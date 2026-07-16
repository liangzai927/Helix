import type { AgentPatch, AgentPatchFile } from '@helix-agent/protocol';

import type { ApprovalPort } from './approval-port';
import type { FileSystemPort } from './file-system-port';
import type { Tool, ToolInputSchema } from './tool';

export interface ApplyPatchInput {
  patch: AgentPatch;
  approvalId: string;
}

export interface ApplyPatchOutput {
  patchId: string;
  files: string[];
  summary: string;
}

interface PreparedPatchFile {
  path: string;
  content: string;
}

const APPLY_PATCH_INPUT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    patch: { type: 'object' },
    approvalId: { type: 'string', minLength: 1 },
  },
  required: ['patch', 'approvalId'],
  additionalProperties: false,
};

/** 经审批后以完整内容替换形式应用 AgentPatch。 */
export class ApplyPatchTool implements Tool<ApplyPatchInput, ApplyPatchOutput> {
  public readonly name = 'apply_patch';
  public readonly description = '在审批通过后将完整文件补丁写入文件系统';
  public readonly inputSchema = APPLY_PATCH_INPUT_SCHEMA;
  public readonly readOnly = false;
  public readonly requiresApproval = true;

  public constructor(
    private readonly fileSystem: FileSystemPort,
    private readonly approvalPort: ApprovalPort,
  ) {}

  /** 审批和全部文件校验完成后才开始写入，避免已知错误造成部分修改。 */
  public async execute(input: ApplyPatchInput): Promise<ApplyPatchOutput> {
    const approval = await this.approvalPort.waitForApproval(input.approvalId);

    if (!approval.approved) {
      throw new Error(
        `补丁未获批准${approval.reason === undefined ? '' : `：${approval.reason}`}`,
      );
    }

    const preparedFiles = await Promise.all(
      input.patch.files.map((file) => this.prepareFile(file)),
    );

    for (const file of preparedFiles) {
      await this.fileSystem.writeFile(file.path, file.content);
    }

    return {
      patchId: input.patch.id,
      files: preparedFiles.map((file) => file.path),
      summary: `已应用 ${preparedFiles.length} 个文件补丁`,
    };
  }

  /** 校验单个文件操作和可选旧内容，返回待写入数据。 */
  private async prepareFile(file: AgentPatchFile): Promise<PreparedPatchFile> {
    if (file.operation?.type !== 'replace_file_content') {
      throw new Error(`文件缺少 replace_file_content 操作：${file.path}`);
    }

    if (file.changeType === 'delete') {
      throw new Error(`replace_file_content 不支持删除文件：${file.path}`);
    }

    if (file.operation.expectedContent !== undefined) {
      const currentContent = await this.fileSystem.readFile(file.path);

      if (currentContent !== file.operation.expectedContent) {
        throw new Error(`文件内容已变化：${file.path}`);
      }
    }

    return {
      path: file.path,
      content: file.operation.content,
    };
  }
}
