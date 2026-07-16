import type { AgentEvent, ApprovalRequest } from '@helix-agent/protocol';
import { useEffect, useState, type FormEvent } from 'react';

import {
  isExtensionToWebviewMessage,
  type ModelConfiguration,
  type WebviewToExtensionMessage,
} from '../../shared/webview-message';
import { vscode } from './vscode';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

/** 将 Agent 事件转换成适合侧边栏展示的简短文本。 */
function describeAgentEvent(
  event: AgentEvent,
): string | undefined {
  switch (event.type) {
    case 'status.changed':
      return event.message ?? `状态：${event.status}`;
    case 'text.delta':
      return event.delta;
    case 'plan.created':
      return event.plan.summary ?? `已生成 ${event.plan.steps.length} 个计划步骤`;
    case 'finished':
      return event.summary ?? `任务已${event.status === 'finished' ? '完成' : '结束'}`;
    case 'error':
      return `错误：${event.error.message}`;
    default:
      return undefined;
  }
}

/** Helix Sidebar 的最小聊天界面。 */
export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'assistant', content: 'Helix is ready.' },
  ]);
  const [input, setInput] = useState('');
  const [configuration, setConfiguration] = useState<ModelConfiguration>({
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    modelId: '',
  });
  const [apiKey, setApiKey] = useState('');
  const [configStatus, setConfigStatus] = useState('API Key not set');
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [resolvingApprovals, setResolvingApprovals] = useState<string[]>([]);

  useEffect(() => {
    /** 将扩展端响应追加到当前消息列表。 */
    function handleMessage(event: MessageEvent<unknown>): void {
      const message = event.data;

      if (!isExtensionToWebviewMessage(message)) {
        return;
      }

      if (message.type === 'config.value' || message.type === 'config.saved') {
        setConfiguration(message.configuration);
        setApiKey('');
        setConfigStatus(
          `${message.type === 'config.saved' ? 'Saved. ' : ''}API Key ${
            message.hasApiKey ? 'stored' : 'not set'
          }`,
        );
        return;
      }

      if (message.type === 'agent.event') {
        const agentEvent = message.event;

        if (agentEvent.type === 'approval.requested') {
          setApprovals((current) => [
            ...current.filter(
              (approval) => approval.id !== agentEvent.approval.id,
            ),
            agentEvent.approval,
          ]);
          return;
        }

        if (agentEvent.type === 'approval.resolved') {
          setApprovals((current) =>
            current.map((approval) =>
              approval.id === agentEvent.approval.id
                ? agentEvent.approval
                : approval,
            ),
          );
          setResolvingApprovals((current) =>
            current.filter((id) => id !== agentEvent.approval.id),
          );
          return;
        }
      }

      const content =
        message.type === 'assistant.message'
          ? message.content
          : describeAgentEvent(message.event);

      if (content === undefined) {
        return;
      }

      setMessages((current) => [
        ...current,
        { id: Date.now(), role: 'assistant', content },
      ]);
    }

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'config.get' } satisfies WebviewToExtensionMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  function handleConfigSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message: WebviewToExtensionMessage = {
      type: 'config.save',
      configuration,
      ...(apiKey.trim().length === 0 ? {} : { apiKey }),
    };
    vscode.postMessage(message);
    setConfigStatus('Saving...');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const content = input.trim();

    if (content.length === 0) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', content },
    ]);
    const message: WebviewToExtensionMessage = {
      type: 'user.message',
      content,
    };
    vscode.postMessage(message);
    setInput('');
  }

  /** 向 Extension 发送审批决定，最终状态以 Runtime 返回事件为准。 */
  function handleApproval(approvalId: string, approved: boolean): void {
    const message: WebviewToExtensionMessage = {
      type: 'approval.resolve',
      approvalId,
      approved,
      ...(approved ? {} : { reason: '用户在 Helix Sidebar 中拒绝' }),
    };
    vscode.postMessage(message);
    setResolvingApprovals((current) => [...current, approvalId]);
  }

  return (
    <main className="shell">
      <header className="header">
        <span className="eyebrow">LOCAL AGENT</span>
        <h1>Helix</h1>
      </header>

      <details className="configuration">
        <summary>Default model</summary>
        <form onSubmit={handleConfigSubmit}>
          <label htmlFor="helix-provider">Provider</label>
          <select
            id="helix-provider"
            onChange={(event) =>
              setConfiguration((current) => ({
                ...current,
                provider: event.target.value as ModelConfiguration['provider'],
              }))
            }
            value={configuration.provider}
          >
            <option value="openai-compatible">OpenAI compatible</option>
            <option value="anthropic-compatible">Anthropic compatible</option>
          </select>

          <label htmlFor="helix-base-url">Base URL</label>
          <input
            id="helix-base-url"
            onChange={(event) =>
              setConfiguration((current) => ({
                ...current,
                baseUrl: event.target.value,
              }))
            }
            type="url"
            value={configuration.baseUrl}
          />

          <label htmlFor="helix-model-id">Model ID</label>
          <input
            id="helix-model-id"
            onChange={(event) =>
              setConfiguration((current) => ({
                ...current,
                modelId: event.target.value,
              }))
            }
            value={configuration.modelId}
          />

          <label htmlFor="helix-api-key">API Key</label>
          <input
            autoComplete="off"
            id="helix-api-key"
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Leave blank to keep the saved key"
            type="password"
            value={apiKey}
          />

          <footer>
            <span>{configStatus}</span>
            <button type="submit">Save</button>
          </footer>
        </form>
      </details>

      {approvals.map((approval) => {
        const resolving = resolvingApprovals.includes(approval.id);
        const pending = approval.status === 'pending';

        return (
          <article className="approval" key={approval.id}>
            <span>APPROVAL · {approval.kind}</span>
            <h2>{approval.title}</h2>
            <p>{approval.reason}</p>
            {pending ? (
              <footer>
                <button
                  disabled={resolving}
                  onClick={() => handleApproval(approval.id, false)}
                  type="button"
                >
                  Reject
                </button>
                <button
                  disabled={resolving}
                  onClick={() => handleApproval(approval.id, true)}
                  type="button"
                >
                  {resolving ? 'Resolving...' : 'Approve'}
                </button>
              </footer>
            ) : (
              <strong>{approval.status}</strong>
            )}
          </article>
        );
      })}

      <section className="messages" aria-live="polite">
        {messages.map((message) => (
          <article className={`message message--${message.role}`} key={message.id}>
            <span>{message.role === 'user' ? 'You' : 'Helix'}</span>
            <p>{message.content}</p>
          </article>
        ))}
      </section>

      <form className="composer" onSubmit={handleSubmit}>
        <label htmlFor="helix-input">Message</label>
        <textarea
          id="helix-input"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this workspace"
          rows={3}
          value={input}
        />
        <button type="submit">Send</button>
      </form>
    </main>
  );
}
