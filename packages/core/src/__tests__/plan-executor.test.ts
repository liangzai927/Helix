import { describe, expect, it } from 'vitest';

import type { AgentEvent, AgentPlan } from '@helix-agent/protocol';
import { ToolRegistry } from '@helix-agent/tools';

import { PlanExecutor } from '../index';

/** 收集执行器事件，便于验证异步事件顺序。 */
async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

describe('PlanExecutor', () => {
  it('executes read and search tools in order and waits for write steps', async () => {
    const executionOrder: string[] = [];
    const toolRegistry = new ToolRegistry();
    toolRegistry.register({
      name: 'read_file',
      description: 'Read file',
      inputSchema: { type: 'object' },
      readOnly: true,
      requiresApproval: false,
      async execute(input: { path: string }) {
        executionOrder.push(`read:${input.path}`);
        return { content: 'const value = 1;' };
      },
    });
    toolRegistry.register({
      name: 'search_text',
      description: 'Search text',
      inputSchema: { type: 'object' },
      readOnly: true,
      requiresApproval: false,
      async execute(input: { query: string; cwd?: string }) {
        executionOrder.push(`search:${input.query}:${input.cwd ?? ''}`);
        return { matches: [] };
      },
    });
    const plan: AgentPlan = {
      id: 'plan_1',
      taskId: 'task_1',
      goal: '执行计划',
      createdAt: '2026-07-16T09:00:00.000Z',
      findings: [],
      steps: [
        {
          id: 'step_1',
          title: '读取入口文件',
          kind: 'read',
          status: 'pending',
          filePaths: ['src/index.ts'],
        },
        {
          id: 'step_2',
          title: '搜索运行时',
          description: 'AgentRuntime',
          kind: 'search',
          status: 'pending',
        },
        {
          id: 'step_3',
          title: '修改运行时',
          kind: 'edit',
          status: 'pending',
        },
        {
          id: 'step_4',
          title: '运行测试',
          kind: 'command',
          status: 'pending',
        },
      ],
      risks: [],
      files: [],
      summary: '计划执行完成',
    };
    const executor = new PlanExecutor(toolRegistry, {
      now() {
        return Date.UTC(2026, 6, 16, 9, 30, 0, 0);
      },
    });

    const events = await collectEvents(executor.execute(plan, { cwd: '/project' }));

    expect(executionOrder).toEqual([
      'read:/project/src/index.ts',
      'search:AgentRuntime:/project',
    ]);
    expect(events.map((event) => event.type)).toEqual([
      'tool.call.started',
      'tool.call.finished',
      'tool.call.started',
      'tool.call.finished',
      'status.changed',
      'status.changed',
    ]);
    expect(events[4]).toMatchObject({
      type: 'status.changed',
      status: 'waiting_approval',
      message: '步骤“修改运行时”等待执行能力',
    });
    expect(events[5]).toMatchObject({
      type: 'status.changed',
      status: 'waiting_approval',
      message: '步骤“运行测试”等待执行能力',
    });
  });

  it('rejects a read step without a file path', async () => {
    const executor = new PlanExecutor(new ToolRegistry());
    const plan: AgentPlan = {
      id: 'plan_2',
      taskId: 'task_2',
      goal: '读取文件',
      createdAt: '2026-07-16T09:00:00.000Z',
      findings: [],
      steps: [
        {
          id: 'step_1',
          title: '读取文件',
          kind: 'read',
          status: 'pending',
        },
      ],
      risks: [],
      files: [],
    };

    await expect(collectEvents(executor.execute(plan, {}))).rejects.toThrow(
      '读取步骤“读取文件”缺少文件路径',
    );
  });
});
