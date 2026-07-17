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

export async function loadContractDocumentPreview(
  url: string,
  resolvedName: string
): Promise<ContractPreviewResult> {
  const response = await apiClient.get(url, {
    responseType: 'blob',
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

  const rendered = await renderPdfPreview(blob);
  return {
    blob,
    contentType,
    kind,
    pdfPages: rendered.pages,
    pdfText: rendered.text,
    pdfFallbackUsed: Boolean(rendered.usedFallback),
  };
}
