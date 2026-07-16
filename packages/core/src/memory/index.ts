/** 会话记忆的最小能力集合，先定义边界，后续再补具体存储实现。 */
export interface ConversationMemory<TMessage = unknown> {
  appendMessage(message: TMessage): Promise<void> | void;
  listMessages(): Promise<readonly TMessage[]> | readonly TMessage[];
  clear?(): Promise<void> | void;
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
