import { describe, expect, it } from 'vitest';

import type { AgentEvent, AgentPlan } from '@helix-agent/protocol';
import { ToolRegistry } from '@helix-agent/tools';

import { PlanExecutor } from '../index';

/** 收集命令执行事件，验证完整事件顺序。 */
async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

describe('PlanExecutor command workflow', () => {
  it('executes a low-risk command and emits command events', async () => {
    const toolRegistry = new ToolRegistry();
    toolRegistry.register({
      name: 'run_terminal',
      description: 'Run terminal command',
      inputSchema: { type: 'object' },
      readOnly: false,
      requiresApproval: true,
      requiresApprovalFor(input: { command: string }) {
        return input.command !== 'git status --short';
      },
      async execute() {
        return {
          exitCode: 0,
          stdout: '',
          stderr: '',
          summary: '命令执行成功',
        };
      },
    });
    const plan: AgentPlan = {
      id: 'plan_1',
      taskId: 'task_1',
      goal: '检查仓库状态',
      createdAt: '2026-07-16T09:00:00.000Z',
      findings: [],
      steps: [
        {
          id: 'step_1',
          title: '检查仓库状态',
          description: 'git status --short',
          kind: 'command',
          status: 'pending',
        },
      ],
      risks: [],
      files: [],
    };
    const executor = new PlanExecutor(toolRegistry);

    const events = await collectEvents(
      executor.execute(plan, { cwd: '/project' }),
    );

    expect(events.map((event) => event.type)).toEqual([
      'command.started',
      'tool.call.started',
      'tool.call.finished',
      'command.finished',
      'finished',
    ]);
    expect(events[0]).toMatchObject({
      type: 'command.started',
      command: { command: 'git status --short', cwd: '/project' },
    });
    expect(events[1]).toMatchObject({
      type: 'tool.call.started',
      toolCall: { toolName: 'run_terminal', requiresApproval: false },
    });
    expect(events[3]).toMatchObject({
      type: 'command.finished',
      command: {
        command: 'git status --short',
        cwd: '/project',
        exitCode: 0,
        summary: '命令执行成功',
      },
    });
  });
});
