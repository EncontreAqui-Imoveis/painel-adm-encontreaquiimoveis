import {
  RENT_PROPERTY_PRICE_MAX,
  SALE_PROPERTY_PRICE_MAX,
  formatPropertyPriceDisplay,
  formatPropertyPriceInput,
  getPropertyPriceInputMaxLength,
  parsePropertyPriceInput,
} from '../../src/lib/propertyPriceLimits';

describe('propertyPriceLimits', () => {
  it('clampa o preço de venda no teto de 999 bilhões', () => {
    expect(formatPropertyPriceInput('9999999999999999', SALE_PROPERTY_PRICE_MAX)).toBe(
      'R$\u00A0999.000.000.000,00'
    );
    expect(parsePropertyPriceInput('9999999999999999', SALE_PROPERTY_PRICE_MAX)).toBe(
      999000000000
    );
    expect(formatPropertyPriceDisplay(1_500_000_000_000, SALE_PROPERTY_PRICE_MAX)).toBe(
      'R$\u00A0999.000.000.000,00'
    );
  });

  it('clampa o preço de aluguel no teto de 999 milhões', () => {
    expect(formatPropertyPriceInput('999999999999', RENT_PROPERTY_PRICE_MAX)).toBe(
      'R$\u00A0999.000.000,00'
    );
    expect(parsePropertyPriceInput('999999999999', RENT_PROPERTY_PRICE_MAX)).toBe(999000000);
    expect(formatPropertyPriceDisplay(1_500_000_000, RENT_PROPERTY_PRICE_MAX)).toBe(
      'R$\u00A0999.000.000,00'
    );
  });

  it('expõe um maxlength coerente com o teto configurado', () => {
    expect(getPropertyPriceInputMaxLength(SALE_PROPERTY_PRICE_MAX)).toBeGreaterThan(0);
    expect(getPropertyPriceInputMaxLength(RENT_PROPERTY_PRICE_MAX)).toBeGreaterThan(0);
    expect(getPropertyPriceInputMaxLength(SALE_PROPERTY_PRICE_MAX)).toBeGreaterThan(
      getPropertyPriceInputMaxLength(RENT_PROPERTY_PRICE_MAX)
    );
  });
});
