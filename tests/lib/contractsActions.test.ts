import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('$lib/apiClient', () => ({
  api: { delete: vi.fn(), put: vi.fn(), patch: vi.fn() },
  apiClient: { post, get: vi.fn() },
}));

import { uploadMatrixDocument } from '../../src/lib/components/contracts/contractsActions';

describe('uploadMatrixDocument', () => {
  it('sends replaceDocumentId only for an explicit replacement', async () => {
    await uploadMatrixDocument(
      'contract-1',
      new File(['pdf'], 'documento.pdf', { type: 'application/pdf' }),
      { documentType: 'doc_identidade', side: 'seller', replaceDocumentId: 42 },
      'identidade'
    );

    const form = post.mock.calls[0][1] as FormData;
    expect(post).toHaveBeenCalledWith('/contracts/contract-1/documents', expect.any(FormData));
    expect(form.get('replaceDocumentId')).toBe('42');
    expect(form.get('side')).toBe('seller');
    expect(form.get('documentType')).toBe('doc_identidade');
  });

  it('does not send replaceDocumentId for a first upload', async () => {
    await uploadMatrixDocument(
      'contract-1',
      new File(['pdf'], 'documento.pdf', { type: 'application/pdf' }),
      { documentType: 'doc_identidade', side: 'seller' },
      'identidade'
    );

    const form = post.mock.calls[1][1] as FormData;
    expect(form.get('replaceDocumentId')).toBeNull();
  });
});
