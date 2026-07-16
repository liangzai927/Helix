import { randomUUID } from 'node:crypto';

import type { AgentEvent, AgentPlan, AgentTask } from '@helix-agent/protocol';
import type { ToolDescriptor } from '@helix-agent/tools';

import { FakeExecutor, type Executor, type ExecutorContext } from '../executor';
import { createPlanCacheKey, PlanCache } from '../memory';
import { FakePlanner, type Planner, type PlannerContext, type PlannerTask } from '../planner';

import { ModeSelector } from './mode-selector';
import { RuntimeState } from './state';
import {
  defineRuntimeDependencies,
  type RuntimeDependencies,
  type RuntimeIdGenerator,
} from './types';

type RuntimePlanner = Planner<PlannerTask<string>, PlannerContext, AgentPlan>;
type RuntimeExecutor = Executor<AgentPlan, ExecutorContext, AgentEvent>;

/** 最小 Runtime：先打通事件闭环，再逐步替换成真实 planner / executor。 */
export class AgentRuntime {
  private readonly dependencies: RuntimeDependencies;
  private readonly planner: RuntimePlanner;
  private readonly executor: RuntimeExecutor;
  private readonly modeSelector = new ModeSelector();
  private readonly planCache = new PlanCache<AgentPlan>();

  public constructor(dependencies: RuntimeDependencies = {}) {
    this.dependencies = defineRuntimeDependencies(dependencies);
    this.planner = (this.dependencies.planner as RuntimePlanner | undefined) ?? new FakePlanner();
    this.executor =
      (this.dependencies.executor as RuntimeExecutor | undefined) ??
      new FakeExecutor(this.dependencies.clock);
  }

  /** 返回当前 Runtime 已注册工具元数据，不触发任何工具执行。 */
  public listAvailableTools(): ToolDescriptor[] {
    return this.dependencies.toolRegistry?.list() ?? [];
  }

  public async *run(input: string): AsyncIterable<AgentEvent> {
    const task = this.createTask(input);
    const state = new RuntimeState({
      taskId: task.id,
      initialStatus: task.status,
      ...(this.dependencies.clock === undefined ? {} : { clock: this.dependencies.clock }),
    });

    yield {
      type: 'task.created',
      taskId: task.id,
      createdAt: this.getCreatedAt(),
      task,
    };

    yield state.setStatus('creating_task', '正在创建任务');
    yield state.setStatus('planning', '正在生成计划');

    const { plan, events: plannerEvents } = await this.createPlan(task);

    for (const event of plannerEvents) {
      yield event;
    }

    yield {
      type: 'plan.created',
      taskId: task.id,
      createdAt: this.getCreatedAt(),
      plan,
    };

    yield state.setStatus('executing', '正在执行计划');

    for await (const event of this.executor.execute(plan, {})) {
      yield event;
    }
  }

  private createTask(input: string): AgentTask {
    const createdAt = this.getCreatedAt();

    return {
      id: this.createId('task'),
      conversationId: this.createId('conversation'),
      input,
      createdAt,
      updatedAt: createdAt,
      mode: this.modeSelector.select(input),
      status: 'idle',
      title: this.createTaskTitle(input),
    };
  }

  private async createPlan(
    task: AgentTask,
  ): Promise<{ plan: AgentPlan; events: AgentEvent[] }> {
    const taskKey = createPlanCacheKey(task.input);
    const cachedPlan = this.planCache.get(taskKey);

    if (cachedPlan !== undefined) {
      return {
        plan: {
          ...cachedPlan,
          taskId: task.id,
        },
        events: [],
      };
    }

    const events: AgentEvent[] = [];
    const plan = await this.planner.createPlan(
      {
        input: task.input,
        taskId: task.id,
        conversationId: task.conversationId,
      },
      {
        emitEvent(event) {
          events.push(event);
        },
      },
    );

    this.planCache.set(taskKey, plan);

    return { plan, events };
  }

  private createTaskTitle(input: string): string {
    const normalizedInput = input.trim();

    if (normalizedInput.length <= 24) {
      return normalizedInput;
    }

    return `${normalizedInput.slice(0, 24)}...`;
  }

  private createId(prefix: string): string {
    const idGenerator = this.dependencies.idGenerator as RuntimeIdGenerator | undefined;

    return idGenerator?.next(prefix) ?? `${prefix}_${randomUUID()}`;
  }

  private getCreatedAt(): string {
    return new Date(this.dependencies.clock?.now() ?? Date.now()).toISOString();
  }
}
