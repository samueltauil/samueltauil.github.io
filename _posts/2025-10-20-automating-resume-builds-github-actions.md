---
lang: en
layout: post
title: "Automating Resume Builds with GitHub Actions"
description: "How I set up GitHub Actions to compile my LaTeX resume and commit the PDF automatically, so one source edit keeps everything in sync."
date: 2025-10-20
categories: [github, devops, automation]
tags: [latex, github-actions, ci-cd, automation, devops]
---

If you've ever tried to maintain a resume in LaTeX, you know the workflow can be frustrating. You make a small change, run the compilation command, check the output, realize you need another edit, compile again, and the cycle continues. Then you need to make sure you're committing both the source file and the generated PDF, keeping everything in sync.

For developers who already use GitHub for version control, there's a better approach.

## The Problem with Traditional LaTeX Workflows

Most people compile LaTeX documents locally, which means:

- You need a full LaTeX distribution installed on your machine
- Every collaborator or device needs the same setup
- PDFs and source files can easily get out of sync
- Sharing the latest version requires manual compilation and upload

## A Solution Using GitHub Actions

I put together a template that automates the entire build process. When you push changes to your LaTeX source file, a GitHub Actions workflow automatically compiles the document and commits the PDF back to the repository. The compiled PDF is also available as a workflow artifact.

This means you can edit your resume from any machine with git access, even without LaTeX installed locally. The automation handles the compilation, and version control keeps everything synchronized.

## The Setup

The template includes a pre-configured workflow that:

- Compiles LaTeX using a containerized environment
- Uploads the PDF as a downloadable artifact
- Commits the generated PDF back to the repository
- Runs automatically on every push

It's straightforward to customize. Just two environment variables control the source and output filenames.

## what the workflow actually does

The workflow lives at `.github/workflows/build-resume.yml` and runs four steps on every push:

1. **Checkout the repository** to get the latest source
2. **Compile the LaTeX** using the [`xu-cheng/latex-action`](https://github.com/xu-cheng/latex-action) container, so no LaTeX distribution is installed on the runner or on your machine
3. **Upload the PDF** as a workflow artifact you can download from the run summary
4. **Commit the PDF back** to the repository, but only when it actually changed

Two variables control the naming, and they are the only thing most people need to touch:

| Variable | Description | Default |
|---|---|---|
| `TEX_FILE` | LaTeX source filename | `my-resume.tex` |
| `PDF_FILE` | Generated PDF filename | `my-resume.pdf` |

Rename your files, update those two values, and everything else keeps working.

## the step that took the longest to get right

Committing a build artifact back into the same repository that triggered the build sounds like an obvious way to create an infinite loop. Push triggers workflow, workflow commits PDF, commit triggers workflow, and so on until someone notices the Actions minutes.

It does not loop, for two reasons worth understanding rather than copying. The commit step only runs when the PDF content actually differs, so a rebuild that produces identical bytes writes nothing and pushes nothing. And commits made with the default `GITHUB_TOKEN` do not trigger new workflow runs, which is a deliberate GitHub behavior that exists precisely for this pattern.

The second one is the load-bearing part. If you swap in a personal access token to get around some other permission problem, you lose that protection and you will get the loop.

## why the container matters more than the automation

The automation is nice. The container is the actual fix. `latex-action` pulls a full TeX Live environment, which means the build is identical whether it runs on my laptop, my work machine, or a GitHub runner I have never seen.

Anyone who has installed a LaTeX distribution knows the failure mode this removes. You get a missing package error, install the package, get a different missing package, and forty minutes later you are reading a Stack Overflow answer from 2013 about font maps. Doing that once is annoying. Doing it again on a new machine two years later, because you need to fix a typo in your resume, is what made me build this.

If you want the PDF locally you can still compile it directly:

```bash
pdflatex my-resume.tex
```

Run it twice if you have added references or a table of contents, since the first pass builds the auxiliary files the second pass reads.

## Why This Matters

For anyone maintaining professional documents in LaTeX, automation removes friction from the editing process. You can focus on content rather than tooling. It's particularly useful for resumes since they require frequent updates but need to maintain consistent professional formatting.

There is a limit worth naming. This is not a good fit for documents with real collaborators, because a PDF committed on every push produces merge conflicts on a binary file, which nobody enjoys resolving. For a single-author document that you edit a few times a year and need to always have current, it is close to ideal.

## Get the Template

The template is MIT licensed and available at: [github.com/samueltauil/latex-resume-template](https://github.com/samueltauil/latex-resume-template)

Click **Use this template**, edit `my-resume.tex`, and push. The first build produces your PDF.

If you've struggled with LaTeX build processes or have developed other solutions, I'm interested to hear how you've approached this problem.

---

*Originally posted on [LinkedIn](https://www.linkedin.com/pulse/automating-resume-builds-github-actions-samuel-tauil/)*
