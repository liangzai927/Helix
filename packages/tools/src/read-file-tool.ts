import type { FileSystemPort } from './file-system-port';
import type { Tool, ToolInputSchema } from './tool';

export interface ReadFileInput {
  path: string;
  startLine?: number;
  endLine?: number;
  maxChars?: number;
}

export interface ReadFileOutput {
  path: string;
  content: string;
  lineCount: number;
  truncated: boolean;
}

const DEFAULT_MAX_CHARS = 20_000;

const READ_FILE_INPUT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    startLine: { type: 'integer', minimum: 1 },
    endLine: { type: 'integer', minimum: 1 },
    maxChars: { type: 'integer', minimum: 1 },
  },
  required: ['path'],
  additionalProperties: false,
};

/** 按行区间读取文本文件，并限制返回字符数。 */
export class ReadFileTool implements Tool<ReadFileInput, ReadFileOutput> {
  public readonly name = 'read_file';
  public readonly description = '读取 UTF-8 文本文件，可限定行区间和最大字符数';
  public readonly inputSchema = READ_FILE_INPUT_SCHEMA;
  public readonly readOnly = true;
  public readonly requiresApproval = false;

  public constructor(private readonly fileSystem: FileSystemPort) {}

  /** 读取文件、选取行区间，并按 maxChars 裁剪结果。 */
  public async execute(input: ReadFileInput): Promise<ReadFileOutput> {
    const startLine = input.startLine ?? 1;
    const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;

    validatePositiveInteger(startLine, '起始行');

    if (input.endLine !== undefined) {
      validatePositiveInteger(input.endLine, '结束行');

      if (input.endLine < startLine) {
        throw new Error('结束行不能小于起始行');
      }
    }

    validatePositiveInteger(maxChars, 'maxChars');

    const fileContent = await this.fileSystem.readFile(input.path);
    const lines = splitLines(fileContent);
    const selectedContent = selectContent(
      fileContent,
      lines,
      input.startLine,
      input.endLine,
    );
    const truncated = selectedContent.length > maxChars;

    return {
      path: input.path,
      content: truncated ? selectedContent.slice(0, maxChars) : selectedContent,
      lineCount: lines.length,
      truncated,
    };
  }
}

/** 验证行号和字符限制都是正整数。 */
function validatePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} 必须是大于等于 1 的整数`);
  }
}

/** 将文本拆成逻辑行，不将末尾换行视为额外空行。 */
function splitLines(content: string): string[] {
  if (content.length === 0) {
    return [];
  }

  const lines = content.split(/\r\n|\n|\r/);

  if (lines.at(-1) === '') {
    lines.pop();
  }

  return lines;
}

/** 未指定行区间时保留原始换行，指定后返回首尾包含的区间。 */
function selectContent(
  fileContent: string,
  lines: string[],
  startLine?: number,
  endLine?: number,
): string {
  if (startLine === undefined && endLine === undefined) {
    return fileContent;
  }

  const startIndex = (startLine ?? 1) - 1;

  return lines.slice(startIndex, endLine ?? lines.length).join('\n');
}
