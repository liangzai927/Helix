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
  ModelRequest,
  ModelResponse,
  ModelStopReason,
  ModelUsage,
} from './types';

const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

/** Anthropic Compatible Adapter 所需的连接配置。 */
export interface AnthropicCompatibleModelOptions {
  baseUrl: string;
  modelId: string;
  apiKey?: string;
  apiVersion?: string;
  defaultHeaders?: Record<string, string>;
  defaultOptions?: Omit<ModelRequest, 'messages'>;
}

interface AnthropicMessageStart {
  id?: string;
  modelId?: string;
  usage: ModelUsage;
}

interface AnthropicMessageDelta {
  stopReason?: ModelStopReason;
  outputTokens?: number;
}

/** 通过 Anthropic Messages HTTP 协议接入 Claude Compatible 服务。 */
export class AnthropicCompatibleModel implements BaseModel {
  public readonly config: ModelConfig;
  private readonly apiVersion: string;
  private readonly endpoint: string;

  public constructor(options: AnthropicCompatibleModelOptions) {
    const baseUrl = requireNonEmptyValue(options.baseUrl, 'baseUrl');
    const modelId = requireNonEmptyValue(options.modelId, 'modelId');

    this.apiVersion = requireNonEmptyValue(
      options.apiVersion ?? DEFAULT_ANTHROPIC_VERSION,
      'apiVersion',
    );
    this.config = {
      provider: 'anthropic-compatible',
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
    this.endpoint = `${baseUrl.replace(/\/+$/, '')}/messages`;
  }

  /** 发起一次非流式 Messages 请求并返回统一响应。 */
  public async chat(request: ModelRequest): Promise<ModelResponse> {
    try {
      const response = await this.sendRequest(request, false);
      const payload = await readJsonResponse(response);

      return parseMessageResponse(payload, this.config.modelId);
    } catch (error) {
      throw normalizeModelError(error);
    }
  }

  /** 解析 Anthropic SSE 事件，并持续输出统一模型事件。 */
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
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;

      for await (const data of readSseData(response.body)) {
        const payload = parseSseJson(data);

        if (!isRecord(payload) || typeof payload.type !== 'string') {
          throw invalidResponseError();
        }

        switch (payload.type) {
          case 'message_start': {
            const start = parseMessageStart(payload);
            id = start.id ?? id;
            modelId = start.modelId ?? modelId;
            inputTokens = start.usage.inputTokens;
            outputTokens = start.usage.outputTokens;
            break;
          }
          case 'content_block_delta': {
            const delta = parseTextDelta(payload);

            if (delta !== undefined && delta.length > 0) {
              content += delta;
              yield {
                type: 'text.delta',
                delta,
              };
            }
            break;
          }
          case 'message_delta': {
            const delta = parseMessageDelta(payload);
            stopReason = delta.stopReason ?? stopReason;
            outputTokens = delta.outputTokens ?? outputTokens;
            break;
          }
          case 'message_stop': {
            const usage = createStreamUsage(inputTokens, outputTokens);

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
          case 'error':
            throw parseStreamError(payload);
          default:
            break;
        }
      }

      throw new ModelError('模型流式响应未收到 message_stop 事件', {
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

    headers.set('anthropic-version', this.apiVersion);

    if (this.config.apiKey !== undefined && this.config.apiKey.length > 0) {
      headers.set('x-api-key', this.config.apiKey);
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

/** 将统一请求映射为 Anthropic Messages 请求体。 */
function createRequestBody(
  config: ModelConfig,
  request: ModelRequest,
  stream: boolean,
): Record<string, unknown> {
  const defaults = config.defaultOptions;
  const tools = request.tools ?? defaults?.tools;
  const toolChoice = request.toolChoice ?? defaults?.toolChoice;
  const maxTokens = request.maxTokens ?? defaults?.maxTokens;

  if (maxTokens === undefined) {
    throw new ModelError('AnthropicCompatibleModel 必须配置 maxTokens', {
      code: 'configuration_error',
    });
  }

  if (
    (tools !== undefined && tools.length > 0) ||
    (toolChoice !== undefined && toolChoice !== 'none') ||
    request.messages.some(
      (message) =>
        message.role === 'tool' ||
        message.toolCallId !== undefined ||
        message.name !== undefined,
    )
  ) {
    throw new ModelError(
      'AnthropicCompatibleModel 暂不支持 name 或 tool call',
      {
        code: 'unsupported_feature',
      },
    );
  }

  const system = request.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const temperature = request.temperature ?? defaults?.temperature;
  const stopSequences = request.stopSequences ?? defaults?.stopSequences;
  const body: Record<string, unknown> = {
    model: config.modelId,
    messages: request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role,
        content: message.content,
      })),
    max_tokens: maxTokens,
    stream,
  };

  if (system.length > 0) {
    body.system = system;
  }

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  if (stopSequences !== undefined) {
    body.stop_sequences = stopSequences;
  }

  return body;
}

/** 校验并归一化非流式 Anthropic Message 响应。 */
function parseMessageResponse(
  payload: unknown,
  fallbackModelId: string,
): ModelResponse {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.content) ||
    !isRecord(payload.usage)
  ) {
    throw invalidResponseError();
  }

  const textParts: string[] = [];

  for (const block of payload.content) {
    if (!isRecord(block)) {
      throw invalidResponseError();
    }

    if (block.type === 'text') {
      if (typeof block.text !== 'string') {
        throw invalidResponseError();
      }

      textParts.push(block.text);
    }
  }

  if (!isJsonValue(payload)) {
    throw invalidResponseError();
  }

  return {
    ...(typeof payload.id === 'string' ? { id: payload.id } : {}),
    modelId:
      typeof payload.model === 'string' ? payload.model : fallbackModelId,
    message: {
      role: 'assistant',
      content: textParts.join(''),
    },
    stopReason: mapStopReason(payload.stop_reason),
    usage: parseUsage(payload.usage),
    raw: payload,
  };
}

/** 从 message_start 中读取消息标识和初始 token 用量。 */
function parseMessageStart(
  payload: Record<string, unknown>,
): AnthropicMessageStart {
  if (!isRecord(payload.message) || !isRecord(payload.message.usage)) {
    throw invalidResponseError();
  }

  return {
    ...(typeof payload.message.id === 'string'
      ? { id: payload.message.id }
      : {}),
    ...(typeof payload.message.model === 'string'
      ? { modelId: payload.message.model }
      : {}),
    usage: parseUsage(payload.message.usage),
  };
}

/** 只提取 Anthropic text_delta，其他增量类型由后续能力处理。 */
function parseTextDelta(payload: Record<string, unknown>): string | undefined {
  if (!isRecord(payload.delta) || typeof payload.delta.type !== 'string') {
    throw invalidResponseError();
  }

  if (payload.delta.type !== 'text_delta') {
    return undefined;
  }

  if (typeof payload.delta.text !== 'string') {
    throw invalidResponseError();
  }

  return payload.delta.text;
}

/** 从 message_delta 中读取结束原因和累计输出 token。 */
function parseMessageDelta(
  payload: Record<string, unknown>,
): AnthropicMessageDelta {
  if (!isRecord(payload.delta)) {
    throw invalidResponseError();
  }

  let outputTokens: number | undefined;

  if (payload.usage !== undefined) {
    if (
      !isRecord(payload.usage) ||
      typeof payload.usage.output_tokens !== 'number'
    ) {
      throw invalidResponseError();
    }

    outputTokens = payload.usage.output_tokens;
  }

  return {
    ...(payload.delta.stop_reason === undefined ||
    payload.delta.stop_reason === null
      ? {}
      : { stopReason: mapStopReason(payload.delta.stop_reason) }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
  };
}

/** 将 Anthropic 流内错误事件转换成统一模型错误。 */
function parseStreamError(payload: Record<string, unknown>): ModelError {
  const message =
    isRecord(payload.error) && typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Anthropic 返回流式错误事件';

  return new ModelError(message, {
    code: 'request_failed',
  });
}

/** 将 Anthropic token 字段映射为统一用量结构。 */
function parseUsage(value: Record<string, unknown>): ModelUsage {
  if (
    typeof value.input_tokens !== 'number' ||
    typeof value.output_tokens !== 'number'
  ) {
    throw invalidResponseError();
  }

  const cacheCreationTokens =
    typeof value.cache_creation_input_tokens === 'number'
      ? value.cache_creation_input_tokens
      : 0;
  const cacheReadTokens =
    typeof value.cache_read_input_tokens === 'number'
      ? value.cache_read_input_tokens
      : 0;
  const inputTokens =
    value.input_tokens + cacheCreationTokens + cacheReadTokens;

  return {
    inputTokens,
    outputTokens: value.output_tokens,
    totalTokens: inputTokens + value.output_tokens,
  };
}

/** 在流式事件信息完整时生成统一 token 用量。 */
function createStreamUsage(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): ModelUsage | undefined {
  if (inputTokens === undefined || outputTokens === undefined) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

/** 将 Anthropic 结束原因收敛到模型层枚举。 */
function mapStopReason(value: unknown): ModelStopReason {
  if (value === 'end_turn' || value === 'stop_sequence') {
    return 'stop';
  }

  if (value === 'max_tokens' || value === 'model_context_window_exceeded') {
    return 'max_tokens';
  }

  if (value === 'tool_use') {
    return 'tool_call';
  }

  if (value === 'refusal') {
    return 'error';
  }

  return 'completed';
}
