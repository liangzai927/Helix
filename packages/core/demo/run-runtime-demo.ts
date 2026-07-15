import { AgentRuntime, FakeExecutor, FakePlanner } from '../src/index';

async function runRuntimeDemo(): Promise<void> {
  const runtime = new AgentRuntime({
    planner: new FakePlanner(),
    executor: new FakeExecutor(),
  });

  for await (const event of runtime.run('验证 Helix Core 运行时事件流')) {
    console.log(`[${event.type}]`, JSON.stringify(event, null, 2));
  }
}

void runRuntimeDemo();
