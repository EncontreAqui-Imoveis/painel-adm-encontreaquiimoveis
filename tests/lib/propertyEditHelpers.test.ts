import { describe, expect, it } from 'vitest';
import {
  buildPropertyEditPayload,
  resolvePropertyEditUpdateStrategy,
} from '../../src/lib/components/property/propertyEditHelpers';

describe('propertyEditHelpers', () => {
  it('rejeita número de endereço inválido antes de montar payload', () => {
    expect(
      buildPropertyEditPayload({
        originalProperty: {
          id: 1,
          status: 'approved',
          title: 'Casa',
        },
        editableProperty: {
          title: 'Casa',
          numero: 'ABC',
        },
        flags: {
          editSemNumero: false,
          editSemQuadra: false,
          editSemLote: false,
          editSemCep: false,
        },
        state: {
          editPromotionSalePercentageDisplay: '',
          editPromotionRentPercentageDisplay: '',
          editValorCondominioDisplay: '',
          editValorIptuDisplay: '',
          editSelectedAmenities: [],
        },
      })
    ).toEqual({
      ok: false,
      error: 'Número do endereço deve conter apenas dígitos.',
    });
  });

  it('monta payload e detecta quando só o status mudou', () => {
    const result = buildPropertyEditPayload({
      originalProperty: {
        id: 1,
        status: 'approved',
        title: 'Casa',
        purpose: 'Venda',
        city: 'Goiânia',
        state: 'GO',
        bairro: 'Centro',
        public_code: 'RV-1',
      },
      editableProperty: {
        title: 'Casa',
        status: 'rented',
        purpose: 'Venda',
        city: 'Goiânia',
        state: 'GO',
        bairro: 'Centro',
        public_code: 'RV-1',
        price: 500000,
        numero: '10',
      },
      flags: {
        editSemNumero: false,
        editSemQuadra: false,
        editSemLote: false,
        editSemCep: false,
      },
      state: {
        editPromotionSalePercentageDisplay: '',
        editPromotionRentPercentageDisplay: '',
        editValorCondominioDisplay: '',
        editValorIptuDisplay: '',
        editSelectedAmenities: ['Piscina'],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.requestedStatus).toBe('rented');
    expect(result.payload.status).toBe('rented');
    expect(result.shouldRefreshList).toBe(false);
    expect(result.payload.numero).toBe('10');
  });

  it('resolve estratégia de update apenas de status quando não há outros campos alterados', () => {
    const strategy = resolvePropertyEditUpdateStrategy(
      {
        id: 1,
        status: 'approved',
        title: 'Casa',
        purpose: 'Venda',
        city: 'Goiânia',
        state: 'GO',
        bairro: 'Centro',
        public_code: 'RV-1',
      },
      {
        title: 'Casa',
        purpose: 'Venda',
        city: 'Goiânia',
        state: 'GO',
        bairro: 'Centro',
        public_code: 'RV-1',
        status: 'sold',
      },
      'sold'
    );

    expect(strategy).toEqual({
      useStatusOnlyUpdate: true,
      endpoint: 'status',
    });
  });
});
