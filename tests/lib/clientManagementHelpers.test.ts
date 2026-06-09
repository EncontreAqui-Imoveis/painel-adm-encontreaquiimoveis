import { describe, expect, it } from 'vitest';
import {
  buildClientForm,
  buildClientUpdatePayload,
  extractClientApiErrorMessage,
  isValidPromoteCreci,
  normalizePromoteCreci,
  unwrapResponseData,
} from '../../src/lib/components/client-management/clientManagementHelpers';

describe('clientManagementHelpers', () => {
  it('builds the edit form from detail and fallback data', () => {
    expect(
      buildClientForm(
        {
          name: 'Detalhe',
          email: 'detail@test.com',
          phone: '11999999999',
          street: 'Rua A',
          number: '10',
          complement: 'Ap 2',
          bairro: 'Centro',
          city: 'Goiânia',
          state: 'GO',
          cep: '74000000',
        },
        {
          name: 'Fallback',
          email: 'fallback@test.com',
          phone: '11888888888',
        },
      ),
    ).toEqual({
      name: 'Detalhe',
      email: 'detail@test.com',
      phone: '11999999999',
      street: 'Rua A',
      number: '10',
      complement: 'Ap 2',
      bairro: 'Centro',
      city: 'Goiânia',
      state: 'GO',
      cep: '74000000',
    });
  });

  it('trims the update payload and preserves empty fields', () => {
    expect(
      buildClientUpdatePayload({
        name: ' Cliente ',
        email: ' cliente@test.com ',
        phone: ' 11999999999 ',
        street: ' Rua A ',
        number: ' 10 ',
        complement: ' Apto 2 ',
        bairro: ' Centro ',
        city: ' Goiânia ',
        state: ' go ',
        cep: ' 74000000 ',
      }),
    ).toEqual({
      name: 'Cliente',
      email: 'cliente@test.com',
      phone: '11999999999',
      street: 'Rua A',
      number: '10',
      complement: 'Apto 2',
      bairro: 'Centro',
      city: 'Goiânia',
      state: 'go',
      cep: '74000000',
    });
  });

  it('extracts API errors and normalizes CRECI input', () => {
    expect(
      extractClientApiErrorMessage(
        { response: { data: { error: 'CRECI inválido' } } },
        'Falha',
      ),
    ).toBe('CRECI inválido');
    expect(normalizePromoteCreci(' 12345-A ')).toBe('12345-A');
    expect(isValidPromoteCreci('12')).toBe(false);
    expect(isValidPromoteCreci('123')).toBe(true);
  });

  it('unwraps either direct data or response.data payloads', () => {
    expect(unwrapResponseData({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(unwrapResponseData([{ id: 2 }])).toEqual([{ id: 2 }]);
  });
});
