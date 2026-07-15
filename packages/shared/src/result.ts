/** 成功结果。 */
export interface Ok<T> {
  ok: true;
  value: T;
}

/** 失败结果。 */
export interface Err<E> {
  ok: false;
  error: E;
}

/** 通用结果类型。 */
export type Result<T, E> = Ok<T> | Err<E>;

/** 创建成功结果。 */
export function ok<T>(value: T): Ok<T> {
  return {
    ok: true,
    value,
  };
}

/** 创建失败结果。 */
export function err<E>(error: E): Err<E> {
  return {
    ok: false,
    error,
  };
}
