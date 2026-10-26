import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { adminSession, getDefaultAdminCapabilities } from '$lib/sessionState';
import type { ContractItem, ContractSignatureStatus } from '$lib/components/contracts/types';
import { currentSignedReplacementContext } from '$lib/components/contracts/contractSignedReplacement';

const { get, post, upload, success, error } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), upload: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock('$lib/apiClient', () => ({ api: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiClient: { get: vi.fn(), post: upload } }));
vi.mock('svelte-sonner', () => ({ toast: { success, error } }));
vi.mock('pdfjs-dist/build/pdf.mjs', () => ({ GlobalWorkerOptions: { workerSrc: '' }, getDocument: vi.fn() }));
import ContractsModule from '$lib/components/ContractsModule.svelte';

const pending = (): ContractSignatureStatus => ({ status: 'PENDING', eventId: null, confirmedByAdminId: null,
  confirmedAt: null, sourceEventId: null, originalEventId: null, originalSignedVersionId: null, preservation: null });
const fixture = (revisionId = 11): ContractItem => ({ id: 'signed-upload-test', status: 'AWAITING_SIGNATURES', dealType: 'rent',
  negotiationId: 'neg-upload-test', propertyId: 1, propertyTitle: 'Contrato de teste',
  draftReview: { revisionId, documentId: 20, allConsented: true },
  documents: [{ id: 20, documentType: 'contrato_minuta', originalFileName: 'minuta.pdf', metadata: { contractId: 'signed-upload-test' } }],
  signatures: { currentVersion: null, seller: pending(), buyer: pending() },
});
const saved = (): ContractItem => {
  const item = fixture();
  item.documents!.push({ id: 41, documentType: 'contrato_assinado', originalFileName: 'assinado.pdf', metadata: { contractId: item.id } });
  item.signatures!.currentVersion = { id: 31, documentId: 41, draftRevisionId: 11, uploadedByAdminId: 7,
    uploadedAt: '2026-10-26T12:00:00Z', previousVersionId: null, replacementReason: null, equivalence: null };
  return item;
};
const pdf = () => new File(['%PDF-1.7 synthetic'], 'assinado.pdf', { type: 'application/pdf' });

describe('signed upload bound to the displayed draft revision', () => {
  let current: ContractItem;
  let load: () => Promise<ContractItem>;
  beforeEach(() => {
    vi.resetAllMocks();
    current = fixture(); load = async () => current;
    adminSession.set({ role: 'admin', capabilities: getDefaultAdminCapabilities() });
    get.mockImplementation(async (url: string) => {
      if (url.startsWith('/admin/contracts?')) return { data: [current], total: 1 };
      if (url === '/contracts/signed-upload-test') { const item = await load(); return { contract: item, documents: item.documents }; }
      return { data: [], total: 0 };
    });
  });
  const open = async () => {
    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
    await fireEvent.click((await screen.findAllByRole('button', { name: 'Finalizar Venda/Locação' }))[0]);
    await screen.findByRole('region', { name: 'Assinaturas presenciais' });
    await waitFor(() => expect(screen.queryByText('Carregando assinaturas…')).not.toBeInTheDocument());
  };
  const input = () => document.querySelector('input[type="file"][accept="application/pdf,image/png,image/jpeg,image/webp"]') as HTMLInputElement;
  const choose = async () => {
    await screen.findByText('Revisão da minuta: #11');
    await fireEvent.click(screen.getByRole('button', { name: 'Escolher arquivo PDF ou imagem' }));
    await fireEvent.change(input(), { target: { files: [pdf()] } });
  };
  const attach = () => fireEvent.click(screen.getByRole('button', { name: 'Anexar documento físico' }));
  const refresh = () => fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
  const noConfirmation = () => { expect(post).not.toHaveBeenCalled(); expect(screen.queryByText('Confirmada diretamente')).not.toBeInTheDocument(); };

  it('sends the displayed revision and reloads persisted pending signatures on a fresh mount', async () => {
    upload.mockImplementation(async () => { current = saved(); return { data: { readyForFinalization: true } }; });
    await open(); await choose(); await attach();
    await waitFor(() => expect(upload).toHaveBeenCalledOnce());
    const form = upload.mock.calls[0][1] as FormData;
    expect(form.get('draftRevisionId')).toBe('11'); expect(form.get('file')).toBeInstanceOf(File);
    expect(upload.mock.calls[0][0]).toBe('/admin/contracts/signed-upload-test/signed-docs');
    await screen.findByText('PDF corrente: assinado.pdf');
    expect(within(screen.getByRole('region', { name: 'Assinaturas presenciais' })).getAllByText('Pendente')).toHaveLength(2);
    noConfirmation();
    cleanup(); await open();
    await screen.findByText('PDF corrente: assinado.pdf'); noConfirmation();
    expect(upload).toHaveBeenCalledOnce();
  });

  it.each([undefined, null, 0])('does not select or send a signed PDF without a revision: %j', async (id) => {
    current.draftReview = { revisionId: id };
    await open();
    await fireEvent.click(await screen.findByRole('button', { name: 'Escolher arquivo PDF ou imagem' }));
    await fireEvent.change(input(), { target: { files: [pdf()] } });
    expect(screen.queryByRole('button', { name: 'Anexar documento físico' })).not.toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled(); expect(success).not.toHaveBeenCalled(); noConfirmation();
  });

  it.each(['picker', 'selected'])('invalidates the selection when the revision changes with the file %s', async (phase) => {
    await open(); await screen.findByText('Revisão da minuta: #11');
    await fireEvent.click(screen.getByRole('button', { name: 'Escolher arquivo PDF ou imagem' }));
    if (phase === 'selected') await fireEvent.change(input(), { target: { files: [pdf()] } });
    current = fixture(12); await refresh(); await screen.findByText('Revisão da minuta: #12');
    if (phase === 'picker') await fireEvent.change(input(), { target: { files: [pdf()] } });
    expect(screen.queryByRole('button', { name: 'Anexar documento físico' })).not.toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled(); noConfirmation();
  });

  it('handles a stale revision explicitly, clears the form and never retries with the new revision', async () => {
    upload.mockImplementation(async () => { current = fixture(12); throw { response: { status: 409, data: { code: 'CONTRACT_DRAFT_REVISION_STALE' } } }; });
    await open(); await choose(); await attach();
    await screen.findByText('Revisão da minuta: #12');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('revisão ou o documento corrente mudou'));
    expect((upload.mock.calls[0][1] as FormData).get('draftRevisionId')).toBe('11');
    expect(upload).toHaveBeenCalledOnce(); expect(success).not.toHaveBeenCalled(); noConfirmation();
    expect(screen.queryByRole('button', { name: 'Anexar documento físico' })).not.toBeInTheDocument();
  });

  it('keeps the captured revision during an in-flight upload and does not accept a late old response as current', async () => {
    let resolve!: (value: unknown) => void;
    upload.mockReturnValue(new Promise(done => { resolve = done; }));
    await open(); await choose(); await attach();
    await attach(); expect(upload).toHaveBeenCalledOnce();
    expect((upload.mock.calls[0][1] as FormData).get('draftRevisionId')).toBe('11');
    current = fixture(12); await refresh(); await screen.findByText('Revisão da minuta: #12');
    resolve({ data: { readyForFinalization: true, signedVersion: { id: 31, draftRevisionId: 11 } } });
    await tick();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher arquivo PDF ou imagem' })).toBeEnabled());
    expect(success).not.toHaveBeenCalled(); expect(upload).toHaveBeenCalledOnce(); noConfirmation();
    expect(screen.getByText('Revisão da minuta: #12')).toBeInTheDocument();
  });

  it.each([403, 500, 'network'])('does not report success on %s and reconciles without retry', async (status) => {
    upload.mockRejectedValue(status === 'network' ? new Error('offline') : { response: { status, data: { error: 'Upload recusado' } } });
    await open(); await choose(); await attach();
    await waitFor(() => expect(error).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher arquivo PDF ou imagem' })).toBeEnabled());
    expect(upload).toHaveBeenCalledOnce(); expect(success).not.toHaveBeenCalled(); noConfirmation();
    expect(get.mock.calls.filter(([url]) => url === '/contracts/signed-upload-test')).toHaveLength(2);
  });

  it('recovers a possibly committed PDF after a lost response without inventing confirmations', async () => {
    upload.mockImplementation(async () => { current = saved(); throw new Error('lost acknowledgement'); });
    await open(); await choose(); await attach();
    await screen.findByText('PDF corrente: assinado.pdf');
    expect(success).not.toHaveBeenCalled(); expect(upload).toHaveBeenCalledOnce(); noConfirmation();
  });

  it('blocks upload if document permission is revoked after choosing a file', async () => {
    await open(); await choose();
    adminSession.set({ role: 'admin', capabilities: { ...getDefaultAdminCapabilities(), canReplaceDocuments: false } });
    await tick();
    const button = screen.getByRole('button', { name: 'Anexar documento físico' });
    expect(button).toBeDisabled(); await fireEvent.click(button);
    expect(upload).not.toHaveBeenCalled(); expect(success).not.toHaveBeenCalled(); noConfirmation();
  });

  it('does not retain a previously displayed revision when a refreshed DTO omits it', async () => {
    await open(); await choose();
    current = fixture(); delete current.draftReview;
    await refresh();
    await screen.findByText('Revisão da minuta indisponível. Atualize os detalhes antes de enviar o PDF assinado.');
    expect(screen.queryByRole('button', { name: 'Anexar documento físico' })).not.toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects a rescan context whose signed revision differs from the displayed draft', () => {
    const item = saved();
    expect(currentSignedReplacementContext(item)?.draftRevisionId).toBe(11);
    item.draftReview!.revisionId = 12;
    expect(currentSignedReplacementContext(item)).toBeNull();
  });
});
