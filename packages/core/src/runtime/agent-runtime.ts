import { randomUUID } from 'node:crypto';

import type { AgentEvent, AgentPlan, AgentTask } from '@helix-agent/protocol';

import { FakePlanner, type Planner, type PlannerContext, type PlannerTask } from '../planner';

import { RuntimeState } from './state';
import {
  DEFAULT_AGENT_RUNTIME_MODE,
  defineRuntimeDependencies,
  type RuntimeDependencies,
  type RuntimeIdGenerator,
} from './types';

type RuntimePlanner = Planner<PlannerTask<string>, PlannerContext, AgentPlan>;

/** 最小 Runtime：先打通事件闭环，再逐步替换成真实 planner / executor。 */
export class AgentRuntime {
  private readonly dependencies: RuntimeDependencies;
  private readonly planner: RuntimePlanner;

  public constructor(dependencies: RuntimeDependencies = {}) {
    this.dependencies = defineRuntimeDependencies(dependencies);
    this.planner = (this.dependencies.planner as RuntimePlanner | undefined) ?? new FakePlanner();
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

    const plan = await this.createPlan(task);

    yield {
      type: 'plan.created',
      taskId: task.id,
      createdAt: this.getCreatedAt(),
      plan,
    };

    yield state.setStatus('finished', '任务执行完成');

    yield {
      type: 'finished',
      taskId: task.id,
      createdAt: this.getCreatedAt(),
      status: 'finished',
      ...(plan.summary === undefined ? {} : { summary: plan.summary }),
    };
  }

  private createTask(input: string): AgentTask {
    const createdAt = this.getCreatedAt();

    return {
      id: this.createId('task'),
      conversationId: this.createId('conversation'),
      input,
      createdAt,
      updatedAt: createdAt,
      mode: DEFAULT_AGENT_RUNTIME_MODE,
      status: 'idle',
      title: this.createTaskTitle(input),
    };
  }

  private async createPlan(task: AgentTask): Promise<AgentPlan> {
    return this.planner.createPlan(
      {
        input: task.input,
        taskId: task.id,
        conversationId: task.conversationId,
      },
      {},
    );
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
