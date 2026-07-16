import type { ModelMessage, ModelRequest } from '@helix-agent/models';
import type { AgentPlan, Message, ToolResult } from '@helix-agent/protocol';

import type { RuntimeMetadata } from '../runtime';

import { ContextBudget } from './context-budget';

export * from './context-budget';

/** Runtime 在构建上下文时会汇总的最小快照。 */
export interface RuntimeContextSnapshot<TMessage = unknown, TToolResult = unknown> {
  cwd?: string;
  messages?: readonly TMessage[];
  toolResults?: readonly TToolResult[];
  metadata?: RuntimeMetadata;
}

/** ContextBuilder 负责把输入材料整理成后续 planner / model 可消费的上下文。 */
export interface ContextBuilder<TInput = unknown, TContext = RuntimeContextSnapshot> {
  build(input: TInput): Promise<TContext> | TContext;
}

export interface DefaultContextBuilderInput {
  userInput: string;
  conversation: readonly Message[];
  toolResults: readonly ToolResult[];
  planCache?: AgentPlan;
}

export interface DefaultContextBuilderOptions {
  recentMessageLimit?: number;
  contextBudget?: ContextBudget;
}

/** 将会话、工具摘要和缓存计划整理成模型请求。 */
export class DefaultContextBuilder
  implements ContextBuilder<DefaultContextBuilderInput, ModelRequest>
{
  private readonly recentMessageLimit: number;
  private readonly contextBudget: ContextBudget | undefined;

  public constructor(options: DefaultContextBuilderOptions = {}) {
    this.recentMessageLimit = options.recentMessageLimit ?? 6;
    this.contextBudget = options.contextBudget;

    if (!Number.isInteger(this.recentMessageLimit) || this.recentMessageLimit < 0) {
      throw new Error('recentMessageLimit 必须是大于等于 0 的整数');
    }
  }

  public build(input: DefaultContextBuilderInput): ModelRequest {
    const messages: ModelMessage[] = [];

    if (input.planCache !== undefined) {
      messages.push({
        role: 'system',
        content: `缓存计划：${input.planCache.summary ?? input.planCache.goal}`,
      });
    }

    const recentConversation =
      this.recentMessageLimit === 0
        ? []
        : input.conversation.slice(-this.recentMessageLimit);

    messages.push(...recentConversation.map(convertConversationMessage));
    messages.push(...input.toolResults.map(convertToolResult));
    messages.push({ role: 'user', content: input.userInput });

    return {
      messages: this.contextBudget?.trim(messages) ?? messages,
    };
  }
}

/** 将协议消息收敛成模型层需要的公共字段。 */
function convertConversationMessage(message: Message): ModelMessage {
  return {
    role: message.role,
    content: message.content,
    ...(message.toolCallId === undefined ? {} : { toolCallId: message.toolCallId }),
  };
}

/** 工具上下文只保留摘要，避免原始输出直接进入 Prompt。 */
function convertToolResult(result: ToolResult): ModelMessage {
  return {
    role: 'tool',
    content: result.summary,
    name: result.toolName,
    toolCallId: result.toolCallId,
  };
}
