import { describe, expect, it } from 'vitest';

import { ModeSelector } from '../index';

describe('ModeSelector', () => {
  const selector = new ModeSelector();

  it.each(['先分析这个问题', '先给方案，不要写代码', '不要改，告诉我原因'])(
    'selects plan mode for explicit planning input: %s',
    (input) => {
      expect(selector.select(input)).toBe('plan');
    },
  );

  it.each([
    '修改 src/runtime.ts 和 src/planner.ts',
    '检查多个文件中的命名是否一致',
  ])('selects plan mode for multi-file input: %s', (input) => {
    expect(selector.select(input)).toBe('plan');
  });

  it('keeps a normal question in chat mode', () => {
    expect(selector.select('这个 Agent 使用什么框架？')).toBe('chat');
  });
});
