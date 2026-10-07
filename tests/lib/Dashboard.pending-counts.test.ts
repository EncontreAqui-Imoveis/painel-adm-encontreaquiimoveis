import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authToken } from '../../src/lib/store';
import { adminSession, getDefaultAdminCapabilities } from '../../src/lib/sessionState';

const { fetchResponseMock, apiGetMock, apiPostMock, apiClientPostMock } = vi.hoisted(() => ({
  fetchResponseMock: vi.fn(), apiGetMock: vi.fn(), apiPostMock: vi.fn(), apiClientPostMock: vi.fn(),
}));
vi.mock('../../src/lib/adminFetchService', () => ({ fetchPlatformResponse: fetchResponseMock }));
vi.mock('$lib/apiClient', () => ({
  api: { get: apiGetMock, post: apiPostMock },
  apiClient: { post: apiClientPostMock },
}));
vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Dashboard from '../../src/lib/Dashboard.svelte';

describe('Dashboard contract correction count', () => {
  const endpoint = '/admin/contracts/draft-review-requests/pending-count';
  let contractTotal: number;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    authToken.set('admin-token');
    adminSession.set({ role: 'admin', capabilities: getDefaultAdminCapabilities() });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    contractTotal = 3;
    fetchResponseMock.mockImplementation(async (path: string) => {
      const total = path === endpoint ? contractTotal
        : path.includes('pending_approval') ? 1
        : path.includes('property-edit-requests') ? 2
        : path.includes('pending_verification') ? 4
        : path.includes('PROPOSAL_SIGNED') ? 5 : 0;
      return new Response(JSON.stringify({ total, data: [] }), { status: 200 });
    });
    apiGetMock.mockResolvedValue({ data: [], total: 0 });
  });

  afterEach(() => vi.restoreAllMocks());

  async function mountVerification() {
    const rendered = render(Dashboard, { initialView: 'verification' });
    await waitFor(() => expect(fetchResponseMock).toHaveBeenCalledWith(endpoint));
    await fireEvent.click(screen.getByRole('button', { name: 'Negociações' }));
    return rendered;
  }

  function contractButton() {
    return screen.getByRole('button', { name: /^Contratos/ });
  }

  it('fetches the endpoint and passes its count to the sidebar', async () => {
    await mountVerification();
    await waitFor(() => expect(within(contractButton()).getByText('3')).toHaveClass('bg-red-500'));
    expect(fetchResponseMock.mock.calls.filter(([path]) => path === endpoint)).toHaveLength(1);
  });

  it('hides the badge for zero', async () => {
    contractTotal = 0;
    await mountVerification();
    expect(contractButton().querySelector('.bg-red-500')).toBeNull();
  });

  it.each(['403', '500', 'network'])('isolates %s failure and preserves other counts', async (failure) => {
    const normalFetch = fetchResponseMock.getMockImplementation()!;
    fetchResponseMock.mockImplementation((path: string) => {
      if (path === endpoint) {
        return failure === 'network' ? Promise.reject(new Error('offline'))
          : Promise.resolve(new Response(null, { status: Number(failure) }));
      }
      return normalFetch(path);
    });
    await mountVerification();
    expect(contractButton().querySelector('.bg-red-500')).toBeNull();
    await waitFor(() => expect(within(screen.getByRole('button', { name: /^Solicitações de Corretores/ })).getByText('4')).toBeInTheDocument());
    expect(within(screen.getByRole('button', { name: /^Solicitações \(Imóveis\)/ })).getByText('3')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /^Solicitação de Propostas/ })).getByText('5')).toBeInTheDocument();
  });

  it.each([500, 403])('polls every 60 seconds; status %s preserves or clears only the contract badge', async (status) => {
    const intervalSpy = vi.spyOn(globalThis, 'setInterval');
    await mountVerification();
    await waitFor(() => expect(within(contractButton()).getByText('3')).toBeInTheDocument());
    await waitFor(() => expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000));
    const callback = intervalSpy.mock.calls.find(([, delay]) => delay === 60_000)![0] as () => void;
    const normalFetch = fetchResponseMock.getMockImplementation()!;
    fetchResponseMock.mockImplementation((path: string) => path === endpoint
      ? Promise.resolve(new Response(null, { status })) : normalFetch(path));
    callback();
    await waitFor(() => expect(fetchResponseMock.mock.calls.filter(([path]) => path === endpoint)).toHaveLength(2));
    if (status === 403) {
      await waitFor(() => expect(contractButton().querySelector('.bg-red-500')).toBeNull());
    } else {
      expect(within(contractButton()).getByText('3')).toBeInTheDocument();
    }
    expect(within(screen.getByRole('button', { name: /^Solicitação de Propostas/ })).getByText('5')).toBeInTheDocument();
  });

  it.each(['keep', 'replace'])('refreshes immediately once after successful %s', async (action) => {
    const pendingContract = {
      id: 'contract-1', status: 'AWAITING_MINUTE_REVIEW', negotiationId: 'neg-1',
      propertyId: 618, propertyTitle: 'Casa', dealType: 'sale', propertyPurpose: 'Venda',
      documents: [{ id: 6181, documentType: 'contrato_minuta', originalFileName: 'minuta.pdf', metadata: { contractId: 'contract-1' } }],
      draftReview: { sellerChangeRequest: { id: 912, reviewerSide: 'seller', reason: 'Corrigir prazo', pendingResolution: true } },
    };
    apiGetMock.mockImplementation(async (path: string) => path === '/contracts/contract-1'
      ? { data: { contract: pendingContract, documents: pendingContract.documents } }
      : path.includes('status=AWAITING_MINUTE_REVIEW') ? { data: [pendingContract], total: 1 }
      : { data: [], total: 0 });
    const resolveAction = async () => { contractTotal = 0; return { data: {} }; };
    apiPostMock.mockImplementation(resolveAction);
    apiClientPostMock.mockImplementation(resolveAction);
    render(Dashboard, { initialView: 'negotiation_contracts' });
    await waitFor(() => expect(within(contractButton()).getByText('3')).toBeInTheDocument());
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferir Minuta' }));
    if (action === 'keep') {
      await fireEvent.click(screen.getByRole('button', { name: 'Manter minuta' }));
      await fireEvent.input(screen.getByLabelText('Motivo da administração'), { target: { value: 'Minuta correta' } });
      await fireEvent.click(screen.getAllByRole('button', { name: 'Manter minuta' }).at(-1)!);
    } else {
      await fireEvent.click(screen.getByRole('button', { name: 'Substituir minuta' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Continuar e selecionar arquivo' }));
      await fireEvent.change(document.querySelector('#draft-pdf')!, {
        target: { files: [new File(['%PDF-1.4%'], 'nova.pdf', { type: 'application/pdf' })] },
      });
    }
    await waitFor(() => expect(contractButton().querySelector('.bg-red-500')).toBeNull());
    expect(fetchResponseMock.mock.calls.filter(([path]) => path === endpoint)).toHaveLength(2);
    expect(action === 'keep' ? apiPostMock : apiClientPostMock).toHaveBeenCalledTimes(1);
  });
});
