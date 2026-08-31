---
lang: en
layout: post
title: "Introducing Copilot Agent Designer: A Visual Workflow for GitHub Copilot Agents"
seo_title: "Copilot Agent Designer: Visual Agent Builder"
description: "A visual workflow builder for GitHub Copilot agents: design agent definitions and handoffs on a canvas instead of hand-editing config files."
date: 2025-11-08
categories: [github-copilot, vscode, extensions]
tags: [github-copilot, vscode, ai, developer-tools, open-source]
---

Sometimes the best ideas come from real-world challenges. While working on GitHub Copilot demos, I kept running into the same situation: defining agents and customizing their interfaces felt like a chore. It wasn't about capability, since Copilot is a really powerful tool. The problem was that the process of shaping agent definitions and handoff workflows was a bit manual. I thought, what if this could feel creative instead of repetitive?

That question led to **Copilot Agent Designer**, a Visual Studio Code extension built to make agent design visual, interactive, and fun.

## What is Copilot Agent Designer?

Instead of editing raw Markdown files or tweaking line by line, you can now design agents like you would in a creative studio. The extension gives you:

- **Instant previews**: See your agent come to life as you design
- **Theme playground**: Experiment with different visual styles
- **Full control**: Customize fonts, colors, avatars, and more
- **One-click export**: Generate production-ready `agent.md` or `chatmode.md` files

When you're ready, export and integrate seamlessly with Copilot to start using custom agents in your IDE.

## what the canvas actually does

The canvas is built on [React Flow](https://reactflow.dev/), which is the part that makes handoffs feel like drawing rather than writing YAML. Each agent is a node you can drag, and each connection between two nodes is a handoff you can configure.

An agent node holds the fields you would otherwise be typing into frontmatter by hand:

- **Name**, up to 100 characters
- **Description**, up to 1000
- **Instructions**, up to 8000, which is where the actual behavior lives
- **Model**, picked from a dropdown that includes GPT-4, GPT-5, and Claude Sonnet 4
- **Tools**, as a comma separated list such as `fetch, search, files`
- **Entry point**, a star toggle that marks where a workflow begins

Drag from one node to another and you get a handoff. Click the connection line and you configure three things: the **label** that shows up as a button in the chat UI, the **prompt** that gets sent when someone clicks it, and whether that prompt **auto-sends** or waits for the user to press enter.

That last checkbox sounds trivial and is not. An auto-sending handoff makes a workflow feel continuous. A manual one gives the person a moment to redirect. Deciding which is which per transition is most of the design work, and it is much easier to reason about when you can see the whole graph at once.

## the validation is the reason I kept using it

The visual part is what people notice in a demo. The part I actually rely on is the validation that runs before export:

- **Circular dependency detection**, so agent A handing off to B handing back to A gets caught on the canvas instead of at runtime
- **Required field checks**, so you do not ship an agent with empty instructions
- **Entry point validation**, so a workflow that cannot start refuses to export

I built the circular dependency check after producing exactly that bug by hand, twice, in the same week. Two agents politely passing a task back and forth is not an error any linter was going to catch for me.

## what it writes to disk

Export produces `.agent.md` files in `.github/agents/`, which is the format Copilot already reads. Nothing proprietary, nothing you cannot edit afterward in a normal text editor:

```markdown
---
description: Generate an implementation plan
tools:
  - fetch
  - search
  - usages
model: Claude Sonnet 4
handoffs:
  - agent: Implement
    label: Start Implementation
    prompt: Now implement the plan outlined above.
    send: false
---

# Plan

## Instructions

Generate an implementation plan for new features or refactoring.
```

Frontmatter carries the metadata and the handoff graph. The Markdown body carries the agent name as an H1 and the instructions under it. If you decide the canvas is not for you, the files you already exported keep working, which was a deliberate constraint. I did not want the extension to become something you cannot leave.

The canvas state itself persists separately in `.agentdesign.md`, so layout and positions survive between sessions without polluting the agent definitions.

## the commands

| Command | Description |
|---|---|
| `Agent Designer: Open Canvas` | Open the visual designer |
| `Agent Designer: Open Design File` | Open an existing `.agentdesign.md` |
| `Agent Designer: Export Agents` | Validate and export to `.agent.md` |
| `Agent Designer: Import Agents` | Import existing agent files |
| `Agent Designer: Open as Text` | View the design file as raw text |

You can also drag `.agent.md` files straight onto the canvas, or point it at a directory and let it load everything it finds. That import path matters more than the create path, honestly. Most people trying this already have agents written.

It needs VS Code 1.105.0 or newer. A few commands in the manifest (New From Template, Run Simulation, Customize Theme) are registered but not implemented yet, and I would rather say that here than have you go looking for them.

## Why I Built This

This wasn't about fixing a gap. It was about **unlocking creativity and speed** for developers who want to build polished experiences without friction. Designing agents should feel like creating, not configuring.

The thing I did not expect: seeing a multi-agent workflow as a graph changed the workflows I designed. When handoffs are lines you draw, you notice that you have built a hub and spoke where you meant to build a pipeline. That is hard to see in six separate Markdown files sitting in a folder.

## Get Started

If you're working with GitHub Copilot agents, give it a try:

- **VS Code Marketplace**: [Copilot Agent Designer](https://marketplace.visualstudio.com/items?itemName=samueltauil.copilot-agentdesigner)
- **Source Code**: [samueltauil/copilot-agentdesigner](https://github.com/samueltauil/copilot-agentdesigner)

I'd love to hear how you use it to create smarter workflows!

---

*Originally posted on [LinkedIn](https://www.linkedin.com/pulse/introducing-copilot-agent-designer-visual-workflow-github-tauil-vnz7e/)*
