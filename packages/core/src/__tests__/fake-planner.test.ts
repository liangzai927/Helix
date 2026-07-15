import { describe, expect, it } from 'vitest';

import { FakePlanner } from '../index';

describe('FakePlanner', () => {
  it('returns a fixed plan structure for the given task', () => {
    const planner = new FakePlanner();
    const plan = planner.createPlan(
      {
        input: '修复 planner 抽象',
        taskId: 'task_1',
        conversationId: 'conversation_1',
      },
      {},
    );

    expect(plan.taskId).toBe('task_1');
    expect(plan.goal).toBe('修复 planner 抽象');
    expect(plan.findings).toEqual(['当前使用内置 FakePlanner，尚未接入真实模型规划']);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toMatchObject({
      title: '分析用户输入',
      kind: 'read',
      status: 'completed',
    });
    expect(plan.steps[1]).toMatchObject({
      title: '生成最小执行计划',
      kind: 'other',
      status: 'pending',
    });
    expect(plan.summary).toBe('已为任务生成最小计划：修复 planner 抽象');
  });

  it('truncates long task titles inside the generated summary', () => {
    const planner = new FakePlanner();
    const plan = planner.createPlan(
      {
        input: '这是一个超过二十四个字符的任务标题用于验证会被截断',
        taskId: 'task_1',
      },
      {},
    );

    expect(plan.summary).toBe('已为任务生成最小计划：这是一个超过二十四个字符的任务标题用于验证会被截...');
  });
});
