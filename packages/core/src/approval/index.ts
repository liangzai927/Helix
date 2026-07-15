export interface ApprovalResolution<TResult = unknown> {
  approved: boolean;
  result?: TResult;
  reason?: string;
}

export interface ApprovalManager<TRequest = unknown, TResult = unknown> {
  createApprovalRequest(request: TRequest): Promise<string> | string;
  waitForApproval(id: string): Promise<ApprovalResolution<TResult>>;
}
