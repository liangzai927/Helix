import { describe, expect, it } from 'vitest';

import type { AgentPatch } from '@helix-agent/protocol';

import type {
  ApprovalPort,
  FileSystemEntry,
  FileSystemPort,
} from '../index';
import { ApplyPatchTool } from '../index';

class MemoryFileSystemPort implements FileSystemPort {
  public readonly files = new Map<string, string>();
  public readonly writes: Array<{ path: string; content: string }> = [];

  public async readFile(path: string): Promise<string> {
    const content = this.files.get(path);

    if (content === undefined) {
      throw new Error(`文件不存在：${path}`);
    }

    return content;
  }

  public async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    this.writes.push({ path, content });
  }

  public async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  public async listDirectory(_path: string): Promise<FileSystemEntry[]> {
    void _path;
    return [];
  }
}

/** 构造单文件更新补丁，集中保持测试协议对象一致。 */
function createPatch(expectedContent = 'before\n'): AgentPatch {
  return {
    id: 'patch_1',
    taskId: 'task_1',
    createdAt: '2026-07-16T09:00:00.000Z',
    summary: '更新 src/index.ts',
    files: [
      {
        path: 'src/index.ts',
        changeType: 'update',
        operation: {
          type: 'replace_file_content',
          content: 'after\n',
          expectedContent,
        },
      },
    ],
  };
}

describe('ApplyPatchTool', () => {
  it('does not write files when approval is rejected', async () => {
    const fileSystem = new MemoryFileSystemPort();
    fileSystem.files.set('src/index.ts', 'before\n');
    const approvalPort: ApprovalPort = {
      async waitForApproval() {
        return { approved: false, reason: '用户拒绝' };
      },
    };
    const tool = new ApplyPatchTool(fileSystem, approvalPort);

    await expect(
      tool.execute({ patch: createPatch(), approvalId: 'approval_1' }),
    ).rejects.toThrow('补丁未获批准：用户拒绝');
    expect(fileSystem.writes).toEqual([]);
  });

  it('writes replacement content after approval', async () => {
    const fileSystem = new MemoryFileSystemPort();
    fileSystem.files.set('src/index.ts', 'before\n');
    const approvalPort: ApprovalPort = {
      async waitForApproval(id) {
        expect(id).toBe('approval_1');
        return { approved: true };
      },
    };
    const tool = new ApplyPatchTool(fileSystem, approvalPort);

    const result = await tool.execute({
      patch: createPatch(),
      approvalId: 'approval_1',
    });

    expect(fileSystem.writes).toEqual([
      { path: 'src/index.ts', content: 'after\n' },
    ]);
    expect(result).toEqual({
      patchId: 'patch_1',
      files: ['src/index.ts'],
      summary: '已应用 1 个文件补丁',
    });
  });

  it('validates all expected content before writing', async () => {
    const fileSystem = new MemoryFileSystemPort();
    fileSystem.files.set('src/index.ts', 'changed externally\n');
    const approvalPort: ApprovalPort = {
      async waitForApproval() {
        return { approved: true };
      },
    };
    const tool = new ApplyPatchTool(fileSystem, approvalPort);

    await expect(
      tool.execute({ patch: createPatch(), approvalId: 'approval_1' }),
    ).rejects.toThrow('文件内容已变化：src/index.ts');
    expect(fileSystem.writes).toEqual([]);
  });
});
