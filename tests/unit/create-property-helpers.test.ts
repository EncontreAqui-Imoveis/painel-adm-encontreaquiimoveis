import { describe, expect, it } from 'vitest';
import {
  formatCurrencyInput,
  formatPromotionPercentageDisplay,
  formatPromotionPercentageInput,
  parseCurrency,
  parsePromotionPercentage,
} from '../../src/lib/components/create-property-helpers';

describe('create-property-helpers promotion percentage', () => {
  it('formats input without embedding % in editable value', () => {
    expect(formatPromotionPercentageInput('8,5')).toBe('8,50');
    expect(formatPromotionPercentageInput('08,5%')).toBe('8,50');
    expect(formatPromotionPercentageInput('555555')).toBe('99,99');
  });

  it('parses values with or without %', () => {
    expect(parsePromotionPercentage('8,5')).toBe(8.5);
    expect(parsePromotionPercentage('8,5%')).toBe(8.5);
    expect(parsePromotionPercentage('555555')).toBe(99.99);
  });

  it('keeps display helper with % for read-only preview', () => {
    expect(formatPromotionPercentageDisplay(8.5)).toBe('8,50%');
  });

  it('clamps currency masks to the configured max value', () => {
    expect(formatCurrencyInput('9999999999', 999999.99)).toBe('R$\u00A0999.999,99');
    expect(parseCurrency('9999999999', 999999.99)).toBe(999999.99);
  });
});
