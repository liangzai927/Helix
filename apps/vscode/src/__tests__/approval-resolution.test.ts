import type { ApprovalRequest } from '@helix-agent/protocol';
import { describe, expect, it, vi } from 'vitest';

import { resolveApproval } from '../approval-resolution';

const approval: ApprovalRequest = {
  id: 'approval-1',
  taskId: 'task-1',
  kind: 'patch',
  title: '应用补丁',
  reason: '需要修改文件',
  status: 'approved',
  createdAt: '2026-07-16T00:00:00.000Z',
};

describe('resolveApproval', () => {
  it('批准时调用 ApprovalManager.approve', () => {
    const approve = vi.fn(() => approval);
    const reject = vi.fn(() => approval);

    const result = resolveApproval(
      { approve, reject },
      { type: 'approval.resolve', approvalId: 'approval-1', approved: true },
    );

    expect(result).toBe(approval);
    expect(approve).toHaveBeenCalledWith('approval-1');
    expect(reject).not.toHaveBeenCalled();
  });

  it('拒绝时将原因传给 ApprovalManager.reject', () => {
    const approve = vi.fn(() => approval);
    const reject = vi.fn(() => approval);

    resolveApproval(
      { approve, reject },
      {
        type: 'approval.resolve',
        approvalId: 'approval-1',
        approved: false,
        reason: '用户拒绝',
      },
    );

    expect(reject).toHaveBeenCalledWith('approval-1', '用户拒绝');
    expect(approve).not.toHaveBeenCalled();
  });
});
