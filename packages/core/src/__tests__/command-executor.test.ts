import { describe, expect, it } from 'vitest';

import type { AgentEvent, AgentPlan } from '@helix-agent/protocol';
import { ToolRegistry } from '@helix-agent/tools';

import { ApprovalManager, PlanExecutor } from '../index';

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

  it('等待中风险命令审批并在批准后继续执行', async () => {
    const toolRegistry = new ToolRegistry();
    const approvalManager = new ApprovalManager({
      idGenerator: { next: () => 'approval-1' },
    });
    toolRegistry.register({
      name: 'run_terminal',
      description: 'Run terminal command',
      inputSchema: { type: 'object' },
      readOnly: false,
      requiresApproval: true,
      requiresApprovalFor: () => true,
      async execute() {
        return { exitCode: 0, stdout: '', stderr: '', summary: '命令执行成功' };
      },
    });
    const plan: AgentPlan = {
      id: 'plan-1',
      taskId: 'task-1',
      goal: '运行测试',
      createdAt: '2026-07-16T09:00:00.000Z',
      findings: [],
      steps: [
        {
          id: 'step-1',
          title: '执行命令：pnpm test',
          description: 'pnpm test',
          kind: 'command',
          status: 'pending',
        },
      ],
      risks: [],
      files: [],
    };
    const executor = new PlanExecutor(toolRegistry, undefined, {
      approvalManager,
      patchGenerator: { generatePatch: () => { throw new Error('不应生成补丁'); } },
    });
    const collecting = collectEvents(executor.execute(plan, { cwd: '/project' }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    approvalManager.approve('approval-1');

    const events = await collecting;

    expect(events.map((event) => event.type)).toEqual([
      'approval.requested',
      'approval.resolved',
      'command.started',
      'tool.call.started',
      'tool.call.finished',
      'command.finished',
      'finished',
    ]);
  });
});
