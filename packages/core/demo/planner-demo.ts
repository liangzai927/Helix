import { resolve } from 'node:path';

import type {
  BaseModel,
  ModelConfig,
  ModelEvent,
  ModelRequest,
  ModelResponse,
} from '@helix-agent/models';
import type { AgentEvent } from '@helix-agent/protocol';
import {
  ListDirectoryTool,
  NodeFileSystemPort,
  ReadFileTool,
  SearchTextTool,
  ToolRegistry,
} from '@helix-agent/tools';

import { AgentRuntime, ModelPlanner, PlanExecutor } from '../src/index';

const PROJECT_ROOT = resolve(__dirname, '../../..');
const BUG_REQUEST = '先分析并修复 AgentRuntime 执行计划前错误结束任务的 bug';

/** 为验收 Demo 提供稳定计划，不依赖外部模型服务。 */
class PlannerDemoModel implements BaseModel {
  public readonly config: ModelConfig = {
    provider: 'openai-compatible',
    modelId: 'planner-demo',
  };
  public chatCalls = 0;

  public async chat(_request: ModelRequest): Promise<ModelResponse> {
    void _request;
    this.chatCalls += 1;

    return {
      id: `planner_demo_${this.chatCalls}`,
      modelId: this.config.modelId,
      message: {
        role: 'assistant',
        content: `## 问题理解
检查 AgentRuntime 的执行状态顺序

## 影响范围
- Core Runtime 事件流

## 关键文件
- packages/core/src/runtime/agent-runtime.ts

## 实施步骤
1. 搜索 AgentRuntime 状态切换逻辑
2. 读取 Runtime 实现
3. 修改错误的状态顺序

## 风险点
- 需要保持现有事件协议兼容

## 是否需要用户确认
修改前需要确认`,
      },
      stopReason: 'completed',
    };
  }

  public stream(_request: ModelRequest): AsyncIterable<ModelEvent> {
    void _request;
    throw new Error('planner-demo 不使用流式模型接口');
  }
}

/** 只输出验收关注的工具、计划和等待事件，避免打印完整文件内容。 */
function printRelevantEvent(event: AgentEvent): void {
  if (event.type === 'tool.call.started') {
    console.log(`[${event.type}]`, {
      toolName: event.toolCall.toolName,
      input: event.toolCall.input,
    });
    return;
  }

  if (event.type === 'tool.call.finished') {
    console.log(`[${event.type}]`, {
      toolName: event.toolResult.toolName,
      status: event.toolResult.status,
      summary: event.toolResult.summary,
    });
    return;
  }

  if (event.type === 'plan.created') {
    console.log(`[${event.type}]`, JSON.stringify(event.plan, null, 2));
    return;
  }

  if (event.type === 'status.changed' && event.status === 'waiting_approval') {
    console.log(`[${event.type}]`, event.status, event.message);
  }
}

/** 运行一次 Runtime 并输出第六周验收事件。 */
async function runOnce(runtime: AgentRuntime, label: string): Promise<void> {
  console.log(`\n[run] ${label}`);

  for await (const event of runtime.run(BUG_REQUEST, {
    cwd: PROJECT_ROOT,
    mode: 'plan',
  })) {
    printRelevantEvent(event);
  }
}

/** 验证项目探索、计划解析、只读执行与相同输入缓存复用。 */
async function runPlannerDemo(): Promise<void> {
  const fileSystem = new NodeFileSystemPort();
  const toolRegistry = new ToolRegistry();
  const model = new PlannerDemoModel();
  toolRegistry.register(new ReadFileTool(fileSystem));
  toolRegistry.register(new ListDirectoryTool(fileSystem));
  toolRegistry.register(new SearchTextTool(fileSystem));

  const runtime = new AgentRuntime({
    planner: new ModelPlanner(model, toolRegistry),
    executor: new PlanExecutor(toolRegistry),
    toolRegistry,
  });

  await runOnce(runtime, 'first');
  const callsBeforeCacheRun = model.chatCalls;
  await runOnce(runtime, 'cached');

  console.log('[cache.hit]', model.chatCalls === callsBeforeCacheRun, {
    modelCalls: model.chatCalls,
  });
}

void runPlannerDemo().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
