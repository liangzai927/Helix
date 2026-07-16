import { DEFAULT_IGNORED_DIRECTORY_NAMES } from './default-ignores';
import type { FileSystemEntry, FileSystemPort } from './file-system-port';
import type { Tool, ToolInputSchema } from './tool';

export interface ListDirectoryInput {
  path: string;
}

export interface ListDirectoryOutput {
  entries: FileSystemEntry[];
}

const LIST_DIRECTORY_INPUT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    path: { type: 'string' },
  },
  required: ['path'],
  additionalProperties: false,
};

/** 列出目录的直接子项，并过滤默认构建与依赖目录。 */
export class ListDirectoryTool
  implements Tool<ListDirectoryInput, ListDirectoryOutput>
{
  public readonly name = 'list_directory';
  public readonly description = '列出目录的直接子项及其路径和类型';
  public readonly inputSchema = LIST_DIRECTORY_INPUT_SCHEMA;
  public readonly readOnly = true;
  public readonly requiresApproval = false;

  public constructor(private readonly fileSystem: FileSystemPort) {}

  /** 读取目录并移除默认忽略的直接子项。 */
  public async execute(input: ListDirectoryInput): Promise<ListDirectoryOutput> {
    const entries = await this.fileSystem.listDirectory(input.path);

    return {
      entries: entries.filter(
        (entry) => !DEFAULT_IGNORED_DIRECTORY_NAMES.has(entry.name),
      ),
    };
  }
}
