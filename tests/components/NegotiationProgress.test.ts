import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPutMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: apiPutMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

import NegotiationProgress from '../../src/lib/components/NegotiationProgress.svelte';

describe('NegotiationProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/negotiations?')) {
        return {
          data: [
            {
              id: 'neg-10',
              status: 'APPROVED',
              propertyId: 10,
              propertyCode: 'RV-010',
              propertyTitle: 'Casa em negociação',
              propertyAddress: 'Rua A, Centro',
              propertyImageUrl: 'https://example.com/casa.jpg',
              brokerName: 'Corretor 1',
              clientName: 'Maria Compradora',
              value: 350000,
              approvedAt: '2026-03-03T10:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint === '/admin/properties/10') {
        return {
          id: 10,
          code: 'RV-010',
          title: 'Casa em negociação',
          type: 'Casa',
          purpose: 'Venda',
          status: 'negociacao',
          city: 'Rio Verde',
          state: 'GO',
          bairro: 'Centro',
          address: 'Rua A',
          numero: '10',
          broker_name: 'Corretor 1',
          broker_phone: '(64)99999-9999',
          owner_name: 'Proprietário 1',
          owner_phone: '(64)98888-8888',
          price_sale: 350000,
          updated_at: '2026-03-03T10:00:00.000Z',
          property_image_url: 'https://example.com/casa.jpg',
        };
      }

      throw new Error(`Endpoint não esperado no teste: ${endpoint}`);
    });
  });

  it('exibe foto na tabela e permite revisar detalhes do imóvel', async () => {
    render(NegotiationProgress);

    expect(await screen.findByText('Usuário')).toBeInTheDocument();
    expect((await screen.findAllByText('Casa em negociação')).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Casa em negociação' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Revisar imóvel em negociação' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Corretor 1')).toBeInTheDocument();
    expect(within(dialog).getByText(/Rua A/)).toBeInTheDocument();
  });
});
