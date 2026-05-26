export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizePhoneBrDigits(value: string): string {
  const digits = onlyDigits(value);
  return digits;
}

export function formatPhoneBr(value: string): string {
  const digits = normalizePhoneBrDigits(value).slice(0, 13);
  if (!digits) return '';
  if (digits.length <= 2) return `+${digits}`;
  const country = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (!rest) return `+${country}`;
  if (rest.length <= 2) return `+${country} (${rest}`;
  const area = rest.slice(0, 2);
  const local = rest.slice(2);
  if (!local) return `+${country} (${area})`;
  if (local.length <= 5) return `+${country} (${area}) ${local}`;
  return `+${country} (${area}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

export function hasValidPhoneBr(value: string): boolean {
  const length = normalizePhoneBrDigits(value).length;
  return length >= 10 && length <= 13;
}

export function sanitizeCreciInput(value: string): string {
  return onlyDigits(value).slice(0, 8);
}

export function hasValidCreci(value: string): boolean {
  const length = onlyDigits(value).length;
  return length >= 4 && length <= 8;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function sanitizeDigitsInput(value: string): string {
  return onlyDigits(value);
}

export function clampCountInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 2);
  if (!digits) return '';
  return String(Math.min(99, Number.parseInt(digits, 10)));
}

const MAX_PROPERTY_AREA = 9999999.99;
const MAX_CURRENCY_VALUE = 9999999999.99;
const MAX_PROMOTION_PERCENT = 99.99;

function maxDigitsForDecimalValue(maxValue: number, fractionDigits = 2): number {
  return Math.max(1, String(Math.floor(maxValue * 10 ** fractionDigits)).length);
}

export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '');
  const parts = cleaned.split(/[.,]/);
  const integer = parts.shift() ?? '';
  const decimal = parts.join('').slice(0, 2);
  if (!decimal) return integer;
  return `${integer},${decimal}`;
}

export function clampAreaInput(value: string): string {
  const sanitized = sanitizeDecimalInput(value);
  const normalized = sanitized.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return sanitized;
  }
  const clamped = Math.min(parsed, MAX_PROPERTY_AREA);
  return sanitized === '' || clamped === parsed
    ? sanitized
    : clamped.toFixed(2).replace('.', ',');
}

export function normalizeDecimal(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatCurrencyInput(raw: string, maxValue = MAX_CURRENCY_VALUE): string {
  const digits = onlyDigits(raw).slice(0, maxDigitsForDecimalValue(maxValue));
  if (!digits) {
    return '';
  }
  const numberValue = Math.min(Number(digits) / 100, maxValue);
  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function parseCurrency(value: string, maxValue = MAX_CURRENCY_VALUE): number | null {
  const digits = onlyDigits(value).slice(0, maxDigitsForDecimalValue(maxValue));
  if (!digits) return null;
  const parsed = Math.min(Number(digits) / 100, maxValue);
  return Number.isNaN(parsed) ? null : Number(parsed.toFixed(2));
}

function normalizePromotionPercentageRaw(
  value: string,
  maxValue = MAX_PROMOTION_PERCENT
): number | null {
  const normalized = String(value ?? '')
    .replace('%', '')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Number(Math.min(parsed, maxValue).toFixed(2));
}

/** Máscara 00,00 com teto 99,99% (4 dígitos = centésimos de ponto percentual). */
export function formatPromotionPercentageInput(value: string, maxValue = MAX_PROMOTION_PERCENT): string {
  const cleaned = String(value ?? '')
    .replace('%', '')
    .replace(/\s+/g, '')
    .trim();
  if (!cleaned) return '';
  const hasSeparator = /[.,]/.test(cleaned);
  const integerDigits = onlyDigits(cleaned.split(/[.,]/)[0] ?? '');
  const decimalDigits = onlyDigits(cleaned.split(/[.,]/).slice(1).join('')).slice(0, 2);
  const normalized = hasSeparator
    ? `${integerDigits || '0'}.${decimalDigits || '0'}`
    : integerDigits;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return '';
  const bounded = Math.min(maxValue, Math.max(0, parsed));
  return bounded.toFixed(2).replace('.', ',');
}

export function parsePromotionPercentage(value: string, maxValue = MAX_PROMOTION_PERCENT): number | null {
  const parsed = normalizePromotionPercentageRaw(value, maxValue);
  if (parsed == null || parsed <= 0) return null;
  return parsed;
}

export function formatPromotionPercentageDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0 || value > MAX_PROMOTION_PERCENT) {
    return '';
  }
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function extractMessageFromValue(value: unknown, depth = 0): string | null {
  if (depth > 5) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ['message', 'error', 'detail', 'details']) {
    const nested = extractMessageFromValue(record[key], depth + 1);
    if (nested) return nested;
  }

  for (const entry of Object.values(record)) {
    const nested = extractMessageFromValue(entry, depth + 1);
    if (nested) return nested;
  }

  return null;
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const response = error as {
    response?: { data?: unknown };
    message?: unknown;
  };

  return (
    extractMessageFromValue(response.response?.data) ||
    extractMessageFromValue(response.message) ||
    extractMessageFromValue(error) ||
    fallback
  );
}

type ResolvedPrices = {
  error?: string;
  price?: number;
  priceSale?: number;
  priceRent?: number;
};

export function resolveCreatePropertyPrices(
  purpose: string,
  priceSale: string,
  priceRent: string
): ResolvedPrices {
  const normalizedPurpose = purpose.toLowerCase();
  const supportsSale = normalizedPurpose.includes('vend');
  const supportsRent = normalizedPurpose.includes('alug');
  const saleValue = parseCurrency(priceSale);
  const rentValue = parseCurrency(priceRent);

  if (supportsSale && (!saleValue || saleValue <= 0)) {
    return { error: 'Informe o preço de venda.' };
  }
  if (supportsRent && (!rentValue || rentValue <= 0)) {
    return { error: 'Informe o preço do aluguel.' };
  }

  if (supportsSale && supportsRent) {
    if (!saleValue || !rentValue) {
      return { error: 'Informe os preços de venda e aluguel.' };
    }
    return {
      price: saleValue,
      priceSale: saleValue,
      priceRent: rentValue,
    };
  }

  if (supportsSale) {
    return { price: saleValue!, priceSale: saleValue! };
  }
  if (supportsRent) {
    return { price: rentValue!, priceRent: rentValue! };
  }

  return { error: 'Finalidade inválida.' };
}
