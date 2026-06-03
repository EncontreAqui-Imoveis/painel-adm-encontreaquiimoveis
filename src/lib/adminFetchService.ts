import { baseURL, handleUnauthorizedResponse } from './api';
import { clearSessionToken, readSessionToken } from './sessionState';
import {
  getRateLimitKey,
  isRateLimited,
  registerRateLimitBackoff,
} from './rateLimit';

type AdminFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

function buildUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseURL}${normalizedPath}`;
}

export async function fetchPlatformResponse(
  endpoint: string,
  options: AdminFetchOptions = {}
): Promise<Response | null> {
  const { skipAuth = false, headers, ...init } = options;
  const rateLimitKey = getRateLimitKey(
    String(init.method ?? 'GET'),
    endpoint,
  );
  if (isRateLimited(rateLimitKey)) {
    return new Response(null, {
      status: 429,
      statusText: 'Too Many Requests',
    });
  }
  const resolvedHeaders = new Headers(headers ?? undefined);

  if (!skipAuth) {
    const token = readSessionToken();
    if (!token) {
      clearSessionToken();
      return null;
    }
    resolvedHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(endpoint), {
    ...init,
    headers: resolvedHeaders,
  });

  if (response.status === 429) {
    registerRateLimitBackoff(
      rateLimitKey,
      response.headers.get('retry-after'),
    );
  }

  if (!skipAuth && handleUnauthorizedResponse(response.status)) {
    return null;
  }

  return response;
}

export function resolveApiAssetUrl(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return buildUrl(trimmed.replace(/^\/+/, ''));
}
