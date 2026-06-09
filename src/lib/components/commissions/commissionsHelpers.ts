import {
  formatCurrencyInput,
  formatPromotionPercentageInput,
  parseCurrency,
  parsePromotionPercentage,
} from '$lib/components/create-property-helpers';

export type CommissionFieldKey = 'comissaoCaptador' | 'comissaoVendedor' | 'taxaPlataforma';
export type FinalizeSplitMode = 'amount' | 'percentage';

export const COMMISSION_CURRENCY_MAX = 999999.99;
export const COMMISSION_PERCENT_MAX = 100;
export const COMMISSION_AMOUNT_MAX_LENGTH = 13;
export const COMMISSION_PERCENT_MAX_LENGTH = 6;

export type CommissionsTransactionLike = {
  propertyId: number;
  propertyTitle?: string | null;
  propertyCode?: string | null;
  propertyPurpose?: string | null;
  signedProposalDocumentId?: number | string | null;
  commissionData?: {
    valorVenda?: number | null;
    comissaoCaptador?: number | null;
    comissaoVendedor?: number | null;
    taxaPlataforma?: number | null;
  } | null;
};

export function formatCommissionCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function readCommissionValue(value: unknown): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return formatCurrencyInput(String(Math.round(numeric * 100)), COMMISSION_CURRENCY_MAX);
}

export function formatCommissionPercentageInputValue(
  raw: string,
  maxValue = COMMISSION_PERCENT_MAX
): string {
  return formatPromotionPercentageInput(raw, maxValue);
}

export function parseCommissionMoney(value: string, maxValue = COMMISSION_CURRENCY_MAX): number | null {
  const parsed = parseCurrency(value, maxValue);
  if (parsed == null || !Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(2));
}

export function parseCommissionPercentage(
  value: string,
  maxValue = COMMISSION_PERCENT_MAX
): number | null {
  const parsed = parsePromotionPercentage(value, maxValue);
  if (parsed == null || !Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(2));
}

export function convertAmountFieldToPercentage(
  rawAmount: string,
  saleValue: number | null
): string {
  if (saleValue == null || saleValue <= 0) return '';
  const amount = parseCommissionMoney(rawAmount, COMMISSION_CURRENCY_MAX);
  if (amount == null) return '';
  const percentage = Number(((amount / saleValue) * 100).toFixed(2));
  return percentage.toLocaleString('pt-BR', {
    minimumFractionDigits: percentage % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function convertPercentageFieldToAmount(
  rawPercentage: string,
  saleValue: number | null
): string {
  if (saleValue == null || saleValue <= 0) return '';
  const percentage = parseCommissionPercentage(rawPercentage, COMMISSION_PERCENT_MAX);
  if (percentage == null) return '';
  const amount = Number(((saleValue * percentage) / 100).toFixed(2));
  return formatCurrencyInput(String(Math.round(amount * 100)), COMMISSION_CURRENCY_MAX);
}

export function resolveCommissionPropertyLabel(item: CommissionsTransactionLike): string {
  const title = String(item.propertyTitle ?? '').trim();
  const code = String(item.propertyCode ?? '').trim();
  if (code && title) return `${code} - ${title}`;
  if (title) return title;
  if (code) return code;
  return `Imóvel #${item.propertyId}`;
}

export function requiresExactSaleSplit(item: CommissionsTransactionLike | null): boolean {
  const purpose = String(item?.propertyPurpose ?? '').trim().toLowerCase();
  const isRentalOnly = purpose.includes('alug') && !purpose.includes('venda');
  return !isRentalOnly;
}

export function hasExactSaleSplit(values: {
  comissaoCaptador: number;
  comissaoVendedor: number;
  taxaPlataforma: number;
  valorVenda: number;
}): boolean {
  const total = Number(
    (values.comissaoCaptador + values.comissaoVendedor + values.taxaPlataforma).toFixed(2)
  );
  return Math.abs(total - values.valorVenda) <= 0.01;
}
