---
name: helix-task-delivery
description: Use when implementing, fixing, refactoring, or reviewing code in the helix-agent repo. Enforces one-small-task-at-a-time delivery, read-before-edit, plan-before-multi-file changes, minimal diffs, TypeScript and Vitest expectations, and a self-review plus validation pass before handoff.
---

# Helix Task Delivery

## When to Use

Use this skill for day-to-day coding work in `helix-agent`, especially when the user asks to:

- implement a feature
- fix a bug
- refactor a module
- add or update tests
- review an existing change

Read [references/prompt-patterns.md](references/prompt-patterns.md) when you need concrete task framing patterns.

## Default Execution Rules

1. Treat each request as one prompt-sized task. Do not bundle Runtime, Planner, Executor, Tool, and UI work into one change unless the user explicitly asks for a coordinated refactor.
2. Read the target files before editing. Do not write code from architectural assumptions alone.
3. Keep the diff surgical. Do not rename, move, reformat, or clean unrelated code.
4. If the task touches more than 3 files, has an unclear bug root cause, or the user asks to preserve existing behavior, inspect first and present a file-by-file plan before editing.
5. Match the local style exactly. Reuse the repo's naming, folder shape, import style, and test patterns.
6. Avoid `any` unless the user explicitly accepts it. Prefer narrow types, discriminated unions, and interface-based dependencies.
7. Add comments only when they explain intent, constraints, or non-obvious behavior. Do not narrate obvious code.
8. For reusable helpers, shared utilities, runtime state containers, protocol-facing adapters, and other common methods that will be reused across modules, add concise Chinese comments that explain the method or type's purpose and any important constraints.

## Delivery Workflow

### 1. Scope the task

- Restate the exact module, file, or boundary being changed.
- Confirm whether the user wants analysis first or direct implementation.
- Check whether the requested change belongs to the current confirmed day or phase.

### 2. Gather local context

- Read the directly related files first.
- Read sibling files only when needed to preserve consistency.
- If the change introduces a new abstraction, also invoke `$helix-architecture-guard`.

### 3. Implement the smallest correct change

- Prefer extending an existing module over creating a new layer.
- Preserve external APIs unless the user explicitly approves a breaking change.
- Keep placeholder code out of delivered files.
- When adding shared or reusable methods, include Chinese comments at the declaration site so later roadmap days can reuse them without re-reading the whole implementation.

### 4. Validate

- Run targeted checks, not a vague "should work" handoff.
- For logic-heavy TypeScript changes, add or update Vitest coverage when the behavior is testable.
- Prefer fake or mock dependencies for planner, model, tool, approval, and terminal paths.

### 5. Self-review before handoff

Check:

- Did the diff stay inside scope
- Did Core remain decoupled from VS Code
- Was any unnecessary abstraction added
- Are tests or verification steps sufficient
- Is there any hidden behavior change

## Stop and Escalate

Stop and ask the user instead of guessing when:

- the request conflicts with the current confirmed roadmap day or phase
- the change would cross Core and VS Code boundaries
- the repo structure needed for the task does not exist yet
- the correct fix would require an out-of-scope MVP capability

## Output Contract

When handing work back:

- summarize what changed
- list what was intentionally not changed
- report the exact validation run or why validation could not run
- call out any residual risk or manual check
