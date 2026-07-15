import type { ApprovalManager } from '../approval';
import type { ContextBuilder } from '../context';
import type { ConversationMemory } from '../memory';
import type { Executor } from '../executor';
import type { Planner } from '../planner';

export type AgentRuntimeMode = 'chat' | 'plan' | 'execute';

export type RuntimeMetadataValue = string | number | boolean | null;

export interface RuntimeMetadata {
  [key: string]: RuntimeMetadataValue;
}

export interface AgentRuntimeOptions {
  taskId?: string;
  conversationId?: string;
  cwd?: string;
  mode?: AgentRuntimeMode;
  metadata?: RuntimeMetadata;
  signal?: AbortSignal;
}

export interface ResolvedAgentRuntimeOptions extends AgentRuntimeOptions {
  mode: AgentRuntimeMode;
  metadata: RuntimeMetadata;
}

export interface RuntimeClock {
  now(): number;
}

export interface RuntimeIdGenerator {
  next(prefix?: string): string;
}

export interface RuntimeLogger {
  debug(message: string, metadata?: RuntimeMetadata): void;
  info(message: string, metadata?: RuntimeMetadata): void;
  warn(message: string, metadata?: RuntimeMetadata): void;
  error(message: string, error?: Error, metadata?: RuntimeMetadata): void;
}

export interface RuntimeDependencies {
  planner?: Planner;
  executor?: Executor;
  contextBuilder?: ContextBuilder;
  memory?: ConversationMemory;
  approvalManager?: ApprovalManager;
  clock?: RuntimeClock;
  idGenerator?: RuntimeIdGenerator;
  logger?: RuntimeLogger;
}

export const DEFAULT_AGENT_RUNTIME_MODE: AgentRuntimeMode = 'chat';

export function resolveAgentRuntimeOptions(
  options: AgentRuntimeOptions = {},
): ResolvedAgentRuntimeOptions {
  return {
    ...options,
    mode: options.mode ?? DEFAULT_AGENT_RUNTIME_MODE,
    metadata: options.metadata ?? {},
  };
}

export function defineRuntimeDependencies(
  dependencies: RuntimeDependencies = {},
): RuntimeDependencies {
  return { ...dependencies };
}
