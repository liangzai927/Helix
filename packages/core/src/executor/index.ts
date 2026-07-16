import { randomUUID } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';

import type {
  AgentEvent,
  AgentPatch,
  AgentPlan,
  JsonObject,
  JsonValue,
  PlanStep,
} from '@helix-agent/protocol';
import type { RegisteredTool, ToolRegistry } from '@helix-agent/tools';

import type { ApprovalManagerPort } from '../approval';
import type { RuntimeClock, RuntimeMetadata } from '../runtime/types';

export * from './model-patch-generator';

/** Executor 执行阶段能直接拿到的公共上下文。 */
export interface ExecutorContext {
  cwd?: string;
  metadata?: RuntimeMetadata;
}

/** Executor 只关心如何消费 plan，并把执行过程转成事件流。 */
export interface Executor<TPlan = unknown, TContext = ExecutorContext, TEvent = unknown> {
  execute(plan: TPlan, context: TContext): AsyncIterable<TEvent>;
}

/** 将编辑步骤转换成待审批补丁，不负责应用文件。 */
export interface PatchGenerator {
  generatePatch(
    plan: AgentPlan,
    step: PlanStep,
    context: ExecutorContext,
  ): Promise<AgentPatch> | AgentPatch;
}

export interface PatchWorkflowDependencies {
  approvalManager: ApprovalManagerPort;
  patchGenerator: PatchGenerator;
}

/** 默认执行器：消费计划并输出最小完成事件，暂不执行任何真实副作用。 */
export class FakeExecutor implements Executor<AgentPlan, ExecutorContext, AgentEvent> {
  public constructor(private readonly clock?: RuntimeClock) {}

  public async *execute(plan: AgentPlan, _context: ExecutorContext): AsyncIterable<AgentEvent> {
    void _context;

    yield {
      type: 'finished',
      taskId: plan.taskId,
      createdAt: new Date(this.clock?.now() ?? Date.now()).toISOString(),
      status: 'finished',
      ...(plan.summary === undefined ? {} : { summary: plan.summary }),
    };
  }
}

/** 按计划顺序执行当前已支持的只读步骤。 */
export class PlanExecutor implements Executor<AgentPlan, ExecutorContext, AgentEvent> {
  public constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly clock?: RuntimeClock,
    private readonly patchWorkflow?: PatchWorkflowDependencies,
  ) {}

  public async *execute(
    plan: AgentPlan,
    context: ExecutorContext,
  ): AsyncIterable<AgentEvent> {
    let waiting = false;

    for (const step of plan.steps) {
      if (step.kind === 'read') {
        yield* this.executeTool(plan, step, 'read_file', createReadInput(step, context));
        continue;
      }

      if (step.kind === 'search') {
        yield* this.executeTool(plan, step, 'search_text', createSearchInput(step, context));
        continue;
      }

      if (step.kind === 'edit' && this.patchWorkflow !== undefined) {
        const applied = yield* this.executePatch(plan, step, context);
        waiting = waiting || !applied;
        continue;
      }

      if (step.kind === 'command' && this.toolRegistry.get('run_terminal') !== undefined) {
        const executed = yield* this.executeCommand(plan, step, context);
        waiting = waiting || !executed;
        continue;
      }

      if (step.kind === 'edit' || step.kind === 'command') {
        waiting = true;
        yield {
          type: 'status.changed',
          taskId: plan.taskId,
          createdAt: this.getCreatedAt(),
          status: 'waiting_approval',
          message: `步骤“${step.title}”等待执行能力`,
        };
      }
    }

    if (!waiting) {
      yield {
        type: 'finished',
        taskId: plan.taskId,
        createdAt: this.getCreatedAt(),
        status: 'finished',
        ...(plan.summary === undefined ? {} : { summary: plan.summary }),
      };
    }
  }

  /** 执行单个只读工具，并输出完整的开始与结束事件。 */
  private async *executeTool(
    plan: AgentPlan,
    step: PlanStep,
    toolName: string,
    input: JsonObject,
    approvedWrite = false,
  ): AsyncGenerator<AgentEvent, JsonValue> {
    const tool = requireExecutableTool(this.toolRegistry, toolName, approvedWrite);
    const requiresApproval =
      tool.requiresApprovalFor?.(input) ?? tool.requiresApproval;
    const toolCallId = `tool_call_${randomUUID()}`;
    const startedAt = this.getCreatedAt();

    yield {
      type: 'tool.call.started',
      taskId: plan.taskId,
      createdAt: startedAt,
      toolCall: {
        id: toolCallId,
        taskId: plan.taskId,
        toolName,
        input,
        createdAt: startedAt,
        readOnly: tool.readOnly,
        requiresApproval,
        status: 'running',
        startedAt,
      },
    };

    try {
      const output = requireJsonValue(await tool.execute(input));

      yield {
        type: 'tool.call.finished',
        taskId: plan.taskId,
        createdAt: this.getCreatedAt(),
        toolResult: {
          id: `tool_result_${randomUUID()}`,
          taskId: plan.taskId,
          toolCallId,
          toolName,
          createdAt: this.getCreatedAt(),
          status: 'success',
          summary: `步骤“${step.title}”执行完成`,
          output,
        },
      };

      return output;
    } catch (error) {
      yield {
        type: 'tool.call.finished',
        taskId: plan.taskId,
        createdAt: this.getCreatedAt(),
        toolResult: {
          id: `tool_result_${randomUUID()}`,
          taskId: plan.taskId,
          toolCallId,
          toolName,
          createdAt: this.getCreatedAt(),
          status: 'error',
          summary: `步骤“${step.title}”执行失败`,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      };

      throw error;
    }
  }

  /** 低风险命令直接执行，中高风险命令保留为等待状态。 */
  private async *executeCommand(
    plan: AgentPlan,
    step: PlanStep,
    context: ExecutorContext,
  ): AsyncGenerator<AgentEvent, boolean> {
    const tool = this.toolRegistry.get('run_terminal');

    if (tool === undefined) {
      return false;
    }

    const command = step.description ?? step.title;
    const input: JsonObject = {
      command,
      ...(context.cwd === undefined ? {} : { cwd: context.cwd }),
    };
    const requiresApproval =
      tool.requiresApprovalFor?.(input) ?? tool.requiresApproval;

    if (requiresApproval) {
      const approvalManager = this.patchWorkflow?.approvalManager;

      if (approvalManager === undefined) {
        yield {
          type: 'status.changed',
          taskId: plan.taskId,
          createdAt: this.getCreatedAt(),
          status: 'waiting_approval',
          message: `步骤“${step.title}”等待命令审批`,
        };
        return false;
      }

      const approval = approvalManager.createApprovalRequest({
        taskId: plan.taskId,
        kind: 'command',
        title: `确认执行命令：${command}`,
        reason: '该命令不在低风险只读白名单中',
        command,
      });
      yield {
        type: 'approval.requested',
        taskId: plan.taskId,
        createdAt: this.getCreatedAt(),
        approval,
      };
      const resolution = await approvalManager.waitForApproval(approval.id);
      yield {
        type: 'approval.resolved',
        taskId: plan.taskId,
        createdAt: this.getCreatedAt(),
        approval: approvalManager.getApprovalRequest(approval.id),
      };

      if (!resolution.approved) {
        return false;
      }
    }

    yield {
      type: 'command.started',
      taskId: plan.taskId,
      createdAt: this.getCreatedAt(),
      command: {
        command,
        ...(context.cwd === undefined ? {} : { cwd: context.cwd }),
      },
    };

    const output = yield* this.executeTool(
      plan,
      step,
      'run_terminal',
      input,
      true,
    );
    const commandResult = requireCommandResult(output);

    yield {
      type: 'command.finished',
      taskId: plan.taskId,
      createdAt: this.getCreatedAt(),
      command: {
        command,
        ...(context.cwd === undefined ? {} : { cwd: context.cwd }),
        exitCode: commandResult.exitCode,
        summary: commandResult.summary,
      },
    };

    return true;
  }

  /** 生成补丁、等待审批并在批准后调用 apply_patch。 */
  private async *executePatch(
    plan: AgentPlan,
    step: PlanStep,
    context: ExecutorContext,
  ): AsyncGenerator<AgentEvent, boolean> {
    const workflow = this.patchWorkflow;

    if (workflow === undefined) {
      return false;
    }

    const patch = await workflow.patchGenerator.generatePatch(plan, step, context);

    if (patch.taskId !== plan.taskId) {
      throw new Error(`补丁 ${patch.id} 不属于任务 ${plan.taskId}`);
    }

    yield {
      type: 'patch.created',
      taskId: plan.taskId,
      createdAt: this.getCreatedAt(),
      patch,
    };

    const approval = workflow.approvalManager.createApprovalRequest({
      taskId: plan.taskId,
      kind: 'patch',
      title: `确认应用补丁：${step.title}`,
      reason: patch.summary,
      patchId: patch.id,
    });

    yield {
      type: 'approval.requested',
      taskId: plan.taskId,
      createdAt: this.getCreatedAt(),
      approval,
    };

    const resolution = await workflow.approvalManager.waitForApproval(approval.id);
    const resolvedApproval = workflow.approvalManager.getApprovalRequest(approval.id);

    yield {
      type: 'approval.resolved',
      taskId: plan.taskId,
      createdAt: this.getCreatedAt(),
      approval: resolvedApproval,
    };

    if (!resolution.approved) {
      return false;
    }

    yield* this.executeTool(
      plan,
      step,
      'apply_patch',
      {
        patch: requireJsonValue(patch),
        approvalId: approval.id,
      },
      true,
    );

    return true;
  }

  private getCreatedAt(): string {
    return new Date(this.clock?.now() ?? Date.now()).toISOString();
  }
}

/** read 步骤必须显式携带目标文件，避免把自然语言标题误当路径。 */
function createReadInput(step: PlanStep, context: ExecutorContext): JsonObject {
  const path = step.filePaths?.[0];

  if (path === undefined) {
    throw new Error(`读取步骤“${step.title}”缺少文件路径`);
  }

  return {
    path:
      context.cwd !== undefined && !isAbsolute(path)
        ? resolve(context.cwd, path)
        : path,
  };
}

/** search 步骤优先使用描述作为查询词，并透传运行目录。 */
function createSearchInput(step: PlanStep, context: ExecutorContext): JsonObject {
  return {
    query: step.description ?? step.title,
    ...(context.cwd === undefined ? {} : { cwd: context.cwd }),
  };
}

/** 只允许执行只读工具，或已走完审批流程的高风险工具。 */
function requireExecutableTool(
  toolRegistry: ToolRegistry,
  toolName: string,
  approvedWrite: boolean,
): RegisteredTool {
  const tool = toolRegistry.get(toolName);

  if (tool === undefined) {
    throw new Error(`Executor 缺少必需工具 ${toolName}`);
  }

  if (!tool.readOnly && !approvedWrite) {
    throw new Error(`Executor 禁止调用非只读工具 ${toolName}`);
  }

  if (approvedWrite && !tool.requiresApproval) {
    throw new Error(`高风险工具 ${toolName} 必须声明 requiresApproval`);
  }

  return tool;
}

/** 确保工具结果可以安全写入协议事件。 */
function requireJsonValue(value: unknown): JsonValue {
  if (isJsonValue(value)) {
    return value;
  }

  throw new Error('工具输出不是有效 JSON 值');
}

/** 从 run_terminal 工具结果中提取命令事件必需字段。 */
function requireCommandResult(value: JsonValue): { exitCode: number; summary: string } {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.exitCode === 'number' &&
    typeof value.summary === 'string'
  ) {
    return {
      exitCode: value.exitCode,
      summary: value.summary,
    };
  }

  throw new Error('run_terminal 输出缺少 exitCode 或 summary');
}

/** 递归检查未知工具结果是否符合协议 JSON 类型。 */
function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}
