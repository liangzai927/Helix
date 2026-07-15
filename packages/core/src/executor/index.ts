import type { RuntimeMetadata } from '../runtime';

export interface ExecutorContext {
  cwd?: string;
  metadata?: RuntimeMetadata;
}

export interface Executor<TPlan = unknown, TContext = ExecutorContext, TEvent = unknown> {
  execute(plan: TPlan, context: TContext): AsyncIterable<TEvent>;
}
