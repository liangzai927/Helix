import { describe, expect, it } from 'vitest';

import {
  GlobFilesTool,
  type FileSystemEntry,
  type FileSystemPort,
} from '../index';

class FakeFileSystemPort implements FileSystemPort {
  public constructor(
    private readonly directories: ReadonlyMap<string, FileSystemEntry[]>,
  ) {}

  /** glob_files 不应读取文件内容。 */
  public async readFile(_path: string): Promise<string> {
    void _path;
    throw new Error('GlobFilesTool 不应调用 readFile');
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

/** 构造包含默认忽略目录和生成代码的测试文件树。 */
function createFileSystem(): FileSystemPort {
  return new FakeFileSystemPort(
    new Map([
      [
        '/project',
        [
          { name: '.git', path: '/project/.git', type: 'directory' },
          { name: 'node_modules', path: '/project/node_modules', type: 'directory' },
          { name: 'package.json', path: '/project/package.json', type: 'file' },
          { name: 'src', path: '/project/src', type: 'directory' },
        ],
      ],
      [
        '/project/.git',
        [{ name: 'config.ts', path: '/project/.git/config.ts', type: 'file' }],
      ],
      [
        '/project/node_modules',
        [{ name: 'library.ts', path: '/project/node_modules/library.ts', type: 'file' }],
      ],
      [
        '/project/src',
        [
          { name: 'generated', path: '/project/src/generated', type: 'directory' },
          { name: 'index.ts', path: '/project/src/index.ts', type: 'file' },
          { name: 'runtime.ts', path: '/project/src/runtime.ts', type: 'file' },
        ],
      ],
      [
        '/project/src/generated',
        [
          {
            name: 'schema.ts',
            path: '/project/src/generated/schema.ts',
            type: 'file',
          },
        ],
      ],
    ]),
  );
}

describe('GlobFilesTool', () => {
  it('exposes read-only metadata without approval', () => {
    const tool = new GlobFilesTool(createFileSystem());

    expect(tool.name).toBe('glob_files');
    expect(tool.readOnly).toBe(true);
    expect(tool.requiresApproval).toBe(false);
  });

  it('matches multiple patterns and applies default ignores', async () => {
    const tool = new GlobFilesTool(createFileSystem());

    await expect(
      tool.execute({
        cwd: '/project',
        patterns: ['**/*.ts', 'package.json'],
      }),
    ).resolves.toEqual({
      files: [
        '/project/package.json',
        '/project/src/generated/schema.ts',
        '/project/src/index.ts',
        '/project/src/runtime.ts',
      ],
    });
  });

  it('adds caller ignore patterns to the defaults', async () => {
    const tool = new GlobFilesTool(createFileSystem());

    await expect(
      tool.execute({
        cwd: '/project',
        patterns: ['**/*.ts'],
        ignore: ['src/generated/**', '**/runtime.ts'],
      }),
    ).resolves.toEqual({
      files: ['/project/src/index.ts'],
    });
  });

  it('rejects an empty pattern list', async () => {
    const tool = new GlobFilesTool(createFileSystem());

    await expect(
      tool.execute({ cwd: '/project', patterns: [] }),
    ).rejects.toThrow('patterns 至少需要一个非空模式');
  });
});
