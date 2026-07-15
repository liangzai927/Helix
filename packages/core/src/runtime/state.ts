import type { AgentTaskStatus, StatusChangedEvent } from '@helix-agent/protocol';

import type { RuntimeClock } from './types';

/** Runtime 内部状态直接与协议层任务状态对齐，避免后续双轨映射。 */
export type RuntimeStatus = AgentTaskStatus;

/** RuntimeState 只负责当前任务的状态，不负责任务本体数据。 */
export interface RuntimeStateOptions {
  taskId: string;
  initialStatus?: RuntimeStatus;
  clock?: RuntimeClock;
}

const DEFAULT_RUNTIME_STATUS: RuntimeStatus = 'idle';

/** 统一从可注入时钟取时间，方便测试稳定断言事件时间戳。 */
function getCreatedAt(clock?: RuntimeClock): string {
  return new Date(clock?.now() ?? Date.now()).toISOString();
}

/** 轻量状态容器：当前阶段只做读写和事件生成，不做复杂状态跃迁校验。 */
export class RuntimeState {
  private status: RuntimeStatus;

  public constructor(private readonly options: RuntimeStateOptions) {
    this.status = options.initialStatus ?? DEFAULT_RUNTIME_STATUS;
  }

  public getStatus(): RuntimeStatus {
    return this.status;
  }

  public setStatus(status: RuntimeStatus, message?: string): StatusChangedEvent {
    // 先更新内部状态，再返回对外事件，确保调用方拿到事件时状态已生效。
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
