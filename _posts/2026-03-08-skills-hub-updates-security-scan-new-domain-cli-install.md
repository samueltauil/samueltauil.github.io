---
lang: en
layout: post
title: "Skills Hub Updates: Security Scanning, CLI Installation, and skillshub.space Launch"
date: 2026-03-08
categories: [github-copilot, open-source, developer-tools]
tags: [github-copilot, security, cli, automation, developer-tools, skills]
---

When I first launched Skills Hub, it had 51 skills pulled from a single source. A few months later, the catalog grew to 225 skills aggregated from GitHub's awesome-copilot, Anthropic's skills repository, and MCP extensions. That's a lot of code I hadn't looked at.

Skills are powerful because they extend what your AI assistant can do. They get loaded dynamically into context, can shape responses, run shell commands, access files, make network requests. That flexibility is the whole point. But when you're aggregating 225 of them from multiple upstream repos, you want to know exactly what each one does before it reaches developers. Not knowing what's inside the code and not knowing exactly when it activates felt like a gap worth closing.

The idea actually clicked during a hackathon at Microsoft Tech Connect in Seattle. We were brainstorming what Skills Hub needed most, and someone asked "do you actually know what these skills do before you ship them?" Honest answer: not really. That question stuck with me, and it pushed me to work on three updates: security scanning, a proper CLI install flow, and a dedicated domain.

## Security Scanning

This was the one that stuck with me from that hackathon conversation. I'm pulling skills from upstream repos I don't fully control, and I needed a way to know what's inside before it reaches the catalog.

So I built an automated scanner that runs on every catalog update. It checks for nine categories of issues:

- **Shell command execution** — unsafe shell escapes and command injection
- **Code evaluation** — `eval()` and dynamic code execution
- **Deserialization attacks** — unsafe object deserialization
- **Hardcoded secrets** — API keys, tokens, credentials sitting in files
- **External URLs** — unexpected network requests to third-party servers
- **Curl pipe-to-shell** — the classic `curl | sh` pattern
- **Path traversal** — directory traversal tricks
- **Sensitive file access** — reads of system files like `/etc/passwd`
- **SQL injection** — unprotected queries

Skills that pass get a **Verified** badge on their detail page, with the scan timestamp and a breakdown of what was checked.

![Verified badge shown on the skill header](/assets/images/2026-03-08-skills-hub-updates/feature-verified-badge.png)

Out of 225 skills, 212 passed clean. 13 got flagged with medium-to-high findings. I decided to keep the flagged ones visible and downloadable — pretending problems don't exist is worse than showing them. Better to surface the findings and let developers decide for themselves.

The fun part nobody tells you about building a security scanner: you end up reading every single skill. Some of them are doing incredibly clever things I never noticed. And a few were doing things that made me go "yeah, glad we caught that."

## CLI Installation

The original install experience was... fine. Download a ZIP, extract it, rename the folder, hope you got the path right. It worked, but it felt clunky every time I used it myself.

I wanted something closer to how we actually install things — one command, done. So I built a GitHub CLI extension:

```bash
gh skills-hub install <skill-id>
```

First time? Just grab the extension:

```bash
gh extension install samueltauil/skills-hub
```

It handles the directory setup, validates everything landed correctly, and gives you a clear confirmation. Each skill page now shows the CLI command front and center with a copy button.

![GH extension and install command shown in the install card](/assets/images/2026-03-08-skills-hub-updates/feature-gh-extension-install.png)

## skillshub.space

This one's simple. Skills Hub used to live at a subdirectory under my GitHub Pages site. With 225 skills from multiple sources, it felt like it deserved its own address:

**[skillshub.space](https://skillshub.space)**

Same hosting, same infrastructure — just easier to share and remember.

![Skills Hub homepage at skillshub.space](/assets/images/2026-03-08-skills-hub-updates/feature-homepage-hero.png)

## Where Things Stand

The catalog currently sits at **225 skills** across 8 categories, with **212 verified** through security scanning and **13 flagged** for review. Installation now has three paths, with CLI as the recommended one.

## What's Next

There's still a lot I want to do — community submissions so others can contribute skills, better search and filtering, VS Code extension integration, and maybe some enterprise patterns for teams that want to run their own curated collections. But the security scanning and CLI install feel like the right foundation to build on.

**Check it out**: [skillshub.space](https://skillshub.space) | [Source on GitHub](https://github.com/samueltauil/skills-hub)
