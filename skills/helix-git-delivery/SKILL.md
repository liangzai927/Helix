---
name: helix-git-delivery
description: Use when preparing commits, validating diffs, reviewing done-ness, or gating phase progression in the helix-agent repo. Enforces atomic task-sized commits, roadmap-aligned delivery, test-before-commit discipline, commit message patterns already used in the project plan, and explicit acceptance checks before moving to the next day or stage.
---

# Helix Git Delivery

## When to Use

Use this skill when:

- staging or committing work
- checking whether a task is truly done
- deciding whether the next roadmap day can begin
- reviewing a diff for scope creep

Read [references/delivery-checklist.md](references/delivery-checklist.md) when you need the commit and acceptance sequence.

## Commit Rules

1. One small task or one day checkpoint per commit.
2. Do not mix unrelated docs, architecture, runtime, and UI changes into one commit unless the user asked for a coordinated change.
3. Prefer commit message shapes already demonstrated in the project plan:
   - `docs: ...`
   - `chore: ...`
   - `feat(scope): ...`
   - `test(scope): ...`
4. The message should state what changed, not the implementation story.
5. Do not commit before targeted validation is complete unless the user explicitly wants a draft or WIP checkpoint.

## Done-ness Rules

A task is not done just because code compiles. Before handoff or commit, check:

- the requested files are updated and no unrelated files drifted in
- validation was run at the right level
- acceptance criteria for the current day or phase are met
- README or related docs are updated if the change affects public usage or structure

## Validation Ladder

Use the smallest correct layer:

1. targeted unit tests for pure logic
2. integration tests for adapter boundaries
3. F5 development-host checks for extension wiring
4. `.vsix` install tests for packaging stages

Do not pretend lower-level checks replace higher-level ones when the feature clearly spans them.

## Roadmap Gate

Do not silently start the next roadmap day or phase when:

- the current day's acceptance items are incomplete
- the user explicitly said not to start the next day
- the needed directory or package belongs to a later phase

Instead, finish the current checkpoint or ask for scope approval.

## Handoff Format

At minimum, report:

- what changed
- what you intentionally did not touch
- what validation ran
- what still needs manual verification
