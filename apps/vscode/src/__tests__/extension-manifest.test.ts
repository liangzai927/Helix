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

  it('构建后通过官方工具生成无外部依赖的 VSIX', () => {
    expect(manifest.scripts['vscode:prepublish']).toBe(
      'pnpm build:production',
    );
    expect(manifest.scripts.vsix).toContain('vsce package --no-dependencies');
    expect(manifest.repository.url).toBe(
      'https://github.com/liangzai927/Helix.git',
    );
  });
});
