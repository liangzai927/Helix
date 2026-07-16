import { describe, expect, it } from 'vitest';

import type { ToolResult } from '@helix-agent/protocol';

import { ToolOutputCompressor } from '../index';

/** 构造工具结果公共字段。 */
function createToolResult(result: Partial<ToolResult> & Pick<ToolResult, 'toolName'>): ToolResult {
  return {
    id: 'result_1',
    taskId: 'task_1',
    toolCallId: 'call_1',
    createdAt: '2026-07-16T09:00:00.000Z',
    status: 'success',
    summary: '工具执行完成',
    ...result,
  };
}

describe('ToolOutputCompressor', () => {
  it('keeps read_file path without raw content', () => {
    const compressor = new ToolOutputCompressor();
    const compressed = compressor.compress(
      createToolResult({
        toolName: 'read_file',
        summary: '读取完成',
        output: {
          path: 'src/index.ts',
          content: 'raw-content'.repeat(1_000),
          lineCount: 20,
          truncated: false,
        },
      }),
    );

    expect(compressed).toEqual({
      toolName: 'read_file',
      summary: '读取完成',
      path: 'src/index.ts',
    });
    expect(JSON.stringify(compressed)).not.toContain('raw-content');
  });

  it('keeps the first search path and line without preview text', () => {
    const compressor = new ToolOutputCompressor();
    const compressed = compressor.compress(
      createToolResult({
        toolName: 'search_text',
        summary: '找到 1 个结果',
        output: {
          matches: [
            {
              path: 'src/runtime.ts',
              line: 42,
              column: 3,
              preview: 'raw-preview'.repeat(1_000),
            },
          ],
        },
      }),
    );

    expect(compressed).toEqual({
      toolName: 'search_text',
      summary: '找到 1 个结果',
      path: 'src/runtime.ts',
      line: 42,
    });
    expect(JSON.stringify(compressed)).not.toContain('raw-preview');
  });

  it('keeps terminal error and summary without raw streams', () => {
    const compressor = new ToolOutputCompressor();
    const compressed = compressor.compress(
      createToolResult({
        toolName: 'run_terminal',
        status: 'error',
        summary: '命令执行失败',
        errorMessage: '进程启动失败',
        output: {
          exitCode: 1,
          stdout: 'raw-stdout'.repeat(1_000),
          stderr: 'raw-stderr'.repeat(1_000),
          summary: '命令执行失败',
        },
      }),
    );

    expect(compressed).toEqual({
      toolName: 'run_terminal',
      summary: '命令执行失败',
      error: '进程启动失败',
    });
    expect(JSON.stringify(compressed)).not.toMatch(/raw-stdout|raw-stderr/u);
  });
});
