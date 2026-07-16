import { describe, expect, it } from 'vitest';

import { ModelConfigStore } from '../model-config-store';

describe('ModelConfigStore', () => {
  it('将 API Key 与非敏感默认模型配置分开保存', async () => {
    const secrets = new Map<string, string>();
    const state = new Map<string, unknown>();
    const store = new ModelConfigStore(
      {
        get: async (key) => secrets.get(key),
        store: async (key, value) => {
          secrets.set(key, value);
        },
      },
      {
        get: (key, defaultValue) =>
          (state.get(key) as typeof defaultValue | undefined) ?? defaultValue,
        update: async (key, value) => {
          state.set(key, value);
        },
      },
    );

    const result = await store.save(
      {
        provider: 'anthropic-compatible',
        baseUrl: ' https://api.example.com/v1 ',
        modelId: ' claude-test ',
      },
      ' secret-key ',
    );

    expect(result).toEqual({
      configuration: {
        provider: 'anthropic-compatible',
        baseUrl: 'https://api.example.com/v1',
        modelId: 'claude-test',
      },
      hasApiKey: true,
    });
    expect(state.get('helix.defaultModel')).not.toHaveProperty('apiKey');
    expect(secrets.get('helix.model.apiKey')).toBe('secret-key');
  });

  it('读取配置时不返回 API Key 明文', async () => {
    const store = new ModelConfigStore(
      {
        get: async () => 'secret-key',
        store: async () => undefined,
      },
      {
        get: (_key, defaultValue) => defaultValue,
        update: async () => undefined,
      },
    );

    const result = await store.load();

    expect(result.hasApiKey).toBe(true);
    expect(result).not.toHaveProperty('apiKey');
  });
});
