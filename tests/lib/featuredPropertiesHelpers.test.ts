import { describe, expect, it } from 'vitest';
import {
  addStateLabel,
  candidatePriceLabel,
  crossScopeBadge,
  formatLocation,
  isDualPurpose,
  mergeCandidatesWithFeatured,
  membershipLabel,
  purposeSupportsRent,
  purposeSupportsSale,
  rowAddDisabled,
  sortFeaturedList,
} from '../../src/lib/components/featured-properties/featuredPropertiesHelpers';

describe('featuredPropertiesHelpers', () => {
  it('sorts featured items by explicit position and merges by id', () => {
    expect(
      sortFeaturedList([
        { id: 2, title: 'B', position: 5 },
        { id: 1, title: 'A', position: 1 },
        { id: 3, title: 'C' },
      ]).map((item) => item.id),
    ).toEqual([1, 2, 3]);

    expect(
      mergeCandidatesWithFeatured(
        [{ id: 1, title: 'Venda', purpose: 'Venda' }],
        [{ id: 2, title: 'Aluguel', purpose: 'Aluguel' }],
        [{ id: 1, title: 'Venda Atualizada', purpose: 'Venda', city: 'Rio Verde' }],
      ).find((item) => item.id === 1),
    ).toMatchObject({ title: 'Venda Atualizada', city: 'Rio Verde' });
  });

  it('classifies purpose and membership labels', () => {
    const item = { id: 10, title: 'Imóvel', purpose: 'Venda e Aluguel' };
    expect(purposeSupportsSale(item.purpose)).toBe(true);
    expect(purposeSupportsRent(item.purpose)).toBe(true);
    expect(isDualPurpose(item.purpose)).toBe(true);
    expect(addStateLabel(item, [{ id: 10, title: 'Imóvel', purpose: 'Venda e Aluguel' }], [])).toBe(
      'Adicionar aluguel',
    );
    expect(membershipLabel(item, [{ id: 10, title: 'Imóvel', purpose: 'Venda e Aluguel' }], [])).toBe(
      'Já está em Venda',
    );
  });

  it('formats location and candidate labels with scope checks', () => {
    expect(formatLocation({ id: 1, title: 'Casa', bairro: 'Centro', city: 'Rio Verde', state: 'GO' })).toBe(
      'Centro - Rio Verde - GO',
    );
    expect(candidatePriceLabel({ id: 1, title: 'Casa', purpose: 'Venda', price: 350000 })).toContain('R$');
    expect(
      crossScopeBadge(
        'sale',
        { id: 1, title: 'Casa', purpose: 'Venda e Aluguel' },
        [{ id: 1, title: 'Casa', purpose: 'Venda e Aluguel' }],
        [{ id: 1, title: 'Casa', purpose: 'Venda e Aluguel' }],
      ),
    ).toBe('Também em Aluguel');
    expect(
      rowAddDisabled(
        { id: 1, title: 'Casa', purpose: 'Venda' },
        [{ id: 1, title: 'Casa', purpose: 'Venda' }],
        [],
        20,
      ),
    ).toBe(true);
  });
});
