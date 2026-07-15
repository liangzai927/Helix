export interface ConversationMemory<TMessage = unknown> {
  appendMessage(message: TMessage): Promise<void> | void;
  listMessages(): Promise<readonly TMessage[]> | readonly TMessage[];
  clear?(): Promise<void> | void;
}
