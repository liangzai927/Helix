import { describe, expect, it } from 'vitest';

import type { AgentPlan } from '@helix-agent/protocol';

import { FakeExecutor } from '../index';

describe('FakeExecutor', () => {
  it('emits only a finished event for the given plan', async () => {
    const plan: AgentPlan = {
      id: 'plan_1',
      taskId: 'task_1',
      goal: '验证 executor 事件流',
      createdAt: '2026-07-15T09:00:00.000Z',
      findings: [],
      steps: [],
      risks: [],
      files: [],
      summary: '执行完成',
    };
    const executor = new FakeExecutor({
      now() {
        return Date.UTC(2026, 6, 15, 9, 30, 0, 0);
      },
    });
    const events = [];

    for await (const event of executor.execute(plan, {})) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: 'finished',
        taskId: 'task_1',
        createdAt: '2026-07-15T09:30:00.000Z',
        status: 'finished',
        summary: '执行完成',
      },
    ]);
  });
});
