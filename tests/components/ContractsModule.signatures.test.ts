import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { adminSession, getDefaultAdminCapabilities } from '$lib/sessionState';
import type { ContractItem, ContractSignatureStatus } from '../../src/lib/components/contracts/types';

const { get, post, put, patch, remove, clientPost } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), remove: vi.fn(), clientPost: vi.fn(),
}));
vi.mock('$lib/apiClient', () => ({ api: { get, post, put, patch, delete: remove }, apiClient: { get: vi.fn(), post: clientPost } }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('pdfjs-dist/build/pdf.mjs', () => ({ GlobalWorkerOptions: { workerSrc: '' }, getDocument: vi.fn() }));
import ContractsModule from '../../src/lib/components/ContractsModule.svelte';

const pending = (): ContractSignatureStatus => ({ status: 'PENDING', eventId: null, confirmedByAdminId: null, confirmedAt: null,
  sourceEventId: null, originalEventId: null, originalSignedVersionId: null, preservation: null });
const fixture = (versionId = 31): ContractItem => ({ id: 'contract-signatures-1', status: 'AWAITING_SIGNATURES',
  negotiationId: 'neg-1', propertyId: 1, dealType: 'rent', propertyTitle: 'Imóvel de teste',
  documents: [{ id: versionId + 10, documentType: 'contrato_assinado', originalFileName: `versao-${versionId}.pdf`, metadata: { contractId: 'contract-signatures-1' } }],
  signatures: { currentVersion: { id: versionId, documentId: versionId + 10, draftRevisionId: 11,
    uploadedByAdminId: 7, uploadedAt: '2026-10-09T12:34:56Z', previousVersionId: null, replacementReason: null, equivalence: null },
    seller: { ...pending(), status: 'CONFIRMED', eventId: 91, confirmedByAdminId: 7, confirmedAt: '2026-10-09T12:34:56Z', originalEventId: 91, originalSignedVersionId: versionId },
    buyer: pending() },
});
type Detail = { contract: ContractItem; documents: ContractItem['documents'] };
const detail = (item: ContractItem): Detail => ({ contract: item, documents: item.documents });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('ContractsModule signature presentation', () => {
  let listing: ContractItem;
  let loadDetail: () => Promise<Detail>;
  beforeEach(() => {
    vi.clearAllMocks();
    adminSession.set({ role: 'admin', capabilities: getDefaultAdminCapabilities() });
    listing = fixture();
    loadDetail = async () => detail(fixture());
    get.mockImplementation(async (url: string) => {
      if (url.includes('/admin/contracts?status=AWAITING_SIGNATURES')) return { data: [listing], total: 1 };
      if (url === '/contracts/contract-signatures-1') return loadDetail();
      return { data: [], total: 0 };
    });
  });
  const open = async () => {
    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizar Venda/Locação' }));
    return screen.findByRole('region', { name: 'Assinaturas presenciais' });
  };
  const noMutations = () => {
    for (const method of [post, put, patch, remove, clientPost]) expect(method).not.toHaveBeenCalled();
  };
  it('loads the real detail DTO and updates the current PDF/signatures on manual refresh without mutations', async () => {
    delete listing.signatures;
    const initial = fixture(); initial.documents!.unshift({ id: 10, documentType: 'contrato_assinado',
      originalFileName: 'historico.pdf', metadata: { contractId: initial.id } });
    loadDetail = async () => detail(initial);
    const panel = within(await open());
    expect(await panel.findByText('PDF corrente: versao-31.pdf')).toBeInTheDocument();
    expect(panel.getByText('Confirmada diretamente')).toBeInTheDocument();
    expect(screen.getAllByText('PDF corrente')).toHaveLength(2);
    expect(screen.getAllByText('Fora da versão corrente')).toHaveLength(2);
    const next = fixture(32); next.signatures!.seller = pending();
    loadDetail = async () => detail(next);
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
    expect(await panel.findByText('PDF corrente: versao-32.pdf')).toBeInTheDocument();
    expect(panel.getAllByText('Pendente')).toHaveLength(2);
    expect(panel.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
    expect(panel.queryByRole('button')).not.toBeInTheDocument(); noMutations();
  });
  it('hides list confirmations until details have actually loaded', async () => {
    const request = deferred<Detail>(); loadDetail = () => request.promise;
    const panel = within(await open());
    expect(panel.getByRole('status')).toHaveTextContent('Carregando');
    expect(panel.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
    request.resolve(detail(fixture()));
    expect(await panel.findByText('Confirmada diretamente')).toBeInTheDocument(); noMutations();
  });
  it('does not expose cached confirmations after initial detail failure', async () => {
    loadDetail = async () => { throw new Error('isolated detail error'); };
    const panel = within(await open());
    expect(await panel.findByRole('alert')).toHaveTextContent('Não foi possível consultar');
    expect(panel.queryByText('Confirmada diretamente')).not.toBeInTheDocument(); noMutations();
  });
  it('displays refresh failure instead of stale confirmations and recovers on another refresh', async () => {
    const panel = within(await open()); await panel.findByText('Confirmada diretamente');
    loadDetail = async () => { throw new Error('isolated refresh error'); };
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
    expect(await panel.findByRole('alert')).toBeInTheDocument();
    expect(panel.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
    loadDetail = async () => detail(fixture(32));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' })).toBeEnabled());
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
    expect(await panel.findByText('PDF corrente: versao-32.pdf')).toBeInTheDocument(); noMutations();
  });
  it('clears previous signature data when a subsequent DTO omits it', async () => {
    const panel = within(await open()); await panel.findByText('Confirmada diretamente');
    const legacy = fixture(); delete legacy.signatures;
    loadDetail = async () => detail(legacy);
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
    expect(await panel.findByText(/Dados de assinaturas não disponíveis/)).toBeInTheDocument();
    expect(panel.queryByText('Confirmada diretamente')).not.toBeInTheDocument(); noMutations();
  });
  it('does not let an older detail response overwrite a newer refresh', async () => {
    const old = deferred<Detail>(); let calls = 0;
    loadDetail = () => ++calls === 1 ? old.promise : Promise.resolve(detail(fixture(32)));
    const panel = within(await open());
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
    expect(await panel.findByText('PDF corrente: versao-32.pdf')).toBeInTheDocument();
    old.resolve(detail(fixture(31))); await old.promise; await tick();
    expect(panel.getByText('PDF corrente: versao-32.pdf')).toBeInTheDocument();
    expect(panel.queryByText('PDF corrente: versao-31.pdf')).not.toBeInTheDocument(); noMutations();
  });
  it('uses neutral party labels throughout the signature area without inferring from property purpose', async () => {
    const legacy = fixture(); legacy.dealType = null; legacy.propertyPurpose = 'Aluguel';
    listing = legacy; loadDetail = async () => detail(legacy);
    const panel = within(await open());
    expect(await panel.findByRole('heading', { name: 'Parte seller' })).toBeInTheDocument();
    expect(panel.getByRole('heading', { name: 'Parte buyer' })).toBeInTheDocument();
    expect(screen.queryByText('Locador')).not.toBeInTheDocument();
    expect(screen.queryByText('Locatário')).not.toBeInTheDocument();
    expect(screen.queryByText('Dados do proprietário legal')).not.toBeInTheDocument(); noMutations();
  });
  it.each(['admin', 'operational_assistant', 'document_operator'] as const)(
    'presents administrative state for %s without creating any new operation', async (role) => {
      adminSession.set({ role, capabilities: getDefaultAdminCapabilities(role) });
      const panel = within(await open());
      expect(await panel.findByText('Confirmada diretamente')).toBeInTheDocument();
      expect(panel.queryByRole('button')).not.toBeInTheDocument(); noMutations();
    },
  );
  it('shows no current version without treating listed historical PDFs as current evidence', async () => {
    const item = fixture(); item.signatures!.currentVersion = null;
    loadDetail = async () => detail(item);
    const panel = within(await open());
    expect(await panel.findByText(/Nenhum PDF assinado corrente/)).toBeInTheDocument();
    expect(panel.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sem versão corrente')).toHaveLength(2); noMutations();
  });
});
