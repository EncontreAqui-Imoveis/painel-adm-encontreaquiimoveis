import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { adminSession, getDefaultAdminCapabilities } from '$lib/sessionState';
import type { ContractItem, ContractSignatureStatus } from '../../src/lib/components/contracts/types';

const { get, post, put, patch, remove, clientPost, clientGet, pdfGetDocument, pageRender, pdfDestroy, handlers, toastError, toastSuccess } = vi.hoisted(() => ({
  clientGet: vi.fn(), pdfGetDocument: vi.fn(), pageRender: vi.fn(), pdfDestroy: vi.fn(),
  handlers: { confirm: null as null | ((side: 'seller' | 'buyer', version: number, checked: boolean) => Promise<void>) },
  get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), remove: vi.fn(), clientPost: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn(),
}));
vi.mock('$lib/apiClient', () => ({ api: { get, post, put, patch, delete: remove }, apiClient: { get: clientGet, post: clientPost } }));
vi.mock('svelte-sonner', () => ({ toast: { error: toastError, success: toastSuccess } }));
vi.mock('pdfjs-dist/build/pdf.mjs', () => ({ GlobalWorkerOptions: { workerSrc: '' }, getDocument: pdfGetDocument }));
// Capture the real parent's handler, while still mounting the real signature component.
// This exercises the guard independently of disabled controls (e.g. a faulty child).
vi.mock('../../src/lib/components/contracts/ContractSignatureStatusPanel.svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/components/contracts/ContractSignatureStatusPanel.svelte')>();
  return { ...actual, default: (anchor: unknown, props: { onConfirmSignature: typeof handlers.confirm }) => {
    handlers.confirm = props.onConfirmSignature;
    return (actual.default as unknown as (anchor: unknown, props: unknown) => unknown)(anchor, props);
  } };
});
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
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('ContractsModule signature presentation', () => {
  let listing: ContractItem;
  let loadDetail: () => Promise<Detail>;
  beforeEach(() => {
    vi.resetAllMocks();
    handlers.confirm = null;
    pageRender.mockReturnValue({ promise: Promise.resolve() });
    pdfDestroy.mockResolvedValue(undefined);
    pdfGetDocument.mockImplementation(() => ({ promise: Promise.resolve({ numPages: 1,
      getPage: async () => ({ getViewport: () => ({ width: 640, height: 900 }), render: pageRender,
        getTextContent: async () => ({ items: [{ str: 'Contrato assinado' }] }), cleanup: vi.fn() }),
      destroy: pdfDestroy,
    }), destroy: async () => {} }));
    const bytes = new TextEncoder().encode('%PDF-1.4 test').buffer;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    Object.defineProperty(blob, 'arrayBuffer', { value: async () => bytes });
    clientGet.mockResolvedValue({ data: blob, headers: { 'content-type': 'application/pdf' } });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:signature-pdf') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: vi.fn(() => ({})) });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', { configurable: true, value: vi.fn(() => 'data:image/png;base64,ZmFrZQ==') });
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
    await fireEvent.click((await screen.findAllByRole('button', { name: 'Finalizar Venda/Locação' }))[0]);
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
  const confirmable = () => {
    const item = fixture(); item.signatures!.seller = pending();
    item.documents![0].downloadUrl = '/negotiations/neg-1/documents/41/download';
    return item;
  };
  const viewCurrent = async (panel: ReturnType<typeof within>) => {
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    // Real service + renderer ran through download, PDF.js page.render and canvas rasterization.
    expect(await screen.findByAltText('versao-31.pdf - página 1')).toHaveAttribute('src', 'data:image/png;base64,ZmFrZQ==');
    await panel.findByText(/PDF corrente visualizado/);
    expect(clientGet).toHaveBeenCalledWith('/negotiations/neg-1/documents/41/download',
      expect.objectContaining({ responseType: 'blob', signal: expect.any(AbortSignal) }));
    expect(pdfGetDocument).toHaveBeenCalledWith({ data: expect.any(Uint8Array) });
    expect(pageRender).toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização' }));
  };
  it.each(['seller', 'buyer'] as const)('confirms %s with the actual version and refreshes the authoritative state', async (side) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open());
    const label = side === 'seller' ? 'Locador' : 'Locatário';
    const checkbox = await panel.findByRole('checkbox', { name: `Declaro que conferi a assinatura de ${label} no PDF corrente, versão #31.` });
    const refreshed = confirmable(); refreshed.signatures![side] = fixture().signatures!.seller;
    post.mockImplementation(async () => { loadDetail = async () => detail(refreshed); return { idempotent: false, signatures: refreshed.signatures }; });
    await viewCurrent(panel);
    await fireEvent.click(checkbox);
    await fireEvent.click(panel.getByRole('button', { name: `Confirmar assinatura (${label})` }));
    expect(post).toHaveBeenCalledExactlyOnceWith(`/admin/contracts/contract-signatures-1/signatures/${side}/confirm`, {
      signedVersionId: 31, signatureChecked: true,
    });
    expect(await panel.findByText('Confirmada diretamente')).toBeInTheDocument();
    expect(panel.getAllByText('Pendente')).toHaveLength(1);
    expect(get.mock.calls.filter(([url]) => url === '/contracts/contract-signatures-1')).toHaveLength(2);
    for (const method of [put, patch, remove, clientPost]) expect(method).not.toHaveBeenCalled();
  });
  it.each(['operational_assistant', 'document_operator'] as const)('hides confirmation controls for %s even with workflow capabilities', async (role) => {
    adminSession.set({ role, capabilities: getDefaultAdminCapabilities('admin') });
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    expect(panel.queryByRole('checkbox')).not.toBeInTheDocument(); noMutations();
  });
  it('does not submit twice and locks both sides while waiting for a confirmation', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const sent = deferred<{ idempotent: boolean; signatures: ContractItem['signatures'] }>(); post.mockReturnValue(sent.promise);
    const panel = within(await open());
    await viewCurrent(panel);
    await fireEvent.click(await panel.findByRole('checkbox', { name: /Locador/ }));
    await fireEvent.click(panel.getByRole('button', { name: 'Confirmar assinatura (Locador)' }));
    expect(panel.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
    expect(panel.getByRole('checkbox', { name: /Locatário/ })).toBeDisabled();
    await fireEvent.click(panel.getByRole('button', { name: 'Confirmando…' }));
    expect(post).toHaveBeenCalledOnce();
    sent.resolve({ idempotent: true, signatures: item.signatures });
    await waitFor(() => expect(panel.queryByRole('button', { name: 'Confirmando…' })).not.toBeInTheDocument());
    expect(await panel.findByRole('checkbox', { name: /Locador/ })).not.toBeChecked();
    expect(toastSuccess).toHaveBeenCalledWith('Assinatura já estava confirmada.');
  });
  it.each([403, 409, 500])('reconciles an HTTP %s failure without inventing confirmation or transferring a declaration', async (status) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open());
    post.mockImplementation(async () => {
      const next = confirmable(); next.signatures!.currentVersion!.id = 32;
      loadDetail = async () => detail(next);
      throw { response: { status, data: { error: 'A versão não pode ser confirmada.', code: 'CONTRACT_SIGNATURE_VERSION_STALE' } } };
    });
    await viewCurrent(panel);
    await fireEvent.click(await panel.findByRole('checkbox', { name: /Locador/ }));
    await fireEvent.click(panel.getByRole('button', { name: 'Confirmar assinatura (Locador)' }));
    const nextCheckbox = await panel.findByRole('checkbox', { name: /Locador.*#32/ });
    expect(nextCheckbox).not.toBeChecked(); expect(panel.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith('A versão não pode ser confirmada.');
  });
  it('shows unavailable state when confirmation succeeded but details cannot be refreshed', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open());
    post.mockImplementation(async () => { loadDetail = async () => { throw new Error('isolated refresh failure'); }; return { idempotent: false, signatures: item.signatures }; });
    await viewCurrent(panel);
    await fireEvent.click(await panel.findByRole('checkbox', { name: /Locador/ }));
    await fireEvent.click(panel.getByRole('button', { name: 'Confirmar assinatura (Locador)' }));
    expect(await panel.findByRole('alert')).toHaveTextContent('Não foi possível consultar');
    expect(panel.queryByRole('checkbox')).not.toBeInTheDocument(); expect(post).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith('Confirmação registrada, mas não foi possível atualizar os detalhes. Use Atualizar.');
  });
  it('confirms the two sides at different moments without carrying the other declaration across refresh', async () => {
    let authoritative = confirmable(); loadDetail = async () => detail(authoritative);
    post.mockImplementation(async (url: string) => {
      authoritative = { ...authoritative, signatures: { ...authoritative.signatures!,
        [url.includes('/seller/') ? 'seller' : 'buyer']: fixture().signatures!.seller } };
      return { idempotent: false, signatures: authoritative.signatures };
    });
    const panel = within(await open());
    await viewCurrent(panel);
    await fireEvent.click(await panel.findByRole('checkbox', { name: /Locador/ }));
    await fireEvent.click(panel.getByRole('button', { name: 'Confirmar assinatura (Locador)' }));
    const buyer = await panel.findByRole('checkbox', { name: /Locatário/ });
    expect(buyer).not.toBeChecked();
    await fireEvent.click(buyer);
    await fireEvent.click(panel.getByRole('button', { name: 'Confirmar assinatura (Locatário)' }));
    await waitFor(() => expect(panel.getAllByText('Confirmada diretamente')).toHaveLength(2));
    expect(post.mock.calls.map(([url]) => url)).toEqual([
      '/admin/contracts/contract-signatures-1/signatures/seller/confirm',
      '/admin/contracts/contract-signatures-1/signatures/buyer/confirm',
    ]);
  });
  it('reconciles an uncertain network outcome with a confirmation already committed on the server', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    post.mockImplementation(async () => { loadDetail = async () => detail(fixture()); throw new Error('Conexão interrompida'); });
    const panel = within(await open());
    await viewCurrent(panel);
    await fireEvent.click(await panel.findByRole('checkbox', { name: /Locador/ }));
    await fireEvent.click(panel.getByRole('button', { name: 'Confirmar assinatura (Locador)' }));
    expect(await panel.findByText('Confirmada diretamente')).toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce(); expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Conexão interrompida');
  });
  const expectLocked = (panel: ReturnType<typeof within>) => {
    for (const input of panel.queryAllByRole('checkbox')) expect(input).toBeDisabled();
    for (const button of panel.queryAllByRole('button', { name: /Confirmar assinatura/ })) expect(button).toBeDisabled();
    expect(panel.queryByText(/PDF corrente visualizado/)).not.toBeInTheDocument();
  };
  const refreshDetails = async () => fireEvent.click(screen.getByTitle('Atualizar dados do contrato e documentos'));

  it('keeps controls and the real parent handler locked without opening the PDF', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    expectLocked(panel);
    await handlers.confirm!('seller', 31, true);
    await handlers.confirm!('buyer', 31, true);
    noMutations(); expect(clientGet).not.toHaveBeenCalled();
  });
  it('does not authorize from a click, a pending download or a pending page render', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const download = deferred<Awaited<ReturnType<typeof clientGet>>>();
    const response = await clientGet(); clientGet.mockClear(); clientGet.mockReturnValueOnce(download.promise);
    const rendering = deferred<void>(); pageRender.mockReturnValueOnce({ promise: rendering.promise });
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    expectLocked(panel); expect(pdfGetDocument).not.toHaveBeenCalled();
    await handlers.confirm!('seller', 31, true); noMutations();
    download.resolve(response);
    await waitFor(() => expect(pageRender).toHaveBeenCalledOnce());
    expectLocked(panel); await handlers.confirm!('buyer', 31, true); noMutations();
    rendering.resolve();
    await panel.findByText(/PDF corrente visualizado/);
    expect(screen.getByAltText('versao-31.pdf - página 1')).toBeInTheDocument();
    expect(panel.getByRole('checkbox', { name: /Locador/ })).toBeEnabled();
    // Successful rendering alone never declares conference or confirms either side.
    for (const input of panel.getAllByRole('checkbox')) expect(input).not.toBeChecked();
    for (const button of panel.getAllByRole('button', { name: /Confirmar assinatura/ })) expect(button).toBeDisabled();
    noMutations();
  });
  it.each(['success', 'failure'] as const)('waits for the rendering result even when a progressive page is visible: %s', async (result) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const secondPage = deferred<void>();
    pageRender.mockReturnValueOnce({ promise: Promise.resolve() }).mockReturnValueOnce({ promise: secondPage.promise });
    pdfGetDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 2,
      getPage: async () => ({ getViewport: () => ({ width: 640, height: 900 }), render: pageRender,
        getTextContent: async () => ({ items: [] }), cleanup: vi.fn() }), destroy: async () => {},
    }) });
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await screen.findByAltText('versao-31.pdf - página 1');
    await waitFor(() => expect(pageRender).toHaveBeenCalledTimes(2));
    expectLocked(panel); await handlers.confirm!('seller', 31, true); noMutations();
    if (result === 'failure') {
      secondPage.reject(new Error('Second page failed'));
      await screen.findByText('Não foi possível carregar a visualização do documento.');
      expectLocked(panel);
    } else {
      secondPage.resolve(); await panel.findByText(/PDF corrente visualizado/);
      expect(screen.getByAltText('versao-31.pdf - página 2')).toBeInTheDocument();
      expect(panel.getByRole('checkbox', { name: /Locador/ })).toBeEnabled();
    }
    noMutations();
  });
  it.each(['download', 'parsing', 'rendering'] as const)('does not authorize after %s failure', async (failure) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    if (failure === 'download') clientGet.mockRejectedValueOnce(new Error('Download failed'));
    if (failure === 'parsing') pdfGetDocument.mockImplementationOnce(() => ({
      promise: Promise.reject(new Error('Invalid PDF')), destroy: async () => {},
    }));
    if (failure === 'rendering') pageRender.mockImplementationOnce(() => ({ promise: Promise.reject(new Error('Render failed')) }));
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await screen.findByText('Não foi possível carregar a visualização do documento.');
    expectLocked(panel); await handlers.confirm!('seller', 31, true); noMutations();
  });
  it.each(['image', 'empty pages', 'invalid bitmap'] as const)('does not authorize a resolved preview with %s', async (invalid) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    if (invalid === 'image') clientGet.mockResolvedValueOnce({ data: new Blob(['image'], { type: 'image/png' }), headers: { 'content-type': 'image/png' } });
    if (invalid === 'empty pages') pdfGetDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 0, destroy: async () => {} }) });
    if (invalid === 'invalid bitmap') vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValueOnce('data:,');
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce()); await tick();
    expectLocked(panel); await handlers.confirm!('seller', 31, true); noMutations();
  });
  it.each(['version', 'document', 'revision', 'missing document'] as const)(
    'invalidates proof and declarations when a query changes the %s', async (change) => {
      const item = confirmable(); loadDetail = async () => detail(item);
      const panel = within(await open()); await viewCurrent(panel);
      await fireEvent.click(panel.getByRole('checkbox', { name: /Locador/ }));
      const next = confirmable();
      if (change === 'version') next.signatures!.currentVersion!.id = 32;
      if (change === 'document') { next.signatures!.currentVersion!.documentId = 42; next.documents![0].id = 42; }
      if (change === 'revision') next.signatures!.currentVersion!.draftRevisionId = 12;
      if (change === 'missing document') next.documents = [];
      loadDetail = async () => detail(next);
      await refreshDetails(); await panel.findByText(/Versão #/);
      expectLocked(panel);
      for (const input of panel.queryAllByRole('checkbox')) expect(input).not.toBeChecked();
      await handlers.confirm!('seller', next.signatures!.currentVersion!.id, true); noMutations();
    },
  );
  it('keeps proof and an unused declaration after a same-PDF refresh and signature updates', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open()); await viewCurrent(panel);
    await fireEvent.click(panel.getByRole('checkbox', { name: /Locatário/ }));
    const refresh = deferred<Detail>(); loadDetail = () => refresh.promise;
    await refreshDetails(); expect(panel.queryByRole('checkbox')).not.toBeInTheDocument();
    await handlers.confirm!('buyer', 31, true); noMutations();
    const next = confirmable(); next.signatures!.seller = fixture().signatures!.seller;
    refresh.resolve(detail(next));
    await panel.findByText('Confirmada diretamente');
    expect(panel.getByRole('checkbox', { name: /Locatário/ })).toBeChecked();
    expect(panel.getByRole('button', { name: 'Confirmar assinatura (Locatário)' })).toBeEnabled();
    expect(panel.getByText(/PDF corrente visualizado/)).toBeInTheDocument(); noMutations();
  });
  it.each(['same PDF', 'another version'] as const)('reconciles rendering completed during detail reload: %s', async (context) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const rendering = deferred<void>(); pageRender.mockReturnValueOnce({ promise: rendering.promise });
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await waitFor(() => expect(pageRender).toHaveBeenCalledOnce());
    const refresh = deferred<Detail>(); loadDetail = () => refresh.promise;
    await refreshDetails();
    rendering.resolve(); await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce()); await tick();
    expect(panel.queryByRole('checkbox')).not.toBeInTheDocument();
    await handlers.confirm!('seller', 31, true); noMutations();
    const next = confirmable();
    if (context === 'another version') next.signatures!.currentVersion!.id = 32;
    refresh.resolve(detail(next));
    const checkbox = await panel.findByRole('checkbox', { name: /Locador/ });
    if (context === 'same PDF') {
      expect(checkbox).toBeEnabled(); expect(panel.getByText(/PDF corrente visualizado/)).toBeInTheDocument();
    } else expectLocked(panel);
    expect(checkbox).not.toBeChecked(); noMutations();
  });
  it('invalidates proof after a failed refresh, even when the next query returns the same PDF', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open()); await viewCurrent(panel);
    await fireEvent.click(panel.getByRole('checkbox', { name: /Locador/ }));
    loadDetail = async () => { throw new Error('Refresh failed'); };
    await refreshDetails(); await panel.findByRole('alert');
    loadDetail = async () => detail(confirmable());
    await refreshDetails(); await panel.findByRole('checkbox', { name: /Locador/ });
    expectLocked(panel); expect(panel.getByRole('checkbox', { name: /Locador/ })).not.toBeChecked();
    await handlers.confirm!('seller', 31, true); noMutations();
  });
  it('invalidates completed viewing and declarations as soon as a new attempt starts or fails', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const panel = within(await open()); await viewCurrent(panel);
    await fireEvent.click(panel.getByRole('checkbox', { name: /Locador/ }));
    const downloading = deferred<unknown>(); clientGet.mockReturnValueOnce(downloading.promise);
    await fireEvent.click(panel.getByRole('button', { name: 'Visualizar PDF corrente' }));
    expectLocked(panel); expect(panel.getByRole('checkbox', { name: /Locador/ })).not.toBeChecked();
    downloading.reject(new Error('New attempt failed'));
    await screen.findByText('Não foi possível carregar a visualização do documento.');
    expectLocked(panel); noMutations();
  });
  it('cancels pending viewing and ignores its late successful rendering', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const rendering = deferred<void>(); pageRender.mockReturnValueOnce({ promise: rendering.promise });
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await waitFor(() => expect(pageRender).toHaveBeenCalledOnce());
    const signal = clientGet.mock.calls[0][1].signal as AbortSignal;
    await fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização' }));
    expect(signal.aborted).toBe(true); expectLocked(panel);
    rendering.resolve();
    await waitFor(() => expect(pdfDestroy).toHaveBeenCalledOnce()); await tick();
    expectLocked(panel); await handlers.confirm!('seller', 31, true); noMutations();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it.each(['version', 'document', 'revision'] as const)('ignores a pending render completed after a %s change', async (change) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const rendering = deferred<void>(); pageRender.mockReturnValueOnce({ promise: rendering.promise });
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await waitFor(() => expect(pageRender).toHaveBeenCalledOnce());
    const next = confirmable();
    if (change === 'version') next.signatures!.currentVersion!.id = 32;
    if (change === 'document') { next.signatures!.currentVersion!.documentId = 42; next.documents![0].id = 42; }
    if (change === 'revision') next.signatures!.currentVersion!.draftRevisionId = 12;
    loadDetail = async () => detail(next); await refreshDetails(); await panel.findByText(/Versão #/);
    rendering.resolve(); await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce()); await tick();
    expectLocked(panel); await handlers.confirm!('seller', next.signatures!.currentVersion!.id, true); noMutations();
  });
  it('does not revive proof when an old render returns after the context changes away and back', async () => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const rendering = deferred<void>(); pageRender.mockReturnValueOnce({ promise: rendering.promise });
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await waitFor(() => expect(pageRender).toHaveBeenCalledOnce());
    const next = confirmable(); next.signatures!.currentVersion!.id = 32;
    loadDetail = async () => detail(next); await refreshDetails(); await panel.findByText(/Versão #32/);
    loadDetail = async () => detail(confirmable()); await refreshDetails(); await panel.findByText(/Versão #31/);
    rendering.resolve(); await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce()); await tick();
    expectLocked(panel); noMutations();
  });
  it.each(['old first', 'new first'] as const)('only the latest viewing attempt can grant proof: %s', async (order) => {
    const item = confirmable(); loadDetail = async () => detail(item);
    const old = deferred<void>(); const current = deferred<void>();
    pageRender.mockReturnValueOnce({ promise: old.promise }).mockReturnValueOnce({ promise: current.promise });
    const panel = within(await open());
    await fireEvent.click(await panel.findByRole('button', { name: 'Visualizar PDF corrente' }));
    await waitFor(() => expect(pageRender).toHaveBeenCalledOnce());
    // A second opening replaces/cancels the first, even if its underlying renderer hasn't stopped.
    await fireEvent.click(panel.getByRole('button', { name: 'Visualizar PDF corrente' }));
    await waitFor(() => expect(pageRender).toHaveBeenCalledTimes(2));
    expect((clientGet.mock.calls[0][1].signal as AbortSignal).aborted).toBe(true);
    if (order === 'old first') {
      old.resolve(); await waitFor(() => expect(pdfDestroy).toHaveBeenCalledOnce()); await tick(); expectLocked(panel);
      current.resolve(); await panel.findByText(/PDF corrente visualizado/);
    } else {
      current.resolve(); await panel.findByText(/PDF corrente visualizado/);
      old.reject(new Error('Obsolete rendering failed'));
      await waitFor(() => expect(pdfDestroy).toHaveBeenCalledTimes(2)); await tick();
    }
    await waitFor(() => expect(panel.getByRole('checkbox', { name: /Locador/ })).toBeEnabled());
    expect(screen.queryByText('Não foi possível carregar a visualização do documento.')).not.toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalledOnce(); noMutations();
  });
  it('invalidates local evidence on contract navigation even when version identifiers happen to match', async () => {
    const first = confirmable(); const second = confirmable(); second.id = 'contract-signatures-2';
    second.documents![0].metadata = { contractId: second.id };
    get.mockImplementation(async (url: string) => {
      if (url.includes('/admin/contracts?status=AWAITING_SIGNATURES')) return { data: [first, second], total: 2 };
      if (url === `/contracts/${first.id}`) return detail(first);
      if (url === `/contracts/${second.id}`) return detail(second);
      return { data: [], total: 0 };
    });
    const firstPanel = within(await open()); await viewCurrent(firstPanel);
    await fireEvent.click(firstPanel.getByRole('checkbox', { name: /Locador/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }));
    await fireEvent.click((await screen.findAllByRole('button', { name: 'Finalizar Venda/Locação' }))[1]);
    const panel = within(await screen.findByRole('region', { name: 'Assinaturas presenciais' }));
    await panel.findByText('PDF corrente: versao-31.pdf');
    expectLocked(panel); expect(panel.getByRole('checkbox', { name: /Locador/ })).not.toBeChecked();
    await handlers.confirm!('seller', 31, true); noMutations();
  });

});
