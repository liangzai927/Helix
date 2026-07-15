import type { AgentEvent, AgentPlan } from '@helix-agent/protocol';

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
