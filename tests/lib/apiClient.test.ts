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
  it.each([true, false])('keeps per-request toast policy in the real GET interceptor: quiet=%s', async (quiet) => {
    const { api, apiClient } = await import('../../src/lib/apiClient');
    apiClient.defaults.adapter = async (config) => {
      throw { message: 'Conflict', config, response: { status: 409, data: { error: 'O PDF corrente mudou.' }, headers: {} } };
    };
    await expect(api.get('/contracts/contract-1', { skipErrorToast: quiet })).rejects.toMatchObject({ response: { status: 409 } });
    expect(toastErrorMock).toHaveBeenCalledTimes(quiet ? 0 : 1);
  });
  it('lets the signed replacement form own its error toast through the real POST interceptor', async () => {
    const { apiClient } = await import('../../src/lib/apiClient');
    const { uploadSignedDocument } = await import('../../src/lib/components/contracts/contractsActions');
    let seenConfig: Record<string, unknown> | null = null;
    apiClient.defaults.adapter = async (config) => {
      seenConfig = config;
      throw { message: 'Conflict', config, response: { status: 409, data: { error: 'O PDF corrente mudou.' }, headers: {} } };
    };
    await expect(uploadSignedDocument('contract-1', 'contrato_assinado',
      new File(['%PDF-test'], 'signed.pdf', { type: 'application/pdf' }), 42,
      { replacementReason: 'Nova digitalização', contractContentUnchanged: true }, 11)).rejects.toMatchObject({ response: { status: 409 } });
    expect(seenConfig).toMatchObject({ skipErrorToast: true });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it.each([
    ['post', '/admin/reauth', 'ADMIN_REAUTH_PASSWORD_INVALID'],
    ['put', '/admin/assistants/2/password', 'ADMIN_REAUTH_INVALID'],
    ['put', '/admin/assistants/2/password', 'ADMIN_REAUTH_REQUIRED'],
  ])('BUG-003 keeps the session on a secondary confirmation failure: %s %s %s', async (method, url, code) => {
    const { get } = await import('svelte/store');
    const { authToken } = await import('../../src/lib/store');
    const { apiClient } = await import('../../src/lib/apiClient');
    authToken.set('synthetic-session');
    const rejected = (apiClient.interceptors.response as any).handlers[0].rejected;
    const error = { config: { method, url, skipErrorToast: true }, response: { status: 401, data: { code, error: 'Confirme novamente.' } } };
    await expect(rejected(error)).rejects.toBe(error);
    expect(get(authToken)).toBe('synthetic-session');
    expect(sessionStorage.getItem('authToken')).toBe('synthetic-session');
  });

  it.each([
    ['/admin/reauth', undefined],
    ['/admin/assistants/2/password', undefined],
    ['/admin/me', 'ADMIN_SESSION_INVALID'],
    ['/users/me', 'ADMIN_REAUTH_PASSWORD_INVALID'],
  ])('BUG-003 still clears expired/revoked sessions; no general 401 bypass: %s', async (url, code) => {
    const { get } = await import('svelte/store');
    const { authToken } = await import('../../src/lib/store');
    const { apiClient } = await import('../../src/lib/apiClient');
    authToken.set('synthetic-session');
    const rejected = (apiClient.interceptors.response as any).handlers[0].rejected;
    // Avoid jsdom navigation; store cleanup is the production implementation.
    vi.stubGlobal('window', undefined);
    const error = { config: { method: 'post', url }, response: { status: 401, data: { code, error: 'Sessão inválida.' } } };
    try { await expect(rejected(error)).rejects.toBe(error); }
    finally { vi.unstubAllGlobals(); }
    expect(get(authToken)).toBeNull();
    expect(sessionStorage.getItem('authToken')).toBeNull();
  });

  it.each(['/admin/assistants', '/admin/assistants/2/password', '/admin/reauth'])(
    'redacts serialized passwords before observing failed requests to %s', async endpoint => {
      const { api, apiClient } = await import('../../src/lib/apiClient');
      const secret = 'Segredo sintético sem exposição!';
      let observedError: { config: Record<string, unknown> } | undefined;
      apiClient.defaults.adapter = async config => {
        // Exercita a transformação real do Axios, incluindo config.data em string.
        expect(typeof config.data).toBe('string');
        expect(JSON.parse(config.data).password).toBe(secret);
        observedError = { message: 'Operação recusada', config,
          response: { status: 403, data: { error: 'Operação recusada' }, headers: {} } } as unknown as { config: Record<string, unknown> };
        throw observedError;
      };
      await expect(api.post(endpoint, { password: secret }, { skipErrorToast: true })).rejects.toMatchObject({
        response: { status: 403 },
      });
      expect(JSON.stringify(observedError?.config)).not.toContain(secret);
      expect(JSON.parse(String(observedError?.config.data)).password).toBe('***');
      expect(JSON.stringify(sentryCaptureMock.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(consoleInfoMock.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(toastErrorMock.mock.calls)).not.toContain(secret);
    },
  );

});
