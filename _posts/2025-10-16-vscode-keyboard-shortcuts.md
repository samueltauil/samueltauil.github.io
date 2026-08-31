---
lang: en
layout: post
title: "Level Up Your VS Code Speed with Keyboard Shortcuts"
seo_title: "VS Code Keyboard Shortcuts for Copilot Users"
description: "The VS Code shortcuts I actually use every day, including the Copilot chat and inline chat keybindings that changed how I move around the editor."
date: 2025-10-16
categories: [vscode, productivity]
tags: [vscode, keyboard-shortcuts, developer-tools, productivity, github-copilot]
---

I was screen sharing last week and caught myself doing something that made the other person stop me: I opened a file, jumped to a symbol, split the editor, and asked Copilot to explain a function without touching the mouse once. They asked me to do it again, slower. That is the entire value of shortcuts. Not that they save a second each, but that they keep you inside the thought you were having.

Here are the ones I reach for constantly, and then the newer set that matters if you have Copilot turned on.

## the classics worth burning into muscle memory

**Command Palette** gets you to any command without hunting through menus:

- macOS: `⇧⌘P`
- Windows/Linux: `Ctrl+Shift+P`

**Quick Open** jumps to a file by name. This one replaced the file explorer for me entirely:

- macOS: `⌘P`
- Windows/Linux: `Ctrl+P`

**Multi-cursor** is the one people watch and then immediately ask about. Place cursors with `Alt+Click`, or add one per line in a selection:

- macOS: `⇧⌥I`
- Windows/Linux: `Shift+Alt+I`

Select the next occurrence of whatever is highlighted, which is how you rename six things in four seconds:

- macOS: `⌘D`
- Windows/Linux: `Ctrl+D`

**Toggle Sidebar** when the code needs the whole window:

- macOS: `⌘B`
- Windows/Linux: `Ctrl+B`

**Zen Mode** when a review needs actual attention:

- macOS: `⌘K Z`
- Windows/Linux: `Ctrl+K Z`

## the Copilot set nobody taught me

This is the part that changed in the last year, and it is where I see the most mouse usage from people who are otherwise fast. The [VS Code AI features cheat sheet](https://code.visualstudio.com/docs/copilot/reference/copilot-vscode-features) documents these, but they are easy to miss because the UI has buttons for all of them.

| Shortcut | What it does |
|---|---|
| `Ctrl+Alt+I` | Open the Chat view in the Secondary Side Bar |
| `Ctrl+I` | Start inline chat, in the editor or the terminal |
| `Ctrl+Shift+Alt+L` | Open Quick Chat without leaving what you are doing |
| `Ctrl+Shift+I` | Switch to using agents in the Chat view |
| `Ctrl+N` | Start a new chat session |
| `Ctrl+Alt+.` | Show the model picker |
| `Tab` | Accept an inline suggestion, or move to the next edit suggestion |
| `Escape` | Dismiss the suggestion |

The one that actually reorganized my day is `Ctrl+I` in the terminal. Not in the editor, the terminal. I used to alt-tab to a browser to remember some `find` incantation. Now I ask in place and read the command before running it. Same loop, minus the context switch.

Quick Chat is the second one worth learning deliberately. Chat view is a place you go to. Quick Chat is a thing you do and then dismiss, which suits the "what does this flag mean" questions that make up most of my prompts.

## why I do not memorize the Mac column

Those keybindings are the Windows and Linux defaults from the docs. The macOS equivalents mostly follow the platform convention, but not uniformly, and I have gotten it wrong on stage before. So rather than trust my memory or a blog post, including this one, open the Keyboard Shortcuts editor with `Ctrl+K Ctrl+S` (`⌘K ⌘S` on macOS) and search for "chat". It shows you what is actually bound on your machine, in your VS Code version, which is the only version that matters.

That editor is also where you fix the collisions. `Ctrl+I` in particular tends to fight with whatever else you have bound, and it is worth resolving deliberately rather than wondering why inline chat sometimes does nothing.

## the honest caveat

Shortcuts are a personal-fit problem, not a best-practices problem. I have watched genuinely excellent engineers work almost entirely from the mouse and ship faster than I do. The reason I care is narrower than productivity: every time I reach for the mouse mid-thought, I lose the thread of what I was about to write. If that is not how your attention works, most of this list is noise.

Pick two. Use them until they are automatic. Then come back for two more.

## Printable Cheat Sheets

Grab the official printable cheat sheets (US-English keyboard):

- [Windows](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf)
- [macOS](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-macos.pdf)
- [Linux](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-linux.pdf)

Explore the full [Keybindings & Customization Guide](https://code.visualstudio.com/docs/configure/keybindings#_keyboard-shortcuts-reference)

What shortcut saves you the most time?

---

*Originally posted on [LinkedIn](https://www.linkedin.com/pulse/level-up-your-vs-code-speed-keyboard-shortcuts-samuel-tauil/)*
