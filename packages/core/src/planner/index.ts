import type { RuntimeMetadata } from '../runtime';

export interface PlannerTask<TInput = string> {
  input: TInput;
  taskId?: string;
  conversationId?: string;
  cwd?: string;
  metadata?: RuntimeMetadata;
}

export interface PlannerContext {
  cwd?: string;
  metadata?: RuntimeMetadata;
}

export interface Planner<TTask = PlannerTask, TContext = PlannerContext, TPlan = unknown> {
  createPlan(task: TTask, context: TContext): Promise<TPlan> | TPlan;
}
