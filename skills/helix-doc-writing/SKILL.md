---
name: helix-doc-writing
description: Use when creating or updating README files, architecture docs, PRD-adjacent notes, code comments, examples, or release-facing documentation in the helix-agent repo. Enforces truthfulness to the current repository state, concise technical writing, explicit implemented-versus-planned language, and documentation updates that stay aligned with verified behavior.
---

# Helix Doc Writing

## When to Use

Use this skill for:

- `README.md`
- architecture notes
- roadmap or checklist updates
- public usage examples
- changelog and release-adjacent docs
- inline code comments

Read [references/doc-checklist.md](references/doc-checklist.md) when you need a repo-facing documentation checklist.

## Writing Rules

1. Write only what the repository can currently support or what the user explicitly labels as planned.
2. Clearly distinguish:
   - implemented behavior
   - planned structure
   - out-of-scope MVP ideas
3. Do not claim a feature is runnable, packaged, or integrated unless you verified it.
4. Prefer concise, high-signal technical prose over marketing language.
5. Commands, file paths, and examples must be copy-pasteable. Do not leave placeholder gaps in delivered snippets.
6. For comments inside code, explain why or constraints, not obvious mechanics.

## Repo-specific Expectations

### README

- state what Helix is in one sentence
- explain the current repo status honestly
- show the current structure, not imagined files
- point to the authoritative product docs
- include run, build, or install steps only when verified

### Architecture Docs

- name the layer responsibilities explicitly
- say what Core cannot depend on
- say what `apps/vscode` should and should not own
- include acceptance or review criteria when documenting a development phase

### Code Comments

- keep them brief
- place them only around non-obvious constraints
- match the language and tone already used in the touched file
- for reusable helpers, common methods, shared utilities, and runtime-facing abstractions, prefer concise Chinese comments at the declaration site so the purpose is clear before reading the implementation

## Required Cross-checks

Before finishing a doc change, verify:

- the file names and directories really exist
- the documented commands exist or are intentionally marked planned
- implemented versus planned wording is explicit
- the change does not silently broaden product scope

## When to Update Docs

Update a relevant doc when a change affects:

- public project positioning
- repo structure
- run, build, package, or install commands
- approval, planning, or architecture boundaries

If no doc update is needed, be ready to state why.
