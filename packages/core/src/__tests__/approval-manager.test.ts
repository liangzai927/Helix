import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApprovalManager } from '../index';

afterEach(() => {
  vi.useRealTimers();
});

describe('ApprovalManager', () => {
  it('creates a pending approval request', () => {
    const manager = new ApprovalManager({
      idGenerator: { next: () => 'approval_1' },
      clock: { now: () => Date.UTC(2026, 6, 16, 9, 0, 0, 0) },
    });

    const request = manager.createApprovalRequest({
      taskId: 'task_1',
      kind: 'patch',
      title: '应用补丁',
      reason: '需要写入文件',
      patchId: 'patch_1',
    });

    expect(request).toEqual({
      id: 'approval_1',
      taskId: 'task_1',
      kind: 'patch',
      title: '应用补丁',
      reason: '需要写入文件',
      status: 'pending',
      createdAt: '2026-07-16T09:00:00.000Z',
      patchId: 'patch_1',
    });
  });

  it('approves a pending request and wakes its waiter', async () => {
    const manager = new ApprovalManager({
      idGenerator: { next: () => 'approval_1' },
    });
    manager.createApprovalRequest({
      taskId: 'task_1',
      kind: 'patch',
      title: '应用补丁',
      reason: '需要写入文件',
    });

    const waiting = manager.waitForApproval('approval_1');
    const approvedRequest = manager.approve('approval_1');

    await expect(waiting).resolves.toEqual({ approved: true });
    expect(approvedRequest.status).toBe('approved');
  });

  it('rejects a pending request with a reason', async () => {
    const manager = new ApprovalManager({
      idGenerator: { next: () => 'approval_1' },
    });
    manager.createApprovalRequest({
      taskId: 'task_1',
      kind: 'command',
      title: '执行命令',
      reason: '命令具有写入风险',
    });

    const rejectedRequest = manager.reject('approval_1', '用户取消');

    await expect(manager.waitForApproval('approval_1')).resolves.toEqual({
      approved: false,
      reason: '用户取消',
    });
    expect(rejectedRequest.status).toBe('rejected');
  });

  it('expires a request after its timeout', async () => {
    vi.useFakeTimers();
    const manager = new ApprovalManager({
      idGenerator: { next: () => 'approval_1' },
      clock: { now: () => Date.now() },
    });
    manager.createApprovalRequest({
      taskId: 'task_1',
      kind: 'tool_call',
      title: '调用工具',
      reason: '工具需要审批',
      timeoutMs: 100,
    });

    const waiting = manager.waitForApproval('approval_1');
    await vi.advanceTimersByTimeAsync(100);

    await expect(waiting).resolves.toEqual({
      approved: false,
      reason: '审批已超时',
    });
    expect(manager.getApprovalRequest('approval_1').status).toBe('expired');
  });
});
