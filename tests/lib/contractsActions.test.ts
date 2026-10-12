import { describe, expect, it, vi } from 'vitest';

const { post, apiPost } = vi.hoisted(() => ({ post: vi.fn(), apiPost: vi.fn() }));

vi.mock('$lib/apiClient', () => ({
  api: { post: apiPost, delete: vi.fn(), put: vi.fn(), patch: vi.fn() },
  apiClient: { post, get: vi.fn() },
}));

import { confirmContractSignature, finalizeContract, submitContractDraft, uploadMatrixDocument, uploadSignedDocument } from '../../src/lib/components/contracts/contractsActions';

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


describe('signed document replacement multipart', () => {
  const pdf = () => new File(['%PDF-test'], 'signed.pdf', { type: 'application/pdf' });
  it('keeps initial signed upload unchanged without any declarations', async () => {
    post.mockClear(); await uploadSignedDocument('contract-1', 'contrato_assinado', pdf());
    const form = post.mock.calls[0][1] as FormData;
    expect([...form.keys()]).toEqual(['documentType', 'file']);
  });
  it.each(['comprovante_pagamento', 'boleto_vistoria', 'outro'])('keeps initial and replacement fields unchanged for %s', async (type) => {
    for (const id of [undefined, 42]) {
      post.mockClear(); await uploadSignedDocument('contract-1', type, pdf(), id);
      const form = post.mock.calls[0][1] as FormData;
      expect(form.get('replaceDocumentId')).toBe(id ? '42' : null);
      for (const key of ['replacementReason', 'equivalenceDeclared', 'contractContentUnchanged']) expect(form.get(key)).toBeNull();
    }
  });
  it.each(['equivalent', 'unchanged'] as const)('sends only the explicit %s declaration as a multipart string', async (mode) => {
    post.mockClear();
    await uploadSignedDocument('contract-1', 'contrato_assinado', pdf(), 42, mode === 'equivalent'
      ? { replacementReason: '  Nova digitalização  ', equivalenceDeclared: true }
      : { replacementReason: '  Nova digitalização  ', contractContentUnchanged: true });
    const form = post.mock.calls[0][1] as FormData;
    expect(form.get('replaceDocumentId')).toBe('42'); expect(form.get('replacementReason')).toBe('Nova digitalização');
    expect(post.mock.calls[0][2]).toEqual({ skipErrorToast: true });
    expect(form.get('equivalenceDeclared')).toBe(mode === 'equivalent' ? 'true' : null);
    expect(form.get('contractContentUnchanged')).toBe(mode === 'unchanged' ? 'true' : null);
  });
  it('rejects missing reason, absent or conflicting declarations and coerced booleans', async () => {
    const invalid: unknown[] = [undefined, { replacementReason: ' ', equivalenceDeclared: true },
      { replacementReason: 'test' }, { replacementReason: 'test', equivalenceDeclared: 'false' },
      { replacementReason: 'test', equivalenceDeclared: true, contractContentUnchanged: true },
      { replacementReason: 'test', contractContentUnchanged: false }];
    for (const declaration of invalid) {
      post.mockClear(); await expect(uploadSignedDocument('contract-1', 'contrato_assinado', pdf(), 42,
        declaration as Parameters<typeof uploadSignedDocument>[4])).rejects.toThrow();
      expect(post).not.toHaveBeenCalled();
    }
  });
  it('rejects a non-PDF replacement without a request', async () => {
    post.mockClear(); await expect(uploadSignedDocument('contract-1', 'contrato_assinado',
      new File(['image'], 'signed.png', { type: 'image/png' }), 42,
      { replacementReason: 'test', contractContentUnchanged: true })).rejects.toThrow(/PDF/);
    expect(post).not.toHaveBeenCalled();
  });
});


describe('draft publication multipart', () => {
  it('sends a new PDF without reuse or invented revision fields, with optional quiet errors', async () => {
    post.mockClear();
    const file = new File(['%PDF'], 'minuta.pdf', { type: 'application/pdf' });
    await submitContractDraft('contract-1', file, false, { skipErrorToast: true });
    expect(post).toHaveBeenCalledExactlyOnceWith('/admin/contracts/contract-1/draft', expect.any(FormData), { skipErrorToast: true });
    const form = post.mock.calls[0][1] as FormData;
    expect([...form.keys()]).toEqual(['file']); expect(form.get('file')).toBe(file);
  });
  it('preserves existing publication and KEEP-reuse request behavior by default', async () => {
    post.mockClear();
    await submitContractDraft('contract-1', null, true);
    expect(post).toHaveBeenCalledExactlyOnceWith('/admin/contracts/contract-1/draft', expect.any(FormData));
    const form = post.mock.calls[0][1] as FormData;
    expect([...form.entries()]).toEqual([['reuseCurrentDraft', 'true']]);
  });
});


describe('finalization request', () => {
  it('keeps commission_data unchanged and makes toast suppression optional', async () => {
    apiPost.mockClear();
    const data = { valorBaseComissao: 1000, comissaoCaptador: 500, comissaoVendedor: 300, taxaPlataforma: 200 };
    await finalizeContract('contract-1', data);
    expect(apiPost).toHaveBeenLastCalledWith('/admin/contracts/contract-1/finalize', { commission_data: data });
    await finalizeContract('contract-1', data, { skipErrorToast: true });
    expect(apiPost).toHaveBeenLastCalledWith('/admin/contracts/contract-1/finalize', { commission_data: data }, { skipErrorToast: true });
    expect(data).toEqual({ valorBaseComissao: 1000, comissaoCaptador: 500, comissaoVendedor: 300, taxaPlataforma: 200 });
  });
});
