import { extractApiErrorMessage } from '$lib/components/create-property-helpers';

export function getRequestIdFromError(error: unknown): string {
  const requestId = (error as { requestId?: unknown })?.requestId;
  if (typeof requestId === 'string' && requestId.trim()) return requestId.trim();

  const response = (error as {
    response?: {
      data?: { requestId?: unknown; request_id?: unknown };
      headers?: unknown;
    };
  })?.response;

  const payloadRequestId =
    typeof response?.data?.requestId === 'string'
      ? response.data.requestId.trim()
      : typeof response?.data?.request_id === 'string'
        ? response.data.request_id.trim()
        : '';
  if (payloadRequestId) return payloadRequestId;

  const headers = response?.headers;
  if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    const headerMap = headers as Record<string, unknown>;
    const rawHeader = headerMap['x-request-id'] ?? headerMap['X-Request-Id'];
    if (typeof rawHeader === 'string' && rawHeader.trim()) return rawHeader.trim();
    if (Array.isArray(rawHeader) && rawHeader[0]) {
      const value = String(rawHeader[0]).trim();
      if (value) return value;
    }
  }

  return '';
}

export function formatPropertySaveError(error: unknown, fallback: string): string {
  const message = extractApiErrorMessage(error, fallback);
  const requestId = getRequestIdFromError(error);
  return requestId ? `${message} (requestId: ${requestId})` : message;
}
