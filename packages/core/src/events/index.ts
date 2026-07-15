export type RuntimeEventListener<TEvent = unknown> = (
  event: TEvent,
) => void | Promise<void>;

export interface RuntimeEventSink<TEvent = unknown> {
  publish(event: TEvent): Promise<void> | void;
}
