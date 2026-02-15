---
lang: en
layout: post
title: "Building My First Agentic Workflow: A Documentation Sync Agent with GitHub Agentic Workflows"
date: 2026-02-13
categories: [github, ai, devops]
tags: [github-actions, ai, automation, agentic-workflows, developer-tools, github-copilot]
---

I have been deep in the world of GitHub Agentic Workflows lately, and I am absolutely thrilled about what this technology enables. If you have ever wished your CI/CD pipelines could *think* instead of just execute, this is the moment you have been waiting for. I built a documentation sync agent for my [AI Skills Hub](https://github.com/samueltauil/skills-hub) repository, and I want to walk you through what I learned: what agentic workflows are, how they work under the hood, how my workflow holds up against the official spec, and what design patterns and ideas you can use to start building your own.

Let's get into it.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } What Are GitHub Agentic Workflows?

Traditional GitHub Actions are powerful, but they are fundamentally rigid. You write YAML, define steps, and every conditional path has to be explicitly coded. Agentic Workflows flip that model on its head.

With [GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/) (gh-aw), you write your automation in **Markdown**. Yes, plain Markdown. The YAML frontmatter at the top configures triggers, permissions, and tools, while the body of the file contains **natural language instructions** that an AI coding agent (Copilot, Claude, or Codex) interprets at runtime.

The agent can:

- **Understand context**: Read your repository, issues, pull requests, and files to grasp the current situation
- **Make decisions**: Choose appropriate actions based on what it finds, not just predefined if-then branches
- **Adapt behavior**: Respond flexibly to different scenarios without you having to account for every edge case in advance

The key insight is this: you describe *what you want to happen*, and the AI agent figures out *how to do it*. The `gh aw compile` command then transforms your Markdown into a secure GitHub Actions workflow (a `.lock.yml` file) that runs inside a sandboxed environment with built-in threat detection.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } The Architecture That Makes It Safe

Before you panic about giving an AI write access to your repository, here is the part that made me fall in love with this system: **safe outputs**.

Agentic workflows enforce a clean separation between thinking and doing. The agent runs with **read-only permissions** by default. When it needs to write something (create a PR, post a comment, add labels), it produces structured output that a *separate, permission-controlled job* executes. The agent never gets direct write access. It requests actions, and a sandboxed handler validates and performs them.

This is security through separation, and it is genuinely clever. You get the flexibility of an AI that can reason about your codebase while maintaining the principle of least privilege. On top of that, every workflow runs inside the Agent Workflow Firewall (AWF), which provides network egress controls, prompt injection detection, and secret leak prevention.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } My Docs-Sync Workflow: The Real Thing

For the [AI Skills Hub](https://github.com/samueltauil/skills-hub), I have a curated catalog of AI assistant skills aggregated from multiple upstream sources. The data flows in through git submodules and a weekly sync workflow, and the challenge is keeping the documentation (README, CONTRIBUTING guide, and the Astro homepage) aligned with the actual state of the data.

Manually checking whether badge counts are accurate, category tables are current, and example formats match the schema is exactly the kind of tedious-but-important work that an AI agent excels at.

Here is the frontmatter of my [docs-sync workflow](https://github.com/samueltauil/skills-hub/blob/main/.github/workflows/docs-sync.md):

```yaml
---
description: Keeps documentation (README, CONTRIBUTING, and site content)
  aligned with the current skills registry and upstream sources after sync
  updates.
on:
  push:
    branches: [main]
    paths:
      - "skills/registry.json"
      - "site/src/data/skills.json"
      - "sources/**"
  workflow_dispatch:
permissions:
  contents: read
  actions: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request:
    title-prefix: "[docs-sync] "
    labels: [documentation, automation]
    draft: true
    expires: 14
---
```

And the Markdown body gives the agent its mission: read the skills data, audit every documentation file for staleness, identify drift, apply minimal fixes, and summarize everything in a pull request. It also knows to use the `noop` safe output when everything is already in sync, so the workflow does not create noise.

## Validation: How Does It Stack Up?

I went through the [official gh-aw documentation](https://github.github.com/gh-aw/introduction/overview/), the [frontmatter reference](https://github.github.com/gh-aw/reference/frontmatter/), the [safe outputs spec](https://github.github.com/gh-aw/reference/safe-outputs/), and the [agentic workflows agent](https://github.com/github/gh-aw/blob/main/.github/agents/agentic-workflows.agent.md) itself. Here is the breakdown.

### What It Gets Right

**Smart Trigger Design.** The `push` trigger uses path-based filtering so the workflow only fires when the data files actually change (`skills/registry.json`, `site/src/data/skills.json`, or anything under `sources/`). This avoids wasting compute on unrelated commits. Including `workflow_dispatch` is also great practice since it lets you trigger the agent manually for testing or on-demand runs.

**Least-Privilege Permissions.** The permissions are `contents: read` and `actions: read`. The workflow does not request any write permissions because all write operations flow through the safe-outputs system. This is exactly how agentic workflows are meant to work. The agent reads your repo, reasons about it, and then *asks* the safe-output handler to create a pull request on its behalf.

**Well-Configured Safe Outputs.** The `create-pull-request` output uses:
- `title-prefix: "[docs-sync] "` for easy identification
- `labels: [documentation, automation]` for organized tracking
- `draft: true` so a human reviews before merging
- `expires: 14` to auto-close stale PRs after two weeks

Every single one of these fields is valid per the spec. The `draft: true` default is a particularly nice touch since it ensures the agent never merges changes without human oversight. The 14-day expiration prevents abandoned PRs from piling up.

**Clear Natural Language Instructions.** The Markdown body is structured with context, step-by-step tasks, explicit guidelines, and safe output instructions. The agent knows exactly what files to check, what discrepancies to look for, and what it is *not* allowed to touch (it must never modify `registry.json`, `skills.json`, or source code). This kind of explicit boundary-setting is critical for reliable agent behavior.

**Proper Use of noop.** The workflow instructs the agent to call `noop` when documentation is already in sync. Since `noop` is auto-enabled by default in gh-aw, this just works. It prevents silent completions and gives you visibility into what the agent decided.

### Observations and Ideas for Future Iterations

The workflow is solid as-is, but a few things jumped out as potential enhancements for future versions:

- **No `engine:` specified.** This defaults to Copilot, which is fine. If you ever wanted to experiment with Claude or Codex for this task, adding `engine: claude` would be a one-line change.
- **No `concurrency:` controls.** If multiple data-file commits land in quick succession, overlapping workflow runs could create duplicate PRs. Adding a concurrency group like `concurrency: { group: docs-sync-${{ github.ref }}, cancel-in-progress: true }` would prevent that.
- **No `if-no-changes:` on the PR output.** The current approach uses `noop` in the instructions, which works. But you could also add `if-no-changes: "ignore"` to the `create-pull-request` config as a belt-and-suspenders approach.

These are minor refinements, not issues. The workflow follows the gh-aw conventions accurately and would compile cleanly.

## The Power of Describing What, Not How

The thing that really gets me fired up about agentic workflows is the pattern it establishes. Look at what we built here: a 70-line Markdown file that replaces what would have been hundreds of lines of brittle shell scripting, JSON parsing, and conditional logic in traditional GitHub Actions.

The agent reads files, compares data structures, identifies discrepancies, makes targeted edits, and writes a detailed PR summary. All of that behavior emerges from natural language instructions. If the schema changes or a new documentation file gets added, you update the Markdown and the agent adapts. No regex rewrites, no parser updates, no new test cases for edge conditions you forgot about.

And the ecosystem around it is growing fast. The gh-aw project already ships with official design patterns for ChatOps, DailyOps, IssueOps, orchestration, monitoring, and reusable shared components, each with its own trigger model and safe-output configuration. I cover each of these with code snippets in the [Design Patterns](#design-patterns-from-the-official-documentation) section below.

We are watching automation evolve from "do exactly what I say" to "here is what we need to accomplish, figure it out." That shift is massive, and it opens up a rich set of patterns and practical ideas worth exploring.

## Tips for Writing Effective Agentic Workflows

After building this workflow and studying the ecosystem, here are some practical lessons I have picked up that should save you time and frustration.

### Be Specific About Boundaries

The most reliable agentic workflows are the ones that clearly tell the agent what it should *not* do. My docs-sync workflow explicitly states that `registry.json` and `skills.json` are off-limits. Without that constraint, an ambitious agent might decide to "fix" your source data. Treat your Markdown instructions like a job description: define the scope, list the responsibilities, and set clear limits on authority.

### Structure Your Instructions Like a Runbook

Agents perform best when your Markdown body follows a predictable structure: **context** (what is this repo, what does the data look like), **tasks** (numbered steps the agent should follow), **guidelines** (formatting rules, tone, what to avoid), and **output instructions** (which safe output to use and when). Think of it as writing for a capable but literal-minded teammate who has never seen your project before.

### Start with `draft: true` and `expires:`

Until you have high confidence in an agentic workflow's behavior, always default to draft PRs and set an expiration window. This gives you a safety net to review what the agent produces without cluttering your repository with stale branches. Once you trust the output after a few cycles, you can remove the draft flag and let PRs land for review directly.

### Use `workflow_dispatch` for Iteration

Always include `workflow_dispatch` as a trigger during development. It lets you re-run the workflow on demand without pushing dummy commits. Pair it with the `gh workflow run` CLI command to iterate quickly. Once your workflow is stable in production, keep it around as a manual override for on-demand runs.

### Leverage Concurrency Groups Early

If your trigger fires on pushes to frequently-updated paths, add a `concurrency` block from the start. Overlapping agentic runs can produce conflicting PRs or duplicate work. A simple `cancel-in-progress: true` saves compute and keeps your PR list clean.

### Keep the Markdown Focused on One Job

Resist the temptation to build a mega-workflow that handles documentation, linting, testing, and issue triage all at once. Agents reason better within a narrow scope. If you need multiple automated tasks, create separate workflow files and let each one own a single responsibility. You can always orchestrate them with dispatch triggers if they need to coordinate.

## Ideas for Agentic Workflows You Can Build Today

The docs-sync pattern is just the beginning. Building on the [design patterns](#design-patterns-from-the-official-documentation) covered earlier, here are use cases I am either actively exploring or planning to build next.

### Stale Issue Triage Agent

Trigger on a cron schedule (DailyOps pattern). The agent scans open issues older than 30 days, checks whether they reference files or features that have since been merged or removed, and posts a summary comment asking the author if the issue is still relevant. If no response after a week, it labels the issue as `stale`. This replaces the old stale-bot approach with something that actually understands your codebase context.

### Release Notes Generator

Trigger on a new tag push. The agent reads all merged PRs since the last release tag, groups them by label (feature, bugfix, breaking change, dependency), and drafts a GitHub Release with categorized notes. Instead of rigid commit-message parsing, the agent reads PR descriptions and summarizes the actual intent behind each change. Wire this up with the `create-release` safe output and you have turnkey release notes.

### Security Advisory Responder

Trigger on `dependabot` alert events or when a `security` label is added to an issue. The agent reads the advisory details, identifies affected files in your codebase, checks whether the vulnerable dependency is actually imported and used (not just listed in a lockfile), and opens a PR with the version bump plus a summary of what changed and why. This turns a Dependabot alert from a notification into an actionable fix.

### Onboarding Checklist Generator

Trigger via IssueOps when someone opens an issue with a `new-contributor` label. The agent reads your CONTRIBUTING guide, scans recent merged PRs for patterns, and posts a personalized comment with setup instructions, good-first-issue suggestions, and links to relevant documentation. It adapts the checklist based on what languages and frameworks the repository actually uses, not a generic template.

### PR Quality Reviewer

Trigger on `pull_request` opened or updated events. The agent reads the diff, checks whether tests were added for new functions, verifies that documentation was updated if public APIs changed, and flags any files that were modified but not covered by the PR description. It posts a review comment summarizing its findings. This is not a linter. It is a context-aware reviewer that understands the relationship between code changes and project conventions.

### Changelog and Migration Guide Maintainer

Trigger when PRs with a `breaking-change` label are merged. The agent reads the diff, identifies what changed in the public API surface, updates the CHANGELOG file with a structured entry, and if needed, appends migration instructions to a `MIGRATION.md` guide. Over time, your migration docs accumulate automatically and stay accurate because they are generated from the actual code changes.

### Monorepo Dependency Graph Auditor

Trigger on pushes that modify `package.json`, `go.mod`, `Cargo.toml`, or equivalent dependency files in any workspace package. The agent maps internal cross-package dependencies, detects version mismatches, identifies circular dependencies, and opens a PR that fixes version alignment or posts an issue summarizing the conflicts. In a monorepo with dozens of packages, this kind of structural awareness is extremely valuable.

Each of these follows the same core pattern: read-only agent, structured safe outputs, human review before anything lands. The difference between these and traditional automation is that the agent adapts to what it finds instead of failing on the first unexpected edge case.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } Design Patterns from the Official Documentation

The gh-aw project ships with a growing library of [design patterns](https://github.github.com/gh-aw/patterns/) that solve common automation scenarios. Here are the ones I find most useful, with snippets you can adapt for your own repositories.

### ChatOps: Slash Commands in Issue Comments

The [ChatOps pattern](https://github.github.com/gh-aw/patterns/chatops/) lets you trigger agentic workflows from issue or PR comments using slash commands. This is perfect for on-demand tasks like `/deploy staging`, `/summarize`, or `/assign-reviewer`.

```yaml
---
description: Responds to slash commands in issue comments.
on:
  issue_comment:
    types: [created]
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  add-comment:
    issue-number: from-trigger
  add-labels:
    issue-number: from-trigger
---
```

The `issue-number: from-trigger` field automatically ties the safe output back to the issue or PR that triggered the workflow. In the Markdown body, you describe which commands to recognize and what each one should do. The agent parses the comment, identifies the command, and acts accordingly. No webhook server, no bot framework, just Markdown.

### IssueOps: Issue-Driven Automation

The [IssueOps pattern](https://github.github.com/gh-aw/patterns/issueops/) uses issue creation or labeling as the trigger. This is ideal for workflows where someone files a request (like "provision a new environment" or "generate a report") and the agent fulfills it.

```yaml
---
description: Processes structured requests submitted as GitHub issues.
on:
  issues:
    types: [opened, labeled]
permissions:
  contents: read
  issues: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  add-comment:
    issue-number: from-trigger
  add-labels:
    issue-number: from-trigger
  create-pull-request:
    title-prefix: "[issueops] "
    labels: [automated]
    draft: true
---
```

The key here is that the issue body acts as the input form. You instruct the agent to parse structured fields from the issue template (like environment name, region, or configuration options) and act on them. The agent posts progress updates as comments and delivers the result as a PR or a final comment with the output.

### DailyOps: Scheduled Maintenance Tasks

The [DailyOps pattern](https://github.github.com/gh-aw/patterns/dailyops/) runs on a cron schedule and is designed for recurring housekeeping: stale issue cleanup, dependency audits, metric reports, or data freshness checks.

```yaml
---
description: Runs daily maintenance tasks on the repository.
on:
  schedule:
    - cron: "0 9 * * 1-5"
  workflow_dispatch:
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-issue:
    labels: [daily-report, automation]
  add-comment:
    issue-number: latest
  create-pull-request:
    title-prefix: "[dailyops] "
    draft: true
    expires: 7
---
```

Notice the `issue-number: latest` on the `add-comment` output. This tells the safe-output handler to find the most recent open issue matching certain criteria and append the comment there, so your daily reports accumulate in a single tracking issue instead of creating a new one each day. The `expires: 7` on the PR output keeps things tidy for weekly cycles.

### Orchestration: Multi-Workflow Coordination

The [orchestration pattern](https://github.github.com/gh-aw/patterns/orchestration/) is for when one agentic workflow needs to kick off another. Think of it as a parent workflow that dispatches child workflows and tracks their results.

```yaml
---
description: Coordinates multiple downstream workflows after a release.
on:
  release:
    types: [published]
permissions:
  contents: read
  actions: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  dispatch-workflow:
    workflows:
      - update-docs.md
      - notify-stakeholders.md
      - publish-packages.md
  add-comment:
    issue-number: from-trigger
---
```

The `dispatch-workflow` safe output is particularly powerful. It lets the agent decide *which* downstream workflows to trigger based on what it observes. For example, if a release only touches the SDK package, the agent might dispatch `publish-packages.md` but skip `update-docs.md` because no API surface changed. This is dynamic orchestration driven by understanding, not static pipeline sequencing.

### Monitoring: Drift Detection and Alerts

The [monitoring pattern](https://github.github.com/gh-aw/patterns/monitoring/) watches for configuration drift, compliance violations, or state inconsistencies and raises alerts when something is off.

```yaml
---
description: Monitors infrastructure configuration for drift and compliance.
on:
  schedule:
    - cron: "0 */6 * * *"
  push:
    branches: [main]
    paths:
      - "infra/**"
      - "terraform/**"
permissions:
  contents: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-issue:
    labels: [drift-detected, infrastructure]
  add-labels:
    issue-number: from-trigger
  noop: {}
---
```

The dual trigger here is intentional: the cron schedule catches drift that accumulates silently, while the push trigger catches misconfigurations the moment they land. The agent compares the current state of config files against expected baselines, and if it finds discrepancies, it opens an issue with a detailed report. When everything is clean, it calls `noop` to confirm the check ran successfully.

### Shared Components: Reusable Agent Instructions

One pattern that deserves special attention is [shared components](https://github.github.com/gh-aw/patterns/shared-components/). You can extract common instructions into reusable Markdown files and reference them from multiple workflows.

```markdown
<!-- .github/agents/shared/pr-conventions.md -->

## Pull Request Conventions

When creating a pull request, follow these rules:

- Title must start with one of: feat:, fix:, docs:, chore:, refactor:
- Description must include a "## Changes" section summarizing what changed
- Description must include a "## Testing" section explaining how to verify
- If the PR touches public APIs, include a "## Migration" section
- Never force-push to the PR branch after review comments have been posted
```

Then in your workflow Markdown body, you reference it:

```markdown
Follow the shared PR conventions defined in `.github/agents/shared/pr-conventions.md`.
```

The agent reads that file at runtime and incorporates the instructions. This means you can standardize behaviors across all your agentic workflows without duplicating instructions in every file. Update the shared component once, and every workflow that references it picks up the change.

### Combining Patterns

The real power emerges when you combine patterns. A ChatOps trigger can dispatch an orchestration workflow. A DailyOps schedule can feed into a monitoring check that creates IssueOps tickets. A shared component can define the PR format that every workflow uses. The patterns are composable building blocks, and because everything is just Markdown and YAML frontmatter, the barrier to mixing them is almost zero.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } Get Started

If you want to try this yourself:

- **Official Documentation**: [github.github.com/gh-aw](https://github.github.com/gh-aw/introduction/overview/)
- **CLI Installation**: `gh extension install github/gh-aw`
- **Example Workflows**: [Agentics Collection](https://github.com/githubnext/agentics)
- **My Workflow**: [skills-hub/docs-sync.md](https://github.com/samueltauil/skills-hub/blob/main/.github/workflows/docs-sync.md)

Write some Markdown. Let an AI agent handle the rest. The future of automation is here and it reads like a README.
