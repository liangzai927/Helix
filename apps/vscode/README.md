# Helix Agent for VS Code

[中文](#中文) | [English](#english)

## 中文

Helix Agent 的 VS Code 客户端提供 Sidebar 消息输入、Core Runtime 事件展示、补丁 Diff Preview、审批卡片和默认模型配置。

### 本地安装

```bash
pnpm --filter helix-agent-vscode vsix
code --install-extension apps/vscode/dist/helix-agent-vscode.vsix
```

安装后重新加载 VS Code，点击 Activity Bar 中的 Helix 图标打开 Sidebar。

API Key 使用 VS Code SecretStorage 保存，不会写入扩展日志或非敏感配置存储。

## English

The Helix Agent VS Code client provides Sidebar input, Core Runtime events, patch Diff Preview, approval cards, and default model configuration.

### Local Installation

```bash
pnpm --filter helix-agent-vscode vsix
code --install-extension apps/vscode/dist/helix-agent-vscode.vsix
```

Reload VS Code after installation, then select the Helix icon in the Activity Bar to open the Sidebar.

API keys are stored through VS Code SecretStorage and are never written to extension logs or non-sensitive configuration storage.
