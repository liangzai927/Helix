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

  it('接受包含事件类型的 Agent 事件消息', () => {
    expect(
      isExtensionToWebviewMessage({
        type: 'agent.event',
        event: {
          type: 'finished',
          taskId: 'task-1',
          createdAt: '2026-07-16T00:00:00.000Z',
          status: 'finished',
        },
      }),
    ).toBe(true);
  });

  it('接受完整模型配置并拒绝未知 Provider', () => {
    expect(
      isWebviewToExtensionMessage({
        type: 'config.save',
        configuration: {
          provider: 'openai-compatible',
          baseUrl: 'https://api.example.com/v1',
          modelId: 'gpt-test',
        },
        apiKey: 'secret-key',
      }),
    ).toBe(true);
    expect(
      isWebviewToExtensionMessage({
        type: 'config.save',
        configuration: {
          provider: 'unknown',
          baseUrl: 'https://api.example.com/v1',
          modelId: 'gpt-test',
        },
      }),
    ).toBe(false);
  });

  it('只接受包含审批 ID 和布尔决定的审批消息', () => {
    expect(
      isWebviewToExtensionMessage({
        type: 'approval.resolve',
        approvalId: 'approval-1',
        approved: true,
      }),
    ).toBe(true);
    expect(
      isWebviewToExtensionMessage({
        type: 'approval.resolve',
        approvalId: '',
        approved: 'yes',
      }),
    ).toBe(false);
  });
});
