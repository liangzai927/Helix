import type { TerminalPort } from './terminal-port';
import type { Tool, ToolInputSchema } from './tool';

export interface RunTerminalInput {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface RunTerminalOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  summary: string;
}

export type TerminalCommandRisk = 'low' | 'medium' | 'high';

const DEFAULT_TIMEOUT_MS = 30_000;
const LOW_RISK_COMMAND_PATTERN = /^(?:git\s+(?:status|diff|log)(?:\s|$)|pwd(?:\s|$)|ls(?:\s|$))/u;
const HIGH_RISK_COMMAND_PATTERN = /(?:^|\s)(?:rm\s+-rf|sudo(?:\s|$)|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|shutdown(?:\s|$)|reboot(?:\s|$))/u;
const SHELL_CONTROL_PATTERN = /[;&|`$()<>]/u;

const RUN_TERMINAL_INPUT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    command: { type: 'string', minLength: 1 },
    cwd: { type: 'string' },
    timeoutMs: { type: 'integer', minimum: 1 },
  },
  required: ['command'],
  additionalProperties: false,
};

/** 通过 TerminalPort 执行命令并统一输出结果摘要。 */
export class RunTerminalTool implements Tool<RunTerminalInput, RunTerminalOutput> {
  public readonly name = 'run_terminal';
  public readonly description = '在指定目录中执行带超时限制的终端命令';
  public readonly inputSchema = RUN_TERMINAL_INPUT_SCHEMA;
  public readonly readOnly = false;
  public readonly requiresApproval = true;

  public constructor(private readonly terminal: TerminalPort) {}

  /** 根据具体命令动态判断是否需要审批。 */
  public requiresApprovalFor(input: RunTerminalInput): boolean {
    return classifyTerminalCommandRisk(input.command) !== 'low';
  }

  public async execute(input: RunTerminalInput): Promise<RunTerminalOutput> {
    const command = input.command.trim();

    if (command.length === 0) {
      throw new Error('command 不能为空');
    }

    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new Error('timeoutMs 必须是大于等于 1 的整数');
    }

    const result = await this.terminal.run({
      command,
      ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
      timeoutMs,
    });

    return {
      ...result,
      summary:
        result.exitCode === 0
          ? '命令执行成功'
          : `命令执行失败，退出码 ${result.exitCode}`,
    };
  }
}

/** 用最小白名单和高风险模式对命令做保守分级。 */
export function classifyTerminalCommandRisk(command: string): TerminalCommandRisk {
  const normalizedCommand = command.trim();

  if (HIGH_RISK_COMMAND_PATTERN.test(normalizedCommand)) {
    return 'high';
  }

  if (SHELL_CONTROL_PATTERN.test(normalizedCommand)) {
    return 'medium';
  }

  if (LOW_RISK_COMMAND_PATTERN.test(normalizedCommand)) {
    return 'low';
  }

  return 'medium';
}
