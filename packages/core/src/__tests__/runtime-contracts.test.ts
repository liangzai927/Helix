import { describe, expect, it } from 'vitest';

import {
  defineRuntimeDependencies,
  resolveAgentRuntimeOptions,
  type ApprovalManager,
  type ContextBuilder,
  type ConversationMemory,
  type Executor,
  type Planner,
  type RuntimeDependencies,
} from '../index';

describe('core runtime contracts', () => {
  it('resolves runtime options with stable defaults', () => {
    const options = resolveAgentRuntimeOptions({
      conversationId: 'conv_1',
      cwd: '/workspace/project',
    });

    expect(options.mode).toBe('chat');
    expect(options.metadata).toEqual({});
    expect(options.conversationId).toBe('conv_1');
    expect(options.cwd).toBe('/workspace/project');
  });

  it('preserves injected runtime dependencies', () => {
    const planner: Planner = {
      createPlan() {
        return { summary: 'fake plan' };
      },
    };

    const executor: Executor = {
      async *execute() {
        yield { type: 'finished' };
      },
    };

    const contextBuilder: ContextBuilder = {
      build() {
        return {
          messages: [],
        };
      },
    };

    const memory: ConversationMemory = {
      appendMessage() {},
      listMessages() {
        return [];
      },
    };

    const approvalManager: ApprovalManager = {
      createApprovalRequest() {
        return 'approval_1';
      },
      async waitForApproval() {
        return {
          approved: true,
        };
      },
    };

    const dependencies: RuntimeDependencies = defineRuntimeDependencies({
      planner,
      executor,
      contextBuilder,
      memory,
      approvalManager,
    });

    expect(dependencies.planner).toBe(planner);
    expect(dependencies.executor).toBe(executor);
    expect(dependencies.contextBuilder).toBe(contextBuilder);
    expect(dependencies.memory).toBe(memory);
    expect(dependencies.approvalManager).toBe(approvalManager);
  });
});
