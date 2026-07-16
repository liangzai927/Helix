import { describe, expect, it } from 'vitest';

import {
  GetDiagnosticsTool,
  NodeDiagnosticsPort,
  type Diagnostic,
  type DiagnosticsPort,
} from '../index';

class FakeDiagnosticsPort implements DiagnosticsPort {
  public constructor(private readonly diagnostics: Diagnostic[]) {}

  /** 返回预置诊断，代替未接入的 VS Code 实现。 */
  public async getDiagnostics(): Promise<Diagnostic[]> {
    return this.diagnostics;
  }
}

describe('GetDiagnosticsTool', () => {
  it('exposes read-only metadata and returns port diagnostics', async () => {
    const diagnostics: Diagnostic[] = [
      {
        path: '/project/src/index.ts',
        message: 'Cannot find name',
        severity: 'error',
        line: 3,
        column: 5,
      },
    ];
    const tool = new GetDiagnosticsTool(new FakeDiagnosticsPort(diagnostics));

    expect(tool.name).toBe('get_diagnostics');
    expect(tool.readOnly).toBe(true);
    expect(tool.requiresApproval).toBe(false);
    await expect(tool.execute({})).resolves.toEqual({ diagnostics });
  });

  it('uses an empty diagnostics result in the Node environment', async () => {
    const port = new NodeDiagnosticsPort();

    await expect(port.getDiagnostics()).resolves.toEqual([]);
  });
});
