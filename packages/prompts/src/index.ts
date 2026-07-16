const PLANNER_PROMPT_PREFIX = `你是 Helix Agent 的规划器。
请基于用户任务和已提供的工程上下文生成计划。
输出必须严格保留以下标题及顺序：

## 问题理解
## 影响范围
## 关键文件
## 实施步骤
## 风险点
## 是否需要用户确认

用户任务：
`;

/** 构造前缀稳定、标题顺序固定的 Planner Prompt。 */
export function buildPlannerPrompt(input: string): string {
  return `${PLANNER_PROMPT_PREFIX}${input}`;
}
