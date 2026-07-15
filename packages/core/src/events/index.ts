import type { AgentEvent } from '@helix-agent/protocol';

/** Runtime 对事件监听器的统一约束，允许同步或异步消费。 */
export type RuntimeEventListener<TEvent = AgentEvent> = (
  event: TEvent,
) => void | Promise<void>;

/** 事件发布边界，后续 Runtime 可以只依赖这个接口而不是具体实现。 */
export interface RuntimeEventSink<TEvent = AgentEvent> {
  publish(event: TEvent): Promise<void> | void;
}

/** 轻量事件总线：只做广播，不做历史缓存和优先级调度。 */
export class EventEmitter<TEvent = AgentEvent> implements RuntimeEventSink<TEvent> {
  private readonly listeners = new Set<RuntimeEventListener<TEvent>>();

  /** 注册监听器，并返回一个可直接注销的清理函数。 */
  public on(listener: RuntimeEventListener<TEvent>): () => void {
    this.listeners.add(listener);

    return () => {
      this.off(listener);
    };
  }

  public off(listener: RuntimeEventListener<TEvent>): void {
    this.listeners.delete(listener);
  }

  public async emit(event: TEvent): Promise<void> {
    // 先复制一份监听器快照，避免回调内部的 on/off 影响当前派发过程。
    const listeners = [...this.listeners];

    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (error) {
        // 单个 listener 失败不能打断整个事件流，错误由上层按需接管。
        void error;
      }
    }
  }

  public publish(event: TEvent): Promise<void> {
    return this.emit(event);
  }
}
