import type { Diagnostic, DiagnosticsPort } from '../diagnostics-port';

/** Node 环境暂无编辑器诊断源，因此返回空结果。 */
export class NodeDiagnosticsPort implements DiagnosticsPort {
  /** 保持 DiagnosticsPort 契约，等待 VS Code Adapter 注入真实实现。 */
  public async getDiagnostics(): Promise<Diagnostic[]> {
    return [];
  }
}
