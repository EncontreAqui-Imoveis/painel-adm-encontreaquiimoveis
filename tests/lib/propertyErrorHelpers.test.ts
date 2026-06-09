import { describe, expect, it } from 'vitest';
import { formatPropertySaveError, getRequestIdFromError } from '../../src/lib/components/property/propertyErrorHelpers';

describe('propertyErrorHelpers', () => {
  it('prefers request id from direct error, payload and headers', () => {
    expect(getRequestIdFromError({ requestId: ' req-1 ' })).toBe('req-1');
    expect(
      getRequestIdFromError({
        response: { data: { request_id: 'req-2' } },
      })
    ).toBe('req-2');
    expect(
      getRequestIdFromError({
        response: { headers: { 'x-request-id': 'req-3' } },
      })
    ).toBe('req-3');
  });

  it('formats save errors with request id when available', () => {
    expect(
      formatPropertySaveError(
        {
          response: { data: { error: 'Falha ao salvar', requestId: 'req-9' } },
        },
        'Falha ao salvar'
      )
    ).toBe('Falha ao salvar (requestId: req-9)');
  });
});
