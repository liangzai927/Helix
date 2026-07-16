import { describe, expect, it } from 'vitest';

import { createSidebarHtml } from '../webview-html';

describe('createSidebarHtml', () => {
  it('renders a script-free Helix sidebar with a CSP', () => {
    const html = createSidebarHtml('vscode-webview://test');

    expect(html).toContain('Helix Agent');
    expect(html).toContain('Sidebar is ready.');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('vscode-webview://test');
    expect(html).not.toContain('<script');
  });
});
