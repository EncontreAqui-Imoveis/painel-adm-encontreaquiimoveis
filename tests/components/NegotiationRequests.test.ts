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
              created_at: '2026-06-10T13:00:00.000Z',
              topProposal: {
                negotiationId: 'neg-10',
                value: 350000,
                clientName: 'Maria Compradora',
                created_at: '2026-06-10T13:05:00.000Z',
              },
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
              created_at: '2026-06-10T13:05:00.000Z',
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

    expect(await screen.findByText('Criado em')).toBeInTheDocument();
    expect(await screen.findByText('10/06/2026')).toBeInTheDocument();

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

  it('esconde o botão de excluir PDF quando a proposta ainda não tem PDF assinado', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/negotiations/requests/summary?')) {
        return {
          data: [
            {
              propertyId: 11,
              propertyCode: 'RV-011',
              propertyTitle: 'Casa sem PDF',
              proposalCount: 1,
              created_at: '2026-06-11T13:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint.startsWith('/admin/negotiations/requests/property/11?')) {
        return {
          data: [
            {
              id: 'neg-11',
              status: 'PROPOSAL_UNSIGNED',
              internalStatus: 'PROPOSAL_UNSIGNED',
              propertyId: 11,
              propertyCode: 'RV-011',
              propertyTitle: 'Casa sem PDF',
              brokerName: 'Corretor 2',
              clientName: 'João Comprador',
              value: 250000,
              created_at: '2026-06-11T13:05:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint === '/admin/negotiations/neg-11/responsibles') {
        return { data: [] };
      }

      return { data: [] };
    });

    render(NegotiationRequests);

    await fireEvent.click(await screen.findByRole('button', { name: 'Ver propostas' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Ver detalhes' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Excluir PDF' })).not.toBeInTheDocument();
    });
  });

  it('abre a edição para proposta não assinada e mostra imagem nos resultados da criação', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/negotiations/requests/summary?')) {
        return {
          data: [
            {
              propertyId: 12,
              propertyCode: 'RV-012',
              propertyTitle: 'Casa editável',
              proposalCount: 1,
              created_at: '2026-06-12T13:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint.startsWith('/admin/negotiations/requests/property/12?')) {
        return {
          data: [
            {
              id: 'neg-12',
              status: 'PROPOSAL_UNSIGNED',
              internalStatus: 'PROPOSAL_UNSIGNED',
              propertyId: 12,
              propertyCode: 'RV-012',
              propertyTitle: 'Casa editável',
              brokerName: 'Corretor 3',
              clientName: 'João Cliente',
              clientCpf: '52998224725',
              value: 420000,
              created_at: '2026-06-12T13:05:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint === '/admin/negotiations/neg-12/responsibles') {
        return { data: [] };
      }

      if (endpoint.startsWith('/admin/properties-with-brokers?')) {
        return {
          data: [
            {
              id: 120,
              code: 'IM-120',
              title: 'Apartamento com imagem',
              price: 120000,
              propertyImageUrl: 'https://example.com/imovel.jpg',
            },
          ],
        };
      }

      return { data: [] };
    });

    render(NegotiationRequests);

    await fireEvent.click(await screen.findByRole('button', { name: 'Ver propostas' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Ver detalhes' }));

    expect(await screen.findByRole('button', { name: 'Editar Proposta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar minuta' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Editar Proposta' }));
    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Proposta' })).not.toBeInTheDocument();
  });

  it('mostra imagem nos resultados da busca de imóvel para gerar proposta', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/negotiations/requests/summary?')) {
        return { data: [], total: 0 };
      }

      if (endpoint.startsWith('/admin/properties-with-brokers?')) {
        return {
          data: [
            {
              id: 120,
              code: 'IM-120',
              title: 'Apartamento com imagem',
              price: 120000,
              propertyImageUrl: 'https://example.com/imovel.jpg',
            },
          ],
        };
      }

      return { data: [] };
    });

    render(NegotiationRequests);

    await fireEvent.click(await screen.findByRole('button', { name: 'Criar proposta' }));
    const searchInput = await screen.findByLabelText('Buscar imóvel por código ou nome');
    await fireEvent.input(searchInput, { target: { value: 'apartamento' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByAltText('Apartamento com imagem')).toBeInTheDocument();
  });
});
