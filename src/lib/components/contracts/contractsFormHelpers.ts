export type FinalizeFieldMode = 'amount' | 'percentage';
export type FinalizeCommissionField = 'comissaoCaptador' | 'comissaoVendedor' | 'taxaPlataforma';

export type FinalizeFormState = {
  valorBaseComissao: string;
  comissaoCaptador: string;
  comissaoVendedor: string;
  taxaPlataforma: string;
};

export type FinalizeFieldModeState = Record<FinalizeCommissionField, FinalizeFieldMode>;

export type PartyInfoFormState = {
  nome: string;
  cpf: string;
  estadoCivil: string;
  profissao: string;
  email: string;
  telefone: string;
  dadosBancarios?: string;
  garantiaLocacao?: string;
  conjugeNome: string;
  conjugeCpf: string;
  conjugeProfissao: string;
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

export function requiresSpouseFields(civilStatus: string): boolean {
  const normalized = civilStatus
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return normalized.includes('casad') || (normalized.includes('uniao') && normalized.includes('estav'));
}

function buildPartyInfoPayload(
  selectedInfo: Record<string, unknown> | null | undefined,
  form: PartyInfoFormState,
  extra: Record<string, unknown>,
  includeBankDetails: boolean
): Record<string, unknown> {
  const previousSource =
    selectedInfo && typeof selectedInfo === 'object'
      ? { ...(selectedInfo as Record<string, unknown>) }
      : {};
  const { dados_bancarios: _dadosBancarios, dadosBancarios: _dadosBancariosLegacy, ...previous } = previousSource;
  const spouseRequired = requiresSpouseFields(form.estadoCivil);

  return {
    ...previous,
    nome: trimInfoValue(form.nome),
    cpf: trimInfoValue(form.cpf),
    profissao: trimInfoValue(form.profissao),
    email: trimInfoValue(form.email),
    telefone: trimInfoValue(form.telefone),
    ...(includeBankDetails
      ? { dados_bancarios: trimInfoValue(form.dadosBancarios ?? '') }
      : {}),
    estado_civil: trimInfoValue(form.estadoCivil),
    conjuge_nome: spouseRequired ? trimInfoValue(form.conjugeNome) : null,
    conjuge_cpf: spouseRequired ? trimInfoValue(form.conjugeCpf) : null,
    conjuge_profissao: spouseRequired ? trimInfoValue(form.conjugeProfissao) : null,
    ...extra,
  };
}

export function buildSellerInfoPayload(
  selectedSellerInfo: Record<string, unknown> | null | undefined,
  form: PartyInfoFormState
): Record<string, unknown> {
  return buildPartyInfoPayload(selectedSellerInfo, form, {}, true);
}

export function buildBuyerInfoPayload(
  selectedBuyerInfo: Record<string, unknown> | null | undefined,
  form: PartyInfoFormState
): Record<string, unknown> {
  return buildPartyInfoPayload(selectedBuyerInfo, form, {
    garantia_locacao: trimInfoValue(form.garantiaLocacao ?? ''),
  }, false);
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

function convertAmountFieldToPercentage(rawValue: string, baseValue: number): number | null {
  const amount = parseMoney(rawValue);
  if (amount == null || baseValue <= 0) {
    return null;
  }
  return Number(((amount / baseValue) * 100).toFixed(2));
}

function convertPercentageFieldToAmount(rawValue: string, baseValue: number): number | null {
  const percentage = parsePercentage(rawValue);
  if (percentage == null || baseValue <= 0) {
    return null;
  }
  return Number(((baseValue * percentage) / 100).toFixed(2));
}

function resolveCommissionFieldAmount(
  field: FinalizeCommissionField,
  baseValue: number,
  form: FinalizeFormState,
  fieldModes: FinalizeFieldModeState
): number | null {
  const rawValue = form[field];
  const mode = fieldModes[field] ?? 'amount';
  return mode === 'percentage'
    ? convertPercentageFieldToAmount(rawValue, baseValue)
    : parseMoney(rawValue);
}

export function resolveFinalizeCommissionAmounts(
  form: FinalizeFormState,
  fieldModes: FinalizeFieldModeState
):
  | {
      valorBaseComissao: number;
      comissaoCaptador: number;
      comissaoVendedor: number;
      taxaPlataforma: number;
    }
  | null {
  const valorBaseComissao = parseMoney(form.valorBaseComissao);
  if (valorBaseComissao == null || valorBaseComissao <= 0) {
    return null;
  }

  const comissaoCaptador = resolveCommissionFieldAmount(
    'comissaoCaptador',
    valorBaseComissao,
    form,
    fieldModes
  );
  const comissaoVendedor = resolveCommissionFieldAmount(
    'comissaoVendedor',
    valorBaseComissao,
    form,
    fieldModes
  );
  const taxaPlataforma = resolveCommissionFieldAmount(
    'taxaPlataforma',
    valorBaseComissao,
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
    valorBaseComissao,
    comissaoCaptador,
    comissaoVendedor,
    taxaPlataforma,
  };
}

export function hasExactSaleSplit(
  values:
    | {
        valorBaseComissao: number;
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
  return Math.abs(total - values.valorBaseComissao) <= 0.01;
}
