import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios';
import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { baseURL, handleUnauthorizedResponse } from './api';
import { reportObservedError } from './observability';
import { authToken } from './store';

const SENSITIVE_KEYS = ['authorization', 'token', 'password', 'senha', 'cookie', 'email', 'phone', 'telefone', 'cep'];
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_REGEX = /eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

type RequestIdAwareError = Record<string, unknown> & {
  requestId?: string;
  response?: {
    status?: number;
    data?: Record<string, unknown>;
    headers?: unknown;
  };
  config?: {
    url?: string;
    method?: string;
  };
  message?: string;
};

function shouldRedactKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((item) => lower.includes(item));
}

function redactString(value: string): string {
  return value
    .replace(BEARER_REGEX, 'Bearer ***')
    .replace(JWT_REGEX, '***.***.***')
    .replace(EMAIL_REGEX, '***@***');
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[redacted-depth]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, depth + 1));
  if (!value || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (shouldRedactKey(key)) {
      output[key] = '***';
      continue;
    }
    output[key] = redactValue(entry, depth + 1);
  }
  return output;
}

function sanitizeErrorForLogging(error: unknown): unknown {
  if (!error || typeof error !== 'object') return error;
  const source = error as Record<string, unknown>;
  for (const key of ['config', 'request', 'response']) {
    if (source[key]) {
      source[key] = redactValue(source[key]);
    }
  }
  if (typeof source.message === 'string') {
    source.message = redactString(source.message);
  }
  return source;
}

function extractRequestId(error: RequestIdAwareError): string | undefined {
  const headerSource = error.response?.headers;
  let headerValue: unknown;

  if (headerSource && typeof headerSource === 'object' && !Array.isArray(headerSource)) {
    const headers = headerSource as Record<string, unknown>;
    headerValue =
      headers['x-request-id'] ??
      headers['X-Request-Id'] ??
      headers['x-request-id'.toLowerCase()];
  }

  const normalizedHeader =
    typeof headerValue === 'string' && headerValue.trim().length > 0
      ? headerValue.trim()
      : undefined;
  if (normalizedHeader) return normalizedHeader;

  const data = error.response?.data;
  const payloadRequestId =
    typeof data?.requestId === 'string'
      ? data.requestId.trim()
      : typeof data?.request_id === 'string'
        ? data.request_id.trim()
        : '';

  return payloadRequestId || undefined;
}

type RequestOptions = {
  token?: string | null;
  skipAuth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, unknown>;
};

type TokenOrOptions = string | null | RequestOptions | undefined;

type ExtendedAxiosConfig = AxiosRequestConfig & {
  token?: string | null;
  skipAuth?: boolean;
};

function normalizeOptions(tokenOrOptions?: TokenOrOptions): RequestOptions {
  if (
    tokenOrOptions === undefined ||
    tokenOrOptions === null ||
    typeof tokenOrOptions === 'string'
  ) {
    return tokenOrOptions === undefined ? {} : { token: tokenOrOptions };
  }
  return tokenOrOptions;
}

function buildConfig(tokenOrOptions?: TokenOrOptions): ExtendedAxiosConfig {
  const options = normalizeOptions(tokenOrOptions);
  const config: ExtendedAxiosConfig = {
    headers: options.headers,
    signal: options.signal,
    params: options.params,
    token: options.token,
    skipAuth: options.skipAuth,
  };
  return config;
}

const apiClient = axios.create({
  baseURL,
});

apiClient.interceptors.request.use((config) => {
  const extended = config as ExtendedAxiosConfig;
  const shouldSkipAuth = extended.skipAuth ?? false;
  const resolvedToken = shouldSkipAuth ? null : extended.token ?? get(authToken);

  const headers = config.headers ?? new AxiosHeaders();
  config.headers = headers;

  const setHeader = (value: string | null) => {
    if (headers instanceof AxiosHeaders) {
      if (value) {
        headers.set('Authorization', `Bearer ${value}`);
      } else {
        headers.delete('Authorization');
      }
    } else {
      const record = headers as Record<string, string>;
      if (value) {
        record['Authorization'] = `Bearer ${value}`;
      } else {
        delete (record as Record<string, unknown>)['Authorization'];
      }
    }
  };

  setHeader(resolvedToken);

  delete extended.token;
  delete extended.skipAuth;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestId = extractRequestId(error as RequestIdAwareError);
    if (requestId) {
      (error as RequestIdAwareError).requestId = requestId;
    }

    sanitizeErrorForLogging(error);
    const safeResponseData = redactValue(error.response?.data) as Record<string, unknown> | undefined;

    console.info('API client request failed', {
      requestId,
      status: (error as RequestIdAwareError).response?.status,
      method: (error as RequestIdAwareError).config?.method,
      url: (error as RequestIdAwareError).config?.url,
    });
    reportObservedError(error, {
      module: 'api-client',
      requestId,
      status: (error as RequestIdAwareError).response?.status,
      url: (error as RequestIdAwareError).config?.url,
      message: typeof safeResponseData?.message === 'string' ? safeResponseData.message : error.message,
    });

    if (handleUnauthorizedResponse(error.response?.status)) {
      return Promise.reject(error);
    }

    const fallbackMessage =
      (typeof safeResponseData?.message === 'string' ? safeResponseData.message : undefined) ||
      error.message ||
      'Erro ao se comunicar com o servidor.';
    toast.error(fallbackMessage);
    return Promise.reject(error);
  }
);

async function request<TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown,
  tokenOrOptions?: TokenOrOptions
) {
  const config = buildConfig(tokenOrOptions);
  const response = await apiClient.request<TResponse>({
    url: endpoint,
    method,
    data: body,
    ...config,
  });
  return response.data;
}

export const api = {
  get: async <T = unknown>(endpoint: string, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('GET', endpoint, undefined, tokenOrOptions);
  },
  post: async <T = unknown>(endpoint: string, body: unknown, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('POST', endpoint, body, tokenOrOptions);
  },
  put: async <T = unknown>(endpoint: string, body: unknown, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('PUT', endpoint, body, tokenOrOptions);
  },
  patch: async <T = unknown>(endpoint: string, body: unknown, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('PATCH', endpoint, body, tokenOrOptions);
  },
  delete: async <T = unknown>(endpoint: string, tokenOrOptions?: TokenOrOptions) => {
    return request<T>('DELETE', endpoint, undefined, tokenOrOptions);
  },
};

export { apiClient };
