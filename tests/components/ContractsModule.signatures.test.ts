import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { adminSession, getDefaultAdminCapabilities } from '$lib/sessionState';
import type { SignedReplacementDeclaration } from '../../src/lib/components/contracts/contractSignedReplacement';
import type { ContractItem, ContractSignatureStatus } from '../../src/lib/components/contracts/types';

const { get, post, put, patch, remove, clientPost, clientGet, pdfGetDocument, pageRender, pdfDestroy, handlers, toastError, toastSuccess } = vi.hoisted(() => ({
  clientGet: vi.fn(), pdfGetDocument: vi.fn(), pageRender: vi.fn(), pdfDestroy: vi.fn(),
  handlers: { confirm: null as null | ((side: 'seller' | 'buyer', version: number, checked: boolean) => Promise<void>),
    publish: null as null | (() => Promise<void>),
    replace: null as null | ((declaration: SignedReplacementDeclaration) => Promise<void>) },
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
vi.mock('../../src/lib/components/contracts/ContractSignedReplacementPanel.svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/components/contracts/ContractSignedReplacementPanel.svelte')>();
  return { ...actual, default: (anchor: unknown, props: { onSubmit: typeof handlers.replace }) => {
    handlers.replace = props.onSubmit;
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
    handlers.confirm = null; handlers.replace = null; handlers.publish = null;
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

  const pdfFile = () => new File(['%PDF-test'], 'nova-digitalizacao.pdf', { type: 'application/pdf' });
  const replacement = async (equivalent = false) => {
    const list = screen.getByText('Documentos para conferência').closest('div')!;
    await fireEvent.click(within(list).getByRole('button', { name: 'Substituir' }));
    const form = within(await screen.findByRole('region', { name: 'Substituição do PDF assinado' }));
    const input = document.querySelector('input[type="file"][accept="application/pdf,.pdf"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    await fireEvent.change(input, { target: { files: [pdfFile()] } });
    await fireEvent.input(form.getByRole('textbox'), { target: { value: 'Nova digitalização' } });
    await fireEvent.click(form.getByRole('radio', { name: equivalent ? /Declaro equivalência:/ : /sem equivalência/ }));
    return form;
  };
  const nextVersion = (previous: ContractItem, equivalent = false) => {
    const next = fixture(32); next.documents![0].downloadUrl = '/negotiations/neg-1/documents/42/download';
    next.documents!.unshift(...previous.documents!);
    next.signatures!.currentVersion!.previousVersionId = 31;
    next.signatures!.currentVersion!.replacementReason = 'Nova digitalização';
    for (const side of ['seller', 'buyer'] as const) next.signatures![side] = equivalent
      ? { ...fixture().signatures!.seller, status: 'PRESERVED', eventId: side === 'seller' ? 110 : 111,
        sourceEventId: side === 'seller' ? 91 : 92, preservation: { performedByAdminId: 7,
          performedAt: '2026-10-10T15:00:00Z', reason: 'Nova digitalização' } }
      : pending();
    return next;
  };
  it.each([true, false])('replaces the current PDF, preserves history and reloads authoritative equivalence=%s', async (equivalent) => {
    const initial = confirmable(); initial.signatures!.seller = fixture().signatures!.seller;
    initial.signatures!.buyer = { ...initial.signatures!.seller, eventId: 92 };
    loadDetail = async () => detail(initial);
    const panel = within(await open()); await viewCurrent(panel);
    const form = await replacement(equivalent);
    const next = nextVersion(initial, equivalent);
    clientPost.mockImplementation(async () => { loadDetail = async () => detail(next); return { data: { signedVersion: { id: 999 } } }; });
    await fireEvent.click(form.getByRole('button', { name: 'Substituir PDF assinado' }));
    expect(clientPost).toHaveBeenCalledOnce();
    const multipart = clientPost.mock.calls[0][1] as FormData;
    expect(clientPost.mock.calls[0][0]).toBe('/admin/contracts/contract-signatures-1/signed-docs');
    expect(multipart.get('replaceDocumentId')).toBe('41'); expect(multipart.get('replacementReason')).toBe('Nova digitalização');
    expect(multipart.get('equivalenceDeclared')).toBe(equivalent ? 'true' : null);
    expect(multipart.get('contractContentUnchanged')).toBe(equivalent ? null : 'true');
    await panel.findByText('PDF corrente: versao-32.pdf');
    expect(panel.getAllByText(equivalent ? 'Preservada por equivalência' : 'Pendente')).toHaveLength(2);
    expect(panel.queryByText(/PDF corrente visualizado/)).not.toBeInTheDocument();
    const list = within(screen.getByText('Documentos para conferência').closest('div')!);
    expect(list.getByText('Fora da versão corrente')).toBeInTheDocument();
    expect(list.getByText('PDF corrente')).toBeInTheDocument();
    expect(list.getAllByRole('button', { name: 'Substituir' })).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Substituição do PDF assinado' })).not.toBeInTheDocument();
    // Historical PDFs remain viewable, but the real viewer's replacement action must reject them.
    const historicalRow = list.getByText('Fora da versão corrente').parentElement!.parentElement!;
    await fireEvent.click(within(historicalRow).getByRole('button', { name: 'Visualizar' }));
    await screen.findByAltText('versao-31.pdf - página 1');
    await fireEvent.click(screen.getByRole('button', { name: 'Substituir documento' }));
    await fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Substituir documento' }));
    expect(screen.queryByRole('region', { name: 'Substituição do PDF assinado' })).not.toBeInTheDocument();
    expect(panel.getByText('PDF corrente: versao-32.pdf')).toBeInTheDocument();
    expect(clientPost).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização' }));
    if (!equivalent) {
      expectLocked(panel); await handlers.confirm!('seller', 32, true); expect(post).not.toHaveBeenCalled();
      await fireEvent.click(panel.getByRole('button', { name: 'Visualizar PDF corrente' }));
      await screen.findByAltText('versao-32.pdf - página 1'); await panel.findByText(/PDF corrente visualizado/);
      await fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização' }));
      await fireEvent.click(panel.getByRole('checkbox', { name: /Locador/ }));
      post.mockResolvedValue({ idempotent: false, signatures: next.signatures });
      await fireEvent.click(panel.getByRole('button', { name: 'Confirmar assinatura (Locador)' }));
      expect(post).toHaveBeenCalledWith('/admin/contracts/contract-signatures-1/signatures/seller/confirm', { signedVersionId: 32, signatureChecked: true });
    } else expect(post).not.toHaveBeenCalled();
  });
  it.each(['operational_assistant', 'document_operator'] as const)('allows only ordinary replacement for %s using actual permissions', async (role) => {
    adminSession.set({ role, capabilities: getDefaultAdminCapabilities(role) });
    const initial = confirmable(); loadDetail = async () => detail(initial);
    const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    const form = await replacement();
    expect(form.queryByRole('radio', { name: /Declaro equivalência:/ })).not.toBeInTheDocument();
    await handlers.replace!({ replacementReason: 'Bypass', equivalenceDeclared: true }); expect(clientPost).not.toHaveBeenCalled();
    clientPost.mockImplementation(async () => { loadDetail = async () => detail(nextVersion(initial)); return {}; });
    await fireEvent.click(form.getByRole('button', { name: 'Substituir PDF assinado' }));
    await panel.findByText('PDF corrente: versao-32.pdf');
    expect((clientPost.mock.calls[0][1] as FormData).get('contractContentUnchanged')).toBe('true');
    expect((clientPost.mock.calls[0][1] as FormData).get('equivalenceDeclared')).toBeNull();
  });
  it('denies replacement controls when the session has no replace permission', async () => {
    adminSession.set({ role: 'admin', capabilities: { ...getDefaultAdminCapabilities(), canReplaceDocuments: false } });
    loadDetail = async () => detail(confirmable()); const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    const list = within(screen.getByText('Documentos para conferência').closest('div')!);
    expect(list.queryByRole('button', { name: 'Substituir' })).not.toBeInTheDocument(); expect(clientPost).not.toHaveBeenCalled();
  });
  it.each(['contract', 'version', 'document', 'revision'] as const)('invalidates a replacement form on %s changes', async (change) => {
    const initial = confirmable(); loadDetail = async () => detail(initial);
    const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    await replacement(); const handler = handlers.replace!;
    const next = confirmable();
    if (change === 'contract') next.id = 'other-contract';
    if (change === 'version') next.signatures!.currentVersion!.id = 33;
    if (change === 'document') { next.signatures!.currentVersion!.documentId = 44; next.documents![0].id = 44; }
    if (change === 'revision') next.signatures!.currentVersion!.draftRevisionId = 12;
    loadDetail = async () => detail(next); await refreshDetails(); await panel.findByText(/Versão #/);
    expect(screen.queryByRole('region', { name: 'Substituição do PDF assinado' })).not.toBeInTheDocument();
    await handler({ replacementReason: 'stale', contractContentUnchanged: true }); expect(clientPost).not.toHaveBeenCalled();
  });
  it('shows a 409 once, reloads details and requires a fresh form and declarations', async () => {
    const initial = confirmable(); loadDetail = async () => detail(initial);
    const panel = within(await open()); await viewCurrent(panel); const form = await replacement(true);
    clientPost.mockImplementation(async () => {
      loadDetail = async () => detail(nextVersion(initial));
      throw { response: { status: 409, data: { code: 'CONTRACT_SIGNED_REPLACEMENT_STALE', error: 'O PDF corrente mudou. Revise os detalhes.' } } };
    });
    await fireEvent.click(form.getByRole('button', { name: 'Substituir PDF assinado' }));
    await panel.findByText('PDF corrente: versao-32.pdf'); expectLocked(panel);
    expect(toastError).toHaveBeenCalledExactlyOnceWith('O PDF corrente mudou. Revise os detalhes.');
    expect(screen.queryByRole('region', { name: 'Substituição do PDF assinado' })).not.toBeInTheDocument();
    await fireEvent.click(within(screen.getByText('Documentos para conferência').closest('div')!).getByRole('button', { name: 'Substituir' }));
    const retry = within(await screen.findByRole('region', { name: 'Substituição do PDF assinado' }));
    expect(retry.getByRole('textbox')).toHaveValue('');
    expect(retry.getAllByRole('radio').every((input) => !(input as HTMLInputElement).checked)).toBe(true);
    expect(retry.getByRole('button', { name: 'Substituir PDF assinado' })).toBeDisabled();
  });
  it('blocks duplicate submissions and ignores older detail responses after replacement', async () => {
    const initial = confirmable(); loadDetail = async () => detail(initial);
    const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    const form = await replacement(); const sent = deferred<unknown>(); clientPost.mockReturnValue(sent.promise);
    await fireEvent.click(form.getByRole('button', { name: 'Substituir PDF assinado' }));
    expect(form.getByRole('textbox')).toBeDisabled();
    await handlers.replace!({ replacementReason: 'Duplicate', contractContentUnchanged: true }); expect(clientPost).toHaveBeenCalledOnce();
    const old = deferred<Detail>(); loadDetail = () => old.promise; await refreshDetails();
    loadDetail = async () => detail(nextVersion(initial)); sent.resolve({});
    await panel.findByText('PDF corrente: versao-32.pdf');
    old.resolve(detail(initial)); await old.promise; await tick();
    expect(panel.getByText('PDF corrente: versao-32.pdf')).toBeInTheDocument(); expectLocked(panel);
    expect(clientPost).toHaveBeenCalledOnce();
  });
  it('blocks a content change and forced submission without declarations', async () => {
    loadDetail = async () => detail(confirmable()); const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    const form = await replacement();
    await fireEvent.click(form.getByRole('radio', { name: 'O conteúdo contratual mudou.' }));
    expect(form.getByRole('alert')).toHaveTextContent('nova revisão da minuta');
    expect(form.getByRole('button', { name: 'Substituir PDF assinado' })).toBeDisabled();
    await handlers.replace!({ replacementReason: 'Missing' } as SignedReplacementDeclaration);
    expect(clientPost).not.toHaveBeenCalled();
  });

  it('does not invent preservation for a pending side when the backend preserves only one confirmation', async () => {
    const initial = confirmable(); initial.signatures!.seller = fixture().signatures!.seller;
    loadDetail = async () => detail(initial);
    const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    const form = await replacement(true); const next = nextVersion(initial, true); next.signatures!.buyer = pending();
    clientPost.mockImplementation(async () => { loadDetail = async () => detail(next); return {}; });
    await fireEvent.click(form.getByRole('button', { name: 'Substituir PDF assinado' }));
    await panel.findByText('PDF corrente: versao-32.pdf');
    expect(panel.getByText('Preservada por equivalência')).toBeInTheDocument();
    expect(panel.getByText('Pendente')).toBeInTheDocument();
    expect(panel.getByRole('checkbox', { name: /Locatário/ })).toBeDisabled(); expect(post).not.toHaveBeenCalled();
  });
  it('uses the details error state without duplicating a conflict toast if reload fails', async () => {
    loadDetail = async () => detail(confirmable()); const panel = within(await open()); await panel.findByText('PDF corrente: versao-31.pdf');
    const form = await replacement();
    clientPost.mockImplementation(async () => {
      loadDetail = async () => { throw new Error('Refresh failed'); };
      throw { response: { status: 409, data: { error: 'O PDF corrente mudou.' } } };
    });
    await fireEvent.click(form.getByRole('button', { name: 'Substituir PDF assinado' }));
    expect(await panel.findByRole('alert')).toHaveTextContent('Não foi possível consultar');
    expect(toastError).toHaveBeenCalledExactlyOnceWith('O PDF corrente mudou.');
    expect(get).toHaveBeenCalledWith('/contracts/contract-signatures-1', { skipErrorToast: true });
    expect(get).toHaveBeenCalledWith('/admin/contracts/contract-signatures-1/document-rejections', { skipErrorToast: true });
    expect(clientPost.mock.calls[0][2]).toEqual({ skipErrorToast: true });
    expect(post).not.toHaveBeenCalled();
  });
  it('invalidates a lost-network replacement and reconciles a possible server success', async () => {
    const initial = confirmable(); loadDetail = async () => detail(initial);
    const panel = within(await open()); await viewCurrent(panel); const form = await replacement();
    clientPost.mockImplementation(async () => { loadDetail = async () => detail(nextVersion(initial)); throw new Error('Connection interrupted'); });
    await fireEvent.click(form.getByRole('button', { name: 'Substituir PDF assinado' }));
    await panel.findByText('PDF corrente: versao-32.pdf'); expectLocked(panel);
    expect(toastError).toHaveBeenCalledOnce(); expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Substituição do PDF assinado' })).not.toBeInTheDocument();
  });

  describe('new draft revision during signatures', () => {
    const initialDraft = () => {
      const item = confirmable();
      item.draftReview = { revisionId: 11, revisionNumber: 1, documentId: 20,
        buyerDecision: 'CONSENTED', sellerDecision: 'CONSENTED', allConsented: true };
      item.documents!.push({ id: 20, documentType: 'contrato_minuta', originalFileName: 'minuta-original.pdf',
        downloadUrl: '/draft/20', metadata: { contractId: item.id, isActiveContractDraft: true } });
      return item;
    };
    const review = (): ContractItem => {
      const item = initialDraft(); item.status = 'AWAITING_MINUTE_REVIEW';
      item.signatures = { currentVersion: null, seller: pending(), buyer: pending() };
      item.draftReview = { revisionId: 12, revisionNumber: 2, documentId: 50,
        buyerDecision: null, sellerDecision: null, allConsented: false };
      item.documents![1].metadata!.isActiveContractDraft = false;
      item.documents!.push({ id: 50, documentType: 'contrato_minuta', originalFileName: 'nova-minuta.pdf',
        downloadUrl: '/draft/50', metadata: { contractId: item.id, isActiveContractDraft: true } });
      return item;
    };
    const pdf = () => new File(['%PDF-1.4'], 'nova-minuta.pdf', { type: 'application/pdf' });
    const newForm = async () => {
      await fireEvent.click(await screen.findByRole('button', { name: 'Publicar nova revisão da minuta' }));
      const form = within(await screen.findByRole('region', { name: 'Nova revisão da minuta' }));
      const button = form.getByRole('button', { name: 'Publicar nova revisão' }) as HTMLButtonElement;
      // Bypass disabled at the DOM boundary to exercise the real parent guards.
      handlers.publish = async () => {
        const disabled = button.disabled; button.disabled = false;
        await fireEvent.click(button); await tick();
        if (disabled && button.isConnected) button.disabled = true;
      };
      return form;
    };
    const chooseAndConfirm = async () => {
      const form = await newForm();
      await fireEvent.change(form.getByLabelText('Novo PDF da minuta'), { target: { files: [pdf()] } });
      await fireEvent.click(form.getByRole('checkbox'));
      return form;
    };
    beforeEach(() => { loadDetail = async () => detail(initialDraft()); });

    it.each(['admin', 'operational_assistant'] as const)('allows %s with the actual workflow capability', async (role) => {
      adminSession.set({ role, capabilities: getDefaultAdminCapabilities(role) });
      await open();
      expect(await screen.findByRole('button', { name: 'Publicar nova revisão da minuta' })).toBeEnabled();
      const form = await newForm();
      expect(form.getByRole('checkbox')).not.toBeChecked();
      expect(form.getByText(/consentimentos e as confirmações de assinatura anteriores não serão reaproveitados/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Voltar para a etapa anterior' })).not.toBeInTheDocument();
      noMutations();
    });
    it('does not expose publication to a document operator or an admin without workflow capability', async () => {
      adminSession.set({ role: 'document_operator', capabilities: getDefaultAdminCapabilities('document_operator') });
      await open(); await screen.findByText('PDF corrente: versao-31.pdf');
      expect(screen.queryByRole('button', { name: 'Publicar nova revisão da minuta' })).not.toBeInTheDocument();
      adminSession.set({ role: 'admin', capabilities: { ...getDefaultAdminCapabilities(), canManageContractWorkflow: false } });
      await tick();
      expect(screen.queryByRole('button', { name: 'Publicar nova revisão da minuta' })).not.toBeInTheDocument(); noMutations();
    });
    it('blocks while details are loading or failed', async () => {
      const request = deferred<Detail>(); loadDetail = () => request.promise;
      await open();
      const button = screen.getByRole('button', { name: 'Publicar nova revisão da minuta' });
      expect(button).toBeDisabled(); await fireEvent.click(button);
      expect(screen.queryByRole('region', { name: 'Nova revisão da minuta' })).not.toBeInTheDocument();
      request.reject(new Error('details unavailable'));
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      expect(button).toBeDisabled(); noMutations();
    });
    it('requires a new PDF and explicit confirmation in the handler too', async () => {
      await open(); const form = await newForm();
      const button = form.getByRole('button', { name: 'Publicar nova revisão' });
      expect(button).toBeDisabled();
      await fireEvent.click(form.getByRole('checkbox'));
      await handlers.publish!(); expect(clientPost).not.toHaveBeenCalled();
      await fireEvent.change(form.getByLabelText('Novo PDF da minuta'), { target: { files: [pdf()] } });
      expect(form.getByRole('checkbox')).not.toBeChecked();
      await handlers.publish!(); expect(clientPost).not.toHaveBeenCalled();
      await fireEvent.click(form.getByRole('checkbox')); expect(button).toBeEnabled();
    });
    it.each(['image', 'empty', 'octet-stream'])('rejects an incompatible PDF before any request (%s)', async (kind) => {
      const file = kind === 'image' ? new File(['image'], 'imagem.png', { type: 'image/png' })
        : new File(kind === 'empty' ? [] : ['pdf'], 'minuta.pdf', { type: kind === 'empty' ? 'application/pdf' : 'application/octet-stream' });
      await open(); const form = await newForm();
      await fireEvent.change(form.getByLabelText('Novo PDF da minuta'), { target: { files: [file] } });
      await fireEvent.click(form.getByRole('checkbox')); await handlers.publish!();
      expect(clientPost).not.toHaveBeenCalled(); expect(toastError).toHaveBeenCalled();
      expect(form.getByRole('button', { name: 'Publicar nova revisão' })).toBeDisabled();
    });
    it('publishes the real multipart and renders only the authoritative new revision, preserving history', async () => {
      await open(); const form = await chooseAndConfirm();
      const response = deferred<unknown>(); clientPost.mockReturnValue(response.promise);
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      const multipart = clientPost.mock.calls[0][1] as FormData;
      expect(clientPost).toHaveBeenCalledExactlyOnceWith('/admin/contracts/contract-signatures-1/draft',
        expect.any(FormData), { skipErrorToast: true });
      expect([...multipart.keys()]).toEqual(['file']); expect((multipart.get('file') as File).name).toBe('nova-minuta.pdf');
      expect(screen.queryByText('Revisão ativa #12')).not.toBeInTheDocument();
      loadDetail = async () => detail(review()); response.resolve({ contract: { status: 'IGNORED' } });
      await screen.findByRole('heading', { name: 'Revisão da Minuta' });
      expect(screen.getByText('Revisão ativa #12')).toBeInTheDocument();
      expect(screen.getByText('Locatário: Aguardando')).toBeInTheDocument();
      expect(screen.getByText('Locador: Aguardando')).toBeInTheDocument();
      expect(screen.queryByText(/De acordo/)).not.toBeInTheDocument();
      expect(screen.getAllByText('nova-minuta.pdf').length).toBeGreaterThan(0);
      expect(screen.getByText('minuta-original.pdf')).toBeInTheDocument();
      expect(screen.getByText('versao-31.pdf')).toBeInTheDocument();
      expect(screen.getByText('PDF assinado histórico — sem validade para a revisão ativa')).toBeInTheDocument();
      expect(screen.getByText('Minuta histórica')).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Assinaturas presenciais' })).not.toBeInTheDocument();
      expect(screen.queryByText('PDF corrente: versao-31.pdf')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Confirmar assinatura/ })).not.toBeInTheDocument();
      expect(post).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled(); expect(patch).not.toHaveBeenCalled();
      expect(get).toHaveBeenCalledWith('/contracts/contract-signatures-1', { skipErrorToast: true });
    });
    it.each([409, 422, 500])('reconciles error %s once, clears the form and never retries automatically', async (status) => {
      await open(); const form = await chooseAndConfirm();
      clientPost.mockRejectedValue({ response: { status, data: { error: 'Revise a revisão corrente.' } } });
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Nova revisão da minuta' })).not.toBeInTheDocument());
      await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar nova revisão da minuta' })).toBeEnabled());
      expect(clientPost).toHaveBeenCalledTimes(1); expect(toastError).toHaveBeenCalledExactlyOnceWith('Revise a revisão corrente.');
      expect(get).toHaveBeenCalledWith('/contracts/contract-signatures-1', { skipErrorToast: true });
      const retry = await newForm(); expect(retry.getByRole('checkbox')).not.toBeChecked();
      expect((retry.getByLabelText('Novo PDF da minuta') as HTMLInputElement).value).toBe('');
    });
    it('reconciles a lost response with a successful server publication', async () => {
      await open(); const form = await chooseAndConfirm();
      clientPost.mockImplementation(async () => { loadDetail = async () => detail(review()); throw new Error('network lost'); });
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      await screen.findByText('Revisão ativa #12'); expect(toastError).toHaveBeenCalledOnce();
      expect(toastSuccess).not.toHaveBeenCalled(); expect(clientPost).toHaveBeenCalledOnce();
    });
    it('uses the existing details error state when reconciliation fails, without duplicate toasts', async () => {
      await open(); const form = await chooseAndConfirm();
      clientPost.mockImplementation(async () => {
        loadDetail = async () => { throw new Error('refresh failed'); };
        throw { response: { status: 409, data: { error: 'Estado desatualizado.' } } };
      });
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      await screen.findByRole('alert');
      expect(screen.getByRole('button', { name: 'Publicar nova revisão da minuta' })).toBeDisabled();
      expect(toastError).toHaveBeenCalledExactlyOnceWith('Estado desatualizado.');
    });
    it('prevents duplicate handler submissions and does not allow modal closing during submission', async () => {
      await open(); const form = await chooseAndConfirm(); const request = deferred<unknown>(); clientPost.mockReturnValue(request.promise);
      const first = handlers.publish!(); await handlers.publish!();
      expect(clientPost).toHaveBeenCalledOnce();
      await fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }));
      expect(form.getByRole('button', { name: 'Publicando…' })).toBeDisabled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      request.resolve({}); await first;
      await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar nova revisão da minuta' })).toBeEnabled());
    });
    it.each(['revision', 'version', 'document'] as const)('invalidates a selected form when the %s changes', async (field) => {
      await open(); await chooseAndConfirm(); const handler = handlers.publish!;
      const next = initialDraft();
      if (field === 'revision') next.draftReview!.revisionId = 12;
      if (field === 'version') next.signatures!.currentVersion!.id = 32;
      if (field === 'document') next.draftReview!.documentId = 51;
      loadDetail = async () => detail(next);
      await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Nova revisão da minuta' })).not.toBeInTheDocument());
      await handler(); expect(clientPost).not.toHaveBeenCalled();
      const fresh = await newForm(); expect(fresh.getByRole('checkbox')).not.toBeChecked();
      expect(fresh.getByRole('button', { name: 'Publicar nova revisão' })).toBeDisabled();
    });
    it('retains the same-PDF form across a compatible refresh but blocks its handler while loading', async () => {
      await open(); const form = await chooseAndConfirm(); const request = deferred<Detail>(); loadDetail = () => request.promise;
      await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
      await handlers.publish!(); expect(clientPost).not.toHaveBeenCalled();
      expect(form.getByRole('button', { name: 'Publicar nova revisão' })).toBeDisabled();
      request.resolve(detail(initialDraft()));
      await waitFor(() => expect(form.getByRole('button', { name: 'Publicar nova revisão' })).toBeEnabled());
      expect(form.getByRole('checkbox')).toBeChecked();
    });
    it('rejects the captured handler if the administrative permission is withdrawn', async () => {
      await open(); await chooseAndConfirm();
      adminSession.set({ role: 'document_operator', capabilities: getDefaultAdminCapabilities('document_operator') }); await tick();
      await handlers.publish!(); expect(clientPost).not.toHaveBeenCalled();
    });
    it('invalidates the previously rendered signature evidence even when publication fails', async () => {
      const panel = within(await open()); await viewCurrent(panel);
      const form = await chooseAndConfirm(); clientPost.mockRejectedValue(new Error('failed'));
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      const current = within(await screen.findByRole('region', { name: 'Assinaturas presenciais' }));
      await current.findByText('PDF corrente: versao-31.pdf'); expectLocked(current);
      expect(current.queryByText(/PDF corrente visualizado/)).not.toBeInTheDocument();
      await viewCurrent(current); expect(current.getByRole('checkbox', { name: /Locador/ })).toBeEnabled();
      expect(post).not.toHaveBeenCalled();
    });
    it('does not let late publication or reconciliation responses overwrite a newer revision', async () => {
      await open(); const form = await chooseAndConfirm(); const upload = deferred<unknown>(); clientPost.mockReturnValue(upload.promise);
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      loadDetail = async () => detail(review());
      await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
      await screen.findByText('Revisão ativa #12');
      const reads = get.mock.calls.filter(([url]) => url === '/contracts/contract-signatures-1').length;
      upload.resolve({ contract: initialDraft() }); await upload.promise; await tick();
      await waitFor(() => expect(get.mock.calls.filter(([url]) => url === '/contracts/contract-signatures-1')).toHaveLength(reads + 1));
      expect(screen.getByText('Revisão ativa #12')).toBeInTheDocument();
      expect(toastSuccess).not.toHaveBeenCalled();
    });
    it('ignores the old POST response but reconciles the server after reopening the same contract', async () => {
      await open(); const form = await chooseAndConfirm(); const upload = deferred<unknown>(); clientPost.mockReturnValue(upload.promise);
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
      await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
      await fireEvent.click((await screen.findAllByRole('button', { name: 'Finalizar Venda/Locação' }))[0]);
      await screen.findByText(/Publicação em andamento/);
      const reads = get.mock.calls.filter(([url]) => url === '/contracts/contract-signatures-1').length;
      loadDetail = async () => detail(review());
      upload.resolve({ contract: initialDraft() }); await upload.promise;
      await screen.findByText('Revisão ativa #12');
      expect(screen.queryByText('PDF corrente: versao-31.pdf')).not.toBeInTheDocument();
      expect(toastSuccess).not.toHaveBeenCalled();
      expect(get.mock.calls.filter(([url]) => url === '/contracts/contract-signatures-1')).toHaveLength(reads + 1);
      expect(screen.getByText('Revisão ativa #12')).toBeInTheDocument();
    });
    it('never applies a late result or starts its reconciliation against a different contract', async () => {
      await open(); const form = await chooseAndConfirm(); const upload = deferred<unknown>(); clientPost.mockReturnValue(upload.promise);
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
      const other = initialDraft(); other.id = 'contract-other'; other.propertyTitle = 'Outro imóvel';
      other.documents!.forEach((doc) => { doc.metadata!.contractId = other.id; });
      get.mockImplementation(async (url: string) => {
        if (url.includes('/admin/contracts?status=AWAITING_SIGNATURES')) return { data: [other], total: 1 };
        if (url === '/contracts/contract-other') return detail(other);
        return { data: [], total: 0 };
      });
      await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
      await screen.findAllByText('Outro imóvel');
      await fireEvent.click((await screen.findAllByRole('button', { name: 'Finalizar Venda/Locação' }))[0]);
      await screen.findByText(/Publicação em andamento/);
      const reads = get.mock.calls.filter(([url]) => url === '/contracts/contract-other').length;
      upload.resolve({ contract: review() }); await upload.promise;
      await screen.findByText('PDF corrente: versao-31.pdf');
      expect(get.mock.calls.filter(([url]) => url === '/contracts/contract-other')).toHaveLength(reads);
      expect(screen.queryByText('Revisão ativa #12')).not.toBeInTheDocument();
      expect(toastSuccess).not.toHaveBeenCalled();
    });
    it('does not let an old reconciliation response overwrite a more recent details query', async () => {
      await open(); const form = await chooseAndConfirm(); const old = deferred<Detail>();
      clientPost.mockImplementation(async () => { loadDetail = () => old.promise; return {}; });
      await fireEvent.click(form.getByRole('button', { name: 'Publicar nova revisão' }));
      await waitFor(() => expect(get.mock.calls.filter(([url]) => url === '/contracts/contract-signatures-1')).toHaveLength(2));
      const next = review(); next.draftReview!.revisionId = 13;
      loadDetail = async () => detail(next);
      await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atualizar' }));
      await screen.findByText('Revisão ativa #13');
      old.resolve(detail(review())); await old.promise; await tick();
      expect(screen.getByText('Revisão ativa #13')).toBeInTheDocument();
      expect(screen.queryByText('Revisão ativa #12')).not.toBeInTheDocument();
    });
    it('invalidates form selections on a contract switch and ignores the old handler', async () => {
      await open(); await chooseAndConfirm(); const handler = handlers.publish!;
      await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
      await handler(); expect(clientPost).not.toHaveBeenCalled();
      await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
      await fireEvent.click((await screen.findAllByRole('button', { name: 'Finalizar Venda/Locação' }))[0]);
      await screen.findByText('PDF corrente: versao-31.pdf');
      const form = await newForm(); expect(form.getByRole('checkbox')).not.toBeChecked();
      expect(form.getByRole('button', { name: 'Publicar nova revisão' })).toBeDisabled();
    });
  });

});
