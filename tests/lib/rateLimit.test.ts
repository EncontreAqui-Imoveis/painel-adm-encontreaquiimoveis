import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  getRateLimitKey,
  isRateLimited,
  registerRateLimitBackoff,
} from '$lib/rateLimit';

describe('rateLimit helper', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('normalizes keys by method and path only', () => {
    expect(getRateLimitKey('get', '/admin/foo?x=1')).toBe('GET:/admin/foo');
    expect(getRateLimitKey('POST', 'https://example.com/admin/foo?x=1')).toBe(
      'POST:/admin/foo',
    );
  });

  test('registers backoff window from retry-after header value', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    const key = getRateLimitKey('GET', '/admin/foo');
    const delayMs = registerRateLimitBackoff(key, 2, 1_000);

    expect(delayMs).toBe(2_000);
    expect(isRateLimited(key)).toBe(true);

    vi.advanceTimersByTime(2_001);
    expect(isRateLimited(key)).toBe(false);
  });
});
