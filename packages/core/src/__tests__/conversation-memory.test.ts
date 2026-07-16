import { describe, expect, it } from 'vitest';

import { InMemoryConversationMemory } from '../index';

describe('InMemoryConversationMemory', () => {
  it('appends and lists messages in insertion order', () => {
    const memory = new InMemoryConversationMemory<string>();
    memory.appendMessage('first');
    memory.appendMessage('second');

    const messages = memory.listMessages();

    expect(messages).toEqual(['first', 'second']);
    messages.push('external');
    expect(memory.listMessages()).toEqual(['first', 'second']);
  });

  it('returns only the most recent messages', () => {
    const memory = new InMemoryConversationMemory([1, 2, 3, 4]);

    expect(memory.getRecentMessages(2)).toEqual([3, 4]);
    expect(memory.getRecentMessages(0)).toEqual([]);
  });

  it('clears all messages', () => {
    const memory = new InMemoryConversationMemory(['message']);

    memory.clear();

    expect(memory.listMessages()).toEqual([]);
  });

  it('rejects an invalid recent message limit', () => {
    const memory = new InMemoryConversationMemory();

    expect(() => memory.getRecentMessages(-1)).toThrow(
      'limit 必须是大于等于 0 的整数',
    );
  });
});
