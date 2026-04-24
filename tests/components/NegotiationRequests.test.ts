import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPutMock,
  apiDeleteMock,
  apiClientGetMock,
  apiClientPostMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  apiClientGetMock: vi.fn(),
  apiClientPostMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: apiPutMock,
    delete: apiDeleteMock,
  },
  apiClient: {
    get: apiClientGetMock,
    post: apiClientPostMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

import NegotiationRequests from '../../src/lib/components/NegotiationRequests.svelte';

describe('NegotiationRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe erro inline e retry quando falha ao carregar responsáveis, bloqueando aprovação', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/negotiations/requests/summary?')) {
        return {
          data: [
            {
              propertyId: 10,
              propertyCode: 'RV-010',
              propertyTitle: 'Casa em negociação',
              proposalCount: 1,
            },
          ],
          total: 1,
        };
      }

      if (endpoint.startsWith('/admin/negotiations/requests/property/10?')) {
        return {
          data: [
            {
              id: 'neg-10',
              status: 'PROPOSAL_SIGNED',
              internalStatus: 'PROPOSAL_SIGNED',
              propertyId: 10,
              propertyCode: 'RV-010',
              propertyTitle: 'Casa em negociação',
              brokerName: 'Corretor 1',
              clientName: 'Maria Compradora',
              value: 350000,
              signedDocumentId: 99,
              signedDocumentFileName: 'proposta.pdf',
            },
          ],
          total: 1,
        };
      }

      if (endpoint === '/admin/negotiations/neg-10/responsibles') {
        throw {
          response: {
            data: { message: 'Falha ao carregar responsáveis' },
          },
        };
      }

      return { data: [] };
    });

    render(NegotiationRequests);

    await fireEvent.click(await screen.findByRole('button', { name: 'Ver propostas' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Ver detalhes' }));

    expect((await screen.findAllByText('Falha ao carregar responsáveis')).length).toBeGreaterThan(0);

    const approveButton = await screen.findByRole('button', { name: 'Aprovar' });
    expect(approveButton).toBeDisabled();

    const retryButton = await screen.findByRole('button', { name: 'Tentar novamente' });
    expect(retryButton).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith('/admin/negotiations/neg-10/responsibles');

    await fireEvent.click(retryButton);

    await waitFor(() => {
      const responsibleCalls = apiGetMock.mock.calls.filter(
        ([endpoint]) => endpoint === '/admin/negotiations/neg-10/responsibles'
      );
      expect(responsibleCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
