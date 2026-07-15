---
name: helix-architecture-guard
description: Use when adding packages, moving responsibilities across layers, designing Runtime or Tool abstractions, or reviewing architecture decisions in the helix-agent repo. Enforces Core and VS Code boundaries, planning-versus-execution separation, tool and approval rules, context efficiency constraints, and MVP scope control.
---

# Helix Architecture Guard

## When to Use

Use this skill whenever the task touches:

- `apps/` versus `packages/` boundaries
- Runtime, Planner, Executor, Tool Registry, or Model Adapter design
- VS Code integration points
- approval, patch, terminal, or context systems
- any new package, shared abstraction, or cross-layer dependency

Read [references/architecture-rules.md](references/architecture-rules.md) before changing package boundaries or introducing new interfaces.

## Hard Boundaries

### Core

`packages/core` may depend on:

- protocol
- shared
- model interfaces
- tool interfaces
- storage interfaces

`packages/core` must not depend on:

- `vscode`
- `electron`
- `react`
- DOM APIs
- Node-specific concrete implementations when an interface boundary is expected

Core should depend on abstractions and injected ports.

### VS Code Adapter

`apps/vscode` owns:

- Sidebar UI
- Webview messaging
- SecretStorage integration
- WorkspaceEdit and diff preview
- Terminal integration
- diagnostics and editor context

`apps/vscode` must not become the place for:

- planning logic
- executor logic
- context building
- prompt assembly
- model routing strategy
- tool scheduling

## Runtime and Tooling Rules

1. Complex tasks should separate exploration, planning, and execution.
2. Planning mode is read-only. It must exclude `apply_patch`, `run_terminal`, and other write tools.
3. Read-only tools may be parallelized. Side-effect tools must be serialized and approval-aware.
4. Tool outputs should support both summary and raw forms; raw output must not flood long-session context by default.
5. Request structure should stay stable enough to protect cache hits: fixed prompt skeleton, fixed tool ordering, and reusable plan artifacts.

## MVP Scope Control

Do not introduce these into MVP unless the user explicitly changes scope:

- multi-agent collaboration
- plugin or MCP marketplace work
- team memory systems
- cloud sync
- Electron production delivery
- JetBrains support
- browser automation
- complex long-term memory
- vector databases
- unattended long-running execution chains

## Architecture Review Questions

Before accepting a design, check:

- Can Core still run without VS Code
- Is the layer split clearer after this change, not blurrier
- Is a new abstraction solving today's problem, not a hypothetical future one
- Does the change preserve approval and audit visibility for risky actions
- Does it improve or at least not harm context efficiency

## Stop and Escalate

Stop and ask the user when:

- the requested design would move business logic into `apps/vscode`
- a Core change needs direct `vscode` imports
- a feature depends on an out-of-scope product surface
- the user request conflicts with the PRD or checklist boundaries
