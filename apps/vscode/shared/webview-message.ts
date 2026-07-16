import type { AgentEvent } from '@helix-agent/protocol';

export interface UserMessage {
  type: 'user.message';
  content: string;
}

export interface AssistantMessage {
  type: 'assistant.message';
  content: string;
}

export interface AgentEventMessage {
  type: 'agent.event';
  event: AgentEvent;
}

export type ModelProvider = 'openai-compatible' | 'anthropic-compatible';

export interface ModelConfiguration {
  provider: ModelProvider;
  baseUrl: string;
  modelId: string;
}

export interface ConfigGetMessage {
  type: 'config.get';
}

export interface ConfigSaveMessage {
  type: 'config.save';
  configuration: ModelConfiguration;
  apiKey?: string;
}

export interface ConfigValueMessage {
  type: 'config.value';
  configuration: ModelConfiguration;
  hasApiKey: boolean;
}

export interface ConfigSavedMessage {
  type: 'config.saved';
  configuration: ModelConfiguration;
  hasApiKey: boolean;
}

export type WebviewToExtensionMessage =
  | UserMessage
  | ConfigGetMessage
  | ConfigSaveMessage;
export type ExtensionToWebviewMessage =
  | AssistantMessage
  | AgentEventMessage
  | ConfigValueMessage
  | ConfigSavedMessage;
export type WebviewMessage = WebviewToExtensionMessage | ExtensionToWebviewMessage;

/** 判断未知数据是否为完整的默认模型配置。 */
function isModelConfiguration(value: unknown): value is ModelConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const configuration = value as Record<string, unknown>;
  return (
    (configuration.provider === 'openai-compatible' ||
      configuration.provider === 'anthropic-compatible') &&
    typeof configuration.baseUrl === 'string' &&
    typeof configuration.modelId === 'string'
  );
}

/** 判断未知数据是否为 Webview 发往扩展端的有效消息。 */
export function isWebviewToExtensionMessage(
  value: unknown,
): value is WebviewToExtensionMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;
  if (message.type === 'user.message') {
    return (
      typeof message.content === 'string' && message.content.trim().length > 0
    );
  }

  if (message.type === 'config.get') {
    return true;
  }

  return (
    message.type === 'config.save' &&
    isModelConfiguration(message.configuration) &&
    (message.apiKey === undefined || typeof message.apiKey === 'string')
  );
}

/** 判断未知数据是否为扩展端发往 Webview 的有效消息。 */
export function isExtensionToWebviewMessage(
  value: unknown,
): value is ExtensionToWebviewMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;
  if (message.type === 'assistant.message') {
    return typeof message.content === 'string';
  }

  if (message.type === 'config.value' || message.type === 'config.saved') {
    return (
      isModelConfiguration(message.configuration) &&
      typeof message.hasApiKey === 'boolean'
    );
  }

  if (message.type !== 'agent.event') {
    return false;
  }

  const event = message.event;
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof (event as Record<string, unknown>).type === 'string'
  );
}
