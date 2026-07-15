import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ModelError,
  OpenAICompatibleModel,
  type ModelEvent,
  type ModelRequest,
} from '../index';

const request: ModelRequest = {
  messages: [
    {
      role: 'system',
      content: '你是代码助手',
    },
    {
      role: 'user',
      content: '分析当前项目',
      name: 'developer',
    },
  ],
  temperature: 0.2,
  stopSequences: ['DONE'],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAICompatibleModel', () => {
  it('maps a chat request and normalizes the response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'chatcmpl_1',
          model: 'gpt-test-2026-07-15',
          choices: [
            {
              message: {
                role: 'assistant',
                content: '项目分析完成',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 4,
            total_tokens: 16,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const model = new OpenAICompatibleModel({
      baseUrl: 'https://example.com/v1/',
      apiKey: 'test-api-key',
      modelId: 'gpt-test',
      defaultHeaders: {
        'X-Helix-Test': 'enabled',
      },
      defaultOptions: {
        maxTokens: 256,
      },
    });

    const response = await model.chat(request);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body)) as unknown;

    expect(url).toBe('https://example.com/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(headers.get('Authorization')).toBe('Bearer test-api-key');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Helix-Test')).toBe('enabled');
    expect(body).toEqual({
      model: 'gpt-test',
      messages: [
        {
          role: 'system',
          content: '你是代码助手',
        },
        {
          role: 'user',
          content: '分析当前项目',
          name: 'developer',
        },
      ],
      temperature: 0.2,
      max_tokens: 256,
      stop: ['DONE'],
      stream: false,
    });
    expect(response).toMatchObject({
      id: 'chatcmpl_1',
      modelId: 'gpt-test-2026-07-15',
      message: {
        role: 'assistant',
        content: '项目分析完成',
      },
      stopReason: 'stop',
      usage: {
        inputTokens: 12,
        outputTokens: 4,
        totalTokens: 16,
      },
    });
  });

  it('turns HTTP and network failures into ModelError', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('invalid api key', { status: 401 }))
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const model = new OpenAICompatibleModel({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-api-key',
      modelId: 'gpt-test',
    });

    await expect(model.chat(request)).rejects.toMatchObject({
      name: 'ModelError',
      code: 'request_failed',
      status: 401,
    });
    await expect(model.chat(request)).rejects.toMatchObject({
      name: 'ModelError',
      code: 'request_failed',
      cause: expect.any(TypeError),
    });
  });

  it('rejects tool calls before sending a request', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const model = new OpenAICompatibleModel({
      baseUrl: 'https://example.com/v1',
      modelId: 'gpt-test',
    });

    await expect(
      model.chat({
        messages: request.messages,
        tools: [
          {
            name: 'read_file',
            description: '读取文件',
            inputSchema: {
              type: 'object',
            },
          },
        ],
      }),
    ).rejects.toMatchObject({
      name: 'ModelError',
      code: 'unsupported_feature',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses chunked SSE data and stops at DONE', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"id":"chatcmpl_stream","model":"gpt-test","choices":[{"delta":{"content":"Hel"},"finish_reason":null}]}\r',
      '\n\r\ndata: {"id":"chatcmpl_stream","model":"gpt-test","choices":[{"delta":{"content":"lo"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.close();
      },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const model = new OpenAICompatibleModel({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-api-key',
      modelId: 'gpt-test',
    });
    const events: ModelEvent[] = [];

    for await (const event of model.stream(request)) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: 'text.delta',
        delta: 'Hel',
      },
      {
        type: 'text.delta',
        delta: 'lo',
      },
      {
        type: 'response.completed',
        response: {
          id: 'chatcmpl_stream',
          modelId: 'gpt-test',
          message: {
            role: 'assistant',
            content: 'Hello',
          },
          stopReason: 'stop',
        },
      },
    ]);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'gpt-test',
      stream: true,
    });
  });

  it('emits a ModelError event when a stream request fails', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const model = new OpenAICompatibleModel({
      baseUrl: 'https://example.com/v1',
      modelId: 'gpt-test',
    });
    const events: ModelEvent[] = [];

    for await (const event of model.stream(request)) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'error',
      error: {
        name: 'ModelError',
        code: 'request_failed',
      },
    });
    expect(events[0]?.type === 'error' && events[0].error).toBeInstanceOf(
      ModelError,
    );
  });
});
