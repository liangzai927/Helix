import { describe, expect, it, vi } from 'vitest';

import type { AgentEvent } from '@helix-agent/protocol';

import { EventEmitter, type RuntimeEventListener } from '../index';

function createStatusChangedEvent(): AgentEvent {
  return {
    type: 'status.changed',
    taskId: 'task_1',
    createdAt: '2026-07-15T16:10:00.000Z',
    status: 'planning',
    message: '正在生成计划',
  };
}

describe('EventEmitter', () => {
  it('delivers emitted events to all listeners', async () => {
    const emitter = new EventEmitter();
    const first = vi.fn((event: AgentEvent) => {
      void event;
    });
    const second = vi.fn((event: AgentEvent) => {
      void event;
    });
    const event = createStatusChangedEvent();

    emitter.on(first);
    emitter.on(second);

    await emitter.emit(event);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
  });

  it('removes listeners with off', async () => {
    const emitter = new EventEmitter();
    const listener = vi.fn((event: AgentEvent) => {
      void event;
    });
    const event = createStatusChangedEvent();

    emitter.on(listener);
    emitter.off(listener);

    await emitter.emit(event);

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports disposing listeners from on', async () => {
    const emitter = new EventEmitter();
    const listener = vi.fn((event: AgentEvent) => {
      void event;
    });
    const event = createStatusChangedEvent();

    const dispose = emitter.on(listener);
    dispose();

    await emitter.emit(event);

    expect(listener).not.toHaveBeenCalled();
  });

  it('continues delivering events when a listener throws', async () => {
    const emitter = new EventEmitter();
    const event = createStatusChangedEvent();
    const throwingListener: RuntimeEventListener = () => {
      throw new Error('listener failed');
    };
    const asyncThrowingListener: RuntimeEventListener = async () => {
      throw new Error('async listener failed');
    };
    const healthyListener = vi.fn((event: AgentEvent) => {
      void event;
    });

    emitter.on(throwingListener);
    emitter.on(asyncThrowingListener);
    emitter.on(healthyListener);

    await expect(emitter.emit(event)).resolves.toBeUndefined();

    expect(healthyListener).toHaveBeenCalledTimes(1);
    expect(healthyListener).toHaveBeenCalledWith(event);
  });
});
