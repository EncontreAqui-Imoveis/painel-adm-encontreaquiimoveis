import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
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

import PropertyArchive from '../../src/lib/components/PropertyArchive.svelte';

describe('PropertyArchive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/properties/archive')) {
        return {
          data: [
            {
              id: 10,
              code: 'RV-010',
              title: 'Casa Vendida',
              brokerName: 'Corretor 1',
              status: 'sold',
              transactionDate: '2026-03-01T10:00:00.000Z',
            },
            {
              id: 11,
              code: 'RV-011',
              title: 'Apartamento Alugado',
              brokerName: 'Corretor 2',
              status: 'rented',
              transactionDate: '2026-03-02T10:00:00.000Z',
            },
          ],
          total: 2,
        };
      }

      if (endpoint === '/admin/users?page=1&limit=200&includeBrokers=true') {
        return {
          data: [
            {
              id: 101,
              name: 'João Teste',
              email: 'joao.teste@example.com',
              role: 'broker',
            },
          ],
        };
      }

      if (endpoint === '/admin/properties/10') {
        return {
          id: 10,
          code: 'RV-010',
          title: 'Casa Vendida',
          type: 'Casa',
          purpose: 'Venda',
          status: 'sold',
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
        };
      }

      throw new Error(`Endpoint não esperado no teste: ${endpoint}`);
    });
  });

  it('remove os filtros Vendidos e Alugados do cabeçalho', async () => {
    render(PropertyArchive);

    expect(await screen.findByText('Casa Vendida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vendidos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alugados' })).not.toBeInTheDocument();
  });

  it('exibe ações visíveis e permite revisar imóvel finalizado', async () => {
    render(PropertyArchive);

    expect((await screen.findAllByText('Casa Vendida')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Revisar' }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Voltar para Disponível' }).length
    ).toBeGreaterThan(0);

    await fireEvent.click(screen.getAllByRole('button', { name: 'Revisar' })[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Revisar imóvel finalizado' });
    expect(dialog).toBeInTheDocument();
    expect(await within(dialog).findByText(/Rua A/)).toBeInTheDocument();
    expect(within(dialog).getByText('Corretor 1')).toBeInTheDocument();
  });

  it('permite voltar imóvel alugado para disponível', async () => {
    apiPutMock.mockResolvedValue({});

    render(PropertyArchive);

    await screen.findAllByText('Apartamento Alugado');
    const relistButtons = screen.getAllByRole('button', { name: 'Voltar para Disponível' });
    await fireEvent.click(relistButtons[relistButtons.length - 1]);
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/admin/properties/11/relist', {});
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Imóvel disponibilizado novamente com sucesso.'
    );
  });
});
