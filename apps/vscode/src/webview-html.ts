/** 生成不含脚本的 Sidebar 初始页面。 */
export function createSidebarHtml(cspSource: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline';" />
    <title>Helix Agent</title>
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; padding: 20px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
      .mark { width: 32px; height: 3px; margin-bottom: 18px; background: var(--vscode-textLink-foreground); }
      h1 { margin: 0 0 8px; font-size: 20px; letter-spacing: -0.02em; }
      p { margin: 0; color: var(--vscode-descriptionForeground); line-height: 1.6; }
      .status { margin-top: 20px; padding: 10px 12px; border-left: 2px solid var(--vscode-textLink-foreground); background: var(--vscode-sideBarSectionHeader-background); }
    </style>
  </head>
  <body>
    <div class="mark"></div>
    <h1>Helix Agent</h1>
    <p>Local coding agent for deliberate, reviewable changes.</p>
    <div class="status">Sidebar is ready.</div>
  </body>
</html>`;
}
