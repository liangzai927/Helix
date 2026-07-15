export type ModelProvider = 'openai-compatible' | 'anthropic-compatible';

export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export type ModelToolChoice = 'auto' | 'none' | { name: string };

export type ModelStopReason =
  | 'completed'
  | 'stop'
  | 'max_tokens'
  | 'tool_call'
  | 'error';

export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface ModelMessage {
  role: ModelMessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  metadata?: JsonObject;
}

export interface ModelToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonObject;
}

export interface ModelRequest {
  messages: ModelMessage[];
  tools?: ModelToolDefinition[];
  toolChoice?: ModelToolChoice;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  metadata?: JsonObject;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelResponse {
  id?: string;
  modelId: string;
  message: ModelMessage;
  stopReason: ModelStopReason;
  usage?: ModelUsage;
  raw?: JsonValue;
}

export interface TextDeltaModelEvent {
  type: 'text.delta';
  delta: string;
}

export interface ToolCallModelEvent {
  type: 'tool.call';
  toolName: string;
  arguments: JsonObject;
}

export interface ResponseCompletedModelEvent {
  type: 'response.completed';
  response: ModelResponse;
}

export interface ModelErrorEvent {
  type: 'error';
  error: Error;
}

export type ModelEvent =
  | TextDeltaModelEvent
  | ToolCallModelEvent
  | ResponseCompletedModelEvent
  | ModelErrorEvent;

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  baseUrl?: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
  defaultOptions?: Omit<ModelRequest, 'messages'>;
}

export interface BaseModel {
  readonly config: ModelConfig;
  chat(request: ModelRequest): Promise<ModelResponse>;
  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
