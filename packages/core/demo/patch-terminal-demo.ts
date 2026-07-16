import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { AgentPatch, AgentPlan } from '@helix-agent/protocol';
import {
  ApplyPatchTool,
  NodeFileSystemPort,
  NodeTerminalPort,
  RunTerminalTool,
  ToolRegistry,
} from '@helix-agent/tools';

import {
  AgentRuntime,
  ApprovalManager,
  PlanExecutor,
  type Planner,
} from '../src/index';

const PROJECT_ROOT = resolve(__dirname, '../../..');

class AutoApprovalManager extends ApprovalManager {
  /** Demo 创建请求后异步批准，保留真实的 pending 请求事件。 */
  public override createApprovalRequest(
    input: Parameters<ApprovalManager['createApprovalRequest']>[0],
  ) {
    const request = super.createApprovalRequest(input);
    queueMicrotask(() => this.approve(request.id));
    return request;
  }
}

/** 构造包含补丁和低风险命令的确定性验收计划。 */
function createDemoPlanner(filePath: string): Planner {
  return {
    createPlan(task): AgentPlan {
      return {
        id: `plan_${randomUUID()}`,
        taskId: task.taskId ?? `task_${randomUUID()}`,
        goal: task.input,
        createdAt: new Date().toISOString(),
        findings: ['使用临时文件验证补丁审批与应用'],
        steps: [
          {
            id: `step_${randomUUID()}`,
            title: '更新临时验收文件',
            kind: 'edit',
            status: 'pending',
            filePaths: [filePath],
          },
          {
            id: `step_${randomUUID()}`,
            title: '检查仓库状态',
            description: 'git status --short',
            kind: 'command',
            status: 'pending',
          },
        ],
        risks: ['补丁写入必须先获得审批'],
        files: [filePath],
        summary: '应用临时文件补丁并检查 Git 状态',
      };
    },
  };
}

/** 根据编辑步骤生成完整文件替换补丁。 */
async function createDemoPatch(plan: AgentPlan, filePath: string): Promise<AgentPatch> {
  const expectedContent = await readFile(filePath, 'utf8');

  return {
    id: `patch_${randomUUID()}`,
    taskId: plan.taskId,
    createdAt: new Date().toISOString(),
    summary: '将临时验收文件内容从 before 更新为 after',
    files: [
      {
        path: filePath,
        changeType: 'update',
        operation: {
          type: 'replace_file_content',
          content: 'after\n',
          expectedContent,
        },
      },
    ],
  };
}

/** 运行第七周验收流程，并在结束后删除临时目录。 */
async function runPatchTerminalDemo(): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'helix-patch-terminal-'));
  const filePath = join(temporaryDirectory, 'demo.txt');

  try {
    await writeFile(filePath, 'before\n', 'utf8');

    const fileSystem = new NodeFileSystemPort();
    const approvalManager = new AutoApprovalManager();
    const toolRegistry = new ToolRegistry();
    toolRegistry.register(new ApplyPatchTool(fileSystem, approvalManager));
    toolRegistry.register(new RunTerminalTool(new NodeTerminalPort()));

    const runtime = new AgentRuntime({
      planner: createDemoPlanner(filePath),
      executor: new PlanExecutor(toolRegistry, undefined, {
        approvalManager,
        patchGenerator: {
          generatePatch(plan) {
            return createDemoPatch(plan, filePath);
          },
        },
      }),
      approvalManager,
      toolRegistry,
    });

    for await (const event of runtime.run('应用一个简单补丁并执行 git status', {
      cwd: PROJECT_ROOT,
      mode: 'execute',
    })) {
      console.log(JSON.stringify(event, null, 2));
    }

    console.log('[patch.content]', JSON.stringify(await readFile(filePath, 'utf8')));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

void runPatchTerminalDemo().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
