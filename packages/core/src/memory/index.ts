/** 会话记忆的最小能力集合，先定义边界，后续再补具体存储实现。 */
export interface ConversationMemory<TMessage = unknown> {
  appendMessage(message: TMessage): Promise<void> | void;
  listMessages(): Promise<readonly TMessage[]> | readonly TMessage[];
  clear?(): Promise<void> | void;
}
