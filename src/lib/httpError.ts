type ErrorPayload = {
  message?: unknown;
  error?: unknown;
  requestId?: unknown;
  request_id?: unknown;
};

export type ResponseErrorContext = {
  status: number;
  message?: string;
  requestId?: string;
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function extractRequestIdFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const source = payload as ErrorPayload;
  return normalizeString(source.requestId) ?? normalizeString(source.request_id);
}

export function extractMessageFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const source = payload as ErrorPayload;
  return normalizeString(source.message) ?? normalizeString(source.error);
}

export async function readErrorContext(response: Response): Promise<ResponseErrorContext> {
  const requestIdFromHeader = normalizeString(response.headers.get('x-request-id'));

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return {
      status: response.status,
      requestId: requestIdFromHeader,
    };
  }

  try {
    const payload = await response.clone().json();
    return {
      status: response.status,
      message: extractMessageFromPayload(payload),
      requestId: requestIdFromHeader ?? extractRequestIdFromPayload(payload),
    };
  } catch {
    return {
      status: response.status,
      requestId: requestIdFromHeader,
    };
  }
}
