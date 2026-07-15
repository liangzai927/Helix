import type { EntityId, IsoDateTimeString } from './common';

/** 一段完整的任务会话。 */
export interface Conversation {
  id: EntityId;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  title?: string;
  summary?: string;
  messageIds: EntityId[];
  taskIds: EntityId[];
}
