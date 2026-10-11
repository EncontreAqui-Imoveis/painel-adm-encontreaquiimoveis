import { describe, expect, it, vi } from 'vitest';

const { post, apiPost } = vi.hoisted(() => ({ post: vi.fn(), apiPost: vi.fn() }));

vi.mock('$lib/apiClient', () => ({
  api: { post: apiPost, delete: vi.fn(), put: vi.fn(), patch: vi.fn() },
  apiClient: { post, get: vi.fn() },
}));

import { confirmContractSignature, uploadMatrixDocument } from '../../src/lib/components/contracts/contractsActions';

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

describe('confirmContractSignature', () => {
  it.each(['seller', 'buyer'] as const)('sends only the actual version and explicit declaration for %s', async (side) => {
    const result = { idempotent: false, signatures: { currentVersion: null } };
    apiPost.mockResolvedValue(result);
    expect(await confirmContractSignature('contract-1', side, 84, true)).toEqual(result);
    expect(apiPost).toHaveBeenLastCalledWith(`/admin/contracts/contract-1/signatures/${side}/confirm`, {
      signedVersionId: 84, signatureChecked: true,
    });
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid version %s without a request', async (id) => {
    apiPost.mockClear();
    await expect(confirmContractSignature('contract-1', 'seller', id, true)).rejects.toThrow();
    expect(apiPost).not.toHaveBeenCalled();
  });
  it('never sends an unchecked declaration', async () => {
    apiPost.mockClear();
    await expect(confirmContractSignature('contract-1', 'buyer', 84, false)).rejects.toThrow();
    expect(apiPost).not.toHaveBeenCalled();
  });
});
