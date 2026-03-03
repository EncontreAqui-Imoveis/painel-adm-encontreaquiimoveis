import { baseURL, handleUnauthorizedResponse } from './api';
import { clearSessionToken, readSessionToken } from './sessionState';

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
