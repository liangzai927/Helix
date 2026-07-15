import { describe, expect, it } from 'vitest';

import type { AgentEvent, AgentPlan } from '@helix-agent/protocol';

import {
  AgentRuntime,
  type Executor,
  type ExecutorContext,
  type Planner,
} from '../index';

async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

describe('AgentRuntime', () => {
  it('emits the minimum runtime event flow in order', async () => {
    let sequence = 0;
    const runtime = new AgentRuntime({
      idGenerator: {
        next(prefix?: string) {
          sequence += 1;
          return `${prefix ?? 'id'}_${sequence}`;
        },
      },
      clock: {
        now() {
          return Date.UTC(2026, 6, 15, 9, 0, sequence, 0);
        },
      },
    });

    const events = await collectEvents(runtime.run('修复 runtime 事件流'));

    expect(events.map((event) => event.type)).toEqual([
      'task.created',
      'status.changed',
      'status.changed',
      'plan.created',
      'status.changed',
      'finished',
    ]);

    expect(events[0]).toMatchObject({
      type: 'task.created',
      taskId: 'task_1',
      task: {
        id: 'task_1',
        conversationId: 'conversation_2',
        input: '修复 runtime 事件流',
        mode: 'chat',
        status: 'idle',
        title: '修复 runtime 事件流',
      },
    });

    expect(events[1]).toMatchObject({
      type: 'status.changed',
      taskId: 'task_1',
      status: 'creating_task',
      message: '正在创建任务',
    });

    expect(events[2]).toMatchObject({
      type: 'status.changed',
      taskId: 'task_1',
      status: 'planning',
      message: '正在生成计划',
    });

    expect(events[3]).toMatchObject({
      type: 'plan.created',
      taskId: 'task_1',
      plan: {
        taskId: 'task_1',
        goal: '修复 runtime 事件流',
        summary: '已为任务生成最小计划：修复 runtime 事件流',
      },
    });

    expect(events[4]).toMatchObject({
      type: 'status.changed',
      taskId: 'task_1',
      status: 'finished',
      message: '任务执行完成',
    });

    expect(events[5]).toMatchObject({
      type: 'finished',
      taskId: 'task_1',
      status: 'finished',
      summary: '已为任务生成最小计划：修复 runtime 事件流',
    });
  });

  it('uses injected planner and executor dependencies when provided', async () => {
    const customPlan: AgentPlan = {
      id: 'plan_custom',
      taskId: 'task_1',
      goal: '自定义计划目标',
      createdAt: '2026-07-15T09:00:00.000Z',
      findings: ['来自注入 planner'],
      steps: [],
      risks: [],
      files: [],
      summary: 'planner override',
    };

    const planner: Planner = {
      createPlan() {
        return customPlan;
      },
    };
    let executedPlan: AgentPlan | undefined;
    const executor: Executor<AgentPlan, ExecutorContext, AgentEvent> = {
      async *execute(plan) {
        executedPlan = plan;

        yield {
          type: 'finished',
          taskId: plan.taskId,
          createdAt: '2026-07-15T09:00:00.000Z',
          status: 'finished',
          summary: 'executor override',
        };
      },
    };

    const runtime = new AgentRuntime({
      idGenerator: {
        next(prefix?: string) {
          return prefix === 'task' ? 'task_1' : `${prefix ?? 'id'}_1`;
        },
      },
      clock: {
        now() {
          return Date.UTC(2026, 6, 15, 9, 0, 0, 0);
        },
      },
      planner,
      executor,
    });

    const events = await collectEvents(runtime.run('生成自定义计划'));
    const planEvent = events.find((event) => event.type === 'plan.created');

    expect(planEvent).toEqual({
      type: 'plan.created',
      taskId: 'task_1',
      createdAt: '2026-07-15T09:00:00.000Z',
      plan: customPlan,
    });

    expect(executedPlan).toBe(customPlan);
    expect(events.at(-1)).toEqual({
      type: 'finished',
      taskId: 'task_1',
      createdAt: '2026-07-15T09:00:00.000Z',
      status: 'finished',
      summary: 'executor override',
    });
  });
});
