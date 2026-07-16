import type { AgentRuntimeOptions } from '@helix-agent/core';
import type { AgentEvent } from '@helix-agent/protocol';

export interface AgentRuntimePort {
  run(input: string, options?: AgentRuntimeOptions): AsyncIterable<AgentEvent>;
}

/** 执行一次 Agent 任务，并按产生顺序向客户端转发全部事件。 */
export async function runAgentTask(
  runtime: AgentRuntimePort,
  input: string,
  onEvent: (event: AgentEvent) => PromiseLike<unknown> | unknown,
  cwd?: string,
): Promise<void> {
  for await (const event of runtime.run(input, cwd === undefined ? {} : { cwd })) {
    await onEvent(event);
  }
}
