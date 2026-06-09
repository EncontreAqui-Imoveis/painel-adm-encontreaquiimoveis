import { describe, expect, it } from 'vitest';
import {
  COMMISSION_AMOUNT_MAX_LENGTH,
  COMMISSION_CURRENCY_MAX,
  COMMISSION_PERCENT_MAX_LENGTH,
  convertAmountFieldToPercentage,
  convertPercentageFieldToAmount,
  formatCommissionCurrency,
  formatCommissionPercentageInputValue,
  hasExactSaleSplit,
  parseCommissionMoney,
  parseCommissionPercentage,
  readCommissionValue,
  resolveCommissionPropertyLabel,
  requiresExactSaleSplit,
} from '../../src/lib/components/commissions/commissionsHelpers';

describe('commissionsHelpers', () => {
  it('normaliza valores monetarios e percentuais no formato do painel', () => {
    expect(formatCommissionCurrency(1234.56)).toBe('R$\u00A01.234,56');
    expect(formatCommissionPercentageInputValue('100,5')).toBe('100,00');
    expect(COMMISSION_AMOUNT_MAX_LENGTH).toBe(13);
    expect(COMMISSION_PERCENT_MAX_LENGTH).toBe(6);
  });

  it('faz round-trip entre reais, percentual e split exato', () => {
    expect(parseCommissionMoney('100000')).toBe(1000);
    expect(parseCommissionPercentage('40')).toBe(40);
    expect(convertAmountFieldToPercentage('40000', 1000)).toBe('40');
    expect(convertPercentageFieldToAmount('40', 1000)).toBe('R$\u00A0400,00');
    expect(hasExactSaleSplit({
      comissaoCaptador: 400,
      comissaoVendedor: 300,
      taxaPlataforma: 300,
      valorVenda: 1000,
    })).toBe(true);
  });

  it('resolve labels e leitura inicial de comissão', () => {
    expect(resolveCommissionPropertyLabel({ propertyId: 9, propertyCode: 'RV-9', propertyTitle: 'Casa' })).toBe('RV-9 - Casa');
    expect(resolveCommissionPropertyLabel({ propertyId: 9, propertyTitle: 'Casa' })).toBe('Casa');
    expect(requiresExactSaleSplit({ propertyId: 9, propertyPurpose: 'Aluguel' })).toBe(false);
    expect(readCommissionValue(0)).toBe('');
    expect(readCommissionValue(123.45)).toBe('R$\u00A0123,45');
    expect(COMMISSION_CURRENCY_MAX).toBe(999999.99);
  });
});
