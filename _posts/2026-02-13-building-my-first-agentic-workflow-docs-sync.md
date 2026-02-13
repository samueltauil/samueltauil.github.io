---
layout: post
title: "Building My First Agentic Workflow: A Documentation Sync Agent with GitHub Agentic Workflows"
date: 2026-02-13
categories: [github, ai, devops]
tags: [github-actions, ai, automation, agentic-workflows, developer-tools, github-copilot]
---

I have been deep in the world of GitHub Agentic Workflows lately, and I am absolutely thrilled about what this technology enables. If you have ever wished your CI/CD pipelines could *think* instead of just execute, this is the moment you have been waiting for. I built a documentation sync agent for my [AI Skills Hub](https://github.com/samueltauil/skills-hub) repository, and I want to walk you through what I learned: what agentic workflows are, how they work under the hood, and how my workflow holds up against the official spec.

Let's get into it.

## What Are GitHub Agentic Workflows?

Traditional GitHub Actions are powerful, but they are fundamentally rigid. You write YAML, define steps, and every conditional path has to be explicitly coded. Agentic Workflows flip that model on its head.

With [GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/) (gh-aw), you write your automation in **Markdown**. Yes, plain Markdown. The YAML frontmatter at the top configures triggers, permissions, and tools, while the body of the file contains **natural language instructions** that an AI coding agent (Copilot, Claude, or Codex) interprets at runtime.

The agent can:

- **Understand context**: Read your repository, issues, pull requests, and files to grasp the current situation
- **Make decisions**: Choose appropriate actions based on what it finds, not just predefined if-then branches
- **Adapt behavior**: Respond flexibly to different scenarios without you having to account for every edge case in advance

The key insight is this: you describe *what you want to happen*, and the AI agent figures out *how to do it*. The `gh aw compile` command then transforms your Markdown into a secure GitHub Actions workflow (a `.lock.yml` file) that runs inside a sandboxed environment with built-in threat detection.

## The Architecture That Makes It Safe

Before you panic about giving an AI write access to your repository, here is the part that made me fall in love with this system: **safe outputs**.

Agentic workflows enforce a clean separation between thinking and doing. The agent runs with **read-only permissions** by default. When it needs to write something (create a PR, post a comment, add labels), it produces structured output that a *separate, permission-controlled job* executes. The agent never gets direct write access. It requests actions, and a sandboxed handler validates and performs them.

This is security through separation, and it is genuinely clever. You get the flexibility of an AI that can reason about your codebase while maintaining the principle of least privilege. On top of that, every workflow runs inside the Agent Workflow Firewall (AWF), which provides network egress controls, prompt injection detection, and secret leak prevention.

## My Docs-Sync Workflow: The Real Thing

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

And the ecosystem around it is growing fast. The gh-aw project ships with patterns for [ChatOps](https://github.github.com/gh-aw/patterns/chatops/), [DailyOps](https://github.github.com/gh-aw/patterns/dailyops/), [IssueOps](https://github.github.com/gh-aw/patterns/issueops/), [orchestration](https://github.github.com/gh-aw/patterns/orchestration/), [monitoring](https://github.github.com/gh-aw/patterns/monitoring/), and more. You can dispatch workflows to other workflows, track work in GitHub Projects, assign Copilot to issues, and even create reusable shared components that wrap MCP servers.

We are watching automation evolve from "do exactly what I say" to "here is what we need to accomplish, figure it out." That shift is massive, and I could not be more excited to be building with it right now.

## Get Started

If you want to try this yourself:

- **Official Documentation**: [github.github.com/gh-aw](https://github.github.com/gh-aw/introduction/overview/)
- **CLI Installation**: `gh extension install github/gh-aw`
- **Example Workflows**: [Agentics Collection](https://github.com/githubnext/agentics)
- **My Workflow**: [skills-hub/docs-sync.md](https://github.com/samueltauil/skills-hub/blob/main/.github/workflows/docs-sync.md)

Write some Markdown. Let an AI agent handle the rest. The future of automation is here and it reads like a README.
