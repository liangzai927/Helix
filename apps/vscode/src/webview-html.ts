export interface SidebarHtmlOptions {
  cspSource: string;
  scriptUri: string;
  styleUri: string;
  nonce: string;
}

/** 生成只允许加载已声明本地资源的 React Webview 页面。 */
export function createSidebarHtml(options: SidebarHtmlOptions): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${options.cspSource}; script-src 'nonce-${options.nonce}';" />
    <link rel="stylesheet" href="${options.styleUri}" />
    <title>Helix Agent</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${options.nonce}" src="${options.scriptUri}"></script>
  </body>
</html>`;
}
