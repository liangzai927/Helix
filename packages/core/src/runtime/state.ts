import type { AgentTaskStatus, StatusChangedEvent } from '@helix-agent/protocol';

import type { RuntimeClock } from './types';

export type RuntimeStatus = AgentTaskStatus;

export interface RuntimeStateOptions {
  taskId: string;
  initialStatus?: RuntimeStatus;
  clock?: RuntimeClock;
}

const DEFAULT_RUNTIME_STATUS: RuntimeStatus = 'idle';

function getCreatedAt(clock?: RuntimeClock): string {
  return new Date(clock?.now() ?? Date.now()).toISOString();
}

export class RuntimeState {
  private status: RuntimeStatus;

  public constructor(private readonly options: RuntimeStateOptions) {
    this.status = options.initialStatus ?? DEFAULT_RUNTIME_STATUS;
  }

  public getStatus(): RuntimeStatus {
    return this.status;
  }

  public setStatus(status: RuntimeStatus, message?: string): StatusChangedEvent {
    this.status = status;

    return {
      type: 'status.changed',
      taskId: this.options.taskId,
      createdAt: getCreatedAt(this.options.clock),
      status,
      ...(message === undefined ? {} : { message }),
    };
  }
}
