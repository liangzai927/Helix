/** 模型适配器统一使用的错误分类，避免上层依赖供应商原始错误结构。 */
export type ModelErrorCode =
  | 'configuration_error'
  | 'request_failed'
  | 'invalid_response'
  | 'unsupported_feature';

export interface ModelErrorOptions {
  code: ModelErrorCode;
  status?: number;
  cause?: unknown;
}

/** 所有模型配置、请求和响应错误都会收敛成这一类型。 */
export class ModelError extends Error {
  public readonly code: ModelErrorCode;
  public readonly status?: number;

  public constructor(message: string, options: ModelErrorOptions) {
    super(message, options.cause === undefined ? {} : { cause: options.cause });
    this.name = 'ModelError';
    this.code = options.code;

    if (options.status !== undefined) {
      this.status = options.status;
    }
  }
}
