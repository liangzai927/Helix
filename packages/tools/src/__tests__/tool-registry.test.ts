import { describe, expect, it } from 'vitest';

import { ToolRegistry, type Tool } from '../index';

/** 构造可注册的最小测试工具。 */
function createTool(name: string): Tool<Record<string, never>, { ok: boolean }> {
  return {
    name,
    description: `${name} description`,
    inputSchema: { type: 'object' },
    readOnly: true,
    requiresApproval: false,
    async execute() {
      return { ok: true };
    },
  };
}

describe('ToolRegistry', () => {
  it('registers, resolves, and lists tool metadata', () => {
    const registry = new ToolRegistry();
    const tool = createTool('read_file');

    registry.register(tool);

    expect(registry.get('read_file')).toMatchObject({
      name: tool.name,
      description: tool.description,
      readOnly: true,
    });
    expect(registry.list()).toEqual([
      {
        name: 'read_file',
        description: 'read_file description',
        inputSchema: { type: 'object' },
        readOnly: true,
        requiresApproval: false,
      },
    ]);
  });

  it('rejects duplicate tool names', () => {
    const registry = new ToolRegistry();
    registry.register(createTool('read_file'));

    expect(() => registry.register(createTool('read_file'))).toThrow(
      '工具 read_file 已经注册',
    );
  });
});
