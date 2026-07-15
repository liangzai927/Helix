/** 一次审批完成后的统一结果。 */
export interface ApprovalResolution<TResult = unknown> {
  approved: boolean;
  result?: TResult;
  reason?: string;
}

/** 审批管理器只定义边界，不关心具体宿主如何展示审批 UI。 */
export interface ApprovalManager<TRequest = unknown, TResult = unknown> {
  createApprovalRequest(request: TRequest): Promise<string> | string;
  waitForApproval(id: string): Promise<ApprovalResolution<TResult>>;
}
