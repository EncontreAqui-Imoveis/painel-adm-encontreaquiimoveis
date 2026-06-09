import { onlyDigits, parseCurrency } from '$lib/components/create-property-helpers';

export type FinalizeFieldMode = 'amount' | 'percentage';
export type FinalizeCommissionField = 'comissaoCaptador' | 'comissaoVendedor' | 'taxaPlataforma';

export type FinalizeFormState = {
  valorVenda: string;
  comissaoCaptador: string;
  comissaoVendedor: string;
  taxaPlataforma: string;
};

export type FinalizeFieldModeState = Record<FinalizeCommissionField, FinalizeFieldMode>;

export type PartyInfoFormState = {
  estadoCivil: string;
  profissao: string;
  email: string;
  telefone: string;
  dadosBancarios?: string;
  garantiaLocacao?: string;
};

function trimInfoValue(raw: string): string | null {
  const value = raw.trim();
  return value.length ? value : null;
}

function normalizePhoneForPayload(raw: string): string | null {
  const digits = onlyDigits(raw).slice(0, 11);
  return digits.length ? digits : null;
}

function parseMoney(value: string): number | null {
  const parsed = parseCurrency(value);
  if (parsed == null || !Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(2));
}

function sanitizePercentageInput(raw: string): string {
  const normalized = String(raw ?? '').replace('%', '').replace(',', '.').trim();
  if (!normalized) return '';
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return '';
  return String(numeric);
}

function parsePercentage(value: string): number | null {
  const sanitized = sanitizePercentageInput(value);
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

export function resolveApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const source = error as {
    response?: {
      data?: Record<string, unknown>;
      headers?: Record<string, unknown>;
    };
    requestId?: unknown;
    message?: unknown;
  };
  const data = source.response?.data ?? {};
  const backendMessage =
    typeof data.error === 'string'
      ? data.error.trim()
      : typeof data.message === 'string'
        ? data.message.trim()
        : typeof source.message === 'string'
          ? source.message.trim()
          : '';
  const requestId =
    typeof source.requestId === 'string'
      ? source.requestId.trim()
      : typeof data.requestId === 'string'
        ? data.requestId.trim()
        : typeof data.request_id === 'string'
          ? data.request_id.trim()
          : '';

  if (!backendMessage) {
    return fallback;
  }

  return requestId ? `${backendMessage} (Req: ${requestId})` : backendMessage;
}

export function buildSellerInfoPayload(
  selectedSellerInfo: Record<string, unknown> | null | undefined,
  form: PartyInfoFormState
): Record<string, unknown> {
  const previous =
    selectedSellerInfo && typeof selectedSellerInfo === 'object'
      ? { ...(selectedSellerInfo as Record<string, unknown>) }
      : {};

  return {
    ...previous,
    estado_civil: trimInfoValue(form.estadoCivil),
    profissao: trimInfoValue(form.profissao),
    email: trimInfoValue(form.email),
    telefone: normalizePhoneForPayload(form.telefone),
    dados_bancarios: trimInfoValue(form.dadosBancarios ?? ''),
  };
}

export function buildBuyerInfoPayload(
  selectedBuyerInfo: Record<string, unknown> | null | undefined,
  form: PartyInfoFormState
): Record<string, unknown> {
  const previous =
    selectedBuyerInfo && typeof selectedBuyerInfo === 'object'
      ? { ...(selectedBuyerInfo as Record<string, unknown>) }
      : {};

  return {
    ...previous,
    estado_civil: trimInfoValue(form.estadoCivil),
    profissao: trimInfoValue(form.profissao),
    email: trimInfoValue(form.email),
    telefone: normalizePhoneForPayload(form.telefone),
    garantia_locacao: trimInfoValue(form.garantiaLocacao ?? ''),
  };
}

function convertAmountFieldToPercentage(rawValue: string, saleValue: number): number | null {
  const amount = parseMoney(rawValue);
  if (amount == null || saleValue <= 0) {
    return null;
  }
  return Number(((amount / saleValue) * 100).toFixed(2));
}

function convertPercentageFieldToAmount(rawValue: string, saleValue: number): number | null {
  const percentage = parsePercentage(rawValue);
  if (percentage == null || saleValue <= 0) {
    return null;
  }
  return Number(((saleValue * percentage) / 100).toFixed(2));
}

function resolveCommissionFieldAmount(
  field: FinalizeCommissionField,
  saleValue: number,
  form: FinalizeFormState,
  fieldModes: FinalizeFieldModeState
): number | null {
  const rawValue = form[field];
  const mode = fieldModes[field] ?? 'amount';
  return mode === 'percentage'
    ? convertPercentageFieldToAmount(rawValue, saleValue)
    : parseMoney(rawValue);
}

export function resolveFinalizeCommissionAmounts(
  form: FinalizeFormState,
  fieldModes: FinalizeFieldModeState
):
  | {
      valorVenda: number;
      comissaoCaptador: number;
      comissaoVendedor: number;
      taxaPlataforma: number;
    }
  | null {
  const valorVenda = parseMoney(form.valorVenda);
  if (valorVenda == null) {
    return null;
  }

  const comissaoCaptador = resolveCommissionFieldAmount(
    'comissaoCaptador',
    valorVenda,
    form,
    fieldModes
  );
  const comissaoVendedor = resolveCommissionFieldAmount(
    'comissaoVendedor',
    valorVenda,
    form,
    fieldModes
  );
  const taxaPlataforma = resolveCommissionFieldAmount(
    'taxaPlataforma',
    valorVenda,
    form,
    fieldModes
  );

  if (
    comissaoCaptador == null ||
    comissaoVendedor == null ||
    taxaPlataforma == null
  ) {
    return null;
  }

  return {
    valorVenda,
    comissaoCaptador,
    comissaoVendedor,
    taxaPlataforma,
  };
}

export function hasExactSaleSplit(
  values:
    | {
        valorVenda: number;
        comissaoCaptador: number;
        comissaoVendedor: number;
        taxaPlataforma: number;
      }
    | null
): boolean {
  if (!values) return false;
  const total = Number(
    (
      values.comissaoCaptador +
      values.comissaoVendedor +
      values.taxaPlataforma
    ).toFixed(2)
  );
  return Math.abs(total - values.valorVenda) <= 0.01;
}
