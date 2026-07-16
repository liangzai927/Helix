import type { AgentEvent } from '@helix-agent/protocol';
import { useEffect, useState, type FormEvent } from 'react';

import {
  isExtensionToWebviewMessage,
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

  useEffect(() => {
    /** 将扩展端响应追加到当前消息列表。 */
    function handleMessage(event: MessageEvent<unknown>): void {
      const message = event.data;

      if (!isExtensionToWebviewMessage(message)) {
        return;
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
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  return (
    <main className="shell">
      <header className="header">
        <span className="eyebrow">LOCAL AGENT</span>
        <h1>Helix</h1>
      </header>

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
