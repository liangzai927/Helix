import { describe, expect, it } from 'vitest';

import type {
  BaseModel,
  ModelConfig,
  ModelEvent,
  ModelMessage,
  ModelRequest,
  ModelResponse,
  ModelToolDefinition,
} from '../index';

class FakeModel implements BaseModel {
  public readonly config: ModelConfig = {
    provider: 'openai-compatible',
    modelId: 'gpt-test',
    baseUrl: 'https://example.com/v1',
  };

  public async chat(request: ModelRequest): Promise<ModelResponse> {
    return {
      id: 'response_1',
      modelId: this.config.modelId,
      message: {
        role: 'assistant',
        content: `reply:${request.messages[0]?.content ?? ''}`,
      },
      stopReason: 'completed',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    };
  }

  public async *stream(request: ModelRequest): AsyncIterable<ModelEvent> {
    yield {
      type: 'text.delta',
      delta: request.messages[0]?.content ?? '',
    };

    yield {
      type: 'response.completed',
      response: await this.chat(request),
    };
  }
}

describe('model protocol types', () => {
  it('creates a model message with optional metadata', () => {
    const message: ModelMessage = {
      role: 'user',
      content: '请分析 packages/models',
      metadata: {
        taskId: 'task_1',
        planMode: true,
      },
    };

    expect(message.role).toBe('user');
    expect(message.metadata?.taskId).toBe('task_1');
  });

  it('creates a request with tools and options', () => {
    const readFileTool: ModelToolDefinition = {
      name: 'read_file',
      description: 'Read a file from disk',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
          },
        },
        required: ['path'],
      },
    };

    const request: ModelRequest = {
      messages: [
        {
          role: 'system',
          content: '你是代码助手',
        },
        {
          role: 'user',
          content: '读取 package.json',
        },
      ],
      tools: [readFileTool],
      toolChoice: 'auto',
      temperature: 0.2,
      maxTokens: 512,
      stopSequences: ['DONE'],
    };

    expect(request.tools).toHaveLength(1);
    expect(request.toolChoice).toBe('auto');
    expect(request.maxTokens).toBe(512);
  });

  it('narrows model events correctly in a switch statement', async () => {
    const model = new FakeModel();
    const request: ModelRequest = {
      messages: [
        {
          role: 'user',
          content: 'hello',
        },
      ],
    };

    const outputs: string[] = [];

    for await (const event of model.stream(request)) {
      switch (event.type) {
        case 'text.delta':
          outputs.push(event.delta);
          break;
        case 'tool.call':
          outputs.push(event.toolName);
          break;
        case 'response.completed':
          outputs.push(event.response.message.content);
          break;
        case 'error':
          outputs.push(event.error.message);
          break;
        default: {
          const neverEvent: never = event;
          outputs.push(String(neverEvent));
        }
      }
    }

    expect(outputs).toEqual(['hello', 'reply:hello']);
  });

  it('supports the chat method on the base model interface', async () => {
    const model: BaseModel = new FakeModel();
    const response = await model.chat({
      messages: [
        {
          role: 'user',
          content: 'generate plan',
        },
      ],
    });

    expect(response.modelId).toBe('gpt-test');
    expect(response.message.role).toBe('assistant');
    expect(response.stopReason).toBe('completed');
    expect(response.usage?.totalTokens).toBe(15);
  });
});
