import type { EntityId, IsoDateTimeString, JsonObject } from './common';

/** 审批对象类型。 */
export type ApprovalKind = 'patch' | 'command' | 'tool_call' | 'batch';

/** 审批状态。 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

/** 一次需要用户确认的审批请求。 */
export interface ApprovalRequest {
  id: EntityId;
  taskId: EntityId;
  kind: ApprovalKind;
  title: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: IsoDateTimeString;
  patchId?: EntityId;
  toolCallId?: EntityId;
  command?: string;
  expiresAt?: IsoDateTimeString;
  metadata?: JsonObject;
}
