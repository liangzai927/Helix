import { DEFAULT_IGNORED_DIRECTORY_NAMES } from './default-ignores';
import type { FileSystemPort } from './file-system-port';
import type { Tool, ToolInputSchema } from './tool';

export interface GlobFilesInput {
  patterns: string[];
  cwd: string;
  ignore?: string[];
}

export interface GlobFilesOutput {
  files: string[];
}

interface GlobMatcher {
  regex: RegExp;
  matchBaseName: boolean;
}

const GLOB_FILES_INPUT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    patterns: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    },
    cwd: { type: 'string' },
    ignore: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['patterns', 'cwd'],
  additionalProperties: false,
};

/** 通过 FileSystemPort 递归匹配项目文件，不依赖具体 glob 库。 */
export class GlobFilesTool implements Tool<GlobFilesInput, GlobFilesOutput> {
  public readonly name = 'glob_files';
  public readonly description = '在指定工作目录中递归匹配文件路径';
  public readonly inputSchema = GLOB_FILES_INPUT_SCHEMA;
  public readonly readOnly = true;
  public readonly requiresApproval = false;

  public constructor(private readonly fileSystem: FileSystemPort) {}

  /** 编译匹配与忽略规则，递归收集并稳定排序文件路径。 */
  public async execute(input: GlobFilesInput): Promise<GlobFilesOutput> {
    const patterns = input.patterns.map((pattern) => pattern.trim());

    if (patterns.length === 0 || patterns.some((pattern) => pattern.length === 0)) {
      throw new Error('patterns 至少需要一个非空模式');
    }

    const patternMatchers = patterns.map(createGlobMatcher);
    const ignoreMatchers = (input.ignore ?? [])
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0)
      .map(createGlobMatcher);
    const files: string[] = [];

    await collectMatchingFiles(
      this.fileSystem,
      input.cwd,
      '',
      patternMatchers,
      ignoreMatchers,
      files,
    );

    return {
      files: files.sort(),
    };
  }
}

/** 深度优先遍历目录，并在进入子目录前应用忽略规则。 */
async function collectMatchingFiles(
  fileSystem: FileSystemPort,
  directoryPath: string,
  relativeDirectory: string,
  patternMatchers: GlobMatcher[],
  ignoreMatchers: GlobMatcher[],
  files: string[],
): Promise<void> {
  const entries = await fileSystem.listDirectory(directoryPath);

  for (const entry of entries) {
    const relativePath = joinRelativePath(relativeDirectory, entry.name);

    if (
      (entry.type === 'directory' &&
        DEFAULT_IGNORED_DIRECTORY_NAMES.has(entry.name)) ||
      matchesAny(ignoreMatchers, relativePath, entry.name)
    ) {
      continue;
    }

    if (entry.type === 'directory') {
      await collectMatchingFiles(
        fileSystem,
        entry.path,
        relativePath,
        patternMatchers,
        ignoreMatchers,
        files,
      );
    } else if (
      entry.type === 'file' &&
      matchesAny(patternMatchers, relativePath, entry.name)
    ) {
      files.push(entry.path);
    }
  }
}

/** 将目录和名称组成统一使用斜杠的相对路径。 */
function joinRelativePath(directory: string, name: string): string {
  return directory.length === 0 ? name : `${directory}/${name}`;
}

/** 判断相对路径或文件名是否命中任意 glob 规则。 */
function matchesAny(
  matchers: GlobMatcher[],
  relativePath: string,
  baseName: string,
): boolean {
  return matchers.some(
    (matcher) =>
      matcher.regex.test(relativePath) ||
      (matcher.matchBaseName && matcher.regex.test(baseName)),
  );
}

/** 将 MVP 支持的星号、双星号和问号语法编译为正则。 */
function createGlobMatcher(pattern: string): GlobMatcher {
  const normalizedPattern = pattern.replaceAll('\\', '/').replace(/^\.\//, '');
  let source = '^';

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const character = normalizedPattern[index];

    if (character === '*' && normalizedPattern[index + 1] === '*') {
      if (normalizedPattern[index + 2] === '/') {
        source += '(?:.*/)?';
        index += 2;
      } else {
        source += '.*';
        index += 1;
      }
    } else if (character === '*') {
      source += '[^/]*';
    } else if (character === '?') {
      source += '[^/]';
    } else {
      source += escapeRegularExpressionCharacter(character);
    }
  }

  return {
    regex: new RegExp(`${source}$`),
    matchBaseName: !normalizedPattern.includes('/'),
  };
}

/** 转义 glob 中作为普通文本的正则特殊字符。 */
function escapeRegularExpressionCharacter(character: string | undefined): string {
  if (character === undefined) {
    return '';
  }

  return /[\\^$+.()|[\]{}]/.test(character) ? `\\${character}` : character;
}
