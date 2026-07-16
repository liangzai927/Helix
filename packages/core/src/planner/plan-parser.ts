import { randomUUID } from 'node:crypto';

import type { AgentPlan, PlanStepKind } from '@helix-agent/protocol';

const SECTION_TITLES = [
  '问题理解',
  '影响范围',
  '关键文件',
  '实施步骤',
  '风险点',
  '是否需要用户确认',
] as const;

type SectionTitle = (typeof SECTION_TITLES)[number];

export interface PlanParserInput {
  taskId: string;
  goal: string;
}

/** 将固定六段模型文本转换成协议层 AgentPlan。 */
export class PlanParser {
  public parse(output: string, input: PlanParserInput): AgentPlan {
    const summary = output.trim();
    const sections = parseSections(summary);

    if (sections === undefined) {
      return createBasePlan(input, summary);
    }

    const files = parseSectionItems(sections.get('关键文件') ?? '');
    const stepTitles = parseSectionItems(sections.get('实施步骤') ?? '');

    return {
      ...createBasePlan(input, summary),
      findings: [
        ...parseSectionItems(sections.get('问题理解') ?? ''),
        ...parseSectionItems(sections.get('影响范围') ?? ''),
      ],
      files,
      steps: stepTitles.map((title) => {
        const kind = inferStepKind(title);
        const command = parseCommand(title);

        return {
          id: `step_${randomUUID()}`,
          title,
          kind,
          status: 'pending',
          ...((kind === 'read' || kind === 'edit') && files.length > 0
            ? { filePaths: files }
            : {}),
          ...(command === undefined ? {} : { description: command }),
        };
      }),
      risks: parseSectionItems(sections.get('风险点') ?? ''),
    };
  }
}

/** 从“执行命令：...”步骤中提取可直接交给终端的命令文本。 */
function parseCommand(title: string): string | undefined {
  return /^执行命令[：:]\s*(.+)$/u.exec(title)?.[1]?.trim();
}

/** 创建解析成功和回退计划共用的稳定基础结构。 */
function createBasePlan(input: PlanParserInput, summary: string): AgentPlan {
  return {
    id: `plan_${randomUUID()}`,
    taskId: input.taskId,
    goal: input.goal,
    createdAt: new Date().toISOString(),
    findings: [],
    steps: [],
    risks: [],
    files: [],
    summary,
  };
}

/** 仅接受标题完整且顺序严格一致的规划文本。 */
function parseSections(output: string): Map<SectionTitle, string> | undefined {
  const lines = output.split(/\r?\n/u);
  const sections = new Map<SectionTitle, string>();
  let sectionIndex = -1;
  let content: string[] = [];

  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/u.exec(line)?.[1];

    if (heading === undefined) {
      if (sectionIndex >= 0) {
        content.push(line);
      }
      continue;
    }

    const expectedHeading = SECTION_TITLES[sectionIndex + 1];

    if (heading !== expectedHeading) {
      return undefined;
    }

    if (sectionIndex >= 0) {
      const currentTitle = SECTION_TITLES[sectionIndex];

      if (currentTitle === undefined) {
        return undefined;
      }

      sections.set(currentTitle, content.join('\n').trim());
    }

    sectionIndex += 1;
    content = [];
  }

  if (sectionIndex !== SECTION_TITLES.length - 1) {
    return undefined;
  }

  const finalTitle = SECTION_TITLES[sectionIndex];

  if (finalTitle === undefined) {
    return undefined;
  }

  sections.set(finalTitle, content.join('\n').trim());
  return sections;
}

/** 兼容项目符号、数字序号和普通分行文本。 */
function parseSectionItems(content: string): string[] {
  return content
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/u, '').trim())
    .filter((line) => line.length > 0);
}

/** 根据步骤动词收敛到协议允许的最小步骤类型集合。 */
function inferStepKind(title: string): PlanStepKind {
  if (/搜索|查找|检索/u.test(title)) {
    return 'search';
  }

  if (/读取|查看|分析/u.test(title)) {
    return 'read';
  }

  if (/修改|实现|修复|编辑/u.test(title)) {
    return 'edit';
  }

  if (/运行|执行|测试|命令/u.test(title)) {
    return 'command';
  }

  return 'other';
}
