/** 代码探索工具默认跳过的依赖、版本库和构建目录。 */
export const DEFAULT_IGNORED_DIRECTORY_NAMES: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
]);
