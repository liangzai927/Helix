# Helix Task Framing Patterns

Use these patterns when the request is broad and needs to be narrowed before coding.

## New Feature

Ask or restate the task in this shape:

```text
只实现 <file-or-module> 中的 <behavior>。
开始前先阅读 <related-files>，给出实现计划。
不要修改其他文件。
```

## Bug Fix

Prefer this sequence:

```text
1. 分析根因
2. 指出涉及文件
3. 只做最小修改
4. 不要重构无关代码
5. 修改后给出验证命令
```

## Multi-file Change

If more than 3 files are likely involved, force a plan-first pass:

```text
先不要改代码。请先阅读相关目录并给出文件修改计划，
列出每个文件的职责、风险点和验证方式。
```

## Mandatory Review Pass

After implementation, run a focused self-review against:

1. Core and VS Code decoupling
2. `any` usage
3. missing tests
4. over-design
5. security or approval regressions
6. tool output pollution or unstable prompt structure
