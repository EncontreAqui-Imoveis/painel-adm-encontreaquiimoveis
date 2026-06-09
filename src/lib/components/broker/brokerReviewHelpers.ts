import { extractApiErrorMessage } from '$lib/components/create-property-helpers';
import type { BrokerDocuments } from '$lib/types';

export type BrokerDocumentLabelKey = 'creciFront' | 'creciBack' | 'selfie';

export type BrokerDetailLike = {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  bairro?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  creci?: string | null;
  status?: string | null;
  created_at?: string | null;
  sem_cep?: number | boolean | null;
  sem_numero?: number | boolean | null;
  creci_front_url?: string | null;
  creci_back_url?: string | null;
  selfie_url?: string | null;
  documents?: BrokerDocuments;
};

export type BrokerFormState = {
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
  creci: string;
  semCep: boolean;
  semNumero: boolean;
};

export const BROKER_DOCUMENT_LABELS: Record<BrokerDocumentLabelKey, string> = {
  creciFront: 'Frente do CRECI',
  creciBack: 'Verso do CRECI',
  selfie: 'Selfie com CRECI',
};

export function formatBrokerReviewDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export function getBrokerDocumentLabel(docType: BrokerDocumentLabelKey): string {
  return BROKER_DOCUMENT_LABELS[docType];
}

export function getBrokerDocumentActionLabel(
  action: 'send' | 'replace' | 'view' | 'delete',
  docType: BrokerDocumentLabelKey
): string {
  const label = getBrokerDocumentLabel(docType).toLowerCase();
  if (action === 'replace') return `Substituir ${label}`;
  if (action === 'view') return `Visualizar ${label}`;
  if (action === 'delete') return `Excluir ${label}`;
  return `Enviar ${label}`;
}

export function extractRequestIdFromError(error: unknown): string {
  const requestId = (error as { requestId?: unknown })?.requestId;
  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId.trim();
  }

  const response = (error as {
    response?: {
      data?: { requestId?: unknown; request_id?: unknown };
      headers?: unknown;
    };
  }).response;

  const dataRequestId =
    typeof response?.data?.requestId === 'string'
      ? response.data.requestId.trim()
      : typeof response?.data?.request_id === 'string'
        ? response.data.request_id.trim()
        : '';
  if (dataRequestId) return dataRequestId;

  const headers = response?.headers;
  if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    const headerMap = headers as Record<string, unknown>;
    const rawHeader = headerMap['x-request-id'] ?? headerMap['X-Request-Id'] ?? headerMap['request-id'];
    if (typeof rawHeader === 'string' && rawHeader.trim().length > 0) return rawHeader.trim();
    if (Array.isArray(rawHeader) && rawHeader[0]) {
      const value = String(rawHeader[0]).trim();
      if (value) return value;
    }
  }

  return '';
}

export function formatBrokerReviewErrorMessage(error: unknown, fallback: string): string {
  const message = extractApiErrorMessage(error, fallback);
  const requestId = extractRequestIdFromError(error);
  return requestId ? `${message} (requestId: ${requestId})` : message;
}

export function normalizeBrokerDocumentUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';
  if (trimmedUrl.startsWith('http') || trimmedUrl.includes('cloudinary')) {
    return trimmedUrl;
  }
  if (trimmedUrl.startsWith('/uploads/') || trimmedUrl.startsWith('uploads/')) {
    return '';
  }
  return trimmedUrl;
}

export function resolveBrokerDocumentUrls(source: BrokerDetailLike | null | undefined) {
  const fromSource = (key: keyof BrokerDocuments): string | null => {
    if (source == null) return null;
    const fromDocuments = source.documents?.[key];
    if (typeof fromDocuments === 'string' && fromDocuments.trim().length > 0) {
      return fromDocuments;
    }
    const legacyValue = (source as Record<string, unknown>)[key as string];
    if (typeof legacyValue === 'string' && legacyValue.trim().length > 0) {
      return legacyValue;
    }
    return null;
  };

  return {
    creciFrontUrl: normalizeBrokerDocumentUrl(fromSource('creci_front_url')),
    creciBackUrl: normalizeBrokerDocumentUrl(fromSource('creci_back_url')),
    selfieUrl: normalizeBrokerDocumentUrl(fromSource('selfie_url')),
  };
}

export function createBrokerFormState(
  detail: BrokerDetailLike | null | undefined,
  fallback: Partial<BrokerFormState> = {}
): BrokerFormState {
  return {
    name: detail?.name ?? fallback.name ?? '',
    email: detail?.email ?? fallback.email ?? '',
    phone: detail?.phone ?? fallback.phone ?? '',
    street: detail?.street ?? fallback.street ?? '',
    number: detail?.number ?? fallback.number ?? '',
    complement: detail?.complement ?? fallback.complement ?? '',
    bairro: detail?.bairro ?? fallback.bairro ?? '',
    city: detail?.city ?? fallback.city ?? '',
    state: detail?.state ?? fallback.state ?? '',
    cep: detail?.cep ?? fallback.cep ?? '',
    creci: detail?.creci ?? fallback.creci ?? '',
    semCep: Boolean(detail?.sem_cep ?? fallback.semCep ?? false),
    semNumero: Boolean(detail?.sem_numero ?? fallback.semNumero ?? false),
  };
}
