import { describe, expect, it } from 'vitest';

import type { TerminalPort, TerminalPortInput } from '../index';
import { RunTerminalTool } from '../index';

class MockTerminalPort implements TerminalPort {
  public input: TerminalPortInput | undefined;

  public async run(input: TerminalPortInput) {
    this.input = input;
    return {
      exitCode: 1,
      stdout: 'standard output\n',
      stderr: 'standard error\n',
    };
  }
}

describe('RunTerminalTool', () => {
  it('returns terminal output and a readable summary', async () => {
    const terminal = new MockTerminalPort();
    const tool = new RunTerminalTool(terminal);

    const result = await tool.execute({
      command: 'pnpm test',
      cwd: '/project',
      timeoutMs: 5_000,
    });

    expect(terminal.input).toEqual({
      command: 'pnpm test',
      cwd: '/project',
      timeoutMs: 5_000,
    });
    expect(result).toEqual({
      exitCode: 1,
      stdout: 'standard output\n',
      stderr: 'standard error\n',
      summary: '命令执行失败，退出码 1',
    });
  });

  it.each(['git status', 'git status --short', 'git diff', 'pwd', 'ls -la'])(
    'does not require approval for a low-risk command: %s',
    (command) => {
      const tool = new RunTerminalTool(new MockTerminalPort());

      expect(tool.requiresApprovalFor({ command })).toBe(false);
    },
  );

  it.each([
    'pnpm test',
    'git push origin main',
    'rm -rf dist',
    'sudo reboot',
    'git status && git push origin main',
  ])(
    'requires approval for a medium or high-risk command: %s',
    (command) => {
      const tool = new RunTerminalTool(new MockTerminalPort());

      expect(tool.requiresApprovalFor({ command })).toBe(true);
    },
  );
});
