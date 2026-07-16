import type { RuntimeMetadata } from '../runtime';
import { randomUUID } from 'node:crypto';

import type { BaseModel } from '@helix-agent/models';
import type { AgentPlan } from '@helix-agent/protocol';

const MODEL_PLANNER_SYSTEM_PROMPT = `你是 Helix Agent 的规划器。请分析用户任务，并严格按照以下结构输出计划：
1. 问题理解
2. 影响范围
3. 步骤
4. 风险点
5. 关键文件`;

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
  public constructor(private readonly model: BaseModel) {}

  /** 向模型发送固定规划 Prompt，并将模型文本收敛到 plan.summary。 */
  public async createPlan(
    task: PlannerTask<string>,
    _context: PlannerContext,
  ): Promise<AgentPlan> {
    void _context;

    const response = await this.model.chat({
      tools: [],
      toolChoice: 'none',
      messages: [
        {
          role: 'system',
          content: MODEL_PLANNER_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: task.input,
        },
      ],
    });

    return {
      id: createPlannerId('plan'),
      taskId: task.taskId ?? createPlannerId('task'),
      goal: task.input,
      createdAt: new Date().toISOString(),
      findings: [],
      steps: [],
      risks: [],
      files: [],
      summary: response.message.content,
    };
  }
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
