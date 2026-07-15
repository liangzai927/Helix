import type { AgentEvent } from '@helix-agent/protocol';

export type RuntimeEventListener<TEvent = AgentEvent> = (
  event: TEvent,
) => void | Promise<void>;

export interface RuntimeEventSink<TEvent = AgentEvent> {
  publish(event: TEvent): Promise<void> | void;
}

export class EventEmitter<TEvent = AgentEvent> implements RuntimeEventSink<TEvent> {
  private readonly listeners = new Set<RuntimeEventListener<TEvent>>();

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
    const listeners = [...this.listeners];

    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (error) {
        void error;
      }
    }
  }

  public publish(event: TEvent): Promise<void> {
    return this.emit(event);
  }
}
