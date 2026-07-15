import { ModelError } from './errors';
import type { JsonValue } from './types';

/** 安全读取 JSON，避免原生解析异常穿透模型边界。 */
export async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    throw new ModelError('模型响应包含无效 JSON', {
      code: 'invalid_response',
      cause: error,
    });
  }
}

/** 限制 HTTP 错误正文长度，避免大响应污染上层错误信息。 */
export async function readErrorDetails(response: Response): Promise<string> {
  try {
    return (await response.text()).trim().slice(0, 500);
  } catch {
    return '';
  }
}

/** 统一创建响应结构错误，避免各解析分支产生不同错误形态。 */
export function invalidResponseError(): ModelError {
  return new ModelError('模型响应结构无效', {
    code: 'invalid_response',
  });
}

/** 保留已有 ModelError，其余异常统一包装为请求错误。 */
export function normalizeModelError(error: unknown): ModelError {
  if (error instanceof ModelError) {
    return error;
  }

  return new ModelError('模型请求失败', {
    code: 'request_failed',
    cause: error,
  });
}

/** 校验 Adapter 必需配置，并返回去除首尾空白后的值。 */
export function requireNonEmptyValue(value: string, field: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new ModelError(`模型配置 ${field} 不能为空`, {
      code: 'configuration_error',
    });
  }

  return normalizedValue;
}

/** 判断未知值是否为可安全读取字段的普通对象。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 递归确认原始响应能够安全存入统一 JSON 类型。 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}
