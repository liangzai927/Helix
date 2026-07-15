import { err, ok, type Result } from './result';

/** 生成带可选前缀的唯一 ID。 */
export function createId(prefix?: string): string {
  const id = crypto.randomUUID();

  if (prefix == null || prefix.length === 0) {
    return id;
  }

  return `${prefix}_${id}`;
}

/** 返回当前时间戳。 */
export function now(): number {
  return Date.now();
}

/** 强制检查分支是否穷尽。 */
export function assertNever(value: never, message?: string): never {
  const detail = message ?? `Unexpected value: ${String(value)}`;
  throw new Error(detail);
}

/** 异步等待指定毫秒数。 */
export async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 安全解析 JSON 字符串。 */
export function safeJsonParse<T>(input: string): Result<T, Error> {
  try {
    return ok(JSON.parse(input) as T);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return err(error);
    }

    return err(new Error('Unknown JSON parse error'));
  }
}
