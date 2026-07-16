const PLANNER_PROMPT_PREFIX = `你是 Helix Agent 的规划器。
请基于用户任务和已提供的工程上下文生成计划。
输出必须严格保留以下标题及顺序：

## 问题理解
## 影响范围
## 关键文件
## 实施步骤
## 风险点
## 是否需要用户确认

实施步骤中的终端命令必须写成“执行命令：具体命令”，关键文件必须使用工作区相对路径。

用户任务：
`;

const PATCH_PROMPT_PREFIX = `你是 Helix Agent 的补丁生成器。
只能修改提供的文件，必须返回严格 JSON，禁止 Markdown 代码块和额外说明。
返回格式：{"summary":"修改摘要","files":[{"path":"原始路径","content":"修改后的完整文件内容"}]}。
不得省略未修改代码，不得使用占位符，不得返回未提供的路径。
`;

/** 构造前缀稳定、标题顺序固定的 Planner Prompt。 */
export function buildPlannerPrompt(input: string): string {
  return `${PLANNER_PROMPT_PREFIX}${input}`;
}

/** 构造要求完整文件内容和严格 JSON 的补丁生成 Prompt。 */
export function buildPatchPrompt(goal: string, step: string): string {
  return `${PATCH_PROMPT_PREFIX}任务目标：${goal}\n当前步骤：${step}`;
}
