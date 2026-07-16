/** 目录子项类型由端口层统一，不暴露具体文件系统 API。 */
export type FileSystemEntryType =
  | 'file'
  | 'directory'
  | 'symbolic-link'
  | 'other';

/** 目录的直接子项，供上层稳定生成列表结果。 */
export interface FileSystemEntry {
  name: string;
  path: string;
  type: FileSystemEntryType;
}

/** 文件系统端口只定义能力边界，不依赖 Node fs 或 VS Code。 */
export interface FileSystemPort {
  /** 读取 UTF-8 文本文件。 */
  readFile(path: string): Promise<string>;

  /** 以 UTF-8 写入文本文件。 */
  writeFile(path: string, content: string): Promise<void>;

  /** 判断路径是否存在。 */
  exists(path: string): Promise<boolean>;

  /** 列出目录的直接子项。 */
  listDirectory(path: string): Promise<FileSystemEntry[]>;
}
