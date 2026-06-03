type RetryAfterValue = string | number | null | undefined;

const rateLimitBackoffUntil = new Map<string, number>();

function normalizeKeyPart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withoutBase = trimmed.replace(/^https?:\/\/[^/]+/i, '');
  const path = withoutBase.split('?')[0] ?? '';
  return path.trim().toLowerCase();
}

export function getRateLimitKey(method: string, endpoint: string): string {
  const normalizedMethod = method.trim().toUpperCase();
  return `${normalizedMethod}:${normalizeKeyPart(endpoint)}`;
}

export function isRateLimited(key: string): boolean {
  const until = rateLimitBackoffUntil.get(key);
  return typeof until === 'number' && until > Date.now();
}

function resolveRetryAfterMs(value: RetryAfterValue, fallbackMs: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value * 1000;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallbackMs;

    const seconds = Number(trimmed);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }

    const retryAfterDate = Date.parse(trimmed);
    if (!Number.isNaN(retryAfterDate)) {
      return Math.max(retryAfterDate - Date.now(), fallbackMs);
    }
  }

  return fallbackMs;
}

export function registerRateLimitBackoff(
  key: string,
  retryAfter: RetryAfterValue = null,
  fallbackMs = 60_000,
): number {
  const delayMs = resolveRetryAfterMs(retryAfter, fallbackMs);
  rateLimitBackoffUntil.set(key, Date.now() + delayMs);
  return delayMs;
}

export function getRateLimitRetryAfterMs(
  retryAfter: RetryAfterValue,
  fallbackMs = 60_000,
): number {
  return resolveRetryAfterMs(retryAfter, fallbackMs);
}
