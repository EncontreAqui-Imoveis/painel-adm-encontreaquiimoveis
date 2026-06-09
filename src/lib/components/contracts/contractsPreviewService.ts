import { apiClient } from '$lib/apiClient';
import { renderPdfPreview } from '$lib/pdfPreviewRenderer';

export type ContractPreviewKind = 'image' | 'pdf';

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

  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: 'application/octet-stream' });
  const contentType = String(
    response.headers?.['content-type'] ?? response.headers?.['Content-Type'] ?? blob.type ?? ''
  ).toLowerCase();
  const isPdfFile = contentType.includes('pdf') || resolvedName.toLowerCase().endsWith('.pdf');
  const kind: ContractPreviewKind = contentType.includes('image/') && !isPdfFile ? 'image' : 'pdf';

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
