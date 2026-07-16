import { randomUUID } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';

import type {
  AgentEvent,
  AgentPlan,
  JsonObject,
  JsonValue,
  PlanStep,
} from '@helix-agent/protocol';
import type { RegisteredTool, ToolRegistry } from '@helix-agent/tools';

import type { RuntimeClock, RuntimeMetadata } from '../runtime/types';

/** Executor 执行阶段能直接拿到的公共上下文。 */
export interface ExecutorContext {
  cwd?: string;
  metadata?: RuntimeMetadata;
}

/** Executor 只关心如何消费 plan，并把执行过程转成事件流。 */
export interface Executor<TPlan = unknown, TContext = ExecutorContext, TEvent = unknown> {
  execute(plan: TPlan, context: TContext): AsyncIterable<TEvent>;
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
  ): AsyncIterable<AgentEvent> {
    const tool = requireReadOnlyTool(this.toolRegistry, toolName);
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
        requiresApproval: tool.requiresApproval,
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

/** 只允许执行已注册的只读工具。 */
function requireReadOnlyTool(toolRegistry: ToolRegistry, toolName: string): RegisteredTool {
  const tool = toolRegistry.get(toolName);

  if (tool === undefined) {
    throw new Error(`Executor 缺少必需工具 ${toolName}`);
  }

  if (!tool.readOnly) {
    throw new Error(`Executor 禁止调用非只读工具 ${toolName}`);
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
