/** 工具层只依赖审批结果，不依赖 Core 的具体管理器。 */
export interface ToolApprovalResolution {
  approved: boolean;
  reason?: string;
}

/** 审批端口通过结构化接口隔离 packages/tools 与 packages/core。 */
export interface ApprovalPort {
  waitForApproval(id: string): Promise<ToolApprovalResolution>;
}
