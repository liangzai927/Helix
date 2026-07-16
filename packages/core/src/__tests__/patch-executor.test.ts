import { describe, expect, it } from 'vitest';

import type { AgentEvent, AgentPatch, AgentPlan } from '@helix-agent/protocol';
import { ToolRegistry } from '@helix-agent/tools';

import { ApprovalManager, PlanExecutor } from '../index';

class AutoApprovalManager extends ApprovalManager {
  public override createApprovalRequest(
    input: Parameters<ApprovalManager['createApprovalRequest']>[0],
  ) {
    const request = super.createApprovalRequest(input);
    queueMicrotask(() => this.approve(request.id));
    return request;
  }
}

/** 收集执行器事件，方便验证审批事件流。 */
async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

describe('PlanExecutor patch workflow', () => {
  it('emits patch and approval events before applying an approved patch', async () => {
    const executionOrder: string[] = [];
    const toolRegistry = new ToolRegistry();
    toolRegistry.register({
      name: 'apply_patch',
      description: 'Apply patch',
      inputSchema: { type: 'object' },
      readOnly: false,
      requiresApproval: true,
      async execute(input: { patch: AgentPatch; approvalId: string }) {
        executionOrder.push(`apply:${input.patch.id}:${input.approvalId}`);
        return { patchId: input.patch.id, files: ['src/index.ts'] };
      },
    });
    const approvalManager = new AutoApprovalManager({
      idGenerator: { next: () => 'approval_1' },
    });
    const patch: AgentPatch = {
      id: 'patch_1',
      taskId: 'task_1',
      createdAt: '2026-07-16T09:00:00.000Z',
      summary: '更新入口文件',
      files: [
        {
          path: 'src/index.ts',
          changeType: 'update',
          operation: {
            type: 'replace_file_content',
            content: 'export const value = 2;\n',
          },
        },
      ],
    };
    const plan: AgentPlan = {
      id: 'plan_1',
      taskId: 'task_1',
      goal: '修改入口文件',
      createdAt: '2026-07-16T09:00:00.000Z',
      findings: [],
      steps: [
        {
          id: 'step_1',
          title: '修改入口文件',
          kind: 'edit',
          status: 'pending',
          filePaths: ['src/index.ts'],
        },
      ],
      risks: [],
      files: ['src/index.ts'],
    };
    const executor = new PlanExecutor(toolRegistry, undefined, {
      approvalManager,
      patchGenerator: {
        async generatePatch() {
          executionOrder.push('generate');
          return patch;
        },
      },
    });

    const events = await collectEvents(executor.execute(plan, {}));

    expect(executionOrder).toEqual(['generate', 'apply:patch_1:approval_1']);
    expect(events.map((event) => event.type)).toEqual([
      'patch.created',
      'approval.requested',
      'approval.resolved',
      'tool.call.started',
      'tool.call.finished',
      'finished',
    ]);
    expect(events[0]).toMatchObject({ type: 'patch.created', patch });
    expect(events[1]).toMatchObject({
      type: 'approval.requested',
      approval: { id: 'approval_1', status: 'pending', patchId: 'patch_1' },
    });
    expect(events[2]).toMatchObject({
      type: 'approval.resolved',
      approval: { id: 'approval_1', status: 'approved' },
    });
  });
});
