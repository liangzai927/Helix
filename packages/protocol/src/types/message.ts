import type { EntityId, IsoDateTimeString, JsonObject } from './common';

/** 消息角色。 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** 会话中的单条消息。 */
export interface Message {
  id: EntityId;
  conversationId: EntityId;
  role: MessageRole;
  content: string;
  createdAt: IsoDateTimeString;
  toolCallId?: EntityId;
  metadata?: JsonObject;
}
