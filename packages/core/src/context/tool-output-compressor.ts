import type { JsonObject, JsonValue, ToolResult } from '@helix-agent/protocol';

export interface CompressedToolOutput {
  toolName: string;
  summary: string;
  path?: string;
  line?: number;
  error?: string;
}

/** 将工具原始结果压缩成可安全进入模型上下文的摘要。 */
export class ToolOutputCompressor {
  public constructor(private readonly maxFieldCharacters = 500) {
    if (!Number.isInteger(maxFieldCharacters) || maxFieldCharacters < 1) {
      throw new Error('maxFieldCharacters 必须是大于等于 1 的整数');
    }
  }

  public compress(result: ToolResult): CompressedToolOutput {
    const output = getJsonObject(result.output);
    const location = getLocation(result.toolName, output);
    const error = getError(result, output);

    return {
      toolName: result.toolName,
      summary: this.truncate(result.summary),
      ...(location.path === undefined
        ? {}
        : { path: this.truncate(location.path) }),
      ...(location.line === undefined ? {} : { line: location.line }),
      ...(error === undefined ? {} : { error: this.truncate(error) }),
    };
  }

  /** 生成稳定文本，供 ContextBuilder 直接写入 tool 消息。 */
  public toContextText(result: ToolResult): string {
    const compressed = this.compress(result);

    return [
      compressed.summary,
      ...(compressed.path === undefined ? [] : [`path: ${compressed.path}`]),
      ...(compressed.line === undefined ? [] : [`line: ${compressed.line}`]),
      ...(compressed.error === undefined ? [] : [`error: ${compressed.error}`]),
    ].join('\n');
  }

  private truncate(value: string): string {
    if (value.length <= this.maxFieldCharacters) {
      return value;
    }

    if (this.maxFieldCharacters <= 3) {
      return value.slice(0, this.maxFieldCharacters);
    }

    return `${value.slice(0, this.maxFieldCharacters - 3)}...`;
  }
}

/** 从工具输出读取直接路径或搜索结果首个位置。 */
function getLocation(
  toolName: string,
  output: JsonObject | undefined,
): { path?: string; line?: number } {
  if (output === undefined) {
    return {};
  }

  if (toolName === 'search_text' && Array.isArray(output.matches)) {
    const firstMatch = getJsonObject(output.matches[0]);

    if (firstMatch !== undefined) {
      return {
        ...(typeof firstMatch.path === 'string' ? { path: firstMatch.path } : {}),
        ...(typeof firstMatch.line === 'number' ? { line: firstMatch.line } : {}),
      };
    }
  }

  return typeof output.path === 'string' ? { path: output.path } : {};
}

/** 优先保留协议错误，其次保留错误结果中的结构化 error 或 stderr。 */
function getError(result: ToolResult, output: JsonObject | undefined): string | undefined {
  if (result.errorMessage !== undefined) {
    return result.errorMessage;
  }

  if (result.status !== 'error' || output === undefined) {
    return undefined;
  }

  if (typeof output.error === 'string') {
    return output.error;
  }

  return typeof output.stderr === 'string' ? output.stderr : undefined;
}

/** 将协议 JSON 值安全收窄为对象。 */
function getJsonObject(value: JsonValue | undefined): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : undefined;
}
