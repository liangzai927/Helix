import type { EntityId, IsoDateTimeString } from './common';

/** 文件补丁操作类型。 */
export type AgentPatchFileChangeType = 'create' | 'update' | 'delete';

/** MVP 阶段只支持用完整文本替换整个文件。 */
export interface ReplaceFileContentPatchOperation {
  type: 'replace_file_content';
  content: string;
  expectedContent?: string;
}

/** 补丁操作联合类型，后续新增局部编辑时从这里扩展。 */
export type AgentPatchOperation = ReplaceFileContentPatchOperation;

/** 补丁中的单个文件改动。 */
export interface AgentPatchFile {
  path: string;
  changeType: AgentPatchFileChangeType;
  operation?: AgentPatchOperation;
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

/** 生成可直接展示给用户审查的稳定补丁摘要。 */
export function createAgentPatchSummary(files: readonly AgentPatchFile[]): string {
  const details = files.map(
    (file) => `- ${getChangeTypeLabel(file.changeType)} ${file.path}`,
  );

  return [`修改 ${files.length} 个文件：`, ...details].join('\n');
}

/** 将协议枚举转换成面向用户的中文动作。 */
function getChangeTypeLabel(changeType: AgentPatchFileChangeType): string {
  switch (changeType) {
    case 'create':
      return '新建';
    case 'update':
      return '更新';
    case 'delete':
      return '删除';
  }
}
