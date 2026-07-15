import { describe, expect, it } from 'vitest';

import { RuntimeState } from '../index';

describe('RuntimeState', () => {
  it('defaults to idle', () => {
    const state = new RuntimeState({
      taskId: 'task_1',
    });

    expect(state.getStatus()).toBe('idle');
  });

  it('accepts an explicit initial status', () => {
    const state = new RuntimeState({
      taskId: 'task_1',
      initialStatus: 'building_context',
    });

    expect(state.getStatus()).toBe('building_context');
  });

  it('updates the current status and returns a status.changed event', () => {
    const state = new RuntimeState({
      taskId: 'task_1',
      clock: {
        now() {
          return Date.UTC(2026, 6, 15, 8, 0, 0, 0);
        },
      },
    });

    const event = state.setStatus('planning', '正在生成计划');

    expect(state.getStatus()).toBe('planning');
    expect(event).toEqual({
      type: 'status.changed',
      taskId: 'task_1',
      createdAt: '2026-07-15T08:00:00.000Z',
      status: 'planning',
      message: '正在生成计划',
    });
  });

  it('supports the extra runtime statuses required by the runtime workflow', () => {
    const state = new RuntimeState({
      taskId: 'task_1',
    });

    state.setStatus('applying_patch');
    expect(state.getStatus()).toBe('applying_patch');

    state.setStatus('running_command');
    expect(state.getStatus()).toBe('running_command');
  });
});
