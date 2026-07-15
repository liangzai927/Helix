# Helix Architecture Rules

## Canonical Layering

Planned repo shape:

```text
apps/
  vscode/
  cli/
  desktop/
packages/
  core/
  protocol/
  shared/
  models/
  tools/
  storage/
  prompts/
  sdk/
```

The key product statement is:

- Helix is an Agent Core plus a VS Code adapter
- VS Code is the first client, not the product boundary

## Planning and Execution

Default planning triggers:

- the user says "先给方案" or equivalent
- more than 2 files are involved
- the bug location is uncertain
- the user explicitly asks to avoid regressions

Planning output should stay structured around:

- goal
- findings
- steps
- risks
- files

Execution should prefer reusing the plan result instead of re-exploring the whole repo.

## Approval Rules

Approval applies to:

- file modifications
- command execution
- batch changes

Allowed decisions should stay visible and auditable:

- reject
- allow once
- allow similar action for the current session

## Context Efficiency

Protect these goals:

- stable system prefix
- stable tool definition order
- compressed old tool output
- plan cache reuse
- no complex long-memory system in MVP
