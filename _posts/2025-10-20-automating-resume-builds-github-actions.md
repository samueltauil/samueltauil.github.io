---
layout: post
title: "Automating Resume Builds with GitHub Actions"
date: 2025-10-20
categories: [github, devops, automation]
tags: [latex, github-actions, ci-cd, automation, devops]
---

If you've ever tried to maintain a resume in LaTeX, you know the workflow can be frustrating. You make a small change, run the compilation command, check the output, realize you need another edit, compile again – and the cycle continues. Then you need to make sure you're committing both the source file and the generated PDF, keeping everything in sync.

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

It's straightforward to customize – just two environment variables control the source and output filenames.

## Why This Matters

For anyone maintaining professional documents in LaTeX, automation removes friction from the editing process. You can focus on content rather than tooling. It's particularly useful for resumes since they require frequent updates but need to maintain consistent professional formatting.

## Get the Template

The template is MIT licensed and available at: [github.com/samueltauil/latex-resume-template](https://github.com/samueltauil/latex-resume-template)

If you've struggled with LaTeX build processes or have developed other solutions, I'm interested to hear how you've approached this problem.

---

*Originally posted on [LinkedIn](https://www.linkedin.com/pulse/automating-resume-builds-github-actions-samuel-tauil/)*
