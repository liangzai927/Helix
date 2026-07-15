import type { RuntimeMetadata } from '../runtime';

export interface RuntimeContextSnapshot<TMessage = unknown, TToolResult = unknown> {
  cwd?: string;
  messages?: readonly TMessage[];
  toolResults?: readonly TToolResult[];
  metadata?: RuntimeMetadata;
}

export interface ContextBuilder<TInput = unknown, TContext = RuntimeContextSnapshot> {
  build(input: TInput): Promise<TContext> | TContext;
}
