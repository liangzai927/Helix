import type { RuntimeMetadata } from '../runtime';

/** Executor 执行阶段能直接拿到的公共上下文。 */
export interface ExecutorContext {
  cwd?: string;
  metadata?: RuntimeMetadata;
}

/** Executor 只关心如何消费 plan，并把执行过程转成事件流。 */
export interface Executor<TPlan = unknown, TContext = ExecutorContext, TEvent = unknown> {
  execute(plan: TPlan, context: TContext): AsyncIterable<TEvent>;
}
