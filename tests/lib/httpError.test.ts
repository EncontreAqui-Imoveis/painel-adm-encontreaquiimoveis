import { describe, expect, it } from 'vitest';

import {
  extractMessageFromPayload,
  extractRequestIdFromPayload,
  readErrorContext,
} from '../../src/lib/httpError';

describe('httpError helpers', () => {
  it('extracts requestId and message from payload helpers', () => {
    expect(
      extractRequestIdFromPayload({ request_id: 'req-body-1' }),
    ).toBe('req-body-1');
    expect(
      extractMessageFromPayload({ error: 'Falha ao autenticar' }),
    ).toBe('Falha ao autenticar');
  });

  it('prefers the header requestId when response is JSON', async () => {
    const response = new Response(
      JSON.stringify({
        message: 'Sessão expirada',
        requestId: 'req-body-2',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'req-header-2',
        },
      },
    );

    await expect(readErrorContext(response)).resolves.toEqual({
      status: 401,
      message: 'Sessão expirada',
      requestId: 'req-header-2',
    });
  });

  it('falls back to payload requestId when header is absent', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'Contrato bloqueado',
        request_id: 'req-body-3',
      }),
      {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    await expect(readErrorContext(response)).resolves.toEqual({
      status: 409,
      message: 'Contrato bloqueado',
      requestId: 'req-body-3',
    });
  });
});
