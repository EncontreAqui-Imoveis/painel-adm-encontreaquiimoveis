import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiClientGetMock } = vi.hoisted(() => ({
  apiClientGetMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  apiClient: {
    get: apiClientGetMock,
  },
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
});
