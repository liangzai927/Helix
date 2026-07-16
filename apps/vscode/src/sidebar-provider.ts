import { randomBytes } from 'node:crypto';

import * as vscode from 'vscode';

import { createSidebarHtml } from './webview-html';

/** 管理 Helix Sidebar Webview 的生命周期。 */
export class HelixSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'helix.chat';

  public constructor(private readonly extensionUri: vscode.Uri) {}

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
  }
}
