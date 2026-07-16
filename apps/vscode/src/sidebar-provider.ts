import { randomBytes } from 'node:crypto';

import * as vscode from 'vscode';

import {
  isWebviewToExtensionMessage,
  type ExtensionToWebviewMessage,
} from '../shared/webview-message';
import { ModelConfigStore } from './model-config-store';
import type { AgentRuntimePort } from './run-agent-task';
import { runAgentTask } from './run-agent-task';
import { createSidebarHtml } from './webview-html';

/** 管理 Helix Sidebar Webview 的生命周期。 */
export class HelixSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'helix.chat';

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly runtime: AgentRuntimePort,
    private readonly modelConfigStore: ModelConfigStore,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    const webview = webviewView.webview;
    const resourceRoot = vscode.Uri.joinPath(this.extensionUri, 'dist');

    webview.options = {
      enableScripts: true,
      localResourceRoots: [resourceRoot],
    };
    webview.html = createSidebarHtml({
      cspSource: webview.cspSource,
      scriptUri: webview.asWebviewUri(
        vscode.Uri.joinPath(resourceRoot, 'webview.js'),
      ).toString(),
      styleUri: webview.asWebviewUri(
        vscode.Uri.joinPath(resourceRoot, 'webview.css'),
      ).toString(),
      nonce: randomBytes(16).toString('base64'),
    });

    const messageSubscription = webview.onDidReceiveMessage(
      async (message: unknown) => {
        if (!isWebviewToExtensionMessage(message)) {
          return;
        }

        if (message.type === 'config.get') {
          const stored = await this.modelConfigStore.load();
          await webview.postMessage({ type: 'config.value', ...stored });
          return;
        }

        if (message.type === 'config.save') {
          const stored = await this.modelConfigStore.save(
            message.configuration,
            message.apiKey,
          );
          await webview.postMessage({ type: 'config.saved', ...stored });
          return;
        }

        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        await runAgentTask(
          this.runtime,
          message.content,
          async (event) => {
            const response: ExtensionToWebviewMessage = {
              type: 'agent.event',
              event,
            };
            await webview.postMessage(response);
          },
          cwd,
        );
      },
    );
    webviewView.onDidDispose(() => messageSubscription.dispose());
  }
}
