import type { EntityId, IsoDateTimeString } from './common';

/** 文件补丁操作类型。 */
export type AgentPatchFileChangeType = 'create' | 'update' | 'delete';

/** 补丁中的单个文件改动。 */
export interface AgentPatchFile {
  path: string;
  changeType: AgentPatchFileChangeType;
  oldText?: string;
  newText?: string;
  diff?: string;
}

/** 一次任务生成的结构化补丁。 */
export interface AgentPatch {
  id: EntityId;
  taskId: EntityId;
  createdAt: IsoDateTimeString;
  summary: string;
  files: AgentPatchFile[];
}
