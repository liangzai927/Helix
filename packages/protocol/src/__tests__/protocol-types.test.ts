import { describe, expect, it } from 'vitest';

import type {
  AgentEvent,
  AgentPlan,
  AgentTask,
  ApprovalRequest,
  CommandExecutionResult,
  Message,
  PatchCreatedEvent,
  PlanCreatedEvent,
  StatusChangedEvent,
  ToolCallFinishedEvent,
  ToolCallStartedEvent,
} from '../index';

type NarrowedAgentEvent = Extract<
  AgentEvent,
  | StatusChangedEvent
  | PlanCreatedEvent
  | ToolCallStartedEvent
  | ToolCallFinishedEvent
  | PatchCreatedEvent
  | { type: 'command.finished' }
>;

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

  it('narrows agent events correctly in a switch statement', () => {
    const events: NarrowedAgentEvent[] = [
      {
        type: 'status.changed',
        taskId: 'task_1',
        createdAt: '2026-07-15T10:04:00.000Z',
        status: 'planning',
        message: '正在生成计划',
      },
      {
        type: 'plan.created',
        taskId: 'task_1',
        createdAt: '2026-07-15T10:04:01.000Z',
        plan: {
          id: 'plan_1',
          taskId: 'task_1',
          goal: '生成可执行计划',
          createdAt: '2026-07-15T10:04:01.000Z',
          findings: [],
          steps: [],
          risks: [],
          files: [],
        },
      },
      {
        type: 'tool.call.started',
        taskId: 'task_1',
        createdAt: '2026-07-15T10:04:02.000Z',
        toolCall: {
          id: 'tool_call_1',
          taskId: 'task_1',
          toolName: 'read_file',
          input: {
            path: 'packages/protocol/src/types/event.ts',
          },
          createdAt: '2026-07-15T10:04:02.000Z',
          readOnly: true,
          requiresApproval: false,
          status: 'running',
        },
      },
      {
        type: 'tool.call.finished',
        taskId: 'task_1',
        createdAt: '2026-07-15T10:04:03.000Z',
        toolResult: {
          id: 'tool_result_1',
          taskId: 'task_1',
          toolCallId: 'tool_call_1',
          toolName: 'read_file',
          createdAt: '2026-07-15T10:04:03.000Z',
          status: 'success',
          summary: '已读取 event.ts',
        },
      },
      {
        type: 'patch.created',
        taskId: 'task_1',
        createdAt: '2026-07-15T10:04:04.000Z',
        patch: {
          id: 'patch_1',
          taskId: 'task_1',
          createdAt: '2026-07-15T10:04:04.000Z',
          summary: '新增事件测试',
          files: [
            {
              path: 'packages/protocol/src/__tests__/protocol-types.test.ts',
              changeType: 'update',
            },
          ],
        },
      },
      {
        type: 'command.finished',
        taskId: 'task_1',
        createdAt: '2026-07-15T10:04:05.000Z',
        command: {
          command: 'pnpm test',
          exitCode: 0,
          summary: '测试通过',
        },
      },
    ];

    const handled = events.map((event) => {
      switch (event.type) {
        case 'status.changed': {
          const typedEvent: StatusChangedEvent = event;
          return typedEvent.status;
        }
        case 'plan.created': {
          const typedEvent: PlanCreatedEvent = event;
          return typedEvent.plan.goal;
        }
        case 'tool.call.started': {
          const typedEvent: ToolCallStartedEvent = event;
          return typedEvent.toolCall.toolName;
        }
        case 'tool.call.finished': {
          const typedEvent: ToolCallFinishedEvent = event;
          return typedEvent.toolResult.summary;
        }
        case 'patch.created': {
          const typedEvent: PatchCreatedEvent = event;
          return typedEvent.patch.summary;
        }
        case 'command.finished': {
          const typedEvent: { command: CommandExecutionResult } = event;
          return typedEvent.command.exitCode.toString();
        }
        default: {
          const neverEvent: never = event;
          return neverEvent;
        }
      }
    });

    expect(handled).toEqual([
      'planning',
      '生成可执行计划',
      'read_file',
      '已读取 event.ts',
      '新增事件测试',
      '0',
    ]);
  });
});
