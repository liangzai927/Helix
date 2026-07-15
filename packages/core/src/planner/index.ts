import type { RuntimeMetadata } from '../runtime';

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
