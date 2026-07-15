/** 协议层统一使用的 ISO 时间字符串。 */
export type IsoDateTimeString = string;

/** 协议层统一使用的主键 ID。 */
export type EntityId = string;

/** JSON 原始值。 */
export type JsonPrimitive = string | number | boolean | null;

/** JSON 对象。 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/** JSON 值。 */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/** 文件引用信息。 */
export interface FileReference {
  path: string;
  line?: number;
  column?: number;
}
