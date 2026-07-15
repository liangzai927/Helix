# Helix Agent

[中文](#中文) | [English](#english)

---

## 中文

### 项目简介

Helix Agent 是一个面向本地开发环境的 Agent Engine，目标是在 VS Code 中完成从代码理解、任务规划、补丁生成到受控命令执行的完整闭环。

当前仓库还处于早期阶段，现有内容以产品愿景、MVP 范围和工作区脚手架为主，还不是一个已经完成开发的可运行应用。

### 当前仓库包含

- 产品愿景文档
- MVP 范围定义
- 基础 pnpm workspace 脚手架

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
├── docs/
│   ├── 00-项目愿景.md
│   └── 01-MVP范围.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### 规划中的工作区结构

`pnpm-workspace.yaml` 已预留：

```text
apps/*
packages/*
```

这表示项目后续预期会按 monorepo 方式拆分应用层和共享包，但当前仓库里这两个目录还未落地。

### 文档入口

- [项目愿景](/Users/liuwenliang/lwl/helix-agent/docs/00-项目愿景.md)
- [MVP 范围](/Users/liuwenliang/lwl/helix-agent/docs/01-MVP范围.md)

### 当前状态

- 仓库已初始化并已推送远端
- 现阶段主要用于沉淀产品定义和架构边界
- 下一步通常是补齐 `apps/` 与 `packages/` 下的实际代码结构

---

## English

### Overview

Helix Agent is an agent engine for local development environments. Its goal is to deliver a full loop inside VS Code, from code understanding and task planning to patch generation and controlled command execution.

This repository is still in an early stage. At the moment, it mainly contains product vision documents, MVP scope definition, and workspace scaffolding. It is not yet a finished runnable application.

### What Is In This Repository

- Product vision documents
- MVP scope definition
- Basic pnpm workspace scaffolding

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
├── docs/
│   ├── 00-项目愿景.md
│   └── 01-MVP范围.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Planned Workspace Layout

The existing `pnpm-workspace.yaml` already reserves:

```text
apps/*
packages/*
```

This suggests a future monorepo split between applications and shared packages, although those directories are not implemented in the repository yet.

### Documents

- [Project Vision](/Users/liuwenliang/lwl/helix-agent/docs/00-项目愿景.md)
- [MVP Scope](/Users/liuwenliang/lwl/helix-agent/docs/01-MVP范围.md)

### Current Status

- The repository has been initialized and pushed to the remote
- The current phase is focused on product definition and architectural boundaries
- The next practical step is usually to create the real code structure under `apps/` and `packages/`
