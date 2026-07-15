import type { EntityId, FileReference, IsoDateTimeString } from './common';

/** 计划步骤类型。 */
export type PlanStepKind = 'read' | 'search' | 'edit' | 'command' | 'approval' | 'other';

/** 计划步骤状态。 */
export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

/** 计划中的单个执行步骤。 */
export interface PlanStep {
  id: EntityId;
  title: string;
  kind: PlanStepKind;
  status: PlanStepStatus;
  description?: string;
  filePaths?: string[];
  references?: FileReference[];
  expectedOutput?: string;
}

/** 一次任务生成的执行计划。 */
export interface AgentPlan {
  id: EntityId;
  taskId: EntityId;
  goal: string;
  createdAt: IsoDateTimeString;
  findings: string[];
  steps: PlanStep[];
  risks: string[];
  files: string[];
  summary?: string;
}
