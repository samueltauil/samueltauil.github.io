---
layout: post
title: "I stopped asking Copilot to write SSIS XML"
seo_title: "SSIS Package Generation with GitHub Copilot"
description: "Instead of asking Copilot to write .dtsx XML, I gave it the SSIS managed object model, so it generates packages I can actually validate and review."
date: 2026-08-29
categories: [github-copilot, devops]
tags: [github-copilot, ssis, sql-server, data-engineering, custom-agents, agent-skills, powershell, csharp, developer-tools]
---

I was sharing Visual Studio with a customer, clicking through the custom agent, the metadata schema, and the SQL conventions I had put in a repository. At one point I described it as the thing that "generates and validates the SSIS packaging." That is not especially polished demo language, but it captured what they wanted: use GitHub Copilot to speed up package creation without asking people to babysit SSIS boilerplate. An SSIS package is a `.dtsx` file full of generated identifiers, component metadata, lineage references, and designer state. Asking a model to type that XML faster was not the answer. So what should Copilot be allowed to write?

That question became [ssis-copilot-toolkit](https://github.com/samueltauil/ssis-copilot-toolkit). The customer could describe an integration package in Copilot Chat, skip most of the boilerplate, and spend the conversation on how data should move. The toolkit turned that description into an SSIS project with connection managers, package metadata, a generated `.dtsx`, validation SQL, and Markdown documentation that a reviewer could read without opening the designer.

What made the demo useful was the boundary. Copilot stopped at something I could inspect.

## The first approach was the obvious wrong one

I first tried the direct route: let Copilot edit `.dtsx` XML. That lasted long enough to remind me why SSIS developers avoid reviewing package XML by hand.

I had already learned a version of this lesson while working on Java projects that depended on XML validation. A document can be valid XML and still be wrong for the system consuming it. SSIS adds another layer because the designer cares about relationships between generated IDs, component metadata, and data-flow lineage. Seeing angle brackets never made me nervous. Seeing plausible XML treated as proof that a package was usable did.

The format is documented, but that does not make it a good authoring surface. A package contains `refId` values, lineage IDs, component properties, paths, and state that the Visual Studio designer expects to agree with each other. A model can produce well-formed XML that still fails to load in the designer or breaks when a column changes upstream. The output looks plausible right until SSIS has to use it.

The toolkit now refuses direct edits to `.dtsx`, `.dtproj`, `.conmgr`, and `.params` files. It also refuses requests to change internal IDs. Those files belong to the SSIS managed object model, the same API behind the native designer.

That refusal is not a warning buried in a README. It is part of the `ssis-author` agent contract:

```markdown
1. Never write or edit .dtsx, .dtproj, .conmgr, or .params files directly.
2. Never modify refIds, lineageIds, package GUIDs, or internal identifiers.
3. Never skip the delivery gate.
```

I have become suspicious of agents whose main feature is how many things they can do. For this demo, the list of things the agent would not do was more important.

## JSON is the intermediate representation

While I was sharing the repository, I kept coming back to one phrase: "creating and generating from a metadata JSON." My cleaner explanation is that the toolkit behaves like a small compiler. Copilot handles the front end, where a plain-English request becomes intent. The metadata JSON is an intermediate representation we can review. From there, a deterministic host calls the SSIS managed object model and emits the package.

The first demo request was deliberately ordinary:

```text
/generate-staging-package
Load AdventureWorks2025 Sales.Customer into stg.Customer.
```

Copilot resolves the actual source and target schemas before it writes anything. For AdventureWorks2025, the repository includes a pinned mapping skill. In another database, the agent is instructed to query `INFORMATION_SCHEMA.COLUMNS` and confirm types rather than fill gaps from memory. If it cannot resolve a table or column, it stops.

The resulting `Stg_Customer.metadata.json` names both connections, both databases, the source query, seven column mappings, the target table, and whether the load truncates first. One line is easy to miss and matters in practice:

```json
{
  "pattern": "staging",
  "packageName": "Stg_Customer",
  "sourceConnection": "AdventureWorks2025",
  "targetConnection": "CopilotSSIS_Warehouse",
  "targetTable": "stg.Customer",
  "truncateBeforeLoad": true,
  "auditTable": "etl.PackageRun",
  "protectionLevel": "DontSaveSensitive"
}
```

The full metadata also contains an explicit `CAST(c.AccountNumber AS NVARCHAR(10))`. The source and destination types differ, so the conversion belongs in the query where a reviewer can see it. Relying on an implicit SSIS conversion can leave you with a package that passes validation and then fails at runtime with `0xC02020F6`.

This JSON is the file I want in a pull request. It describes the integration without pretending that humans should review generated package internals. Change `truncateBeforeLoad` to `false`, add a mapped column, or change a Type 2 tracked attribute, then regenerate. The `.dtsx` remains an artifact of that decision.

## What turns the JSON into a package

`tools/New-SsisPackage.ps1` is a thin wrapper. It validates the connection names against `.ssis-toolkit.json`, resolves the output path, builds a small .NET Framework executable when needed, and calls it with the metadata file.

The executable is `SsisOmHost.exe`. Its entry point reads the JSON and dispatches to one of four C# builders:

- `StagingLoad.cs` copies a source into `stg.*`, with an optional truncate and audit row.
- `Type1Dimension.cs` inserts new business keys and overwrites matched attributes.
- `Type2Dimension.cs` expires the current row and inserts a new version when tracked values change.
- `FactLoad.cs` resolves dimension surrogate keys before inserting facts.

Those are the only four shapes the agent supports. Ask it to load a fact directly from a source system or create an SCD Type 6 package, and it refuses. Four patterns do not cover every SSIS workload. They cover the repeatable Kimball-style work I wanted to demonstrate, and each one has a builder I can test.

The C# host exists for a less glamorous reason too. PowerShell can load much of the SSIS object model, but it cannot reliably activate the pipeline design-time components used by sources, destinations, lookups, and derived columns. The COM path fails at `ProvideComponentProperties`. A .NET Framework console process compiled with `csc.exe` activates those components cleanly, so PowerShell handles invocation while C# owns object-model authoring.

That separation is the part I like most. The external binary gives me consistency that another page of agent instructions cannot. Copilot can reason about the package, but the managed object model still has to build something the SSIS designer recognizes. During the demo I could say that the agent knew how to create a new SSIS project, then show the repository assets that made the claim inspectable instead of asking everyone to trust the chat window.

## Generated is not the same as done

After every SSIS-affecting change, `ssis-author` must hand the package to a separate `ssis-validator` agent. The validator has no edit tool. It can read, search, and execute the validation primitives, but it cannot repair a package or deploy one.

Two checks ship today. First, `Test-SsisPackage.ps1` runs:

```powershell
dtexec.exe /File <package.dtsx> /Validate /WarnAsError
```

That catches broken bindings, invalid expressions, and data-flow type errors. Then `Test-SsisDesignerLoad.ps1` asks the managed object model to load the package and save it to a temporary file. This exercises the same `Application.LoadPackage` path used when the designer opens a package.

The verdict is structured and deliberately boring:

```text
VERDICT: PASS
STEPS:
  1. Test-SsisPackage      : PASS
  2. Test-SsisDesignerLoad : PASS
  3. Build-SsisIspac       : SKIPPED (roadmap)
  4. ssis-clone-roundtrip  : SKIPPED (roadmap)
```

I am calling out the skipped lines because they are real limits, not footnotes. Building the `.ispac` with `SSISBuild.exe` and validating a clean clone are designed into the gate but not implemented yet. The `/deploy-and-execute` prompt also refuses today because its build, publish, and execution primitives are still on the roadmap.

There is another smaller gap in the current code. The delivery-gate skill says the designer round trip compares a structural hash, but the host currently proves only that `Application.LoadPackage` and `SaveToXml` succeed and that the saved file parses as XML. That is still a useful check. It is not yet the stronger comparison described in the skill, and I would rather say that plainly than turn a demo into a claim the code cannot support.

## Making it usable in an existing SSIS repo

A clean demo repository is easy. The customer question underneath most demos is what happens to the repository they already have.

The toolkit has a brownfield installer for that. Run it from the root of an existing SSIS repository:

```powershell
iex (irm https://raw.githubusercontent.com/samueltauil/ssis-copilot-toolkit/main/install/Add-CopilotSsisToolkit.ps1)
```

The installer copies the agents, skills, prompts, instructions, tools, and VS Code tasks. By default it skips files that already exist. For `AGENTS.md` and `.gitignore`, it owns only a fenced block and replaces that block on a later run without rewriting the rest of the file.

One manifest controls both distribution paths. Its `Overlay` list is what a customer repository receives. Its `Demo` list contains AdventureWorks, demo SQL, the walkthrough, and teardown scripts that must stay out of a customer tree. Its `Ignore` list catches build output and debugging artifacts that should never ship. The same manifest also drives the cleanup workflow when someone creates a new repository from the GitHub template.

That part took more code than the chat demo. I also think it is the part teams should copy. Without an upgrade path and a clear answer to which files the installer owns, the demo ends with a zip file that nobody wants to merge into a ten-year-old repository.

## The unglamorous prerequisites

This is SSIS, so the machine matters. Authoring and validation are Windows-only. The current host binds to the SQL Server 2025 Integration Services assemblies, specifically managed DTS version `17.0.0.0`. Installing only the database engine is not enough, and SQL Server 2022 assemblies do not satisfy that requirement.

The repository includes `Test-Prerequisites.ps1` because I lost patience with setup failures masquerading as agent failures. It runs on stock Windows PowerShell 5.1, checks Git, .NET Framework, the SSIS assemblies, `dtexec`, configuration, SQL access, and the IDE, then prints the exact remediation for each failure. With `-Install`, it can install Git, PowerShell 7, and the `SqlServer` module. It deliberately does not install SQL Server, restore AdventureWorks, or create SSISDB.

This is not a cross-platform abstraction over data integration. It is a focused harness around the tools SSIS teams already use.

## What the customer could focus on instead

By the end of the demo, we had an integration package plus the surrounding material people usually postpone: project configuration, connections, validation SQL, and package documentation covering control flow, data flow, parameters, and a runbook. I wanted the toolkit to absorb the repetitive checks around columns, model restrictions, and package conventions. That left the human conversation where I think it belongs: what the source means, how the warehouse should model it, and what the load must do when reality does not match the happy path. Nobody had to negotiate a lineage ID with a language model.

A generated format does not become a good AI authoring surface merely because it is text. I want the model interpreting intent, checking the live schema, and producing a small contract a person can review. The API that already knows the format can serialize it. Then an independent gate gets the last word.

Let AI choose intent, not serialize XML.
