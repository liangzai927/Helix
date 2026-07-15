# Helix Agent MVP 范围 / MVP Scope

## 1. MVP 目标 / MVP Goal

### 中文

Helix Agent MVP 的目标不是做成一个大而全的平台，而是先完成一个可以安装、可以内测、可以验证真实开发价值的 VS Code Agent 最小闭环。

MVP 必须让用户在 VS Code 中完成以下事情：

- 提问代码问题
- 浏览计划
- 生成补丁
- 审查改动
- 执行受控命令
- 获取结果摘要

### English

The goal of the Helix Agent MVP is not to build a broad all-in-one platform, but to deliver a minimal VS Code agent loop that can be installed, tested internally, and validated against real development tasks.

The MVP must let users do the following inside VS Code:

- ask code-related questions
- inspect plans
- generate patches
- review changes
- execute controlled commands
- receive result summaries

## 2. MVP 必做能力 / In-Scope Capabilities

### 2.1 会话与交互 / Session and Interaction

- 中文：Sidebar Chat UI、基础多轮对话、流式输出、会话历史保存与恢复
- English: Sidebar chat UI, basic multi-turn conversation, streaming output, and session history persistence and restore

### 2.2 模型与配置 / Models and Configuration

- 中文：支持用户配置主模型与规划或摘要模型，支持 OpenAI Compatible Provider、Anthropic Compatible Provider，以及基础模型参数配置
- English: Support user-configured primary models and planner or summarizer models, OpenAI-compatible providers, Anthropic-compatible providers, and basic model parameter configuration

### 2.3 Agent Runtime / Agent Runtime

- 中文：Agent Runtime 最小闭环、Planner、Executor、Tool Registry、上下文构建与裁剪、工具输出压缩、计划结果缓存初版
- English: Minimal Agent Runtime loop, Planner, Executor, Tool Registry, context building and trimming, tool output compression, and an initial plan cache

### 2.4 只读工具 / Read-Only Tools

- `read_file`
- `search_text`
- `list_directory`
- `glob_files`
- `get_diagnostics`

### 2.5 副作用工具与审批 / Side-Effect Tools and Approval

- 中文：`apply_patch`、`run_terminal`、`approval`、diff preview
- English: `apply_patch`, `run_terminal`, approval flow, and diff preview

### 2.6 存储与发布 / Storage and Distribution

- 中文：敏感配置使用 SecretStorage，非敏感配置本地存储，支持 VSIX 打包
- English: Use SecretStorage for sensitive configuration, local storage for non-sensitive configuration, and support VSIX packaging

## 3. MVP 明确不做 / Explicitly Out of Scope

### 中文

第一版不做以下内容：

- 多 Agent 协作
- 插件市场
- 团队知识库
- 云同步
- JetBrains 插件
- Electron 桌面端正式交付
- 复杂长期记忆
- 向量数据库
- 浏览器自动化
- 无人值守长链路自动执行

### English

The first version will not include:

- multi-agent collaboration
- a plugin marketplace
- team knowledge sharing
- cloud sync
- a JetBrains plugin
- formal Electron desktop delivery
- complex long-term memory
- vector databases
- browser automation
- unattended long-running execution chains

## 4. MVP 架构边界 / Architectural Boundaries

### 中文

MVP 阶段必须明确以下边界：

- VS Code 是第一版客户端，不是唯一产品形态
- Agent Core 必须与 VS Code API 解耦
- 写文件与命令执行必须进入审批链路
- 复杂任务默认遵循先探索、后规划、再执行
- 不为了未来扩展提前引入复杂抽象

### English

The MVP must keep the following boundaries clear:

- VS Code is the first client, not the only product form
- Agent Core must be decoupled from the VS Code API
- file writes and command execution must go through approval
- complex tasks should default to explore first, then plan, then execute
- no complex abstraction should be introduced early for hypothetical future needs

## 5. MVP 验收结果 / Acceptance Outcomes

### 中文

如果 MVP 达标，应该可以验证以下结果：

- 用户能在 VS Code 内完成一个真实的小中型开发任务闭环
- Runtime 可以独立演进，不被 UI 实现绑定
- 模型、工具、审批、上下文的职责边界清晰
- 产品具备继续扩展到 CLI 和 Electron 的基础

### English

If the MVP is successful, it should validate the following outcomes:

- users can complete a real small-to-medium development task loop inside VS Code
- the Runtime can evolve independently without being tied to the UI implementation
- the boundaries between models, tools, approvals, and context are clear
- the product has a solid base for later CLI and Electron expansion
