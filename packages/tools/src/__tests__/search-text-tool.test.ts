import { describe, expect, it } from 'vitest';

import {
  SearchTextTool,
  type FileSystemEntry,
  type FileSystemPort,
} from '../index';

class FakeFileSystemPort implements FileSystemPort {
  public constructor(
    private readonly directories: ReadonlyMap<string, FileSystemEntry[]>,
    private readonly files: ReadonlyMap<string, string>,
  ) {}

  /** 返回测试文件树中的文本内容。 */
  public async readFile(path: string): Promise<string> {
    const content = this.files.get(path);

    if (content === undefined) {
      throw new Error(`测试文件不存在: ${path}`);
    }

    return content;
  }

  /** 该测试替身不执行写入。 */
  public async writeFile(_path: string, _content: string): Promise<void> {
    void _path;
    void _content;
  }

  /** 测试路径始终视为存在。 */
  public async exists(_path: string): Promise<boolean> {
    void _path;
    return true;
  }

  /** 按路径返回测试目录树中的直接子项。 */
  public async listDirectory(path: string): Promise<FileSystemEntry[]> {
    return this.directories.get(path) ?? [];
  }
}

/** 构造用于搜索过滤、定位和数量限制的测试文件树。 */
function createFileSystem(): FileSystemPort {
  return new FakeFileSystemPort(
    new Map([
      [
        '/project',
        [
          { name: 'node_modules', path: '/project/node_modules', type: 'directory' },
          { name: 'README.md', path: '/project/README.md', type: 'file' },
          { name: 'src', path: '/project/src', type: 'directory' },
        ],
      ],
      [
        '/project/node_modules',
        [{ name: 'agent.ts', path: '/project/node_modules/agent.ts', type: 'file' }],
      ],
      [
        '/project/src',
        [
          { name: 'agent.test.ts', path: '/project/src/agent.test.ts', type: 'file' },
          { name: 'agent.ts', path: '/project/src/agent.ts', type: 'file' },
        ],
      ],
    ]),
    new Map([
      ['/project/README.md', 'AgentRuntime documentation'],
      ['/project/node_modules/agent.ts', 'AgentRuntime dependency'],
      ['/project/src/agent.test.ts', 'AgentRuntime test'],
      [
        '/project/src/agent.ts',
        'const runtime = new AgentRuntime();\nAgentRuntime.run();',
      ],
    ]),
  );
}

describe('SearchTextTool', () => {
  it('exposes read-only metadata without approval', () => {
    const tool = new SearchTextTool(createFileSystem());

    expect(tool.name).toBe('search_text');
    expect(tool.readOnly).toBe(true);
    expect(tool.requiresApproval).toBe(false);
  });

  it('returns one-based locations and applies include and exclude patterns', async () => {
    const tool = new SearchTextTool(createFileSystem());

    await expect(
      tool.execute({
        query: 'AgentRuntime',
        cwd: '/project',
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      }),
    ).resolves.toEqual({
      matches: [
        {
          path: '/project/src/agent.ts',
          line: 1,
          column: 21,
          preview: 'const runtime = new AgentRuntime();',
        },
        {
          path: '/project/src/agent.ts',
          line: 2,
          column: 1,
          preview: 'AgentRuntime.run();',
        },
      ],
    });
  });

  it('stops after the configured maximum result count', async () => {
    const tool = new SearchTextTool(createFileSystem());

    const result = await tool.execute({
      query: 'AgentRuntime',
      cwd: '/project',
      maxResults: 2,
    });

    expect(result.matches).toHaveLength(2);
  });

  it('rejects empty queries and invalid result limits', async () => {
    const tool = new SearchTextTool(createFileSystem());

    await expect(
      tool.execute({ query: '   ', cwd: '/project' }),
    ).rejects.toThrow('query 不能为空');
    await expect(
      tool.execute({ query: 'AgentRuntime', cwd: '/project', maxResults: 0 }),
    ).rejects.toThrow('maxResults 必须是大于等于 1 的整数');
  });
});
