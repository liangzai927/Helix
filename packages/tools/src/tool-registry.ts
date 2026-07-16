import type { Tool, ToolInputSchema } from './tool';

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  readOnly: boolean;
  requiresApproval: boolean;
}

/** Registry 内部统一的工具执行边界。 */
export interface RegisteredTool extends ToolDescriptor {
  /** 使用已经过 Schema 约束的未知输入执行具体工具。 */
  execute(input: unknown): Promise<unknown>;
}

/** 按名称管理 Runtime 允许使用的工具。 */
export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  /** 注册工具并拒绝重复名称，避免运行时被静默覆盖。 */
  public register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 ${tool.name} 已经注册`);
    }

    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      readOnly: tool.readOnly,
      requiresApproval: tool.requiresApproval,
      execute: (input: unknown) => tool.execute(input as TInput),
    });
  }

  /** 按名称返回已注册工具，未注册时返回 undefined。 */
  public get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /** 按注册顺序返回不包含执行函数的工具元数据。 */
  public list(): ToolDescriptor[] {
    return Array.from(this.tools.values(), (tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      readOnly: tool.readOnly,
      requiresApproval: tool.requiresApproval,
    }));
  }
}
