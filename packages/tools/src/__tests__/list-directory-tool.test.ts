import { describe, expect, it } from 'vitest';

import {
  ListDirectoryTool,
  type FileSystemEntry,
  type FileSystemPort,
} from '../index';

class FakeFileSystemPort implements FileSystemPort {
  public constructor(private readonly entries: FileSystemEntry[]) {}

  /** list_directory 不应读取文件内容。 */
  public async readFile(_path: string): Promise<string> {
    void _path;
    throw new Error('ListDirectoryTool 不应调用 readFile');
  }

  /** 该测试替身不执行写入。 */
  public async writeFile(_path: string, _content: string): Promise<void> {
    void _path;
    void _content;
  }

  /** 测试目录始终视为存在。 */
  public async exists(_path: string): Promise<boolean> {
    void _path;
    return true;
  }

  /** 返回测试预置的目录子项。 */
  public async listDirectory(_path: string): Promise<FileSystemEntry[]> {
    void _path;
    return this.entries;
  }
}

describe('ListDirectoryTool', () => {
  it('exposes read-only metadata without approval', () => {
    const tool = new ListDirectoryTool(new FakeFileSystemPort([]));

    expect(tool.name).toBe('list_directory');
    expect(tool.readOnly).toBe(true);
    expect(tool.requiresApproval).toBe(false);
    expect(tool.inputSchema).toMatchObject({
      type: 'object',
      required: ['path'],
    });
  });

  it('filters default ignored entries and preserves entry details', async () => {
    const entries: FileSystemEntry[] = [
      { name: '.git', path: '/project/.git', type: 'directory' },
      { name: 'build', path: '/project/build', type: 'directory' },
      { name: 'dist', path: '/project/dist', type: 'directory' },
      { name: 'node_modules', path: '/project/node_modules', type: 'directory' },
      { name: 'package.json', path: '/project/package.json', type: 'file' },
      { name: 'src', path: '/project/src', type: 'directory' },
    ];
    const tool = new ListDirectoryTool(new FakeFileSystemPort(entries));

    await expect(tool.execute({ path: '/project' })).resolves.toEqual({
      entries: [
        { name: 'package.json', path: '/project/package.json', type: 'file' },
        { name: 'src', path: '/project/src', type: 'directory' },
      ],
    });
  });
});
