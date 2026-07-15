import type { RuntimeMetadata } from '../runtime';

/** Runtime 在构建上下文时会汇总的最小快照。 */
export interface RuntimeContextSnapshot<TMessage = unknown, TToolResult = unknown> {
  cwd?: string;
  messages?: readonly TMessage[];
  toolResults?: readonly TToolResult[];
  metadata?: RuntimeMetadata;
}

/** ContextBuilder 负责把输入材料整理成后续 planner / model 可消费的上下文。 */
export interface ContextBuilder<TInput = unknown, TContext = RuntimeContextSnapshot> {
  build(input: TInput): Promise<TContext> | TContext;
}
