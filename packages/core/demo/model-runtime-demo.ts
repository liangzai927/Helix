import { OpenAICompatibleModel } from '@helix-agent/models';

import { AgentRuntime, ModelPlanner } from '../src/index';

/** 读取必填环境变量，避免将无效配置延迟到网络请求阶段。 */
function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new Error(`缺少必填环境变量 ${name}`);
  }

  return value;
}

/** 将命令行参数合并为用户任务，并拒绝空输入。 */
function readTaskInput(): string {
  const input = process.argv.slice(2).join(' ').trim();

  if (input.length === 0) {
    throw new Error('请通过命令行参数输入用户任务');
  }

  return input;
}

/** 使用真实 OpenAI Compatible 模型运行 Core 规划链路。 */
async function runModelRuntimeDemo(): Promise<void> {
  const model = new OpenAICompatibleModel({
    apiKey: requireEnvironmentVariable('HELIX_API_KEY'),
    baseUrl: requireEnvironmentVariable('HELIX_BASE_URL'),
    modelId: requireEnvironmentVariable('HELIX_MODEL'),
  });
  const runtime = new AgentRuntime({
    planner: new ModelPlanner(model),
  });

  for await (const event of runtime.run(readTaskInput())) {
    if (event.type === 'plan.created') {
      console.log(JSON.stringify(event.plan, null, 2));
    }
  }
}

void runModelRuntimeDemo().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
