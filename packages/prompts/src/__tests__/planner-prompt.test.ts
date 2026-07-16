import { describe, expect, it } from 'vitest';

import { buildPatchPrompt, buildPlannerPrompt } from '../index';

describe('buildPlannerPrompt', () => {
  it('builds the stable planner structure in the required order', () => {
    expect(buildPlannerPrompt('修复登录失败问题')).toBe(`你是 Helix Agent 的规划器。
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
修复登录失败问题`);
  });

  it('keeps the prefix stable when the user input changes', () => {
    const first = buildPlannerPrompt('task one');
    const second = buildPlannerPrompt('task two');

    expect(first.slice(0, -'task one'.length)).toBe(
      second.slice(0, -'task two'.length),
    );
  });
});

describe('buildPatchPrompt', () => {
  it('要求模型返回完整文件 JSON 且不允许扩展路径', () => {
    const prompt = buildPatchPrompt('修复登录', '修改会话恢复逻辑');

    expect(prompt).toContain('严格 JSON');
    expect(prompt).toContain('修改后的完整文件内容');
    expect(prompt).toContain('不得返回未提供的路径');
    expect(prompt).toContain('任务目标：修复登录');
  });
});
