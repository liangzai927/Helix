import { describe, expect, it } from 'vitest';

import manifest from '../../package.json';

describe('VS Code 扩展清单', () => {
  it('声明可执行入口和 Helix Sidebar', () => {
    expect(manifest.main).toBe('./dist/extension.js');
    expect(manifest.activationEvents).toContain('onView:helix.chat');
    expect(manifest.contributes.views['helix.sidebar']).toContainEqual({
      id: 'helix.chat',
      name: 'Helix',
      type: 'webview',
    });
  });

  it('使用稳定的扩展标识信息', () => {
    expect(manifest.name).toBe('helix-agent-vscode');
    expect(manifest.publisher).toBe('liangzai927');
    expect(manifest.engines.vscode).toBe('^1.100.0');
  });
});
