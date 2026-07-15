# Helix Delivery Checklist

## Preferred Commit Rhythm

The project guidance repeatedly assumes:

```text
小任务 -> 实现 -> review -> 测试 -> commit
```

Keep the commit boundary aligned with that rhythm.

## Commit Message Examples Already Used By The Project Plan

- `docs: define helix vision and mvp scope`
- `chore: initialize monorepo workspace`
- `docs: add system architecture`
- `feat(protocol): add core agent types`
- `test(protocol): add protocol type tests`

Use the same style unless the user asks for another convention.

## Day and Phase Gate

Before moving forward, confirm:

- current acceptance items are actually met
- relevant tests passed
- docs are updated when structure or usage changed
- no future-phase code was pulled in just because it felt convenient

## Packaging-stage Checks

When the project reaches release-facing work, the expected checks include:

- `F5` development-host validation
- unit tests for pure logic
- integration tests for VS Code boundaries
- `.vsix` package and clean-profile install testing
- README, CHANGELOG, LICENSE, icon, and screenshot completeness
