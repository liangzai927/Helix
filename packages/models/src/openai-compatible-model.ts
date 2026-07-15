import {
  invalidResponseError,
  isJsonValue,
  isRecord,
  normalizeModelError,
  readErrorDetails,
  readJsonResponse,
  requireNonEmptyValue,
} from './adapter-utils';
import { ModelError } from './errors';
import { parseSseJson, readSseData } from './sse';
import type {
  BaseModel,
  ModelConfig,
  ModelEvent,
  ModelMessage,
  ModelRequest,
  ModelResponse,
  ModelStopReason,
  ModelUsage,
} from './types';

/** OpenAI Compatible Adapter 所需的连接配置。 */
export interface OpenAICompatibleModelOptions {
  baseUrl: string;
  modelId: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
  defaultOptions?: Omit<ModelRequest, 'messages'>;
}

interface ParsedStreamChunk {
  id?: string;
  modelId?: string;
  delta?: string;
  stopReason?: ModelStopReason;
  usage?: ModelUsage;
}

/** 通过标准 Chat Completions HTTP 协议接入 OpenAI Compatible 服务。 */
export class OpenAICompatibleModel implements BaseModel {
  public readonly config: ModelConfig;
  private readonly endpoint: string;

  public constructor(options: OpenAICompatibleModelOptions) {
    const baseUrl = requireNonEmptyValue(options.baseUrl, 'baseUrl');
    const modelId = requireNonEmptyValue(options.modelId, 'modelId');

    this.config = {
      provider: 'openai-compatible',
      modelId,
      baseUrl,
      ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
      ...(options.defaultHeaders === undefined
        ? {}
        : { defaultHeaders: { ...options.defaultHeaders } }),
      ...(options.defaultOptions === undefined
        ? {}
        : { defaultOptions: { ...options.defaultOptions } }),
    };
    this.endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  }

  /** 发起一次非流式 Chat Completions 请求并返回统一响应。 */
  public async chat(request: ModelRequest): Promise<ModelResponse> {
    try {
      const response = await this.sendRequest(request, false);
      const payload = await readJsonResponse(response);

      return parseChatResponse(payload, this.config.modelId);
    } catch (error) {
      throw normalizeModelError(error);
    }
  }

  /** 解析 Chat Completions SSE，并持续输出统一模型事件。 */
  public async *stream(request: ModelRequest): AsyncIterable<ModelEvent> {
    try {
      const response = await this.sendRequest(request, true);

      if (response.body === null) {
        throw new ModelError('模型流式响应缺少可读取内容', {
          code: 'invalid_response',
        });
      }

      let id: string | undefined;
      let modelId = this.config.modelId;
      let content = '';
      let stopReason: ModelStopReason = 'completed';
      let usage: ModelUsage | undefined;

      for await (const data of readSseData(response.body)) {
        if (data === '[DONE]') {
          yield {
            type: 'response.completed',
            response: {
              ...(id === undefined ? {} : { id }),
              modelId,
              message: {
                role: 'assistant',
                content,
              },
              stopReason,
              ...(usage === undefined ? {} : { usage }),
            },
          };
          return;
        }

        const chunk = parseStreamChunk(parseSseJson(data));

        id = chunk.id ?? id;
        modelId = chunk.modelId ?? modelId;
        stopReason = chunk.stopReason ?? stopReason;
        usage = chunk.usage ?? usage;

        if (chunk.delta !== undefined && chunk.delta.length > 0) {
          content += chunk.delta;
          yield {
            type: 'text.delta',
            delta: chunk.delta,
          };
        }
      }

      throw new ModelError('模型流式响应未收到 [DONE] 结束标记', {
        code: 'invalid_response',
      });
    } catch (error) {
      yield {
        type: 'error',
        error: normalizeModelError(error),
      };
    }
  }

  /** 统一构造请求和处理 HTTP 错误，保证 chat / stream 行为一致。 */
  private async sendRequest(
    request: ModelRequest,
    stream: boolean,
  ): Promise<Response> {
    const body = createRequestBody(this.config, request, stream);
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
    });

    if (this.config.apiKey !== undefined && this.config.apiKey.length > 0) {
      headers.set('Authorization', `Bearer ${this.config.apiKey}`);
    }

    let response: Response;

    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ModelError('模型请求失败', {
        code: 'request_failed',
        cause: error,
      });
    }

    if (!response.ok) {
      const details = await readErrorDetails(response);

      throw new ModelError(
        `模型请求失败，HTTP ${response.status}${details.length === 0 ? '' : `: ${details}`}`,
        {
          code: 'request_failed',
          status: response.status,
        },
      );
    }

    return response;
  }
}

/** 将统一请求映射为 Chat Completions 请求体，并显式拦截尚未支持的工具能力。 */
function createRequestBody(
  config: ModelConfig,
  request: ModelRequest,
  stream: boolean,
): Record<string, unknown> {
  const defaults = config.defaultOptions;
  const tools = request.tools ?? defaults?.tools;
  const toolChoice = request.toolChoice ?? defaults?.toolChoice;

  if (
    (tools !== undefined && tools.length > 0) ||
    (toolChoice !== undefined && toolChoice !== 'none') ||
    request.messages.some(
      (message) => message.role === 'tool' || message.toolCallId !== undefined,
    )
  ) {
    throw new ModelError('OpenAICompatibleModel 暂不支持 tool call', {
      code: 'unsupported_feature',
    });
  }

  const temperature = request.temperature ?? defaults?.temperature;
  const maxTokens = request.maxTokens ?? defaults?.maxTokens;
  const stopSequences = request.stopSequences ?? defaults?.stopSequences;
  const body: Record<string, unknown> = {
    model: config.modelId,
    messages: request.messages.map(mapMessage),
    stream,
  };

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  if (maxTokens !== undefined) {
    body.max_tokens = maxTokens;
  }

  if (stopSequences !== undefined) {
    body.stop = stopSequences;
  }

  return body;
}

/** 只映射当前阶段支持的文本消息字段。 */
function mapMessage(message: ModelMessage): Record<string, string> {
  return {
    role: message.role,
    content: message.content,
    ...(message.name === undefined ? {} : { name: message.name }),
  };
}

/** 校验并归一化非流式 Chat Completions 响应。 */
function parseChatResponse(
  payload: unknown,
  fallbackModelId: string,
): ModelResponse {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.choices) ||
    payload.choices.length === 0
  ) {
    throw invalidResponseError();
  }

  const choice = payload.choices[0];

  if (
    !isRecord(choice) ||
    !isRecord(choice.message) ||
    typeof choice.message.content !== 'string'
  ) {
    throw invalidResponseError();
  }

  if (!isJsonValue(payload)) {
    throw invalidResponseError();
  }

  const usage = parseUsage(payload.usage);

  return {
    ...(typeof payload.id === 'string' ? { id: payload.id } : {}),
    modelId:
      typeof payload.model === 'string' ? payload.model : fallbackModelId,
    message: {
      role: 'assistant',
      content: choice.message.content,
    },
    stopReason: mapStopReason(choice.finish_reason),
    ...(usage === undefined ? {} : { usage }),
    raw: payload,
  };
}

/** 校验单个流式 chunk，只提取当前统一协议需要的字段。 */
function parseStreamChunk(payload: unknown): ParsedStreamChunk {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw invalidResponseError();
  }

  const usage = parseUsage(payload.usage);
  const choice = payload.choices[0];

  if (choice === undefined) {
    return {
      ...(typeof payload.id === 'string' ? { id: payload.id } : {}),
      ...(typeof payload.model === 'string' ? { modelId: payload.model } : {}),
      ...(usage === undefined ? {} : { usage }),
    };
  }

  if (!isRecord(choice)) {
    throw invalidResponseError();
  }

  const delta = isRecord(choice.delta) ? choice.delta.content : undefined;

  if (delta !== undefined && delta !== null && typeof delta !== 'string') {
    throw invalidResponseError();
  }

  return {
    ...(typeof payload.id === 'string' ? { id: payload.id } : {}),
    ...(typeof payload.model === 'string' ? { modelId: payload.model } : {}),
    ...(typeof delta === 'string' ? { delta } : {}),
    ...(choice.finish_reason === undefined || choice.finish_reason === null
      ? {}
      : { stopReason: mapStopReason(choice.finish_reason) }),
    ...(usage === undefined ? {} : { usage }),
  };
}

/** 将供应商 token 字段映射为统一用量结构。 */
function parseUsage(value: unknown): ModelUsage | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (
    !isRecord(value) ||
    typeof value.prompt_tokens !== 'number' ||
    typeof value.completion_tokens !== 'number' ||
    typeof value.total_tokens !== 'number'
  ) {
    throw invalidResponseError();
  }

  return {
    inputTokens: value.prompt_tokens,
    outputTokens: value.completion_tokens,
    totalTokens: value.total_tokens,
  };
}

/** 将 Chat Completions 结束原因收敛到模型层枚举。 */
function mapStopReason(value: unknown): ModelStopReason {
  if (value === 'stop') {
    return 'stop';
  }

  if (value === 'length') {
    return 'max_tokens';
  }

  if (value === 'tool_calls' || value === 'function_call') {
    return 'tool_call';
  }

  return 'completed';
}
