/** 会话记忆的最小能力集合，先定义边界，后续再补具体存储实现。 */
export interface ConversationMemory<TMessage = unknown> {
  appendMessage(message: TMessage): Promise<void> | void;
  listMessages(): Promise<readonly TMessage[]> | readonly TMessage[];
  getRecentMessages(limit: number): Promise<readonly TMessage[]> | readonly TMessage[];
  clear(): Promise<void> | void;
}

/** 单进程内按追加顺序保存消息的会话记忆实现。 */
export class InMemoryConversationMemory<TMessage = unknown>
  implements ConversationMemory<TMessage>
{
  private readonly messages: TMessage[];

  public constructor(initialMessages: readonly TMessage[] = []) {
    this.messages = [...initialMessages];
  }

  public appendMessage(message: TMessage): void {
    this.messages.push(message);
  }

  public listMessages(): TMessage[] {
    return [...this.messages];
  }

  /** 返回最近 limit 条消息，并拒绝含糊的负数或小数输入。 */
  public getRecentMessages(limit: number): TMessage[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('limit 必须是大于等于 0 的整数');
    }

    return limit === 0 ? [] : this.messages.slice(-limit);
  }

  public clear(): void {
    this.messages.length = 0;
  }
}

/** Runtime 单实例使用的内存计划缓存。 */
export class PlanCache<TPlan = unknown> {
  private readonly plans = new Map<string, TPlan>();

  public set(taskKey: string, plan: TPlan): void {
    this.plans.set(taskKey, plan);
  }

  public get(taskKey: string): TPlan | undefined {
    return this.plans.get(taskKey);
  }

  public clear(): void {
    this.plans.clear();
  }
}

/** 从用户输入生成大小写和空白稳定的简单缓存键。 */
export function createPlanCacheKey(userInput: string): string {
  return userInput.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}
