import type { ModelMessage } from '@helix-agent/models';

/** 使用字符数近似控制模型上下文大小。 */
export class ContextBudget {
  public constructor(public readonly maxCharacters: number) {
    if (!Number.isInteger(maxCharacters) || maxCharacters < 1) {
      throw new Error('maxCharacters 必须是大于等于 1 的整数');
    }
  }

  public estimate(messages: readonly ModelMessage[]): number {
    return messages.reduce((total, message) => total + message.content.length, 0);
  }

  /** 从最旧消息开始裁剪，最后一条当前用户消息永远保留。 */
  public trim(messages: readonly ModelMessage[]): ModelMessage[] {
    if (messages.length === 0) {
      return [];
    }

    const currentUserMessage = messages.at(-1);

    if (currentUserMessage?.role !== 'user') {
      throw new Error('上下文最后一条消息必须是当前用户输入');
    }

    const retainedMessages = messages.slice(0, -1);

    while (
      retainedMessages.length > 0 &&
      this.estimate([...retainedMessages, currentUserMessage]) > this.maxCharacters
    ) {
      retainedMessages.shift();
    }

    return [...retainedMessages, currentUserMessage];
  }
}
