import { describe, expect, it } from 'vitest';

import type { AgentPatch, AgentPatchFile } from '../index';
import { createAgentPatchSummary } from '../index';

describe('AgentPatch', () => {
  it('represents a replace file content operation', () => {
    const file: AgentPatchFile = {
      path: 'src/index.ts',
      changeType: 'update',
      operation: {
        type: 'replace_file_content',
        content: 'export const value = 2;\n',
        expectedContent: 'export const value = 1;\n',
      },
    };
    const patch: AgentPatch = {
      id: 'patch_1',
      taskId: 'task_1',
      createdAt: '2026-07-16T09:00:00.000Z',
      summary: createAgentPatchSummary([file]),
      files: [file],
    };

    expect(patch.files[0]?.operation).toEqual({
      type: 'replace_file_content',
      content: 'export const value = 2;\n',
      expectedContent: 'export const value = 1;\n',
    });
    expect(patch.summary).toBe('修改 1 个文件：\n- 更新 src/index.ts');
  });

  it('creates a human-readable summary for multiple files', () => {
    const files: AgentPatchFile[] = [
      {
        path: 'src/new.ts',
        changeType: 'create',
        operation: { type: 'replace_file_content', content: 'new\n' },
      },
      {
        path: 'src/existing.ts',
        changeType: 'update',
        operation: { type: 'replace_file_content', content: 'updated\n' },
      },
    ];

    expect(createAgentPatchSummary(files)).toBe(
      '修改 2 个文件：\n- 新建 src/new.ts\n- 更新 src/existing.ts',
    );
  });
});
