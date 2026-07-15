import { describe, expect, it } from 'vitest';

import {
  assertNever,
  createId,
  err,
  now,
  ok,
  safeJsonParse,
  sleep,
  type Result,
} from '../index';

describe('shared utilities', () => {
  it('creates ids with and without prefixes', () => {
    const plainId = createId();
    const prefixedId = createId('task');

    expect(plainId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(prefixedId).toMatch(
      /^task_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('returns the current timestamp', () => {
    const before = Date.now();
    const timestamp = now();
    const after = Date.now();

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('creates ok and err results', () => {
    const success = ok('done');
    const failure = err(new Error('failed'));

    expect(success).toEqual({ ok: true, value: 'done' });
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error.message).toBe('failed');
    }
  });

  it('parses valid json and returns a typed result', () => {
    const result = safeJsonParse<{ name: string }>('{"name":"helix"}');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('helix');
    }
  });

  it('returns an error result for invalid json', () => {
    const result = safeJsonParse<unknown>('{"name":');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it('throws when assertNever is called', () => {
    expect(() => assertNever('unexpected' as never)).toThrow('Unexpected value: unexpected');
  });

  it('waits for at least the requested duration', async () => {
    const startedAt = Date.now();

    await sleep(5);

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(5);
  });

  it('supports discriminated result narrowing', () => {
    const result: Result<number, string> = Math.random() > -1 ? ok(1) : err('failed');

    if (result.ok) {
      expect(result.value).toBe(1);
      return;
    }

    expect(result.error).toBe('failed');
  });
});
