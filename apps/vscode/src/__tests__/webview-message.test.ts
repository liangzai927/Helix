import { describe, expect, it } from 'vitest';

import {
  isExtensionToWebviewMessage,
  isWebviewToExtensionMessage,
} from '../../shared/webview-message';

describe('Webview 消息协议', () => {
  it('接受有效的用户消息', () => {
    expect(
      isWebviewToExtensionMessage({
        type: 'user.message',
        content: '检查项目',
      }),
    ).toBe(true);
  });

  it('拒绝空用户消息和未知类型', () => {
    expect(
      isWebviewToExtensionMessage({ type: 'user.message', content: '   ' }),
    ).toBe(false);
    expect(
      isWebviewToExtensionMessage({ type: 'unknown', content: '检查项目' }),
    ).toBe(false);
  });

  it('只接受扩展端助手消息', () => {
    expect(
      isExtensionToWebviewMessage({
        type: 'assistant.message',
        content: '收到',
      }),
    ).toBe(true);
    expect(isExtensionToWebviewMessage(null)).toBe(false);
  });
});
