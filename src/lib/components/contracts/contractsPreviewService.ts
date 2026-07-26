import { apiClient } from '$lib/apiClient';
import { renderPdfPreview } from '$lib/pdfPreviewRenderer';

export type ContractPreviewKind = 'image' | 'pdf';

const PREVIEW_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export type ContractPreviewResult = {
  blob: Blob;
  contentType: string;
  kind: ContractPreviewKind;
  pdfPages: Array<{ pageNumber: number; dataUrl: string }>;
  pdfText: string;
  pdfFallbackUsed: boolean;
};

export type ContractPreviewLoadOptions = {
  signal?: AbortSignal;
  onPdfPage?: (pages: Array<{ pageNumber: number; dataUrl: string }>, text: string) => void;
};

type PreviewApiError = {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
};

/** Converts Axios blob errors back to the API's safe, user-facing message. */
export async function resolveContractPreviewErrorMessage(error: unknown): Promise<string> {
  const candidate = error as PreviewApiError;
  const responseData = candidate?.response?.data;

  if (responseData instanceof Blob) {
    try {
      const payload = JSON.parse(await responseData.text()) as Record<string, unknown>;
      const message = String(payload.error ?? payload.message ?? '').trim();
      if (message) return message;
    } catch {
      // Non-JSON blob errors use the generic safe message below.
    }
  }

  if (candidate?.response?.status === 403) {
    return 'Você não possui permissão para visualizar este documento.';
  }
  if (candidate?.response?.status === 404) {
    return 'Este documento não está mais disponível.';
  }

  return 'Não foi possível carregar a visualização do documento.';
}

export async function loadContractDocumentPreview(
  url: string,
  resolvedName: string,
  options: ContractPreviewLoadOptions = {}
): Promise<ContractPreviewResult> {
  const response = await apiClient.get(url, {
    responseType: 'blob',
    signal: options.signal,
  });

  const responseBlob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: 'application/octet-stream' });
  const responseContentType = String(
    response.headers?.['content-type'] ?? response.headers?.['Content-Type'] ?? responseBlob.type ?? ''
  ).split(';')[0].trim().toLowerCase();
  const extensionContentType = resolvedName.toLowerCase().endsWith('.pdf')
    ? 'application/pdf'
    : resolvedName.toLowerCase().endsWith('.png')
      ? 'image/png'
      : resolvedName.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : resolvedName.toLowerCase().endsWith('.jpg') || resolvedName.toLowerCase().endsWith('.jpeg')
          ? 'image/jpeg'
          : '';
  const contentType = PREVIEW_CONTENT_TYPES.has(responseContentType)
    ? responseContentType
    : (!responseContentType || responseContentType === 'application/octet-stream')
      ? extensionContentType
      : '';

  if (!contentType || !PREVIEW_CONTENT_TYPES.has(contentType)) {
    throw new Error('Tipo de arquivo não permitido para visualização.');
  }
  if (responseBlob.size <= 0) {
    throw new Error('Arquivo vazio.');
  }

  const blob = responseBlob.type === contentType
    ? responseBlob
    : new Blob([responseBlob], { type: contentType });
  const kind: ContractPreviewKind = contentType === 'application/pdf' ? 'pdf' : 'image';

  if (kind !== 'pdf') {
    return {
      blob,
      contentType,
      kind,
      pdfPages: [],
      pdfText: '',
      pdfFallbackUsed: false,
    };
  }

  const rendered = await renderPdfPreview(blob, {
    signal: options.signal,
    onPage: options.onPdfPage,
  });
  return {
    blob,
    contentType,
    kind,
    pdfPages: rendered.pages,
    pdfText: rendered.text,
    pdfFallbackUsed: Boolean(rendered.usedFallback),
  };
}
