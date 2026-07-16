import type { Dirent } from 'node:fs';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  FileSystemEntry,
  FileSystemEntryType,
  FileSystemPort,
} from '../file-system-port';

/** 使用 Node 文件系统 API 实现统一端口。 */
export class NodeFileSystemPort implements FileSystemPort {
  /** 以 UTF-8 读取完整文件内容。 */
  public readFile(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  /** 以 UTF-8 写入文件，并保留 Node 原生错误语义。 */
  public writeFile(path: string, content: string): Promise<void> {
    return writeFile(path, content, 'utf8');
  }

  /** 检查路径是否存在，但不吞掉权限等其他文件系统错误。 */
  public async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch (error) {
      if (isMissingPathError(error)) {
        return false;
      }

      throw error;
    }
  }

  /** 读取目录的直接子项，并按名称稳定排序。 */
  public async listDirectory(path: string): Promise<FileSystemEntry[]> {
    const entries = await readdir(path, { withFileTypes: true });

    return entries
      .map((entry) => ({
        name: entry.name,
        path: join(path, entry.name),
        type: getEntryType(entry),
      }))
      .sort(compareEntriesByName);
  }
}

/** 只将路径不存在或中间路径非目录视为 exists=false。 */
function isMissingPathError(error: unknown): boolean {
  const code =
    error instanceof Error && 'code' in error
      ? (error as NodeJS.ErrnoException).code
      : undefined;

  return code === 'ENOENT' || code === 'ENOTDIR';
}

/** 将 Node Dirent 转换为端口层稳定类型。 */
function getEntryType(entry: Dirent): FileSystemEntryType {
  if (entry.isFile()) {
    return 'file';
  }

  if (entry.isDirectory()) {
    return 'directory';
  }

  if (entry.isSymbolicLink()) {
    return 'symbolic-link';
  }

  return 'other';
}

/** 保证目录输出顺序不受底层文件系统影响。 */
function compareEntriesByName(left: FileSystemEntry, right: FileSystemEntry): number {
  if (left.name === right.name) {
    return 0;
  }

  return left.name < right.name ? -1 : 1;
}
