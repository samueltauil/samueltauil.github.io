---
layout: post
title: "Cardiac Digital Twin: Driving a Simulink Model With GitHub Copilot in Eight Prompts"
date: 2026-07-07
categories: [github-copilot, ai, healthcare]
tags: [github-copilot, mcp, simulink, matlab, digital-twin, healthcare, pharma, agentic-workflows, ai]
---

The Simulink Agentic Toolkit release from MATLAB landed a few weeks ago, and my first thought was not "what does it do." It was the question I find myself asking about every new MCP release lately: what would actually be useful to ask this thing in English? Simulink is not a language-model surface. It is a graphical modeling environment engineers in aerospace and medicine and automotive have used for decades to build precise, validated simulations. Handing one of those over to a chat prompt felt strange enough that I wanted to see what happened. What I did not have was a good use case.

I sat with it for a few days. The idea that would not leave me alone came from a corner of my job I do not usually blog about: healthcare and pharma.

Cardiovascular drug trials ask the wrong question. They ask "how will the average patient respond to this dose," and then they enroll people, and then they measure. Patients are not average. Age, weight, kidney function, genetics, current medications. A single trial against an average captures none of that variability, and a failed cardiovascular trial costs a pharmaceutical company billions of dollars and years of time. The question everyone actually wants answered before enrolling anyone is different. How will THIS patient respond?

That is what a cardiac digital twin is for. It is a computational stand-in for a specific patient's cardiovascular system. You change the dose in software, you run the model, you see what would happen. Then you decide whether the trial is worth running. It is a very old idea in aerospace. Crash the plane in the simulator before you crash it in the sky. Healthcare has been catching up slowly, mostly because building the models is hard and driving them has never been easy.

That became the demo. I built it here: [samueltauil/cardiac-digital-twin](https://github.com/samueltauil/cardiac-digital-twin). It uses GitHub Copilot in Agent mode, orchestrating the Simulink Agentic Toolkit through MCP, to simulate a beta-blocker dosage change on a cardiac digital twin in eight natural-language prompts. No manual code editing. The model is a real closed-loop cardiac model, not a toy script.

## What I tried first

My first instinct was to make the demo about a small MATLAB script and have Copilot rewrite it. That works, and I threw it away after about half an hour. It answered a boring question ("can Copilot edit MATLAB code," which of course it can) and skipped the one I cared about. I wanted to see Copilot driving a validated Simulink model without touching the source of the model. Editing a script means the model is a text file. Driving a Simulink model means it is a live simulation the agent has to interrogate.

So I threw the toy away and built a proper closed-loop cardiac model with five subsystems: pharmacokinetics for metoprolol, a Hill/Emax heart-rate response, cardiac output, blood pressure, and a baroreflex feedback loop that partially compensates for the heart-rate drop. All in Simulink, built programmatically from `model/create_cardiac_model.m`. That is the thing Copilot has to interact with, not a script.

## The eight prompts

The demo scenario is a single line the user types to Copilot in Agent mode: *"Simulate the effect of increasing a patient's beta-blocker (metoprolol) dosage by 20%."* From that one sentence, Copilot runs an eight-step workflow:

1. Describe the cardiac model's subsystem topology.
2. Locate and resolve the `beta_blocker_dose_mg` workspace parameter.
3. Apply the +20% change (50 mg to 60 mg).
4. Re-run the closed-loop simulation and compare the headline metrics.
5. Interpret the physiological impact in clinical context.
6. Generate a Gherkin verification test.
7. Draft formal engineering requirements from the simulation results.
8. Launch a real-time `uifigure` dashboard with an overlaid run comparison.

The prompt text lives in `.github/prompts/01-explore-model.prompt.md` through `08-realtime-dashboard.prompt.md`. The Copilot agent that ties them together is `.github/agents/cardiac-demo.agent.md`. Everything is in the repo, all versioned, all reviewable. Nothing runs against a hidden dashboard or a hosted skill.

The wiring for both Copilot surfaces is two small MCP config files, one for Copilot Chat in Agent mode and one for the Copilot CLI:

```json
// .vscode/mcp.json  (VS Code, Copilot Chat in Agent mode)
{
  "servers": {
    "matlab-simulink": { ... }
  }
}
```

```json
// .github/mcp.json  (GitHub Copilot CLI)
{
  "mcpServers": {
    "matlab-simulink": { ... }
  }
}
```

Two schemas, one server. Both point at the `matlab-simulink` MCP server that the Simulink Agentic Toolkit installer set up. The Toolkit shares a running MATLAB session with that server, so when Copilot asks the model a question, it is asking a live Simulink workspace with the model loaded, not a snapshot on disk.

That is the part I care about. The rigor still lives in the Simulink model. What MCP added was a natural-language shell over it.

## The numbers, and why they are the point

After Copilot bumps the dose from 50 mg to 60 mg and reruns the simulation, the comparison it prints back is small on purpose:

| Metric | Baseline (50 mg) | Modified (60 mg) | Change |
|--------|:----------------:|:----------------:|:------:|
| Heart rate | 67.4 bpm | 66.6 bpm | -1.3 % |
| Cardiac output | 4.72 L/min | 4.66 L/min | -1.3 % |
| Mean arterial pressure | 84.9 mmHg | 83.9 mmHg | -1.3 % |

A +20% dose change producing a -1.3% heart-rate drop looks underwhelming until you read Copilot's explanation of it, which is the real output of the demo. The Hill curve for metoprolol saturates near Emax at these dose levels, so a 20% dose increase is not a 20% receptor-occupancy increase. The baroreflex partially restores heart rate as blood pressure drops, damping the observable effect even more. That is a real physiological answer, produced by a real physiological model, in response to a question asked in English.

![Real-time uifigure dashboard showing baseline and modified beta-blocker runs overlaid, with live gauges for heart rate, cardiac output, and mean arterial pressure](https://raw.githubusercontent.com/samueltauil/cardiac-digital-twin/main/docs/images/dashboard.png)

The other thing Copilot writes at that point is a Gherkin file, `validation/beta_blocker_dose_response.feature`, that turns those numbers into a scenario: given the `CardiacDigitalTwin` baseline, when `beta_blocker_dose_mg` increases to 60 mg, then heart rate and mean arterial pressure both drop by 1.3%. That test did not exist before Copilot generated it from the simulation output. The next time someone changes the model, the Gherkin file is what tells them whether the physiology still holds.

## Why the pattern is worth stealing

The temptation with a demo like this is to read it as "AI is now doing clinical simulation." It is not. The Simulink model does the simulation. Every value in that comparison table came from equations an engineer wrote and validated. What changed is the interface.

For anyone working in a regulated domain that already has a mature simulator, this is the shape worth stealing. It could be a grid-stability model, or a refinery-yield model, or a claims-adjudication engine. The physics or the business rules are already encoded. What has been missing is a way to ask the model a question in the language of the problem, without also being fluent in the language of the tool. MCP is the piece that closes that gap. The agent is not replacing the model. It is a translator sitting on top of it.

The eleven-prompt version of the demo (three optional deep-dive prompts on top of the eight) goes further. It linearizes the closed loop, checks baroreflex stability margins with a Bode plot, and runs a 100-patient Monte Carlo cohort with a PRCC sensitivity tornado, all in natural language. That is the part a clinical pharmacologist can use, not because Copilot suddenly understands pharmacology, but because the model does, and Copilot can now ask.

When the agent can drive a validated Simulink model, the interesting prompt stops being "what should I code" and becomes "which patient should I simulate." Repo is at [samueltauil/cardiac-digital-twin](https://github.com/samueltauil/cardiac-digital-twin), and the full documentation site (model architecture, prompt narrative, physiology math, validation methodology) is at [samueltauil.github.io/cardiac-digital-twin](https://samueltauil.github.io/cardiac-digital-twin/) if you want to poke at it.
