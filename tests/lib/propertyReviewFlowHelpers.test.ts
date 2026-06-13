import { describe, expect, it } from 'vitest';
import { resolvePropertyReviewState } from '../../src/lib/components/property/propertyReviewFlowHelpers';

describe('propertyReviewFlowHelpers', () => {
  it('resolve o estado de revisão com merge seguro e mídia normalizada', () => {
    const result = resolvePropertyReviewState({
      property: {
        id: 10,
        public_code: 'PUB-10',
        purpose: 'Venda',
        price: 1000,
        images: null,
        amenities: ['Wi-Fi'],
      },
      details: {
        public_code: '  ',
        price_sale: 2000,
        promotion_percentage: 10,
        sem_quadra: 1,
        sem_lote: 0,
        sem_cep: 1,
        images: [{ id: 3, url: 'https://example.com/a.jpg' }],
        amenities: ['Piscina'],
      },
      normalizePublicCode: (value) => (String(value ?? '').trim() || null),
      getPurposeFlags: (purpose) => ({
        supportsSale: String(purpose ?? '').includes('Venda'),
        supportsRent: false,
      }),
      clampPropertyPriceValue: (value) => (value == null ? null : Math.min(Number(value), 9999)),
      saleMax: 9999,
      rentMax: 9999,
      sanitizeEditable: (data) => data as never,
      normalizeAmenityList: (value) => (Array.isArray(value) ? value.map(String) : []),
      normalizeImages: (value) =>
        Array.isArray(value)
          ? value
              .map((entry, index) => ({
                id: Number((entry as { id?: number }).id ?? index),
                url: String((entry as { url?: string }).url ?? ''),
              }))
              .filter((image) => Boolean(image.url))
          : [],
      isSemNumeroValue: () => false,
    });

    expect(result.mergedProperty.public_code).toBe(null);
    expect(result.editableProperty.price_sale).toBe(2000);
    expect(result.editSemQuadra).toBe(true);
    expect(result.editSemCep).toBe(true);
    expect(result.galleryImages).toEqual([{ id: 3, url: 'https://example.com/a.jpg' }]);
    expect(result.selectedAmenities).toEqual(['Piscina']);
  });
});
