import { DEFAULT_IGNORED_DIRECTORY_NAMES } from './default-ignores';
import type { FileSystemPort } from './file-system-port';
import {
  createGlobMatcher,
  matchesAnyGlob,
  type GlobMatcher,
} from './glob-matcher';
import type { Tool, ToolInputSchema } from './tool';

export interface SearchTextInput {
  query: string;
  cwd: string;
  include?: string[];
  exclude?: string[];
  maxResults?: number;
}

export interface SearchTextMatch {
  path: string;
  line: number;
  column: number;
  preview: string;
}

export interface SearchTextOutput {
  matches: SearchTextMatch[];
}

const DEFAULT_MAX_RESULTS = 50;

const SEARCH_TEXT_INPUT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    query: { type: 'string' },
    cwd: { type: 'string' },
    include: { type: 'array', items: { type: 'string' } },
    exclude: { type: 'array', items: { type: 'string' } },
    maxResults: { type: 'integer', minimum: 1 },
  },
  required: ['query', 'cwd'],
  additionalProperties: false,
};

/** 通过 FileSystemPort 递归搜索文本，并限制返回命中数量。 */
export class SearchTextTool implements Tool<SearchTextInput, SearchTextOutput> {
  public readonly name = 'search_text';
  public readonly description = '在工作目录中搜索文本并返回文件位置';
  public readonly inputSchema = SEARCH_TEXT_INPUT_SCHEMA;
  public readonly readOnly = true;
  public readonly requiresApproval = false;

  public constructor(private readonly fileSystem: FileSystemPort) {}

  /** 校验搜索参数，遍历文件并在达到上限时立即停止。 */
  public async execute(input: SearchTextInput): Promise<SearchTextOutput> {
    if (input.query.trim().length === 0) {
      throw new Error('query 不能为空');
    }

    const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;

    if (!Number.isInteger(maxResults) || maxResults < 1) {
      throw new Error('maxResults 必须是大于等于 1 的整数');
    }

    const includeMatchers = createMatchers(input.include);
    const excludeMatchers = createMatchers(input.exclude);
    const matches: SearchTextMatch[] = [];

    await collectTextMatches(
      this.fileSystem,
      input.cwd,
      '',
      input.query,
      includeMatchers,
      excludeMatchers,
      maxResults,
      matches,
    );

    return { matches };
  }
}

/** 将可选 glob 列表收敛为可复用匹配器，忽略空规则。 */
function createMatchers(patterns: string[] | undefined): GlobMatcher[] {
  return (patterns ?? [])
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .map(createGlobMatcher);
}

/** 递归搜索符合路径规则的文件，返回是否已达结果上限。 */
async function collectTextMatches(
  fileSystem: FileSystemPort,
  directoryPath: string,
  relativeDirectory: string,
  query: string,
  includeMatchers: GlobMatcher[],
  excludeMatchers: GlobMatcher[],
  maxResults: number,
  matches: SearchTextMatch[],
): Promise<boolean> {
  const entries = await fileSystem.listDirectory(directoryPath);

  for (const entry of entries) {
    const relativePath = joinRelativePath(relativeDirectory, entry.name);

    if (
      (entry.type === 'directory' &&
        DEFAULT_IGNORED_DIRECTORY_NAMES.has(entry.name)) ||
      matchesAnyGlob(excludeMatchers, relativePath, entry.name)
    ) {
      continue;
    }

    if (entry.type === 'directory') {
      if (
        await collectTextMatches(
          fileSystem,
          entry.path,
          relativePath,
          query,
          includeMatchers,
          excludeMatchers,
          maxResults,
          matches,
        )
      ) {
        return true;
      }
    } else if (
      entry.type === 'file' &&
      (includeMatchers.length === 0 ||
        matchesAnyGlob(includeMatchers, relativePath, entry.name))
    ) {
      const content = await fileSystem.readFile(entry.path);

      if (appendFileMatches(entry.path, content, query, maxResults, matches)) {
        return true;
      }
    }
  }

  return false;
}

/** 记录单个文件中的所有字面量命中，行列均从 1 开始。 */
function appendFileMatches(
  path: string,
  content: string,
  query: string,
  maxResults: number,
  matches: SearchTextMatch[],
): boolean {
  const lines = content.split(/\r\n|\n|\r/);

  for (const [lineIndex, preview] of lines.entries()) {
    let searchFrom = 0;

    while (searchFrom <= preview.length - query.length) {
      const columnIndex = preview.indexOf(query, searchFrom);

      if (columnIndex === -1) {
        break;
      }

      matches.push({
        path,
        line: lineIndex + 1,
        column: columnIndex + 1,
        preview,
      });

      if (matches.length >= maxResults) {
        return true;
      }

      searchFrom = columnIndex + query.length;
    }
  }

  return false;
}

/** 将目录和名称组成统一使用斜杠的相对路径。 */
function joinRelativePath(directory: string, name: string): string {
  return directory.length === 0 ? name : `${directory}/${name}`;
}
