import type { ApprovalRequest } from '@helix-agent/protocol';

import type { ApprovalResolveMessage } from '../shared/webview-message';

export interface ApprovalResolverPort {
  approve(id: string): ApprovalRequest;
  reject(id: string, reason?: string): ApprovalRequest;
}

/** 将 Webview 审批决定交给 Runtime 共用的 ApprovalManager。 */
export function resolveApproval(
  approvalManager: ApprovalResolverPort,
  message: ApprovalResolveMessage,
): ApprovalRequest {
  if (message.approved) {
    return approvalManager.approve(message.approvalId);
  }

  return approvalManager.reject(message.approvalId, message.reason);
}
