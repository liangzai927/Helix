import type { RuntimeMetadata } from '../runtime';
import { randomUUID } from 'node:crypto';

import type { BaseModel } from '@helix-agent/models';
import { buildPlannerPrompt } from '@helix-agent/prompts';
import type { AgentEvent, AgentPlan, JsonObject, JsonValue } from '@helix-agent/protocol';
import type { ToolRegistry } from '@helix-agent/tools';

import { PlanParser } from './plan-parser';

export * from './plan-parser';

/** Planner 收到的任务输入，后续 runtime 会在这里逐步补充更多字段。 */
export interface PlannerTask<TInput = string> {
  input: TInput;
  taskId?: string;
  conversationId?: string;
  cwd?: string;
  metadata?: RuntimeMetadata;
}

/** Planner 规划时可读的公共环境信息。 */
export interface PlannerContext {
  cwd?: string;
  metadata?: RuntimeMetadata;
  emitEvent?: (event: AgentEvent) => Promise<void> | void;
}

/** Planner 的职责是产出 plan，而不是直接执行副作用。 */
export interface Planner<TTask = PlannerTask, TContext = PlannerContext, TPlan = unknown> {
  createPlan(task: TTask, context: TContext): Promise<TPlan> | TPlan;
}

/** 默认规划器：先稳定输出固定计划结构，后续再替换成真实模型规划。 */
export class FakePlanner
  implements Planner<PlannerTask<string>, PlannerContext, AgentPlan>
{
  public createPlan(task: PlannerTask<string>, _context: PlannerContext): AgentPlan {
    void _context;

    return {
      id: createPlannerId('plan'),
      taskId: task.taskId ?? createPlannerId('task'),
      goal: task.input,
      createdAt: new Date().toISOString(),
      findings: ['当前使用内置 FakePlanner，尚未接入真实模型规划'],
      steps: [
        {
          id: createPlannerId('step'),
          title: '分析用户输入',
          kind: 'read',
          status: 'completed',
          expectedOutput: '确认任务目标和范围',
        },
        {
          id: createPlannerId('step'),
          title: '生成最小执行计划',
          kind: 'other',
          status: 'pending',
          expectedOutput: '输出可执行的计划摘要',
        },
      ],
      risks: ['当前计划为固定模板，尚未结合真实项目上下文'],
      files: [],
      summary: `已为任务生成最小计划：${createTaskTitle(task.input)}`,
    };
  }
}

/** 通过统一模型接口生成计划摘要，不在规划阶段调用工具。 */
export class ModelPlanner
  implements Planner<PlannerTask<string>, PlannerContext, AgentPlan>
{
  private readonly planParser = new PlanParser();

  public constructor(
    private readonly model: BaseModel,
    private readonly toolRegistry?: ToolRegistry,
  ) {}

  /** 向模型发送固定规划 Prompt，并将模型文本收敛到 plan.summary。 */
  public async createPlan(
    task: PlannerTask<string>,
    _context: PlannerContext,
  ): Promise<AgentPlan> {
    const toolContext =
      this.toolRegistry === undefined
        ? []
        : await this.collectToolContext(task, _context);

    const response = await this.model.chat({
      tools: [],
      toolChoice: 'none',
      messages: [
        {
          role: 'system',
          content: buildPlannerPrompt(task.input),
        },
        {
          role: 'user',
          content: createToolContextMessage(toolContext),
        },
      ],
    });

    return this.planParser.parse(response.message.content, {
      taskId: task.taskId ?? createPlannerId('task'),
      goal: task.input,
    });
  }

  /** 按固定顺序执行目录和文本搜索，为模型构建只读上下文。 */
  private async collectToolContext(
    task: PlannerTask<string>,
    context: PlannerContext,
  ): Promise<PlannerToolContext[]> {
    const cwd = task.cwd ?? context.cwd ?? '.';

    return [
      {
        toolName: 'list_directory',
        output: await this.executeReadOnlyTool(
          'list_directory',
          { path: cwd },
          task,
          context,
        ),
      },
      {
        toolName: 'search_text',
        output: await this.executeReadOnlyTool(
          'search_text',
          { query: task.input, cwd },
          task,
          context,
        ),
      },
    ];
  }

  /** 执行单个已注册只读工具，并在执行前后输出协议事件。 */
  private async executeReadOnlyTool(
    toolName: string,
    input: JsonObject,
    task: PlannerTask<string>,
    context: PlannerContext,
  ): Promise<JsonValue> {
    const tool = this.toolRegistry?.get(toolName);

    if (tool === undefined) {
      throw new Error(`Planner 缺少必需工具 ${toolName}`);
    }

    if (!tool.readOnly) {
      throw new Error(`Planner 禁止调用非只读工具 ${toolName}`);
    }

    const taskId = task.taskId ?? createPlannerId('task');
    const toolCallId = createPlannerId('tool_call');
    const startedAt = new Date().toISOString();

    await context.emitEvent?.({
      type: 'tool.call.started',
      taskId,
      createdAt: startedAt,
      toolCall: {
        id: toolCallId,
        taskId,
        toolName,
        input,
        createdAt: startedAt,
        readOnly: tool.readOnly,
        requiresApproval: tool.requiresApproval,
        status: 'running',
        startedAt,
      },
    });

    try {
      const output = requireJsonValue(await tool.execute(input));
      const finishedAt = new Date().toISOString();

      await context.emitEvent?.({
        type: 'tool.call.finished',
        taskId,
        createdAt: finishedAt,
        toolResult: {
          id: createPlannerId('tool_result'),
          taskId,
          toolCallId,
          toolName,
          createdAt: finishedAt,
          status: 'success',
          summary: `工具 ${toolName} 执行完成`,
          output,
        },
      });

      return output;
    } catch (error) {
      const finishedAt = new Date().toISOString();

      await context.emitEvent?.({
        type: 'tool.call.finished',
        taskId,
        createdAt: finishedAt,
        toolResult: {
          id: createPlannerId('tool_result'),
          taskId,
          toolCallId,
          toolName,
          createdAt: finishedAt,
          status: 'error',
          summary: `工具 ${toolName} 执行失败`,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }
}

interface PlannerToolContext {
  toolName: string;
  output: JsonValue;
}

/** 将只读工具结果以稳定 JSON 形态交给模型。 */
function createToolContextMessage(context: PlannerToolContext[]): string {
  return `只读工具上下文：\n${JSON.stringify(context)}`;
}

/** 确保工具输出能安全写入协议事件与模型上下文。 */
function requireJsonValue(value: unknown): JsonValue {
  if (isJsonValue(value)) {
    return value;
  }

  throw new Error('工具输出不是有效 JSON 值');
}

/** 递归检查未知值是否符合协议层 JSON 类型。 */
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

/** 统一 FakePlanner 的默认标题裁剪规则，避免 runtime 和 planner 各写一份。 */
function createTaskTitle(input: string): string {
  const normalizedInput = input.trim();

  if (normalizedInput.length <= 24) {
    return normalizedInput;
  }

  return `${normalizedInput.slice(0, 24)}...`;
}

/** 当前阶段只需要稳定且可测试的本地 ID，不要求和运行时主 ID 生成器打通。 */
function createPlannerId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
