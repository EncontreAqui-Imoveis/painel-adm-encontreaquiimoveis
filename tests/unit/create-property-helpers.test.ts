import { describe, expect, it } from 'vitest';
import {
  formatPromotionPercentageDisplay,
  formatPromotionPercentageInput,
  parsePromotionPercentage,
} from '../../src/lib/components/create-property-helpers';

describe('create-property-helpers promotion percentage', () => {
  it('formats input without embedding % in editable value', () => {
    expect(formatPromotionPercentageInput('8,5')).toBe('8,50');
    expect(formatPromotionPercentageInput('08,5%')).toBe('8,50');
  });

  it('parses values with or without %', () => {
    expect(parsePromotionPercentage('8,5')).toBe(8.5);
    expect(parsePromotionPercentage('8,5%')).toBe(8.5);
  });

  it('keeps display helper with % for read-only preview', () => {
    expect(formatPromotionPercentageDisplay(8.5)).toBe('8,50%');
  });
});
