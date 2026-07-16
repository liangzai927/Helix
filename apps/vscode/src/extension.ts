import * as vscode from 'vscode';

/** 激活 Helix Agent Extension 并注册基础命令。 */
export function activate(context: vscode.ExtensionContext): void {
  const helloCommand = vscode.commands.registerCommand('helix.hello', async () => {
    await vscode.window.showInformationMessage('Helix Agent is running.');
  });

  context.subscriptions.push(helloCommand);
}

/** 当前没有需要显式释放的全局资源。 */
export function deactivate(): void {}
