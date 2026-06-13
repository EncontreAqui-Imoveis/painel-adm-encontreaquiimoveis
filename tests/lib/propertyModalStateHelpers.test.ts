import { describe, expect, it } from 'vitest';
import {
  buildPropertyModalResetState,
  buildSoldDialogResetState,
  resolvePropertyEditExtraState,
  resolvePropertyEditNumericFlags,
} from '../../src/lib/components/property/propertyModalStateHelpers';

describe('propertyModalStateHelpers', () => {
  it('reseta o estado do modal de forma previsivel', () => {
    const state = buildPropertyModalResetState();
    expect(state.isModalOpen).toBe(false);
    expect(state.editSelectedAmenities).toEqual([]);
    expect(state.brokenPreviewImages.size).toBe(0);
    expect(state.rejectObservation).toBe('');
  });

  it('reseta o dialog de venda e calcula flags de edicao', () => {
    expect(buildSoldDialogResetState()).toMatchObject({
      soldDialogOpen: false,
      soldByPlatform: null,
      soldSaleValue: '',
    });

    expect(
      resolvePropertyEditNumericFlags({
        bedrooms: 0,
        bathrooms: 1,
        garage_spots: 0,
        sem_quadra: false,
        sem_lote: true,
        quadra: '',
        lote: '10',
      })
    ).toMatchObject({
      editBedroomsAsZero: true,
      editBathroomsAsZero: false,
      editGarageSpotsAsZero: true,
      editSemQuadra: true,
      editSemLote: true,
    });
  });

  it('resolve os textos de apoio do modal', () => {
    expect(
      resolvePropertyEditExtraState({
        valor_condominio: 2500,
        valor_iptu: 100,
        broker_name: 'Corretor X',
        owner_name: 'Proprietario Y',
      })
    ).toMatchObject({
      editValorCondominioDisplay: expect.stringMatching(/R\$\s?2\.500,00/),
      editValorIptuDisplay: expect.stringMatching(/R\$\s?100,00/),
      advertiserQuery: 'Corretor X',
      selectedAdvertiser: null,
    });
  });
});
