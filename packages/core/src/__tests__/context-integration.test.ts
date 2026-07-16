import { describe, expect, it } from 'vitest';

import type { Message, ToolResult } from '@helix-agent/protocol';

import {
  ContextBudget,
  DefaultContextBuilder,
  InMemoryConversationMemory,
} from '../index';

/** 创建用于上下文验收的连续历史消息。 */
function createHistory(index: number): Message {
  return {
    id: `message_${index}`,
    conversationId: 'conversation_1',
    role: index % 2 === 0 ? 'assistant' : 'user',
    content: `history ${index}`,
    createdAt: '2026-07-16T09:00:00.000Z',
  };
}

describe('ContextBuilder integration', () => {
  it('keeps recent messages, compressed tools and current input under budget', () => {
    const memory = new InMemoryConversationMemory<Message>();

    for (let index = 1; index <= 20; index += 1) {
      memory.appendMessage(createHistory(index));
    }

    const toolResult: ToolResult = {
      id: 'result_1',
      taskId: 'task_1',
      toolCallId: 'call_1',
      toolName: 'read_file',
      createdAt: '2026-07-16T09:00:00.000Z',
      status: 'success',
      summary: '已读取大型文件',
      output: {
        path: 'src/large.ts',
        content: 'RAW_OUTPUT_MUST_NOT_SURVIVE'.repeat(10_000),
        lineCount: 10_000,
        truncated: false,
      },
    };
    const budget = new ContextBudget(75);
    const builder = new DefaultContextBuilder({ contextBudget: budget });

    const request = builder.build({
      userInput: '当前用户输入不能丢失',
      conversation: memory.listMessages(),
      toolResults: [toolResult],
    });
    const serialized = JSON.stringify(request);

    expect(request.messages.at(-1)).toEqual({
      role: 'user',
      content: '当前用户输入不能丢失',
    });
    expect(request.messages.some((message) => message.content === 'history 20')).toBe(true);
    expect(request.messages.some((message) => message.content === 'history 14')).toBe(false);
    expect(request.messages.some((message) => message.content.includes('已读取大型文件'))).toBe(
      true,
    );
    expect(serialized).toContain('src/large.ts');
    expect(serialized).not.toContain('RAW_OUTPUT_MUST_NOT_SURVIVE');
    expect(budget.estimate(request.messages)).toBeLessThanOrEqual(75);
  });
});
