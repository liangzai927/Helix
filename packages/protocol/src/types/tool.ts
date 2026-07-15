import type { EntityId, IsoDateTimeString, JsonObject, JsonValue } from './common';

/** 工具调用状态。 */
export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** 工具结果状态。 */
export type ToolResultStatus = 'success' | 'error';

/** 一次工具调用请求。 */
export interface ToolCall {
  id: EntityId;
  taskId: EntityId;
  toolName: string;
  input: JsonObject;
  createdAt: IsoDateTimeString;
  readOnly: boolean;
  requiresApproval: boolean;
  status: ToolCallStatus;
  startedAt?: IsoDateTimeString;
  finishedAt?: IsoDateTimeString;
}

/** 一次工具调用结果。 */
export interface ToolResult {
  id: EntityId;
  taskId: EntityId;
  toolCallId: EntityId;
  toolName: string;
  createdAt: IsoDateTimeString;
  status: ToolResultStatus;
  summary: string;
  output?: JsonValue;
  errorMessage?: string;
}
