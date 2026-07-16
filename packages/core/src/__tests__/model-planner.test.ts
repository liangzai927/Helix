import { describe, expect, it } from 'vitest';

import type {
  BaseModel,
  ModelConfig,
  ModelEvent,
  ModelRequest,
  ModelResponse,
} from '@helix-agent/models';
import type { AgentEvent } from '@helix-agent/protocol';
import { ToolRegistry } from '@helix-agent/tools';

import { AgentRuntime, ModelPlanner } from '../index';

class FakeModel implements BaseModel {
  public readonly config: ModelConfig = {
    provider: 'openai-compatible',
    modelId: 'planner-test',
    baseUrl: 'https://models.example.com/v1',
    defaultOptions: {
      tools: [
        {
          name: 'read_file',
          description: '读取文件',
          inputSchema: {
            type: 'object',
          },
        },
      ],
      toolChoice: 'auto',
    },
  };
  public readonly requests: ModelRequest[] = [];

  /** 记录规划请求并返回稳定文本，避免测试访问真实模型。 */
  public async chat(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);

    return {
      id: 'response_1',
      modelId: this.config.modelId,
      message: {
        role: 'assistant',
        content: '模型生成的计划摘要',
      },
      stopReason: 'completed',
    };
  }

  /** ModelPlanner 不应调用流式接口，调用时直接让测试失败。 */
  public stream(_request: ModelRequest): AsyncIterable<ModelEvent> {
    void _request;
    throw new Error('ModelPlanner 不应调用 stream');
  }
}

/** 收集 Runtime 事件，方便验证异步事件流。 */
async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

describe('ModelPlanner', () => {
  it('uses BaseModel.chat with the fixed planning prompt', async () => {
    const model = new FakeModel();
    const toolRegistry = new ToolRegistry();
    const executionOrder: string[] = [];
    toolRegistry.register({
      name: 'list_directory',
      description: 'List directory',
      inputSchema: { type: 'object' },
      readOnly: true,
      requiresApproval: false,
      async execute() {
        executionOrder.push('list_directory');
        return { entries: [{ name: 'src', type: 'directory' }] };
      },
    });
    toolRegistry.register({
      name: 'search_text',
      description: 'Search text',
      inputSchema: { type: 'object' },
      readOnly: true,
      requiresApproval: false,
      async execute() {
        executionOrder.push('search_text');
        return { matches: [{ path: 'src/index.ts', line: 1 }] };
      },
    });
    const originalChat = model.chat.bind(model);
    model.chat = async (request) => {
      executionOrder.push('model');
      return originalChat(request);
    };
    const planner = new ModelPlanner(model, toolRegistry);
    const events: AgentEvent[] = [];

    const plan = await planner.createPlan(
      {
        input: '修复登录流程',
        taskId: 'task_1',
        cwd: '/project',
      },
      {
        emitEvent(event) {
          events.push(event);
        },
      },
    );

    expect(plan).toMatchObject({
      taskId: 'task_1',
      goal: '修复登录流程',
      findings: [],
      steps: [],
      risks: [],
      files: [],
      summary: '模型生成的计划摘要',
    });
    expect(model.requests).toHaveLength(1);
    expect(model.requests[0]?.tools).toEqual([]);
    expect(model.requests[0]?.toolChoice).toBe('none');
    expect(model.requests[0]?.messages).toHaveLength(2);
    expect(model.requests[0]?.messages[0]?.content).toContain('问题理解');
    expect(model.requests[0]?.messages[0]?.content).toContain('影响范围');
    expect(model.requests[0]?.messages[0]?.content).toContain('步骤');
    expect(model.requests[0]?.messages[0]?.content).toContain('风险点');
    expect(model.requests[0]?.messages[0]?.content).toContain('关键文件');
    expect(model.requests[0]?.messages[1]?.content).toContain('src/index.ts');
    expect(executionOrder).toEqual(['list_directory', 'search_text', 'model']);
    expect(events.map((event) => event.type)).toEqual([
      'tool.call.started',
      'tool.call.finished',
      'tool.call.started',
      'tool.call.finished',
    ]);
  });

  it('can be injected into AgentRuntime', async () => {
    const model = new FakeModel();
    const toolRegistry = new ToolRegistry();
    toolRegistry.register({
      name: 'list_directory',
      description: 'List directory',
      inputSchema: { type: 'object' },
      readOnly: true,
      requiresApproval: false,
      async execute() {
        return { entries: [] };
      },
    });
    toolRegistry.register({
      name: 'search_text',
      description: 'Search text',
      inputSchema: { type: 'object' },
      readOnly: true,
      requiresApproval: false,
      async execute() {
        return { matches: [] };
      },
    });
    const runtime = new AgentRuntime({
      planner: new ModelPlanner(model, toolRegistry),
      idGenerator: {
        next(prefix?: string) {
          return prefix === 'task' ? 'task_1' : `${prefix ?? 'id'}_1`;
        },
      },
      clock: {
        now() {
          return Date.UTC(2026, 6, 16, 9, 0, 0, 0);
        },
      },
    });

    const events = await collectEvents(runtime.run('生成模型计划'));
    const planEvent = events.find((event) => event.type === 'plan.created');

    expect(planEvent).toMatchObject({
      type: 'plan.created',
      taskId: 'task_1',
      plan: {
        taskId: 'task_1',
        goal: '生成模型计划',
        summary: '模型生成的计划摘要',
      },
    });
    expect(events.map((event) => event.type)).toEqual([
      'task.created',
      'status.changed',
      'status.changed',
      'tool.call.started',
      'tool.call.finished',
      'tool.call.started',
      'tool.call.finished',
      'plan.created',
      'status.changed',
      'finished',
    ]);
    expect(model.requests).toHaveLength(1);
  });

  it('rejects non-read-only planning tools before calling the model', async () => {
    const model = new FakeModel();
    const toolRegistry = new ToolRegistry();
    toolRegistry.register({
      name: 'list_directory',
      description: 'Unsafe list directory',
      inputSchema: { type: 'object' },
      readOnly: false,
      requiresApproval: true,
      async execute() {
        return {};
      },
    });
    const planner = new ModelPlanner(model, toolRegistry);

    await expect(
      planner.createPlan({ input: '修复问题', taskId: 'task_1' }, {}),
    ).rejects.toThrow('Planner 禁止调用非只读工具 list_directory');
    expect(model.requests).toHaveLength(0);
  });
});
