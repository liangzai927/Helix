import type { ModelConfiguration } from '../shared/webview-message';

interface SecretStore {
  get(key: string): PromiseLike<string | undefined>;
  store(key: string, value: string): PromiseLike<void>;
}

interface StateStore {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): PromiseLike<void>;
}

export interface StoredModelConfiguration {
  configuration: ModelConfiguration;
  hasApiKey: boolean;
}

const API_KEY_SECRET = 'helix.model.apiKey';
const DEFAULT_MODEL_STATE = 'helix.defaultModel';
const DEFAULT_MODEL: ModelConfiguration = {
  provider: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  modelId: '',
};

/** 分别使用 SecretStorage 和 globalState 保存敏感与非敏感模型配置。 */
export class ModelConfigStore {
  public constructor(
    private readonly secrets: SecretStore,
    private readonly state: StateStore,
  ) {}

  /** 读取默认模型配置，只返回 API Key 是否存在，不返回明文。 */
  public async load(): Promise<StoredModelConfiguration> {
    const configuration = this.state.get(DEFAULT_MODEL_STATE, DEFAULT_MODEL);
    const apiKey = await this.secrets.get(API_KEY_SECRET);

    return {
      configuration,
      hasApiKey: apiKey !== undefined && apiKey.length > 0,
    };
  }

  /** 保存默认模型配置；API Key 留空时保留已保存的密钥。 */
  public async save(
    configuration: ModelConfiguration,
    apiKey?: string,
  ): Promise<StoredModelConfiguration> {
    const normalizedConfiguration = {
      provider: configuration.provider,
      baseUrl: configuration.baseUrl.trim(),
      modelId: configuration.modelId.trim(),
    };

    await this.state.update(DEFAULT_MODEL_STATE, normalizedConfiguration);

    const normalizedApiKey = apiKey?.trim();
    if (normalizedApiKey !== undefined && normalizedApiKey.length > 0) {
      await this.secrets.store(API_KEY_SECRET, normalizedApiKey);
    }

    return this.load();
  }
}
