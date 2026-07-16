interface VsCodeApi {
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

/** 获取 VS Code 注入的 Webview 通信对象。 */
export const vscode = acquireVsCodeApi();
