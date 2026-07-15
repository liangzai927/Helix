import type { EntityId, IsoDateTimeString } from './common';

/** 任务运行模式。 */
export type AgentTaskMode = 'chat' | 'plan' | 'execute';

/** 任务运行状态。 */
export type AgentTaskStatus =
  | 'idle'
  | 'creating_task'
  | 'building_context'
  | 'planning'
  | 'executing'
  | 'waiting_approval'
  | 'applying_patch'
  | 'running_command'
  | 'finished'
  | 'failed'
  | 'cancelled';

/** 一次 Agent 任务。 */
export interface AgentTask {
  id: EntityId;
  conversationId: EntityId;
  input: string;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  mode: AgentTaskMode;
  status: AgentTaskStatus;
  title?: string;
  planId?: EntityId;
}
