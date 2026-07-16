import {
  ListDirectoryTool,
  NodeFileSystemPort,
  ReadFileTool,
  SearchTextTool,
  ToolRegistry,
} from '@helix-agent/tools';

import { AgentRuntime, FakeExecutor, FakePlanner } from '../src/index';

async function runRuntimeDemo(): Promise<void> {
  const fileSystem = new NodeFileSystemPort();
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new ReadFileTool(fileSystem));
  toolRegistry.register(new ListDirectoryTool(fileSystem));
  toolRegistry.register(new SearchTextTool(fileSystem));

  const runtime = new AgentRuntime({
    planner: new FakePlanner(),
    executor: new FakeExecutor(),
    toolRegistry,
  });

  console.log('[tools.available]', JSON.stringify(runtime.listAvailableTools(), null, 2));

  for await (const event of runtime.run('验证 Helix Core 运行时事件流')) {
    console.log(`[${event.type}]`, JSON.stringify(event, null, 2));
  }
}

void runRuntimeDemo();
