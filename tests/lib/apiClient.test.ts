import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();
const consoleInfoMock = vi.fn();
const sentryCaptureMock = vi.fn();

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

describe('api client', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    toastErrorMock.mockReset();
    consoleInfoMock.mockReset();
    vi.spyOn(console, 'info').mockImplementation(consoleInfoMock);
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    (globalThis as typeof globalThis & { Sentry?: { captureException: typeof sentryCaptureMock } }).Sentry = {
      captureException: sentryCaptureMock,
    };
    sentryCaptureMock.mockReset();
  });

  it('normalizes the base URL and injects the bearer token into requests', async () => {
    const [apiModule, storeModule, apiClientModule] = await Promise.all([
      import('../../src/lib/api'),
      import('../../src/lib/store'),
      import('../../src/lib/apiClient'),
    ]);

    expect(apiModule.baseURL).toBe('https://api.example.com');

    storeModule.authToken.set('token-123');

    const interceptor = (
      apiClientModule.apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown> }>;
      }
    ).handlers[0];

    const config = await interceptor.fulfilled({ headers: undefined });
    const authorization =
      typeof (config.headers as { get?: (key: string) => string | null }).get === 'function'
        ? (config.headers as { get: (key: string) => string | null }).get('Authorization')
        : (config.headers as Record<string, string>)['Authorization'];

    expect(authorization).toBe('Bearer token-123');
  }, 60000);

  it('skips auth header injection when skipAuth is enabled', async () => {
    const storeModule = await import('../../src/lib/store');
    const apiClientModule = await import('../../src/lib/apiClient');

    storeModule.authToken.set('token-123');

    const interceptor = (
      apiClientModule.apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown> }>;
      }
    ).handlers[0];

    const config = await interceptor.fulfilled({ headers: undefined, skipAuth: true });
    const authorization =
      typeof (config.headers as { get?: (key: string) => string | null }).get === 'function'
        ? (config.headers as { get: (key: string) => string | null }).get('Authorization')
        : (config.headers as Record<string, string>)['Authorization'];

    expect(authorization).toBeFalsy();
  });

  it('redacts sensitive data and shows a toast for non-401 failures', async () => {
    const apiClientModule = await import('../../src/lib/apiClient');

    const interceptor = (
      apiClientModule.apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: Record<string, unknown>) => Promise<never> }>;
      }
    ).handlers[0];

    const error = {
      message: 'Erro ao chamar admin@example.com com Bearer token',
      config: {
        headers: {
          Authorization: 'Bearer super-secret-token',
          'X-Trace': 'ok',
        },
      },
      response: {
        status: 403,
        data: {
          message: 'Falha ao salvar',
          email: 'admin@example.com',
        },
      },
    };

    await expect(interceptor.rejected(error)).rejects.toBe(error);

    expect(toastErrorMock).toHaveBeenCalledWith('Falha ao salvar');
    expect(
      ((error.config as { headers: Record<string, string> }).headers).Authorization
    ).toBe('***');
    expect((error.response as { data: Record<string, string> }).data.email).toBe('***');
    expect(error.message).toContain('***@***');
    expect(error.message).not.toContain('admin@example.com');
  });

  it('attaches requestId from the response and logs correlation data', async () => {
    const apiClientModule = await import('../../src/lib/apiClient');

    const interceptor = (
      apiClientModule.apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: Record<string, unknown>) => Promise<never> }>;
      }
    ).handlers[0];

    const error: Record<string, unknown> = {
      message: 'Falha ao salvar',
      config: {
        method: 'post',
        url: '/admin/contracts/1/evaluate-side',
      },
      response: {
        status: 409,
        headers: {
          'x-request-id': 'req-admin-409',
        },
        data: {
          message: 'Contrato bloqueado',
        },
      },
    };

    await expect(interceptor.rejected(error)).rejects.toBe(error);

    expect(error.requestId).toBe('req-admin-409');
    expect(consoleInfoMock).toHaveBeenCalledWith('API client request failed', {
      requestId: 'req-admin-409',
      status: 409,
      method: 'post',
      url: '/admin/contracts/1/evaluate-side',
    });
    expect(sentryCaptureMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: expect.objectContaining({
          module: 'api-client',
          requestId: 'req-admin-409',
        }),
        extra: expect.objectContaining({
          status: 409,
          url: '/admin/contracts/1/evaluate-side',
        }),
      }),
    );
  });
});
