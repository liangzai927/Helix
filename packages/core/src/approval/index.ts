import { randomUUID } from 'node:crypto';

import type { ApprovalRequest, ApprovalStatus } from '@helix-agent/protocol';

/** 一次审批完成后的统一结果。 */
export interface ApprovalResolution<TResult = unknown> {
  approved: boolean;
  result?: TResult;
  reason?: string;
}

export type CreateApprovalRequestInput = Omit<
  ApprovalRequest,
  'id' | 'status' | 'createdAt' | 'expiresAt'
> & {
  timeoutMs?: number;
};

export interface ApprovalManagerOptions {
  defaultTimeoutMs?: number;
  clock?: { now(): number };
  idGenerator?: { next(prefix?: string): string };
}

interface ApprovalEntry {
  request: ApprovalRequest;
  reason: string | undefined;
  waiters: Set<(resolution: ApprovalResolution) => void>;
  timer?: ReturnType<typeof setTimeout>;
}

/** ApprovalManager 对外提供的完整审批管理能力。 */
export interface ApprovalManagerPort {
  createApprovalRequest(input: CreateApprovalRequestInput): ApprovalRequest;
  approve(id: string): ApprovalRequest;
  reject(id: string, reason?: string): ApprovalRequest;
  waitForApproval(id: string): Promise<ApprovalResolution>;
  getApprovalRequest(id: string): ApprovalRequest;
}

/** 单进程内存审批管理器，负责状态转换、等待唤醒和超时。 */
export class ApprovalManager implements ApprovalManagerPort {
  private readonly entries = new Map<string, ApprovalEntry>();

  public constructor(private readonly options: ApprovalManagerOptions = {}) {}

  /** 创建 pending 请求，并根据超时配置写入 expiresAt。 */
  public createApprovalRequest(input: CreateApprovalRequestInput): ApprovalRequest {
    const { timeoutMs = this.options.defaultTimeoutMs, ...requestInput } = input;

    if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
      throw new Error('timeoutMs 必须是大于 0 的有限数字');
    }

    const id = this.options.idGenerator?.next('approval') ?? `approval_${randomUUID()}`;

    if (this.entries.has(id)) {
      throw new Error(`审批请求 ${id} 已存在`);
    }

    const createdAtMs = this.getNow();
    const request: ApprovalRequest = {
      ...requestInput,
      id,
      status: 'pending',
      createdAt: new Date(createdAtMs).toISOString(),
      ...(timeoutMs === undefined
        ? {}
        : { expiresAt: new Date(createdAtMs + timeoutMs).toISOString() }),
    };

    this.entries.set(id, {
      request,
      reason: undefined,
      waiters: new Set(),
    });

    return request;
  }

  public approve(id: string): ApprovalRequest {
    return this.settle(id, 'approved');
  }

  public reject(id: string, reason = '审批已拒绝'): ApprovalRequest {
    return this.settle(id, 'rejected', reason);
  }

  /** 等待请求完成；已有结果立即返回，pending 请求按剩余时间等待。 */
  public waitForApproval(id: string): Promise<ApprovalResolution> {
    const entry = this.requireEntry(id);
    const resolution = createResolution(entry);

    if (resolution !== undefined) {
      return Promise.resolve(resolution);
    }

    const remainingMs = getRemainingTimeout(entry.request, this.getNow());

    if (remainingMs !== undefined && remainingMs <= 0) {
      this.settle(id, 'expired', '审批已超时');
      return Promise.resolve({ approved: false, reason: '审批已超时' });
    }

    return new Promise((resolve) => {
      entry.waiters.add(resolve);

      if (remainingMs !== undefined && entry.timer === undefined) {
        entry.timer = setTimeout(() => {
          this.settle(id, 'expired', '审批已超时');
        }, remainingMs);
      }
    });
  }

  public getApprovalRequest(id: string): ApprovalRequest {
    return this.requireEntry(id).request;
  }

  /** 完成一次状态转换并唤醒所有等待者，已完成请求保持原状态。 */
  private settle(id: string, status: ApprovalStatus, reason?: string): ApprovalRequest {
    const entry = this.requireEntry(id);

    if (entry.request.status !== 'pending') {
      return entry.request;
    }

    entry.request = {
      ...entry.request,
      status,
    };
    entry.reason = reason;

    if (entry.timer !== undefined) {
      clearTimeout(entry.timer);
      delete entry.timer;
    }

    const resolution = createResolution(entry);

    if (resolution !== undefined) {
      for (const waiter of entry.waiters) {
        waiter(resolution);
      }
    }

    entry.waiters.clear();
    return entry.request;
  }

  private requireEntry(id: string): ApprovalEntry {
    const entry = this.entries.get(id);

    if (entry === undefined) {
      throw new Error(`审批请求 ${id} 不存在`);
    }

    return entry;
  }

  private getNow(): number {
    return this.options.clock?.now() ?? Date.now();
  }
}

/** 将终态请求转换成工具和 Executor 共用的审批结果。 */
function createResolution(entry: ApprovalEntry): ApprovalResolution | undefined {
  if (entry.request.status === 'approved') {
    return { approved: true };
  }

  if (entry.request.status === 'pending') {
    return undefined;
  }

  return {
    approved: false,
    ...(entry.reason === undefined ? {} : { reason: entry.reason }),
  };
}

/** 根据 expiresAt 计算剩余等待时间，无超时配置时返回 undefined。 */
function getRemainingTimeout(request: ApprovalRequest, now: number): number | undefined {
  if (request.expiresAt === undefined) {
    return undefined;
  }

  return new Date(request.expiresAt).getTime() - now;
}
