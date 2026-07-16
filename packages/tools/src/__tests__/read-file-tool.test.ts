import { describe, expect, it } from 'vitest';

import {
  ReadFileTool,
  type FileSystemEntry,
  type FileSystemPort,
} from '../index';

class FakeFileSystemPort implements FileSystemPort {
  public constructor(private readonly content: string) {}

  /** 返回测试预置的文件内容。 */
  public async readFile(_path: string): Promise<string> {
    void _path;
    return this.content;
  }

  /** 该测试替身不执行写入。 */
  public async writeFile(_path: string, _content: string): Promise<void> {
    void _path;
    void _content;
  }

  /** 测试文件始终视为存在。 */
  public async exists(_path: string): Promise<boolean> {
    void _path;
    return true;
  }

  /** read_file 不应访问目录列表。 */
  public async listDirectory(_path: string): Promise<FileSystemEntry[]> {
    void _path;
    throw new Error('ReadFileTool 不应调用 listDirectory');
  }
}

describe('ReadFileTool', () => {
  it('exposes read-only metadata without approval', () => {
    const tool = new ReadFileTool(new FakeFileSystemPort('content'));

    expect(tool.name).toBe('read_file');
    expect(tool.readOnly).toBe(true);
    expect(tool.requiresApproval).toBe(false);
    expect(tool.inputSchema).toMatchObject({
      type: 'object',
      required: ['path'],
    });
  });

  it('reads the complete file by default', async () => {
    const tool = new ReadFileTool(
      new FakeFileSystemPort('first line\nsecond line\nthird line'),
    );

    await expect(tool.execute({ path: '/project/example.ts' })).resolves.toEqual({
      content: 'first line\nsecond line\nthird line',
      lineCount: 3,
      truncated: false,
    });
  });

  it('reads an inclusive one-based line range', async () => {
    const tool = new ReadFileTool(
      new FakeFileSystemPort('first line\nsecond line\nthird line\nfourth line'),
    );

    await expect(
      tool.execute({
        path: '/project/example.ts',
        startLine: 2,
        endLine: 3,
      }),
    ).resolves.toEqual({
      content: 'second line\nthird line',
      lineCount: 4,
      truncated: false,
    });
  });

  it('truncates selected content at maxChars', async () => {
    const tool = new ReadFileTool(new FakeFileSystemPort('123456789'));

    await expect(
      tool.execute({
        path: '/project/example.ts',
        maxChars: 5,
      }),
    ).resolves.toEqual({
      content: '12345',
      lineCount: 1,
      truncated: true,
    });
  });

  it('uses 20000 characters as the default limit', async () => {
    const tool = new ReadFileTool(new FakeFileSystemPort('a'.repeat(20_001)));

    const result = await tool.execute({ path: '/project/large.txt' });

    expect(result.content).toHaveLength(20_000);
    expect(result.truncated).toBe(true);
  });

  it('rejects invalid line ranges and character limits', async () => {
    const tool = new ReadFileTool(new FakeFileSystemPort('content'));

    await expect(
      tool.execute({ path: '/project/example.ts', startLine: 0 }),
    ).rejects.toThrow('起始行 必须是大于等于 1 的整数');
    await expect(
      tool.execute({ path: '/project/example.ts', startLine: 3, endLine: 2 }),
    ).rejects.toThrow('结束行不能小于起始行');
    await expect(
      tool.execute({ path: '/project/example.ts', maxChars: 0 }),
    ).rejects.toThrow('maxChars 必须是大于等于 1 的整数');
  });
});
