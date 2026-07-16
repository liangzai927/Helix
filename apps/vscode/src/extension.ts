import * as vscode from 'vscode';
import { AgentRuntime } from '@helix-agent/core';

import { HelixSidebarProvider } from './sidebar-provider';
import { ModelConfigStore } from './model-config-store';

/** 激活 Helix Agent Extension 并注册基础命令。 */
export function activate(context: vscode.ExtensionContext): void {
  const helloCommand = vscode.commands.registerCommand('helix.hello', async () => {
    await vscode.window.showInformationMessage('Helix Agent is running.');
  });
  const sidebarProvider = vscode.window.registerWebviewViewProvider(
    HelixSidebarProvider.viewType,
    new HelixSidebarProvider(
      context.extensionUri,
      new AgentRuntime(),
      new ModelConfigStore(context.secrets, context.globalState),
    ),
  );

  context.subscriptions.push(helloCommand, sidebarProvider);
}

/** 当前没有需要显式释放的全局资源。 */
export function deactivate(): void {}
