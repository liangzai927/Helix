import { describe, expect, it, vi } from 'vitest';

import { createPatchPreviews } from '../patch-preview';

describe('createPatchPreviews', () => {
  it('使用补丁快照创建更新文件的前后内容', async () => {
    const readFile = vi.fn<(path: string) => Promise<string>>();

    const previews = await createPatchPreviews(
      {
        id: 'patch-1',
        taskId: 'task-1',
        createdAt: '2026-07-16T00:00:00.000Z',
        summary: '更新入口文件',
        files: [
          {
            path: 'src/index.ts',
            changeType: 'update',
            operation: {
              type: 'replace_file_content',
              expectedContent: 'before\n',
              content: 'after\n',
            },
          },
        ],
      },
      '/workspace',
      readFile,
    );

    expect(previews).toEqual([
      {
        path: '/workspace/src/index.ts',
        title: 'Helix Diff: src/index.ts',
        before: 'before\n',
        after: 'after\n',
      },
    ]);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('缺少旧内容快照时读取当前文件，但不会写入文件', async () => {
    const readFile = vi.fn(async () => 'current\n');

    const [preview] = await createPatchPreviews(
      {
        id: 'patch-1',
        taskId: 'task-1',
        createdAt: '2026-07-16T00:00:00.000Z',
        summary: '更新入口文件',
        files: [
          {
            path: '/workspace/src/index.ts',
            changeType: 'update',
            newText: 'after\n',
          },
        ],
      },
      undefined,
      readFile,
    );

    expect(preview?.before).toBe('current\n');
    expect(preview?.after).toBe('after\n');
    expect(readFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('为新建和删除文件生成空白的一侧', async () => {
    const previews = await createPatchPreviews(
      {
        id: 'patch-1',
        taskId: 'task-1',
        createdAt: '2026-07-16T00:00:00.000Z',
        summary: '调整文件',
        files: [
          {
            path: 'new.ts',
            changeType: 'create',
            operation: { type: 'replace_file_content', content: 'new\n' },
          },
          {
            path: 'old.ts',
            changeType: 'delete',
            oldText: 'old\n',
          },
        ],
      },
      '/workspace',
      async () => 'unused',
    );

    expect(previews.map(({ before, after }) => ({ before, after }))).toEqual([
      { before: '', after: 'new\n' },
      { before: 'old\n', after: '' },
    ]);
  });
});
