import { describe, expect, it } from 'vitest';

import {
  AnthropicCompatibleModel,
  ModelError,
  ModelFactory,
  OpenAICompatibleModel,
  type ModelConfig,
} from '../index';

describe('ModelFactory', () => {
  it('creates an OpenAI compatible model from config', () => {
    const config: ModelConfig = {
      provider: 'openai-compatible',
      modelId: 'gpt-test',
      baseUrl: 'https://openai.example.com/v1',
      apiKey: 'openai-key',
      defaultHeaders: {
        'X-Tenant': 'tenant-a',
      },
      defaultOptions: {
        temperature: 0.2,
      },
    };

    const model = ModelFactory.create(config);

    expect(model).toBeInstanceOf(OpenAICompatibleModel);
    expect(model.config).toEqual(config);
  });

  it('creates an Anthropic compatible model from config', () => {
    const config: ModelConfig = {
      provider: 'anthropic-compatible',
      modelId: 'claude-test',
      baseUrl: 'https://anthropic.example.com/v1',
      apiKey: 'anthropic-key',
      defaultOptions: {
        maxTokens: 1024,
      },
    };

    const model = ModelFactory.create(config);

    expect(model).toBeInstanceOf(AnthropicCompatibleModel);
    expect(model.config).toEqual(config);
  });

  it('rejects a missing base URL', () => {
    expect(() =>
      ModelFactory.create({
        provider: 'openai-compatible',
        modelId: 'gpt-test',
      }),
    ).toThrowError('模型配置 baseUrl 不能为空');
  });

  it('rejects an unsupported provider with a clear error', () => {
    const config = {
      provider: 'custom-provider',
      modelId: 'custom-model',
      baseUrl: 'https://models.example.com',
    } as unknown as ModelConfig;
    let error: unknown;

    try {
      ModelFactory.create(config);
    } catch (cause) {
      error = cause;
    }

    expect(error).toBeInstanceOf(ModelError);
    expect(error).toMatchObject({
      message: '不支持的模型提供方: custom-provider',
      code: 'configuration_error',
    });
  });
});
