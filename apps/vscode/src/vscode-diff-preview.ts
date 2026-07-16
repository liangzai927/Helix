import * as vscode from 'vscode';

import type { AgentPatch } from '@helix-agent/protocol';

import {
  createPatchPreviews,
  type DiffPreviewPort,
} from './patch-preview';

const textDecoder = new TextDecoder();

/** 使用 VS Code 临时文档打开结构化补丁，不执行任何文件写入。 */
export class VsCodeDiffPreview implements DiffPreviewPort {
  public async openPatch(patch: AgentPatch, cwd?: string): Promise<void> {
    const previews = await createPatchPreviews(
      patch,
      cwd,
      async (path) =>
        textDecoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.file(path))),
    );

    for (const preview of previews) {
      const beforeDocument = await vscode.workspace.openTextDocument({
        content: preview.before,
      });
      const afterDocument = await vscode.workspace.openTextDocument({
        content: preview.after,
      });

      await vscode.commands.executeCommand(
        'vscode.diff',
        beforeDocument.uri,
        afterDocument.uri,
        preview.title,
        { preview: true },
      );
    }
  }
}
