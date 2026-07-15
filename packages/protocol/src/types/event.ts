import type { EntityId, IsoDateTimeString } from './common';
import type { AgentPlan } from './plan';
import type { AgentPatch } from './patch';
import type { ApprovalRequest } from './approval';
import type { AgentTask, AgentTaskStatus } from './task';
import type { ToolCall, ToolResult } from './tool';

/** 命令执行请求。 */
export interface CommandExecution {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

/** 命令执行结果。 */
export interface CommandExecutionResult extends CommandExecution {
  exitCode: number;
  summary: string;
}

/** 统一事件基类。 */
export interface AgentEventBase<TType extends string> {
  type: TType;
  taskId: EntityId;
  createdAt: IsoDateTimeString;
}

/** 任务创建事件。 */
export interface TaskCreatedEvent extends AgentEventBase<'task.created'> {
  task: AgentTask;
}

/** 状态变化事件。 */
export interface StatusChangedEvent extends AgentEventBase<'status.changed'> {
  status: AgentTaskStatus;
  message?: string;
}

/** 流式文本输出事件。 */
export interface TextDeltaEvent extends AgentEventBase<'text.delta'> {
  delta: string;
}

/** 工具调用开始事件。 */
export interface ToolCallStartedEvent extends AgentEventBase<'tool.call.started'> {
  toolCall: ToolCall;
}

/** 工具调用结束事件。 */
export interface ToolCallFinishedEvent extends AgentEventBase<'tool.call.finished'> {
  toolResult: ToolResult;
}

/** 计划生成完成事件。 */
export interface PlanCreatedEvent extends AgentEventBase<'plan.created'> {
  plan: AgentPlan;
}

/** 补丁生成完成事件。 */
export interface PatchCreatedEvent extends AgentEventBase<'patch.created'> {
  patch: AgentPatch;
}

/** 审批请求发起事件。 */
export interface ApprovalRequestedEvent extends AgentEventBase<'approval.requested'> {
  approval: ApprovalRequest;
}

/** 审批请求处理完成事件。 */
export interface ApprovalResolvedEvent extends AgentEventBase<'approval.resolved'> {
  approval: ApprovalRequest;
}

/** 命令执行开始事件。 */
export interface CommandStartedEvent extends AgentEventBase<'command.started'> {
  command: CommandExecution;
}

/** 命令执行完成事件。 */
export interface CommandFinishedEvent extends AgentEventBase<'command.finished'> {
  command: CommandExecutionResult;
}

/** 运行错误事件。 */
export interface ErrorEvent extends AgentEventBase<'error'> {
  error: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
}

/** 任务完成事件。 */
export interface FinishedEvent extends AgentEventBase<'finished'> {
  status: Extract<AgentTaskStatus, 'finished' | 'failed' | 'cancelled'>;
  summary?: string;
}

/** Agent 对外输出的统一事件流。 */
export type AgentEvent =
  | TaskCreatedEvent
  | StatusChangedEvent
  | TextDeltaEvent
  | ToolCallStartedEvent
  | ToolCallFinishedEvent
  | PlanCreatedEvent
  | PatchCreatedEvent
  | ApprovalRequestedEvent
  | ApprovalResolvedEvent
  | CommandStartedEvent
  | CommandFinishedEvent
  | ErrorEvent
  | FinishedEvent;
