import type { BaseModel, ModelConfig, ModelEvent, ModelRequest } from '@helix-agent/models';
import type { AgentPlan } from '@helix-agent/protocol';
import type { FileSystemPort } from '@helix-agent/tools';
import { describe, expect, it } from 'vitest';

import { ModelPatchGenerator } from '../index';

describe('ModelPatchGenerator', () => {
  it('只为计划授权路径生成带旧内容校验的补丁', async () => {
    const model = createModel(
      JSON.stringify({
        summary: '更新入口',
        files: [{ path: 'src/index.ts', content: 'export const value = 2;\n' }],
      }),
    );
    const generator = new ModelPatchGenerator(model, createFileSystem());

    const patch = await generator.generatePatch(
      createPlan(),
      createPlan().steps[0]!,
      { cwd: '/workspace' },
    );

    expect(patch).toMatchObject({
      taskId: 'task-1',
      summary: '更新入口',
      files: [
        {
          path: '/workspace/src/index.ts',
          changeType: 'update',
          operation: {
            type: 'replace_file_content',
            expectedContent: 'export const value = 1;\n',
            content: 'export const value = 2;\n',
          },
        },
      ],
    });
  });

  it('拒绝模型返回计划外路径', async () => {
    const model = createModel(
      JSON.stringify({
        summary: '越界修改',
        files: [{ path: '../secret.ts', content: 'secret' }],
      }),
    );
    const generator = new ModelPatchGenerator(model, createFileSystem());

    await expect(
      generator.generatePatch(createPlan(), createPlan().steps[0]!, {
        cwd: '/workspace',
      }),
    ).rejects.toThrow('未授权或重复');
  });
});

/** 创建只返回指定补丁 JSON 的测试模型。 */
function createModel(content: string): BaseModel {
  const config: ModelConfig = { provider: 'openai-compatible', modelId: 'test' };
  return {
    config,
    async chat(_request: ModelRequest) {
      void _request;
      return {
        modelId: 'test',
        message: { role: 'assistant', content },
        stopReason: 'completed',
      };
    },
    stream(): AsyncIterable<ModelEvent> {
      throw new Error('不应调用流式接口');
    },
  };
}

/** 创建仅暴露测试文件的内存文件系统。 */
function createFileSystem(): FileSystemPort {
  return {
    readFile: async () => 'export const value = 1;\n',
    writeFile: async () => undefined,
    exists: async (path) => path === '/workspace/src/index.ts',
    listDirectory: async () => [],
  };
}

/** 创建包含单个编辑步骤的稳定测试计划。 */
function createPlan(): AgentPlan {
  return {
    id: 'plan-1',
    taskId: 'task-1',
    goal: '更新入口',
    createdAt: '2026-07-16T00:00:00.000Z',
    findings: [],
    steps: [
      {
        id: 'step-1',
        title: '修改入口',
        kind: 'edit',
        status: 'pending',
        filePaths: ['src/index.ts'],
      },
    ],
    risks: [],
    files: ['src/index.ts'],
  };
}
