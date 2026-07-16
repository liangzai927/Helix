import type { AgentRuntimeMode } from './types';

const PLAN_PHRASES = ['先分析', '先给方案', '不要改'] as const;
const MULTI_FILE_SCOPE_PATTERN = /多个文件|两个文件|所有文件|跨文件/u;
const FILE_REFERENCE_PATTERN = /(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9]+/gu;

/** 根据用户原始输入选择聊天或规划模式。 */
export class ModeSelector {
  public select(input: string): Extract<AgentRuntimeMode, 'chat' | 'plan'> {
    if (PLAN_PHRASES.some((phrase) => input.includes(phrase))) {
      return 'plan';
    }

    if (MULTI_FILE_SCOPE_PATTERN.test(input) || countFileReferences(input) >= 2) {
      return 'plan';
    }

    return 'chat';
  }
}

/** 对文件引用去重，避免同一文件重复出现时误判为多文件任务。 */
function countFileReferences(input: string): number {
  return new Set(input.match(FILE_REFERENCE_PATTERN) ?? []).size;
}
