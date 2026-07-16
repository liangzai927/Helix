import { randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';

import type { BaseModel } from '@helix-agent/models';
import { buildPatchPrompt } from '@helix-agent/prompts';
import type { AgentPatch, AgentPlan, PlanStep } from '@helix-agent/protocol';
import type { FileSystemPort } from '@helix-agent/tools';

import type { ExecutorContext, PatchGenerator } from './index';

interface PatchResponse {
  summary: string;
  files: Array<{ path: string; content: string }>;
}

/** 使用主模型将计划中的编辑步骤转换为可审批的完整文件补丁。 */
export class ModelPatchGenerator implements PatchGenerator {
  public constructor(
    private readonly model: BaseModel,
    private readonly fileSystem: FileSystemPort,
  ) {}

  public async generatePatch(
    plan: AgentPlan,
    step: PlanStep,
    context: ExecutorContext,
  ): Promise<AgentPatch> {
    const requestedPaths = step.filePaths ?? plan.files;

    if (requestedPaths.length === 0) {
      throw new Error(`编辑步骤“${step.title}”缺少目标文件`);
    }

    const snapshots = await Promise.all(
      requestedPaths.map(async (path) => {
        const absolutePath = resolveWorkspacePath(path, context.cwd);
        const exists = await this.fileSystem.exists(absolutePath);

        return {
          path,
          absolutePath,
          exists,
          content: exists ? await this.fileSystem.readFile(absolutePath) : '',
        };
      }),
    );
    const response = await this.model.chat({
      tools: [],
      toolChoice: 'none',
      messages: [
        { role: 'system', content: buildPatchPrompt(plan.goal, step.title) },
        {
          role: 'user',
          content: JSON.stringify(
            snapshots.map(({ path, content }) => ({ path, content })),
          ),
        },
      ],
    });
    const parsed = parsePatchResponse(response.message.content);
    const snapshotByPath = new Map(snapshots.map((snapshot) => [snapshot.path, snapshot]));
    const seenPaths = new Set<string>();

    return {
      id: `patch_${randomUUID()}`,
      taskId: plan.taskId,
      createdAt: new Date().toISOString(),
      summary: parsed.summary,
      files: parsed.files.map((file) => {
        const snapshot = snapshotByPath.get(file.path);

        if (snapshot === undefined || seenPaths.has(file.path)) {
          throw new Error(`模型返回了未授权或重复的补丁路径：${file.path}`);
        }

        seenPaths.add(file.path);
        return {
          path: snapshot.absolutePath,
          changeType: snapshot.exists ? 'update' : 'create',
          operation: {
            type: 'replace_file_content',
            content: file.content,
            ...(snapshot.exists ? { expectedContent: snapshot.content } : {}),
          },
        };
      }),
    };
  }
}

/** 将工作区相对路径解析为绝对路径，并拒绝越过工作区边界。 */
function resolveWorkspacePath(path: string, cwd = '.'): string {
  const workspaceRoot = resolve(cwd);
  const absolutePath = isAbsolute(path) ? resolve(path) : resolve(workspaceRoot, path);
  const relativePath = relative(workspaceRoot, absolutePath);

  if (relativePath === '..' || relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error(`补丁路径超出工作区：${path}`);
  }

  return absolutePath;
}

/** 解析并校验模型返回的最小补丁 JSON。 */
function parsePatchResponse(output: string): PatchResponse {
  let value: unknown;

  try {
    value = JSON.parse(output);
  } catch {
    throw new Error('模型补丁不是有效 JSON');
  }

  if (typeof value !== 'object' || value === null) {
    throw new Error('模型补丁必须是对象');
  }

  const response = value as Record<string, unknown>;
  if (typeof response.summary !== 'string' || !Array.isArray(response.files)) {
    throw new Error('模型补丁缺少 summary 或 files');
  }

  const files = response.files.map((file) => {
    if (typeof file !== 'object' || file === null) {
      throw new Error('模型补丁文件格式无效');
    }

    const entry = file as Record<string, unknown>;
    if (typeof entry.path !== 'string' || typeof entry.content !== 'string') {
      throw new Error('模型补丁文件缺少 path 或 content');
    }

    return { path: entry.path, content: entry.content };
  });

  if (files.length === 0) {
    throw new Error('模型补丁没有文件改动');
  }

  return { summary: response.summary, files };
}
