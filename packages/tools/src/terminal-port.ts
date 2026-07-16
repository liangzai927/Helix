export interface TerminalPortInput {
  command: string;
  cwd?: string;
  timeoutMs: number;
}

export interface TerminalPortOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** 终端端口隔离具体进程执行环境。 */
export interface TerminalPort {
  run(input: TerminalPortInput): Promise<TerminalPortOutput>;
}
