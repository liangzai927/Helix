/** 统一诊断级别，避免 Core 依赖 VS Code 枚举。 */
export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

/** 宿主返回给 Agent 的最小诊断结构。 */
export interface Diagnostic {
  path: string;
  message: string;
  severity: DiagnosticSeverity;
  line?: number;
  column?: number;
}

/** 诊断端口隔离 Core 与具体编辑器 API。 */
export interface DiagnosticsPort {
  /** 读取当前工作区可用的全部诊断。 */
  getDiagnostics(): Promise<Diagnostic[]>;
}
