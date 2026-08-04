---
layout: post
title: "Well formed is not the same as safe to build"
date: 2026-08-03
categories: [github-copilot, healthcare]
tags: [github-copilot, code-review, agent-skills, healthcare, fhir, hl7, interoperability, hipaa, typescript]
---

`npm test` came back with nineteen passing and zero failing. Then I called the endpoint those tests cover and read the JSON it returned. Sitting in a free-text note field on a clinical Observation was a patient's Social Security number. The suite was green. The resource was wrong in four separate ways, and one of them is the kind of thing that ends up in a breach notification.

I wrote it that way on purpose. [fhir-compliance-copilot](https://github.com/samueltauil/fhir-compliance-copilot) is a small TypeScript service that serves clinical resources in FHIR R4, the fourth release of Fast Healthcare Interoperability Resources, the HL7 standard most modern healthcare integration is built on. It contains eight deliberate R4 violations spread across three routes. Every violation passes the test suite, because the tests assert on the shape my code produces, and my code produces exactly what I told it to. The patient data is Synthea output, so the SSN is a synthetic `999-XX-XXXX` value that the Social Security Administration has never issued to anyone. That detail matters for the demo and, as it turns out, matters not at all for the rule.

The question I was trying to answer came out of a lot of healthcare conversations that go roughly the same way. We validate FHIR in continuous integration, so we are covered. I wanted to find out where that sentence stops being true.

## What a validator is looking at

A FHIR validator reads a resource instance. You hand it JSON, it checks that against the R4 structure definitions and the terminology bindings, and it tells you whether the thing you built is legal. That is genuinely useful, and three of my four Observation violations would have been caught by it.

Here is the function producing them, trimmed down:

```ts
return {
  resourceType: 'Observation',
  id: randomUUID(),
  status: 'final_result',              // V1
  // V2: category array is absent
  subject: { reference: `Patient/${patientId}` },
  code: { coding: [{ system: 'http://loinc.org', code: loincCode, display: 'Heart rate' }] },
  valueQuantity: {
    value,
    unit,                              // V3: no system, no code
  },
  note: auditRef ? [{ text: `Audit ref: ${auditRef}` }] : undefined,  // V4
};
```

Three of those are ordinary structural mistakes. `final_result` is not one of the values R4 allows for `status`, and R4 is strict about that list. `category` is missing, which breaks the profile the spec expects whenever you publish vital signs. `valueQuantity` reports `/min` as a bare string, with nothing attached to say which unit vocabulary those characters came from, so a receiving system gets a label instead of something it can compute with. A validator catches all three without much effort.

Then there is V4. `auditRef` is the patient's SSN, and it lands in `note[].text` as `Audit ref: 999-XX-XXXX`. That is a schema-valid string in a schema-valid field, so the validator has nothing to say about it.

The rest of my toolchain is answering different questions. Secret scanning has no secret to find, because nothing was committed except a variable reference. CodeQL traces tainted data into sinks it has been taught about, and a note field on a FHIR response body is not one of them by default. You could teach it with a custom query, and for a large healthcare codebase that is a serious option. I wanted the rule written somewhere a healthcare architect could read it. Every one of those tools is doing precisely the job it was designed for. The gap is between them.

The Department of Health and Human Services is not so relaxed. Social security numbers are identifier (G) on the Safe Harbor list, and the de-identification guidance answers the free-text question directly: the standard "makes no distinction between data entered into standardized fields and information entered as free text," and an identifier "must be removed regardless of its location in a record if it is recognizable as an identifier." The field you chose is not a defense.

## The last time I saw this, it was pipe-delimited

I am not neutral about this one. Years ago in Brazil I worked on [SIGA Saúde](https://ezute.org.br/siga-saude/), the integrated health management system for the São Paulo municipal network. It has run in production since 2004 across more than 980 facilities, and the public figures put it around 22 million registered users and 1.3 million appointments a month. Scheduling, access regulation, the electronic patient record, the national health card, high-complexity procedure authorizations, all in one platform that talks to the Ministry of Health over HL7 messaging and a pair of patient identity profiles called PIX and PDQ. The [operational manuals](https://repositoriosistemas.smsprefeiturasp.com.br/Manuais/) are still published openly by the city, which tells you something about how the project was set up.

PIX and PDQ are the two I still think about. Patient Identifier Cross-referencing lets two systems reconcile the different identifiers they each hold for the same person. Patient Demographics Query lets one system look someone up by name and birth date and get an identifier back. Both exist so that two systems can agree on which patient they are discussing without shipping a national identity number back and forth. You register the patient once, the index hands you an identifier, and from then on you reference the identifier. The whole architecture is a long, careful argument against the exact line I wrote in `observation.ts`.

FHIR replaced the pipe-delimited segments I was reading back then, and the tooling around it is enormously better. The mistake did not change. Somebody needs a value for debugging, the nearest field that accepts a string is a free-text one, in it goes, and it ships. The serialization format moved on and the failure mode stayed exactly where it was, still waiting on a human to notice before merge.

That last part is the whole reason I went looking for a different kind of check. It survives review because a reviewer reads a diff for what changed, and what changed here was a variable dropped into a template string. There is nothing alarming about the syntax. The alarming part is semantic, and it lives in what `auditRef` happens to hold two files away. You catch it if you already know that, which in practice means you catch it if you wrote the other file, or if you are the person who remembers why the identity architecture exists in the first place. On SIGA that was a handful of people across a very large system, and they were not in every review.

So the check was real, it was just conditional on the right person being in the room. Writing the rule down and pointing it at every diff is not a smarter check than that senior engineer would have made. It is the same check, running every time.

## Why this went in a skill and not in copilot-instructions.md

My first attempt was a `copilot-instructions.md`. It worked. It was also about 130 lines of R4 terminology bindings and protected health information patterns, and repository-wide custom instructions apply to every review, so all 130 lines came along on a pull request that touched nothing but the README. That is exactly what repository-wide instructions are designed to do. I had picked the wrong container for a ruleset this narrow.

Copilot code review gives you four places to put knowledge, and they are not interchangeable. `.github/copilot-instructions.md` holds repository-wide rules that apply to every review in the repo. A file under `.github/instructions/` with an `applyTo` glob in its frontmatter holds rules that only wake up when the changed files match the pattern. `AGENTS.md` in the root holds conventions you want every agent to read, not only Copilot. And `.github/skills/` holds task-specific procedures that load when they are relevant to the diff.

I went back and forth between the path-specific instructions file and the skill. An `applyTo: "src/routes/**/*.ts"` block would have scoped the terminology tables to the routes that build resources, and for a lot of teams that is the right answer and the smaller change. I picked the skill because what I was writing is a procedure rather than a preference. It has severities, lookup tables, and a judgment call about what counts as a leak, and I wanted it to read like a document a compliance lead could sit down with, not a paragraph of style guidance buried in a config file.

The part that changed how I worked is smaller and more practical. Copilot code review reads custom instructions, agent instructions, and skills from the head branch of the pull request rather than the base. Edit the skill, open a PR, and that same PR gets reviewed with the new version of the skill. I did not expect a tight feedback loop on the ruleset itself, and I immediately started leaning on it. Every iteration of the severity definitions below got tested in the pull request that introduced it, which is not how writing compliance rules usually goes.

## The rules I wrote down

The skill lives at `.github/skills/fhir-compliance/SKILL.md`. It opens by scoping itself to pull requests that touch FHIR resource construction, then defines three severities:

```markdown
- CRITICAL: violates a SHALL in the R4 specification. Block merge.
- WARNING: violates a SHOULD. Allow merge with explicit acknowledgment.
- PHI_RISK: always CRITICAL, regardless of data source.
```

After that it is mostly boring lookup tables. Valid `status` codes. The vital signs category code from LOINC, the Logical Observation Identifiers Names and Codes vocabulary. The unit identifiers for `/min`, `mm[Hg]`, `kg`, and `%`, taken from UCUM, the Unified Code for Units of Measure. The deprecated HL7 v3 ActCode URI that R4 removed and the one that replaced it. A list of field-name patterns to scan for: `ssn`, `socialSecurity`, `mrn`, `medicalRecord`, `nationalId`, `taxId`, `driversLicense`, `passport`.

Every comment the skill produces is tagged `[FHIR-R4-SKILL]`, so an author can tell skill-driven feedback apart from Copilot's general review. Small thing. It made triage much less annoying.

The one paragraph I care about is the one that decides what counts as a leak:

> A variable reference like `patient.ssn` is a PHI_RISK violation even when the current data source is synthetic (Synthea). The code pattern itself constitutes the risk.

That sentence is doing all the work. The synthetic bundle is a property of today's fixture directory, not a property of the code. The line that reads an SSN and writes it into a note field behaves identically the day someone points the service at a real electronic health record, and nobody is going to reread that function on that day.

## Getting the review to run

There is no workflow file to write and no bot to install. On a pull request, Copilot shows up under Reviewers in the right sidebar and you click Request. From a terminal it is `gh pr create --reviewer @copilot`, or `gh pr edit PR-NUMBER --add-reviewer @copilot` on a pull request that already exists. Reviews came back in well under a minute every time I ran one.

If you want it on the pull requests you forget rather than the ones you remember, repository and organization owners can switch on automatic review, with separate options for reviewing every new push and for reviewing drafts. On a healthcare repo I would turn on both without thinking about it. The mistake I am describing gets written on a draft branch at 5pm, not on the tidy pull request you open the next morning.

One setting matters more than the rest for this kind of code. Review effort defaults to Low, which is fast feedback on common issues. Medium, in public preview as I write this, routes the pull request to a higher-reasoning model for longer analysis, and GitHub calls out security-sensitive code as the case for it. A route that assembles a clinical resource out of patient fields is exactly that, and the extra AI credits are nowhere near the expensive part of a breach.

## What Copilot left on the pull request

I opened a PR with the four Observation violations and let code review run.

![GitHub Copilot code review comments on the Observation pull request, flagging the invalid status binding, the missing category, and the incomplete valueQuantity](https://raw.githubusercontent.com/samueltauil/fhir-compliance-copilot/main/docs/screenshots/02-pr1-observation-violations-review.png)

It caught all four. For each one it named the severity, quoted the offending line, cited the R4 section, and gave the corrected value rather than telling me to go read the spec. Where the fix fits in a line or two it arrives as a suggested change you can commit straight from the pull request page, and Fix with Copilot hands the larger ones to the cloud agent to open as a follow-up. The PHI comment is the one I keep showing people:

![Copilot code review comment tagging the SSN in the note field as a PHI_RISK violation](https://raw.githubusercontent.com/samueltauil/fhir-compliance-copilot/main/docs/screenshots/03-pr1-phi-ssn-leak-comment.png)

The question I get next, every single time, is how you know the skill fired at all and Copilot did not simply happen to know FHIR. There are two answers. Review comments carry an attribution at the bottom naming the skill or MCP server behind them, and the pull request timeline links to the review session, whose logs show which skills and tools were actually called. In a compliance conversation that traceability is worth more than the comment itself. Somebody is eventually going to ask which version of which ruleset produced a given finding, and you want a better answer than a shrug.

Then I got curious and asked the Copilot app to build a canvas that scans every open PR in the repo and scores it per resource type, with accept-risk or requires-fix triage on each finding. That took one prompt and about a minute, and it is the part of the demo healthcare architects lean forward for, because it looks like something a compliance team could work out of on a Monday morning.

![A canvas compliance dashboard scoring every open pull request by FHIR resource type with per-finding triage](https://raw.githubusercontent.com/samueltauil/fhir-compliance-copilot/main/docs/screenshots/06-canvas-compliance-dashboard.png)

## The part I got wrong

My skill calls `note.text` a narrative field. That is sloppy. In FHIR, `Observation.note` is an `Annotation`, not the resource narrative, which is `Resource.text.div` and has its own rules about rendering safely on its own. I conflated two different things while writing the ruleset, and the review comment carried my wording straight through onto the PR, which is what should happen when the skill is the source of truth you handed it.

The privacy answer does not change. Health and Human Services does not care which field the identifier is in. But it is a good reminder that a skill inherits whatever confusion you brought to it, and that the citations it produces want a human who knows the spec to sanity-check them. This is prose guidance rather than a compiled rule, so two runs on the same diff will phrase the same finding differently. That is the nature of writing rules in English, and it is most of why the approach is worth using at all.

The other thing I would change is the folder name. My skill sits in `.github/skills/fhir-compliance/`, and GitHub's guidance is that review-focused directory names make Copilot more likely to reach for a skill during a review. Mine fired on every pull request I threw at it, so the description was carrying the weight. Calling the folder `fhir-code-review` would have made that signal explicit instead of implicit, and in a repo with a dozen skills competing for attention it is not the kind of thing I would leave to luck.

One more caveat, because it is the first question a compliance lead asks. Copilot always leaves a Comment review, never an Approve and never a Request changes, so it does not count toward required approvals and it cannot block a merge on its own. My severity table says "block merge" on CRITICAL findings, and I should be clear that this is language addressed to the human reading the comment, not an enforcement mechanism. For a reviewer that is occasionally wrong about the spec, advisory is the correct default, and it is also why you should not sell this upward as a gate. If you need something that genuinely stops the merge, put a validator step in continuous integration that fails the build deterministically, or use GitHub Code Quality with a ruleset, which can block a pull request on unresolved findings.

## Where this earns its keep

Think of it as two different questions asked at two different times. A validator inspects the resource your code produced, after the code ran. The skill inspects the code that is about to produce it, while it is still a diff and still cheap to change. Neither one covers the other's blind spot, and the SSN in the note field lives squarely in the validator's.

The repo is public if you want to fork it and point it at your own resource types. Swapping domains is mostly swapping the lookup tables. The severity model and that one paragraph about variable references carry over to any regulated payload, and I would expect the same skill shape to hold up for a claims format or a lab feed with different tables underneath. It is a personal side project built on public documentation and Synthea data, no customer environment involved anywhere, and the opinions are completely mine.

I am not going to pretend this is a compliance program. It is a review assistant that reads the R4 terminology bindings more carefully than I do at 5pm on a Thursday, and it catches one class of mistake the rest of my toolchain is not built to see. That is the whole claim. What I keep coming back to is that the rule was never the hard part. Every healthcare engineer I have worked with already knows you do not put an SSN in a note field. The hard part was getting that knowledge to show up on the pull request where the mistake was being written, instead of in the head of whoever happened not to be reviewing it.

A validator can tell you the resource is well formed. It cannot tell you it was safe to build.
