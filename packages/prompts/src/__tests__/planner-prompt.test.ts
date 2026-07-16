import { describe, expect, it } from 'vitest';

import { buildPlannerPrompt } from '../index';

describe('buildPlannerPrompt', () => {
  it('builds the stable planner structure in the required order', () => {
    expect(buildPlannerPrompt('修复登录失败问题')).toBe(`你是 Helix Agent 的规划器。
请基于用户任务和已提供的工程上下文生成计划。
输出必须严格保留以下标题及顺序：

## 问题理解
## 影响范围
## 关键文件
## 实施步骤
## 风险点
## 是否需要用户确认

用户任务：
修复登录失败问题`);
  });

  it('keeps the prefix stable when the user input changes', () => {
    const first = buildPlannerPrompt('task one');
    const second = buildPlannerPrompt('task two');

    expect(first.slice(0, -'task one'.length)).toBe(
      second.slice(0, -'task two'.length),
    );
  });
});
