/** 当前支持的模型提供方类型，后续 factory 会据此路由具体实现。 */
export type ModelProvider = 'openai-compatible' | 'anthropic-compatible';

/** 模型消息角色尽量保持中立，不绑定某一家 SDK 的枚举。 */
export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** 工具选择策略先覆盖 MVP 需要的三种情况。 */
export type ModelToolChoice = 'auto' | 'none' | { name: string };

/** 统一抽象模型结束原因，避免上层感知 provider 原始字段差异。 */
export type ModelStopReason =
  | 'completed'
  | 'stop'
  | 'max_tokens'
  | 'tool_call'
  | 'error';

/** 这一组 JSON 类型用于承接通用元数据和原始响应负载。 */
export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/** 统一后的模型消息结构，是 chat / stream 两条链路共用的输入单元。 */
export interface ModelMessage {
  role: ModelMessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  metadata?: JsonObject;
}

/** ToolDefinition 保持协议层抽象，不在这里绑定任何执行实现。 */
export interface ModelToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonObject;
}

/** ModelRequest 是所有模型适配器都要吃下去的标准请求。 */
export interface ModelRequest {
  messages: ModelMessage[];
  tools?: ModelToolDefinition[];
  toolChoice?: ModelToolChoice;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  metadata?: JsonObject;
}

/** Token 用量统一格式化，方便后续做上下文预算与成本统计。 */
export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** 非流式响应最终都会收敛成这一份结构。 */
export interface ModelResponse {
  id?: string;
  modelId: string;
  message: ModelMessage;
  stopReason: ModelStopReason;
  usage?: ModelUsage;
  raw?: JsonValue;
}

/** 流式文本增量事件。 */
export interface TextDeltaModelEvent {
  type: 'text.delta';
  delta: string;
}

/** 流式工具调用事件，后续 executor 可以据此决定是否继续调度工具。 */
export interface ToolCallModelEvent {
  type: 'tool.call';
  toolName: string;
  arguments: JsonObject;
}

/** 流式结束时的最终响应事件。 */
export interface ResponseCompletedModelEvent {
  type: 'response.completed';
  response: ModelResponse;
}

/** 模型层错误统一外抛成事件，而不是混入普通文本流。 */
export interface ModelErrorEvent {
  type: 'error';
  error: Error;
}

export type ModelEvent =
  | TextDeltaModelEvent
  | ToolCallModelEvent
  | ResponseCompletedModelEvent
  | ModelErrorEvent;

/** 模型配置只描述“如何连接模型”，不混入运行时任务信息。 */
export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  baseUrl?: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
  defaultOptions?: Omit<ModelRequest, 'messages'>;
}

/** BaseModel 是 core 层未来唯一应该依赖的模型能力边界。 */
export interface BaseModel {
  readonly config: ModelConfig;
  chat(request: ModelRequest): Promise<ModelResponse>;
  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
