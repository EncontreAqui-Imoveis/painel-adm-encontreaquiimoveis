export type ClientSummaryLike = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
};

export type ClientDetailLike = ClientSummaryLike & {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  bairro?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
};

export type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  bairro: string;
  city: string;
  state: string;
  cep: string;
};

type ClientFormSource = Partial<
  Pick<
    ClientDetailLike,
  | 'name'
  | 'email'
  | 'phone'
  | 'street'
  | 'number'
  | 'complement'
  | 'bairro'
  | 'city'
  | 'state'
  | 'cep'
  >
>;

type ApiErrorShape = {
  response?: {
    data?: {
      error?: unknown;
      message?: unknown;
      detail?: unknown;
    };
  };
  message?: unknown;
};

export function buildClientForm(detail: ClientFormSource | null, fallback: ClientFormSource | null): ClientFormState {
  return {
    name: detail?.name ?? fallback?.name ?? '',
    email: detail?.email ?? fallback?.email ?? '',
    phone: detail?.phone ?? fallback?.phone ?? '',
    street: detail?.street ?? fallback?.street ?? '',
    number: detail?.number ?? fallback?.number ?? '',
    complement: detail?.complement ?? fallback?.complement ?? '',
    bairro: detail?.bairro ?? fallback?.bairro ?? '',
    city: detail?.city ?? fallback?.city ?? '',
    state: detail?.state ?? fallback?.state ?? '',
    cep: detail?.cep ?? fallback?.cep ?? '',
  };
}

export function buildClientUpdatePayload(form: ClientFormState) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    street: form.street.trim(),
    number: form.number.trim(),
    complement: form.complement.trim(),
    bairro: form.bairro.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    cep: form.cep.trim(),
  };
}

export function normalizePromoteCreci(value: string): string {
  return value.trim();
}

export function isValidPromoteCreci(value: string): boolean {
  return normalizePromoteCreci(value).length >= 3;
}

function extractMessage(value: unknown, depth = 0): string | null {
  if (depth > 5) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ['error', 'message', 'detail']) {
    const nested = extractMessage(record[key], depth + 1);
    if (nested) return nested;
  }

  for (const entry of Object.values(record)) {
    const nested = extractMessage(entry, depth + 1);
    if (nested) return nested;
  }

  return null;
}

export function extractClientApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const source = error as ApiErrorShape;
  return (
    extractMessage(source.response?.data) ||
    extractMessage(source.message) ||
    extractMessage(error) ||
    fallback
  );
}

export function unwrapResponseData<T>(response: unknown): T | null {
  if (response && typeof response === 'object' && 'data' in response) {
    return ((response as { data?: T }).data ?? null) as T | null;
  }

  return (response as T | null) ?? null;
}
