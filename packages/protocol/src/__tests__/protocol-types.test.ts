import { describe, expect, it } from 'vitest';

import type {
  AgentEvent,
  AgentPlan,
  AgentTask,
  ApprovalRequest,
  Message,
} from '../index';

describe('protocol core types', () => {
  it('creates a user message with the expected fields', () => {
    const message: Message = {
      id: 'msg_1',
      conversationId: 'conv_1',
      role: 'user',
      content: '请帮我分析这个问题',
      createdAt: '2026-07-15T10:00:00.000Z',
    };

    expect(message.role).toBe('user');
    expect(message.content).toContain('分析');
    expect(message.conversationId).toBe('conv_1');
  });

  it('creates an agent task with the expected fields', () => {
    const task: AgentTask = {
      id: 'task_1',
      conversationId: 'conv_1',
      input: '修复 protocol 层的类型问题',
      createdAt: '2026-07-15T10:01:00.000Z',
      updatedAt: '2026-07-15T10:01:00.000Z',
      mode: 'plan',
      status: 'planning',
      title: '协议类型规划',
    };

    expect(task.mode).toBe('plan');
    expect(task.status).toBe('planning');
    expect(task.title).toBe('协议类型规划');
  });

  it('creates an agent plan with structured steps', () => {
    const plan: AgentPlan = {
      id: 'plan_1',
      taskId: 'task_1',
      goal: '补齐 protocol 类型定义',
      createdAt: '2026-07-15T10:02:00.000Z',
      findings: ['当前缺少统一导出的协议类型'],
      steps: [
        {
          id: 'step_1',
          title: '梳理协议对象',
          kind: 'read',
          status: 'completed',
          filePaths: ['packages/protocol/src/index.ts'],
        },
        {
          id: 'step_2',
          title: '新增协议类型',
          kind: 'edit',
          status: 'pending',
          filePaths: ['packages/protocol/src/types'],
        },
      ],
      risks: ['事件命名需要和文档保持一致'],
      files: ['packages/protocol/src/types/event.ts'],
      summary: '先定义核心对象，再统一导出',
    };

    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]?.kind).toBe('read');
    expect(plan.steps[1]?.status).toBe('pending');
    expect(plan.files[0]).toContain('event.ts');
  });

  it('creates an approval.requested event with the expected payload', () => {
    const approval: ApprovalRequest = {
      id: 'approval_1',
      taskId: 'task_1',
      kind: 'patch',
      title: '确认应用补丁',
      reason: '该修改会写入文件',
      status: 'pending',
      createdAt: '2026-07-15T10:03:00.000Z',
      patchId: 'patch_1',
    };

    const event: AgentEvent = {
      type: 'approval.requested',
      taskId: 'task_1',
      createdAt: '2026-07-15T10:03:01.000Z',
      approval,
    };

    expect(event.type).toBe('approval.requested');
    if (event.type === 'approval.requested') {
      expect(event.approval.kind).toBe('patch');
      expect(event.approval.patchId).toBe('patch_1');
      expect(event.approval.status).toBe('pending');
    }
  });
});
