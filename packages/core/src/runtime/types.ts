import type { ApprovalManager } from '../approval';
import type { ContextBuilder } from '../context';
import type { ConversationMemory } from '../memory';
import type { Executor } from '../executor';
import type { Planner } from '../planner';
import type { ToolRegistry } from '@helix-agent/tools';

/** Runtime 面向外部的三种基础模式。 */
export type AgentRuntimeMode = 'chat' | 'plan' | 'execute';

/** 先约束成轻量元数据，避免在 runtime 边界塞入复杂对象。 */
export type RuntimeMetadataValue = string | number | boolean | null;

/** Runtime 内各模块可共享的附加标记信息。 */
export interface RuntimeMetadata {
  [key: string]: RuntimeMetadataValue;
}

/** 创建一次 runtime 运行时可传入的用户侧选项。 */
export interface AgentRuntimeOptions {
  taskId?: string;
  conversationId?: string;
  cwd?: string;
  mode?: AgentRuntimeMode;
  metadata?: RuntimeMetadata;
  signal?: AbortSignal;
}

/** Runtime 真正执行前会把可选项收敛成稳定的内部形态。 */
export interface ResolvedAgentRuntimeOptions extends AgentRuntimeOptions {
  mode: AgentRuntimeMode;
  metadata: RuntimeMetadata;
}

/** 可注入时钟，用来隔离真实时间和测试时间。 */
export interface RuntimeClock {
  now(): number;
}

/** 可注入 ID 生成器，后续方便统一 task / plan / patch 编号策略。 */
export interface RuntimeIdGenerator {
  next(prefix?: string): string;
}

/** Runtime 自身只依赖日志接口，不依赖具体日志实现。 */
export interface RuntimeLogger {
  debug(message: string, metadata?: RuntimeMetadata): void;
  info(message: string, metadata?: RuntimeMetadata): void;
  warn(message: string, metadata?: RuntimeMetadata): void;
  error(message: string, error?: Error, metadata?: RuntimeMetadata): void;
}

/** RuntimeDependencies 是 core 和各子系统之间最关键的注入边界。 */
export interface RuntimeDependencies {
  planner?: Planner;
  executor?: Executor;
  contextBuilder?: ContextBuilder;
  memory?: ConversationMemory;
  approvalManager?: ApprovalManager;
  clock?: RuntimeClock;
  idGenerator?: RuntimeIdGenerator;
  logger?: RuntimeLogger;
  toolRegistry?: ToolRegistry;
}

export const DEFAULT_AGENT_RUNTIME_MODE: AgentRuntimeMode = 'chat';

export function resolveAgentRuntimeOptions(
  options: AgentRuntimeOptions = {},
): ResolvedAgentRuntimeOptions {
  // 这里集中补默认值，避免后续 runtime 到处判空。
  return {
    ...options,
    mode: options.mode ?? DEFAULT_AGENT_RUNTIME_MODE,
    metadata: options.metadata ?? {},
  };
}

export function defineRuntimeDependencies(
  dependencies: RuntimeDependencies = {},
): RuntimeDependencies {
  // 当前阶段只做浅拷贝封装，后续如果要补默认实现，可以集中加在这里。
  return { ...dependencies };
}
