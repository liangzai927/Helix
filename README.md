# Helix Agent

[中文](#中文) | [English](#english)

---

## 中文

### 项目简介

Helix Agent 是一个面向本地开发环境的 Agent Engine，目标是在 VS Code 中完成从代码理解、任务规划、补丁生成到受控命令执行的完整闭环。

当前仓库仍处于早期阶段，已经具备协议类型、模型接口和可独立运行的 Core Runtime 控制台 Demo，但还不是完整的 VS Code Agent 产品。

### 当前仓库包含

- 产品愿景文档
- MVP 范围定义
- pnpm monorepo 工作区
- Agent 协议与模型接口
- 使用 FakePlanner 和 FakeExecutor 的最小 Core Runtime

### 核心定位

- 在 VS Code 中运行的独立代码 Agent 产品
- 可读取工程、搜索代码、生成计划、输出补丁、执行受控命令的本地 Agent Engine
- 核心能力可复用于 CLI 和 Electron 的分层系统

### MVP 目标

MVP 版本聚焦一个最小但完整的开发闭环，让用户可以在 VS Code 内完成：

- 提问代码问题
- 浏览执行计划
- 生成补丁
- 审查改动
- 执行受控命令
- 获取结果摘要

### 设计原则

- 先探索，再规划，再执行
- 工具优先，而不是依赖失控的长 Prompt
- 所有高风险动作必须可见、可审查、可中断、可确认
- Agent Core 与 VS Code Adapter 解耦
- 优先关注上下文效率和长会话稳定性

### 当前目录结构

```text
.
├── apps/
│   ├── cli/
│   ├── desktop/
│   └── vscode/
├── docs/
│   ├── 00-项目愿景.md
│   └── 01-MVP范围.md
├── packages/
│   ├── core/
│   ├── models/
│   ├── protocol/
│   ├── prompts/
│   ├── sdk/
│   ├── shared/
│   ├── storage/
│   └── tools/
├── skills/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### 运行 Core Demo

环境要求：Node.js 24.x、pnpm 11.13.0+（11.x）。

```bash
pnpm install
pnpm --filter @helix-agent/core demo
```

控制台输出的完整事件流包含 `task.created`、`status.changed`、`plan.created` 和 `finished`。当前 Demo 只使用 FakePlanner 和 FakeExecutor，不执行真实模型请求、文件修改或终端命令，也不依赖 VS Code。

### 文档入口

- [项目愿景](docs/00-项目愿景.md)
- [MVP 范围](docs/01-MVP范围.md)

### 当前状态

- 仓库已初始化并已推送远端
- Core Runtime 已可通过控制台 Demo 独立运行
- Planner 和 Executor 当前仍为固定行为的 Fake 实现
- CLI、Desktop 和 VS Code 目前只有工作区脚手架，尚未接入 Core Runtime

---

## English

### Overview

Helix Agent is an agent engine for local development environments. Its goal is to deliver a full loop inside VS Code, from code understanding and task planning to patch generation and controlled command execution.

This repository is still in an early stage. It now includes protocol types, model interfaces, and a standalone Core Runtime console demo, but it is not yet a complete VS Code agent product.

### What Is In This Repository

- Product vision documents
- MVP scope definition
- A pnpm monorepo workspace
- Agent protocol and model interfaces
- A minimal Core Runtime using FakePlanner and FakeExecutor

### Core Positioning

- An independent coding agent product running inside VS Code
- A local agent engine that can read projects, search code, generate plans, produce patches, and execute controlled commands
- A layered system whose core capabilities can later be reused by CLI and Electron

### MVP Goal

The MVP focuses on a minimal but complete developer workflow inside VS Code. Users should be able to:

- ask code-related questions
- inspect execution plans
- generate patches
- review changes
- run controlled commands
- receive result summaries

### Design Principles

- Explore first, then plan, then execute
- Tools first, instead of relying on uncontrolled long prompts
- All high-risk actions must be visible, reviewable, interruptible, and confirmable
- Keep Agent Core decoupled from the VS Code adapter
- Prioritize context efficiency and long-session stability

### Current Repository Structure

```text
.
├── apps/
│   ├── cli/
│   ├── desktop/
│   └── vscode/
├── docs/
│   ├── 00-项目愿景.md
│   └── 01-MVP范围.md
├── packages/
│   ├── core/
│   ├── models/
│   ├── protocol/
│   ├── prompts/
│   ├── sdk/
│   ├── shared/
│   ├── storage/
│   └── tools/
├── skills/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Run The Core Demo

Requirements: Node.js 24.x and pnpm 11.13.0+ (11.x).

```bash
pnpm install
pnpm --filter @helix-agent/core demo
```

The console prints the complete event stream, including `task.created`, `status.changed`, `plan.created`, and `finished`. The demo currently uses only FakePlanner and FakeExecutor, performs no real model requests, file modifications, or terminal commands, and does not depend on VS Code.

### Documents

- [Project Vision](docs/00-项目愿景.md)
- [MVP Scope](docs/01-MVP范围.md)

### Current Status

- The repository has been initialized and pushed to the remote
- The Core Runtime can now run independently through the console demo
- Planner and Executor are still deterministic fake implementations
- CLI, Desktop, and VS Code currently remain workspace scaffolds and are not connected to the Core Runtime
