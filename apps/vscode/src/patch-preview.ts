import { isAbsolute, resolve } from 'node:path';

import type { AgentPatch, AgentPatchFile } from '@helix-agent/protocol';

export interface PatchPreview {
  path: string;
  title: string;
  before: string;
  after: string;
}

export interface DiffPreviewPort {
  openPatch(patch: AgentPatch, cwd?: string): Promise<void>;
}

/** 将结构化补丁转换成 Diff Preview 需要的修改前后完整文本。 */
export async function createPatchPreviews(
  patch: AgentPatch,
  cwd: string | undefined,
  readFile: (path: string) => Promise<string>,
): Promise<PatchPreview[]> {
  return Promise.all(
    patch.files.map(async (file) => {
      const path = resolvePatchPath(file.path, cwd);

      return {
        path,
        title: `Helix Diff: ${file.path}`,
        before: await getBeforeContent(file, path, readFile),
        after: getAfterContent(file),
      };
    }),
  );
}

/** 将相对补丁路径限定到当前工作区，绝对路径保持不变。 */
function resolvePatchPath(path: string, cwd?: string): string {
  if (isAbsolute(path)) {
    return path;
  }

  return resolve(cwd ?? '.', path);
}

/** 优先使用补丁快照，缺少快照时才读取当前文件内容。 */
async function getBeforeContent(
  file: AgentPatchFile,
  path: string,
  readFile: (path: string) => Promise<string>,
): Promise<string> {
  if (file.changeType === 'create') {
    return '';
  }

  return (
    file.oldText ??
    file.operation?.expectedContent ??
    readFile(path)
  );
}

/** 从完整替换操作或协议快照中提取修改后的文件内容。 */
function getAfterContent(file: AgentPatchFile): string {
  if (file.changeType === 'delete') {
    return '';
  }

  const content = file.newText ?? file.operation?.content;

  if (content === undefined) {
    throw new Error(`补丁缺少修改后内容：${file.path}`);
  }

  return content;
}
