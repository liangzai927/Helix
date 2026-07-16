import { requireNonEmptyValue } from './adapter-utils';
import { AnthropicCompatibleModel } from './anthropic-compatible-model';
import { ModelError } from './errors';
import { OpenAICompatibleModel } from './openai-compatible-model';
import type { BaseModel, ModelConfig, ModelRequest } from './types';

interface CompatibleModelOptions {
  baseUrl: string;
  modelId: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
  defaultOptions?: Omit<ModelRequest, 'messages'>;
}

/** 根据统一配置创建对应模型适配器，不让上层感知具体构造参数。 */
export class ModelFactory {
  /** 按 provider 分派配置，并返回统一的 BaseModel 实例。 */
  public static create(config: ModelConfig): BaseModel {
    switch (config.provider) {
      case 'openai-compatible':
        return new OpenAICompatibleModel(createCompatibleModelOptions(config));
      case 'anthropic-compatible':
        return new AnthropicCompatibleModel(createCompatibleModelOptions(config));
      default:
        throw new ModelError(`不支持的模型提供方: ${String(config.provider)}`, {
          code: 'configuration_error',
        });
    }
  }
}

/** 收敛两类 Compatible Adapter 的公共配置映射，避免分支间行为漂移。 */
function createCompatibleModelOptions(config: ModelConfig): CompatibleModelOptions {
  return {
    baseUrl: requireNonEmptyValue(config.baseUrl ?? '', 'baseUrl'),
    modelId: config.modelId,
    ...(config.apiKey === undefined ? {} : { apiKey: config.apiKey }),
    ...(config.defaultHeaders === undefined
      ? {}
      : { defaultHeaders: config.defaultHeaders }),
    ...(config.defaultOptions === undefined
      ? {}
      : { defaultOptions: config.defaultOptions }),
  };
}
