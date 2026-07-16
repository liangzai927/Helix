import * as vscode from 'vscode';

import { createSidebarHtml } from './webview-html';

/** 管理 Helix Sidebar Webview 的生命周期。 */
export class HelixSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'helix.chat';

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: false,
    };
    webviewView.webview.html = createSidebarHtml(webviewView.webview.cspSource);
  }
}
