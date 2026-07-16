import { resolve } from 'node:path';

import {
  ListDirectoryTool,
  NodeFileSystemPort,
  ReadFileTool,
  SearchTextTool,
  ToolRegistry,
} from '@helix-agent/tools';

const PROJECT_ROOT = resolve(__dirname, '../../..');

/** 注册并运行三种只读工具，验证 Core 能读取真实项目。 */
async function runToolDemo(): Promise<void> {
  const fileSystem = new NodeFileSystemPort();
  const readFileTool = new ReadFileTool(fileSystem);
  const listDirectoryTool = new ListDirectoryTool(fileSystem);
  const searchTextTool = new SearchTextTool(fileSystem);
  const toolRegistry = new ToolRegistry();

  toolRegistry.register(readFileTool);
  toolRegistry.register(listDirectoryTool);
  toolRegistry.register(searchTextTool);

  const readResult = await readFileTool.execute({
    path: resolve(PROJECT_ROOT, 'package.json'),
  });
  const listResult = await listDirectoryTool.execute({ path: PROJECT_ROOT });
  const searchResult = await searchTextTool.execute({
    query: 'AgentRuntime',
    cwd: PROJECT_ROOT,
    include: ['packages/**/*.ts'],
    maxResults: 10,
  });

  console.log(
    JSON.stringify(
      {
        tools: toolRegistry.list().map((tool) => tool.name),
        readFile: {
          path: resolve(PROJECT_ROOT, 'package.json'),
          lineCount: readResult.lineCount,
          characterCount: readResult.content.length,
          truncated: readResult.truncated,
        },
        listDirectory: {
          path: PROJECT_ROOT,
          entryCount: listResult.entries.length,
          entries: listResult.entries.map((entry) => entry.name),
        },
        searchText: {
          query: 'AgentRuntime',
          matchCount: searchResult.matches.length,
          matches: searchResult.matches,
        },
      },
      null,
      2,
    ),
  );
}

void runToolDemo().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
