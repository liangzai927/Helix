import { describe, expect, it } from 'vitest';

import type { ModelMessage } from '@helix-agent/models';

import { ContextBudget } from '../index';

describe('ContextBudget', () => {
  it('estimates context size by message content characters', () => {
    const budget = new ContextBudget(100);

    expect(
      budget.estimate([
        { role: 'user', content: '12345' },
        { role: 'assistant', content: '678' },
      ]),
    ).toBe(8);
  });

  it('removes oldest messages until the context fits', () => {
    const budget = new ContextBudget(12);
    const messages: ModelMessage[] = [
      { role: 'user', content: 'oldest' },
      { role: 'assistant', content: 'recent' },
      { role: 'user', content: 'current' },
    ];

    expect(budget.trim(messages)).toEqual([
      { role: 'user', content: 'current' },
    ]);
  });

  it('keeps the current user input even when it exceeds the budget', () => {
    const budget = new ContextBudget(5);
    const current = { role: 'user', content: 'current input is longer' } as const;

    expect(
      budget.trim([
        { role: 'assistant', content: 'old' },
        current,
      ]),
    ).toEqual([current]);
  });
});
