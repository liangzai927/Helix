import type { AgentEvent } from '@helix-agent/protocol';
import { describe, expect, it } from 'vitest';

import { runAgentTask, type AgentRuntimePort } from '../run-agent-task';

describe('runAgentTask', () => {
  it('按顺序转发 Runtime 事件并传入工作目录', async () => {
    const events: AgentEvent[] = [
      {
        type: 'status.changed',
        taskId: 'task-1',
        createdAt: '2026-07-16T00:00:00.000Z',
        status: 'planning',
      },
      {
        type: 'finished',
        taskId: 'task-1',
        createdAt: '2026-07-16T00:00:01.000Z',
        status: 'finished',
      },
    ];
    let receivedOptions: unknown;
    const runtime: AgentRuntimePort = {
      async *run(_input, options) {
        receivedOptions = options;
        yield* events;
      },
    };
    const received: AgentEvent[] = [];

    await runAgentTask(runtime, '检查项目', (event) => received.push(event), '/workspace');

    expect(received).toEqual(events);
    expect(receivedOptions).toEqual({ cwd: '/workspace' });
  });
});
