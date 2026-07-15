import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AnthropicCompatibleModel,
  ModelError,
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
    },
  ],
  temperature: 0.2,
  stopSequences: ['DONE'],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AnthropicCompatibleModel', () => {
  it('maps a message request and normalizes the response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: 'claude-test-20260715',
          content: [
            {
              type: 'text',
              text: '项目分析完成',
            },
          ],
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 12,
            output_tokens: 4,
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

    const model = new AnthropicCompatibleModel({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'test-api-key',
      modelId: 'claude-test',
      defaultHeaders: {
        'X-Helix-Test': 'enabled',
      },
      defaultOptions: {
        maxTokens: 512,
      },
    });

    const response = await model.chat(request);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body)) as unknown;

    expect(url).toBe('https://api.example.com/v1/messages');
    expect(init?.method).toBe('POST');
    expect(headers.get('x-api-key')).toBe('test-api-key');
    expect(headers.get('anthropic-version')).toBe('2023-06-01');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Helix-Test')).toBe('enabled');
    expect(body).toEqual({
      model: 'claude-test',
      system: '你是代码助手',
      messages: [
        {
          role: 'user',
          content: '分析当前项目',
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
      stop_sequences: ['DONE'],
      stream: false,
    });
    expect(response).toMatchObject({
      id: 'msg_1',
      modelId: 'claude-test-20260715',
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

  it('requires maxTokens before sending a request', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const model = new AnthropicCompatibleModel({
      baseUrl: 'https://api.example.com/v1',
      modelId: 'claude-test',
    });

    await expect(model.chat(request)).rejects.toMatchObject({
      name: 'ModelError',
      code: 'configuration_error',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses Anthropic SSE events into unified model events', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'event: message_start\r\ndata: {"type":"message_start","message":{"id":"msg_stream","model":"claude-test","usage":{"input_tokens":12,"output_tokens":1}}}\r',
      '\n\r\nevent: ping\ndata: {"type":"ping"}\n\nevent: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}\n\nevent: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
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

    const model = new AnthropicCompatibleModel({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-api-key',
      modelId: 'claude-test',
    });
    const events: ModelEvent[] = [];

    for await (const event of model.stream({ ...request, maxTokens: 128 })) {
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
          id: 'msg_stream',
          modelId: 'claude-test',
          message: {
            role: 'assistant',
            content: 'Hello',
          },
          stopReason: 'stop',
          usage: {
            inputTokens: 12,
            outputTokens: 5,
            totalTokens: 17,
          },
        },
      },
    ]);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'claude-test',
      max_tokens: 128,
      stream: true,
    });
  });

  it('emits a ModelError event when a stream request fails', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const model = new AnthropicCompatibleModel({
      baseUrl: 'https://api.example.com/v1',
      modelId: 'claude-test',
    });
    const events: ModelEvent[] = [];

    for await (const event of model.stream({ ...request, maxTokens: 128 })) {
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
