---
lang: en
layout: post
title: "i18nOps: Translating My Site with GitHub Agentic Workflows"
date: 2026-02-15
categories: [github, ai, devops]
tags: [github-actions, ai, automation, agentic-workflows, translation, github-copilot, i18n]
---

It is a cold Saturday in Boston. The kind of February weather where going outside feels optional and the best plan is coffee, a warm screen, and building something fun with Copilot. I just got back from Seattle last friday for Microsoft Tech Connect, where I spent time talking about developer productivity and AI tooling, and honestly I came home inspired. So this weekend I sat down and asked myself: what if I could make my entire site bilingual using nothing but an agentic workflow?

Turns out, you can. And the journey was full of surprises.

## The Idea: Automated Translation as a Workflow

I have been enjoying learning about [GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/) (gh-aw) a lot lately. My [previous post]({% post_url 2026-02-13-building-my-first-agentic-workflow-docs-sync %}) covered building a docs-sync agent for my Skills Hub project. This time I wanted to try something different: could I use an agentic workflow to keep a full Portuguese (pt-BR) translation of this site in sync, automatically?

The initial spark came from [Peli de Halleux](https://github.com/pelikhan) and his [action-continuous-translation](https://github.com/pelikhan/action-continuous-translation) project. Peli built a GitHub Action that uses AI to continuously translate documentation. Push a change to your English content, and the action generates a pull request with the updated translations. It is a great concept: treat translation as a CI/CD concern, not a manual chore. That project got me thinking about how this pattern could be expressed as an agentic workflow, with all the flexibility and reasoning that comes with it.

## Building the Translation Workflow

The workflow itself lives in a single Markdown file: [translate-to-ptbr.md](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/workflows/translate-to-ptbr.md). The frontmatter configures triggers, permissions, and safe outputs:

```yaml
---
description: Translates English content to Brazilian Portuguese,
  preserving technical terminology, code blocks, and Markdown structure.
on:
  push:
    branches: [main]
    paths:
      - "_posts/**"
      - "index.md"
      - "about.md"
      - "photography.md"
      - "posts.md"
  workflow_dispatch:
permissions:
  contents: read
  issues: read
  pull-requests: read
concurrency:
  group: translate-ptbr
  cancel-in-progress: true
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request:
    title-prefix: "[translate] "
    labels: [translation, pt-br, automation]
    draft: true
    expires: 14
---
```

Every time I push a change to a blog post or page (including this post), the workflow fires. The agent reads a [glossary of 180+ technical terms](https://github.com/samueltauil/samueltauil.github.io/blob/main/_data/translation_glossary.yml) that should stay in English (words like *workflow*, *deploy*, *pull request*, *commit*), follows a [shared conventions file](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/agents/shared/translation-conventions.md) for tone and formatting rules, and outputs translated files into a `pt-br/` directory. The result lands as a draft pull request for me to review.

What I like about this compared to a rigid script approach is that the agent *understands* the content. It knows not to translate code blocks, preserves Liquid template tags, keeps URLs intact, and produces natural-sounding Brazilian Portuguese, not the stilted output you get from pure machine translation. It reads like something a person wrote, because the agent is reasoning about context, not doing find-and-replace.

## The Hard Part: Polyglot and the Bug Hunt

Setting up the translation agent was honestly the easy part. The real weekend adventure was getting [jekyll-polyglot](https://github.com/untra/polyglot) to behave correctly. Here is a fun one: Jekyll automatically adds the parent directory name as a hidden category for posts in subdirectories. So posts in `pt-br/_posts/` silently get `pt-br` as a category. Combine that with polyglot's `/pt-br/` URL prefix, and you end up with URLs like `/pt-br/pt-br/github/ai/2026/02/13/my-post.html`. Double prefixed. 404 everywhere.

The fix was adding explicit `permalink` frontmatter to every PT-BR post. But discovering *why* things were broken required some detective work: checking generated URLs, inspecting polyglot's routing logic, and testing all 24 URLs (8 posts × 2 languages + 4 pages × 2 languages) to make sure everything resolved correctly.

I documented all five pitfalls we found in the [translation conventions](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/agents/shared/translation-conventions.md) so the agent knows how to avoid them on future runs. That is one of the beautiful things about agentic workflows: you can teach the agent from your mistakes by updating the shared instructions. No code changes, just clearer prose.

## Diff-Based Incremental Translation

One problem that came up during testing was translation drift. Imagine you fix a typo in a 300-line blog post. The workflow flags it as stale, re-translates the entire thing, and now all 300 lines of Portuguese are slightly different, with different synonym choices, different sentence structures, different transition phrases. The glossary prevents *term* drift, but the connective tissue of the writing shifts every time.

The solution was adding diff-based patching to the workflow. Instead of blindly re-translating everything, the agent now:

1. Gets the commit hash when the PT-BR file was last modified
2. Runs `git diff` on the English source since that commit
3. Reads the existing PT-BR translation as the base document
4. Patches only the changed portions, preserving everything else verbatim

If the diff shows more than ~60% of the file changed (a major rewrite), it falls back to a full re-translation but still reads the existing PT-BR first to absorb the established voice. This keeps translations consistent across edits. Unchanged paragraphs keep their exact phrasing, and only genuinely new content gets translated.

## Proposing i18nOps as a Design Pattern

After getting everything working, I realized this is not just a one-off solution. It is a repeatable pattern. The gh-aw project already has well-defined design patterns like ChatOps, IssueOps, and DailyOps. Translation fits naturally into the same mold: a trigger-driven workflow where an AI agent reads source content, applies domain-specific rules, and outputs structured results through safe outputs.

So I wrote up a proposal and posted it as a [discussion on the gh-aw repository](https://github.com/github/gh-aw/discussions/15847): **i18nOps**, internationalization as an operational workflow pattern. The core idea:

- **Trigger**: push to content files, or scheduled staleness checks
- **Agent behavior**: glossary-aware translation with diff-based patching
- **Safe outputs**: draft pull request with translated content
- **Shared conventions**: reusable translation rules across languages

If you have a docs site, a blog, or any repository with content that needs to reach a multilingual audience, this pattern gives you a starting point. Fork the workflow, swap in your target language and glossary, and you have continuous translation with human review.

## A Bug Along the Way

During the implementation, I also ran into a bug in the `gh aw compile` command: when the repository name ends in `.github.io` (as GitHub Pages repos do), the compiler generates an incorrect `runtime-import` path. Instead of `.github/workflows/translate-to-ptbr.md`, it outputs `.github.io/.github/workflows/translate-to-ptbr.md`. I reported it as [gh-aw#15824](https://github.com/github/gh-aw/issues/15824). For now, I manually fix the path in the lock file after each compilation. Not ideal, but it works. Hopefully it gets patched soon.

## Wrapping Up

What started as a weekend experiment turned into a working bilingual site, a documented translation pattern, a community discussion, and a bug report. Not bad for a cold Saturday in Boston with Copilot keeping me company.

The thing I keep coming back to with agentic workflows is how natural they feel. You are not writing YAML conditionals or shell scripts. You are describing what you want in plain language, and the agent figures out the details. Teaching the agent about polyglot pitfalls was as simple as updating a Markdown file. Adding incremental translation was a few paragraphs of instructions, not a diff-parsing library.

If you want to try it yourself, here are the key pieces:

- **Translation workflow**: [translate-to-ptbr.md](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/workflows/translate-to-ptbr.md)
- **Translation conventions**: [translation-conventions.md](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/agents/shared/translation-conventions.md)
- **Peli's original project**: [action-continuous-translation](https://github.com/pelikhan/action-continuous-translation)
- **i18nOps discussion**: [gh-aw#15847](https://github.com/github/gh-aw/discussions/15847)
- **gh-aw documentation**: [github.github.com/gh-aw](https://github.github.com/gh-aw/introduction/overview/)

Write some Markdown, teach an agent your conventions, and let it handle the translations. Your weekend self will thank you.
