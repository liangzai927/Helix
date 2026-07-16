import { spawn } from 'node:child_process';

import type {
  TerminalPort,
  TerminalPortInput,
  TerminalPortOutput,
} from '../terminal-port';

/** 使用 Node 子进程实现终端端口，并在超时后终止命令。 */
export class NodeTerminalPort implements TerminalPort {
  public run(input: TerminalPortInput): Promise<TerminalPortOutput> {
    return new Promise((resolve, reject) => {
      const child = spawn(input.command, {
        ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
        shell: true,
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, input.timeoutMs);

      child.on('error', (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        reject(error);
      });

      child.on('close', (exitCode) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        resolve({
          exitCode: timedOut ? 124 : (exitCode ?? 1),
          stdout,
          stderr: timedOut ? `${stderr}命令执行超时\n` : stderr,
        });
      });
    });
  }
}
