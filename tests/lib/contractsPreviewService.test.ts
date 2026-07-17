import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiClientGetMock, renderPdfPreviewMock } = vi.hoisted(() => ({
  apiClientGetMock: vi.fn(),
  renderPdfPreviewMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  apiClient: {
    get: apiClientGetMock,
  },
}));

vi.mock('$lib/pdfPreviewRenderer', () => ({
  renderPdfPreview: renderPdfPreviewMock,
}));

import { loadContractDocumentPreview } from '../../src/lib/components/contracts/contractsPreviewService';

describe('contractsPreviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aceita imagens permitidas e preserva o MIME recebido', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    apiClientGetMock.mockResolvedValue({
      data: blob,
      headers: { 'content-type': 'image/png' },
    });

    const result = await loadContractDocumentPreview('/documents/1/download', 'documento.png');

    expect(result.kind).toBe('image');
    expect(result.contentType).toBe('image/png');
    expect(result.blob.type).toBe('image/png');
  });

  it('rejeita resposta HTML mesmo quando o nome termina em PDF', async () => {
    apiClientGetMock.mockResolvedValue({
      data: new Blob(['<html>erro</html>'], { type: 'text/html' }),
      headers: { 'content-type': 'text/html' },
    });

    await expect(
      loadContractDocumentPreview('/documents/1/download', 'documento.pdf')
    ).rejects.toThrow('Tipo de arquivo');
  });

  it('rejeita arquivos vazios', async () => {
    apiClientGetMock.mockResolvedValue({
      data: new Blob([], { type: 'image/png' }),
      headers: { 'content-type': 'image/png' },
    });

    await expect(
      loadContractDocumentPreview('/documents/1/download', 'documento.png')
    ).rejects.toThrow('Arquivo vazio');
  });

  it('encaminha cancelamento e páginas progressivas para o renderer de PDF', async () => {
    const signalController = new AbortController();
    const onPdfPage = vi.fn();
    const pages = [{ pageNumber: 1, dataUrl: 'data:image/png;base64,page-1' }];
    apiClientGetMock.mockResolvedValue({
      data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });
    renderPdfPreviewMock.mockImplementation(async (_blob, options) => {
      options.onPage(pages, 'Texto da primeira página');
      return { pages, text: 'Texto da primeira página', usedFallback: false };
    });

    const result = await loadContractDocumentPreview('/documents/1/download', 'documento.pdf', {
      signal: signalController.signal,
      onPdfPage,
    });

    expect(apiClientGetMock).toHaveBeenCalledWith('/documents/1/download', {
      responseType: 'blob',
      signal: signalController.signal,
    });
    expect(renderPdfPreviewMock).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.objectContaining({ signal: signalController.signal, onPage: onPdfPage })
    );
    expect(onPdfPage).toHaveBeenCalledWith(pages, 'Texto da primeira página');
    expect(result.pdfPages).toEqual(pages);
  });
});
