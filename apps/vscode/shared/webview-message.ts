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

export type WebviewToExtensionMessage = UserMessage;
export type ExtensionToWebviewMessage = AssistantMessage | AgentEventMessage;
export type WebviewMessage = WebviewToExtensionMessage | ExtensionToWebviewMessage;

/** 判断未知数据是否为 Webview 发往扩展端的有效消息。 */
export function isWebviewToExtensionMessage(
  value: unknown,
): value is WebviewToExtensionMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    message.type === 'user.message' &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
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
import type { AgentEvent } from '@helix-agent/protocol';
