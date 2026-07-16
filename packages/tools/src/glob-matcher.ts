export interface GlobMatcher {
  regex: RegExp;
  matchBaseName: boolean;
}

/** 判断相对路径或文件名是否命中任意 glob 规则。 */
export function matchesAnyGlob(
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
export function createGlobMatcher(pattern: string): GlobMatcher {
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
