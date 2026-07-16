import { describe, expect, it } from 'vitest';

import type { AgentPlan, Message, ToolResult } from '@helix-agent/protocol';

import { DefaultContextBuilder } from '../index';

/** 创建稳定的历史消息，避免测试重复协议字段。 */
function createMessage(index: number): Message {
  return {
    id: `message_${index}`,
    conversationId: 'conversation_1',
    role: index % 2 === 0 ? 'assistant' : 'user',
    content: `history ${index}`,
    createdAt: '2026-07-16T09:00:00.000Z',
  };
}

describe('DefaultContextBuilder', () => {
  it('builds model messages from recent conversation and summaries', () => {
    const conversation = Array.from({ length: 8 }, (_, index) =>
      createMessage(index + 1),
    );
    const toolResults: ToolResult[] = [
      {
        id: 'result_1',
        taskId: 'task_1',
        toolCallId: 'call_1',
        toolName: 'read_file',
        createdAt: '2026-07-16T09:00:00.000Z',
        status: 'success',
        summary: '已读取入口文件',
        output: { content: 'raw content must not enter context' },
      },
    ];
    const planCache: AgentPlan = {
      id: 'plan_1',
      taskId: 'task_1',
      goal: '修复入口文件',
      createdAt: '2026-07-16T09:00:00.000Z',
      findings: [],
      steps: [],
      risks: [],
      files: [],
      summary: '先读取入口，再进行修复',
    };
    const builder = new DefaultContextBuilder();

    const request = builder.build({
      userInput: '继续处理当前问题',
      conversation,
      toolResults,
      planCache,
    });

    expect(request.messages.map((message) => message.content)).toEqual([
      '缓存计划：先读取入口，再进行修复',
      'history 3',
      'history 4',
      'history 5',
      'history 6',
      'history 7',
      'history 8',
      '已读取入口文件',
      '继续处理当前问题',
    ]);
    expect(request.messages[7]).toMatchObject({
      role: 'tool',
      name: 'read_file',
      toolCallId: 'call_1',
    });
    expect(JSON.stringify(request)).not.toContain('raw content must not enter context');
  });
});
