import type { Diagnostic, DiagnosticsPort } from './diagnostics-port';
import type { Tool, ToolInputSchema } from './tool';

export type GetDiagnosticsInput = Record<string, never>;

export interface GetDiagnosticsOutput {
  diagnostics: Diagnostic[];
}

const GET_DIAGNOSTICS_INPUT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

/** 通过宿主诊断端口获取工作区问题。 */
export class GetDiagnosticsTool
  implements Tool<GetDiagnosticsInput, GetDiagnosticsOutput>
{
  public readonly name = 'get_diagnostics';
  public readonly description = '获取当前工作区的诊断信息';
  public readonly inputSchema = GET_DIAGNOSTICS_INPUT_SCHEMA;
  public readonly readOnly = true;
  public readonly requiresApproval = false;

  public constructor(private readonly diagnosticsPort: DiagnosticsPort) {}

  /** 读取并返回宿主诊断，不在工具层改写结果。 */
  public async execute(_input: GetDiagnosticsInput): Promise<GetDiagnosticsOutput> {
    void _input;
    return {
      diagnostics: await this.diagnosticsPort.getDiagnostics(),
    };
  }
}
