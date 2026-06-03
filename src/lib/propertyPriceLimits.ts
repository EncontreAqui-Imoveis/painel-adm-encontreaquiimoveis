import { formatCurrencyInput, parseCurrency } from '$lib/components/create-property-helpers';

export const SALE_PROPERTY_PRICE_MAX = 999_000_000_000;
export const RENT_PROPERTY_PRICE_MAX = 999_000_000;
export const SALE_PROPERTY_PRICE_INPUT_MAX_LENGTH = getPropertyPriceInputMaxLength(
  SALE_PROPERTY_PRICE_MAX
);
export const RENT_PROPERTY_PRICE_INPUT_MAX_LENGTH = getPropertyPriceInputMaxLength(
  RENT_PROPERTY_PRICE_MAX
);

function toCentsDigits(maxValue: number): string {
  return String(Math.round(maxValue * 100));
}

export function getPropertyPriceInputMaxLength(maxValue: number): number {
  return formatCurrencyInput(toCentsDigits(maxValue), maxValue).length;
}

export function clampPropertyPriceValue(value: unknown, maxValue: number): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Number(Math.min(numeric, maxValue).toFixed(2));
}

export function formatPropertyPriceInput(raw: string, maxValue: number): string {
  return formatCurrencyInput(raw, maxValue);
}

export function parsePropertyPriceInput(value: string, maxValue: number): number | null {
  return parseCurrency(value, maxValue);
}

export function formatPropertyPriceDisplay(value: unknown, maxValue: number): string {
  const clamped = clampPropertyPriceValue(value, maxValue);
  if (clamped == null) return '';
  return clamped.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
