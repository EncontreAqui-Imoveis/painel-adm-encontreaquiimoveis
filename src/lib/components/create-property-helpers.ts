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

export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '');
  const parts = cleaned.split(/[.,]/);
  const integer = parts.shift() ?? '';
  const decimal = parts.join('');
  if (!decimal) return integer;
  return `${integer},${decimal}`;
}

export function normalizeDecimal(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatCurrencyInput(raw: string): string {
  const digits = onlyDigits(raw);
  if (!digits) {
    return '';
  }
  const numberValue = Number(digits) / 100;
  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function parseCurrency(value: string): number | null {
  const digits = onlyDigits(value);
  if (!digits) return null;
  const parsed = Number(digits) / 100;
  return Number.isNaN(parsed) ? null : parsed;
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
