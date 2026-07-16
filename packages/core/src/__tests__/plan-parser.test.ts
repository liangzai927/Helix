import { describe, expect, it } from 'vitest';

import { PlanParser } from '../index';

describe('PlanParser', () => {
  it('parses the fixed planner sections into an AgentPlan', () => {
    const parser = new PlanParser();
    const plan = parser.parse(
      `## 问题理解
修复登录状态丢失问题

## 影响范围
- 登录流程
- 会话恢复

## 关键文件
- src/auth/session.ts
- src/login/index.ts

## 实施步骤
1. 搜索会话状态的写入位置
2. 读取登录流程实现
3. 修改会话恢复逻辑
4. 运行相关测试

## 风险点
- 可能影响已有登录态

## 是否需要用户确认
否`,
      {
        taskId: 'task_1',
        goal: '修复登录流程',
      },
    );

    expect(plan).toMatchObject({
      taskId: 'task_1',
      goal: '修复登录流程',
      findings: ['修复登录状态丢失问题', '登录流程', '会话恢复'],
      files: ['src/auth/session.ts', 'src/login/index.ts'],
      risks: ['可能影响已有登录态'],
      summary: expect.stringContaining('## 问题理解'),
    });
    expect(plan.steps.map((step) => [step.title, step.kind, step.status])).toEqual([
      ['搜索会话状态的写入位置', 'search', 'pending'],
      ['读取登录流程实现', 'read', 'pending'],
      ['修改会话恢复逻辑', 'edit', 'pending'],
      ['运行相关测试', 'command', 'pending'],
    ]);
  });

  it('falls back to a summary when the output is malformed', () => {
    const parser = new PlanParser();
    const plan = parser.parse('模型只返回了一段普通文本', {
      taskId: 'task_2',
      goal: '分析项目',
    });

    expect(plan).toMatchObject({
      taskId: 'task_2',
      goal: '分析项目',
      findings: [],
      steps: [],
      risks: [],
      files: [],
      summary: '模型只返回了一段普通文本',
    });
  });
});
