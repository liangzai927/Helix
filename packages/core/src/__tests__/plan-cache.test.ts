import { describe, expect, it } from 'vitest';

import type { AgentEvent, AgentPlan } from '@helix-agent/protocol';

import { AgentRuntime, PlanCache, createPlanCacheKey, type Planner } from '../index';

/** 收集 Runtime 事件，方便读取计划事件。 */
async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

describe('PlanCache', () => {
  it('sets, gets and clears plans by a normalized user input key', () => {
    const cache = new PlanCache();
    const plan: AgentPlan = {
      id: 'plan_1',
      taskId: 'task_1',
      goal: '修复登录问题',
      createdAt: '2026-07-16T09:00:00.000Z',
      findings: [],
      steps: [],
      risks: [],
      files: [],
    };
    const key = createPlanCacheKey('  Fix   Login  ');

    cache.set(key, plan);

    expect(key).toBe('fix login');
    expect(cache.get(createPlanCacheKey('fix login'))).toBe(plan);

    cache.clear();

    expect(cache.get(key)).toBeUndefined();
  });

  it('lets Runtime reuse a plan without retaining the previous task id', async () => {
    let plannerCalls = 0;
    let idSequence = 0;
    const planner: Planner = {
      createPlan(task) {
        plannerCalls += 1;

        return {
          id: 'plan_cached',
          taskId: task.taskId ?? 'task_missing',
          goal: task.input,
          createdAt: '2026-07-16T09:00:00.000Z',
          findings: [],
          steps: [],
          risks: [],
          files: [],
        } satisfies AgentPlan;
      },
    };
    const runtime = new AgentRuntime({
      planner,
      idGenerator: {
        next(prefix?: string) {
          idSequence += 1;
          return `${prefix ?? 'id'}_${idSequence}`;
        },
      },
    });

    const firstEvents = await collectEvents(runtime.run('修复登录问题'));
    const secondEvents = await collectEvents(runtime.run('  修复登录问题  '));
    const firstPlan = firstEvents.find((event) => event.type === 'plan.created');
    const secondPlan = secondEvents.find((event) => event.type === 'plan.created');

    expect(plannerCalls).toBe(1);
    expect(firstPlan).toMatchObject({
      type: 'plan.created',
      taskId: 'task_1',
      plan: { id: 'plan_cached', taskId: 'task_1' },
    });
    expect(secondPlan).toMatchObject({
      type: 'plan.created',
      taskId: 'task_3',
      plan: { id: 'plan_cached', taskId: 'task_3' },
    });
  });
});
