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
  dadosBancarios?: string;
  garantiaLocacao?: string;
};

function trimInfoValue(raw: string): string | null {
  const value = raw.trim();
  return value.length ? value : null;
}

export function formatManualDecimalDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  return Number(value).toFixed(2).replace('.', ',');
}

export function sanitizeManualDecimalInput(
  raw: string,
  options: {
    maxFractionDigits?: number;
    maxIntegerDigits?: number;
    maxValue?: number;
  } = {}
): string {
  const { maxFractionDigits = 2, maxIntegerDigits, maxValue } = options;
  const cleaned = String(raw ?? '').replace('%', '').replace(/\s+/g, '');
  const lastSeparatorIndex = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  const hasSeparator = lastSeparatorIndex >= 0;
  const integerPartRaw = hasSeparator ? cleaned.slice(0, lastSeparatorIndex) : cleaned;
  const fractionPartRaw = hasSeparator ? cleaned.slice(lastSeparatorIndex + 1) : '';

  let integerPart = integerPartRaw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (typeof maxIntegerDigits === 'number') {
    integerPart = integerPart.slice(0, maxIntegerDigits);
  }

  const decimalPart = fractionPartRaw.replace(/\D/g, '').slice(0, maxFractionDigits);
  if (!integerPart && !decimalPart) {
    return '';
  }

  const hasTrailingSeparator = hasSeparator && /[.,]$/.test(cleaned) && decimalPart.length === 0;
  let formatted = hasSeparator ? `${integerPart || '0'},${decimalPart}` : integerPart || '0';
  if (hasTrailingSeparator) {
    formatted = `${integerPart || '0'},`;
  }

  if (typeof maxValue === 'number') {
    const normalizedValue = Number(
      hasSeparator ? `${integerPart || '0'}.${decimalPart || '0'}` : integerPart || '0'
    );
    if (Number.isFinite(normalizedValue) && normalizedValue > maxValue) {
      return maxValue.toFixed(maxFractionDigits).replace('.', ',');
    }
  }

  return formatted;
}

function parseManualDecimal(value: string, maxValue?: number): number | null {
  const sanitized = sanitizeManualDecimalInput(value, {
    maxFractionDigits: 2,
    maxValue,
  });
  if (!sanitized) return null;
  const parsed = Number(sanitized.replace(',', '.').replace(/,$/, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  const bounded = typeof maxValue === 'number' ? Math.min(maxValue, parsed) : parsed;
  return Number(bounded.toFixed(2));
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
  const { email: _email, telefone: _telefone, phone: _phone, ...rest } = previous;

  return {
    ...rest,
    estado_civil: trimInfoValue(form.estadoCivil),
    profissao: trimInfoValue(form.profissao),
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
  const { email: _email, telefone: _telefone, phone: _phone, ...rest } = previous;

  return {
    ...rest,
    estado_civil: trimInfoValue(form.estadoCivil),
    profissao: trimInfoValue(form.profissao),
    garantia_locacao: trimInfoValue(form.garantiaLocacao ?? ''),
  };
}

function parseMoney(value: string): number | null {
  return parseManualDecimal(value);
}

function parsePercentage(value: string): number | null {
  return parseManualDecimal(value, 100);
}

function formatPercentageValue(value: number): string {
  return Number(value).toFixed(2).replace('.', ',');
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
