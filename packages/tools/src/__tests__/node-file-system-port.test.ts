import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NodeFileSystemPort } from '../index';

describe('NodeFileSystemPort', () => {
  let temporaryDirectory: string;
  let fileSystem: NodeFileSystemPort;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'helix-tools-'));
    fileSystem = new NodeFileSystemPort();
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('writes and reads UTF-8 files', async () => {
    const filePath = join(temporaryDirectory, 'example.txt');

    await fileSystem.writeFile(filePath, 'Helix 文件内容');

    await expect(fileSystem.readFile(filePath)).resolves.toBe('Helix 文件内容');
  });

  it('checks whether a path exists', async () => {
    const existingPath = join(temporaryDirectory, 'existing.txt');
    const missingPath = join(temporaryDirectory, 'missing.txt');

    await fileSystem.writeFile(existingPath, 'content');

    await expect(fileSystem.exists(existingPath)).resolves.toBe(true);
    await expect(fileSystem.exists(missingPath)).resolves.toBe(false);
  });

  it('preserves file system errors unrelated to missing paths', async () => {
    await expect(fileSystem.exists('\0')).rejects.toThrow();
  });

  it('lists direct children with stable paths and types', async () => {
    const filePath = join(temporaryDirectory, 'a-file.txt');
    const directoryPath = join(temporaryDirectory, 'b-directory');

    await fileSystem.writeFile(filePath, 'content');
    await mkdir(directoryPath);

    await expect(fileSystem.listDirectory(temporaryDirectory)).resolves.toEqual([
      {
        name: 'a-file.txt',
        path: filePath,
        type: 'file',
      },
      {
        name: 'b-directory',
        path: directoryPath,
        type: 'directory',
      },
    ]);
  });
});
