import { useState, type FormEvent } from 'react';

import { vscode } from './vscode';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

/** Helix Sidebar 的最小聊天界面。 */
export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'assistant', content: 'Helix is ready.' },
  ]);
  const [input, setInput] = useState('');

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
    vscode.postMessage({ type: 'user.message', content });
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
