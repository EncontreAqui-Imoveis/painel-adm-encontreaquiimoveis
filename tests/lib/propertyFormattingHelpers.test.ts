import { describe, expect, it } from 'vitest';
import {
  areaUnitLabel,
  formatAreaWithUnit,
  formatCurrency,
  formatNumeroDisplay,
  getPurposeFlags,
  isOptionalBairroPropertyType,
  isSemNumeroValue,
  normalizeAreaUnit,
  normalizeCityLabel,
  resolvePriceLines,
} from '../../src/lib/components/property/propertyFormattingHelpers';

describe('propertyFormattingHelpers', () => {
  it('normaliza cidade, unidade e número', () => {
    expect(normalizeCityLabel({ nome: ' Goiânia ' })).toBe('Goiânia');
    expect(normalizeAreaUnit('ha.')).toBe('hectare');
    expect(areaUnitLabel('hectare')).toBe('ha');
    expect(formatAreaWithUnit('120', 'm2')).toBe('120 m²');
    expect(isOptionalBairroPropertyType('Chácara')).toBe(true);
    expect(isSemNumeroValue('0')).toBe(true);
    expect(formatNumeroDisplay('0')).toBe('S/N');
  });

  it('resolve finalidade, preços e moeda', () => {
    expect(getPurposeFlags('Venda e Aluguel')).toEqual({
      supportsSale: true,
      supportsRent: true,
      isDual: true,
    });
    expect(
      resolvePriceLines({
        price: 500000,
        purpose: 'Venda',
      })
    ).toEqual([{ label: 'Venda', value: 500000 }]);
    expect(formatCurrency(1250.5)).toContain('1.250,50');
  });
});
