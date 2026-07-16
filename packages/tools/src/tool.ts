/** 工具输入 Schema 保持 JSON Schema 形态，不绑定具体验证库。 */
export type ToolInputSchema = Record<string, unknown>;

/** 所有工具共用的最小契约。 */
export interface Tool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ToolInputSchema;
  readonly readOnly: boolean;
  readonly requiresApproval: boolean;

  /** 输入相关的动态审批判断；未实现时使用静态 requiresApproval。 */
  requiresApprovalFor?(input: TInput): boolean;

  /** 执行工具并返回可供 Runtime 消费的结构化结果。 */
  execute(input: TInput): Promise<TOutput>;
}
