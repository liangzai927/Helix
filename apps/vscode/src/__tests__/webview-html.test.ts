import { describe, expect, it } from 'vitest';

import { createSidebarHtml } from '../webview-html';

describe('createSidebarHtml', () => {
  it('renders the React entry resources with a nonce CSP', () => {
    const html = createSidebarHtml({
      cspSource: 'vscode-webview://test',
      scriptUri: 'vscode-webview://test/webview.js',
      styleUri: 'vscode-webview://test/webview.css',
      nonce: 'nonce-value',
    });

    expect(html).toContain('Helix Agent');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-nonce-value'");
    expect(html).toContain('vscode-webview://test/webview.js');
    expect(html).toContain('vscode-webview://test/webview.css');
    expect(html).toContain('<div id="root"></div>');
  });
});
