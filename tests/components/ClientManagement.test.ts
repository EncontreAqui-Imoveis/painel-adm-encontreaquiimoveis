import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPutMock,
  apiPostMock,
  apiDeleteMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: apiPutMock,
    post: apiPostMock,
    delete: apiDeleteMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

import ClientManagement from '../../src/lib/components/ClientManagement.svelte';

describe('ClientManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiPutMock.mockResolvedValue({ message: 'ok' });
    apiPostMock.mockResolvedValue({ reauthToken: 'reauth-123' });
    apiDeleteMock.mockResolvedValue({ message: 'ok' });
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/users?')) {
        return {
          data: [
            {
              id: 7,
              name: 'Cliente Teste',
              email: 'cliente@test.com',
              phone: '64999999999',
              created_at: '2026-01-10T10:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint === '/admin/clients/7') {
        return {
          data: {
            id: 7,
            name: 'Cliente Teste',
            email: 'cliente@test.com',
            phone: '64999999999',
            street: 'Rua A',
            number: '10',
            complement: 'Apto 2',
            bairro: 'Centro',
            city: 'Rio Verde',
            state: 'GO',
            cep: '75900000',
            created_at: '2026-01-10T10:00:00.000Z',
          },
        };
      }

      if (endpoint === '/admin/clients/7/properties') {
        return { data: [] };
      }

      return { data: [] };
    });
  });

  it('edits a client using the active modal flow', async () => {
    render(ClientManagement);

    await screen.findByText('Cliente Teste');
    await fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));

    await screen.findByText('Revisar Cliente');
    await fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const dialogs = screen.getAllByRole('dialog');
    const reviewDialog = dialogs[0];
    const textboxes = within(reviewDialog).getAllByRole('textbox');
    await fireEvent.input(textboxes[0], { target: { value: 'Cliente Atualizado' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/clients/7',
        expect.objectContaining({
          name: 'Cliente Atualizado',
          email: 'cliente@test.com',
        }),
      );
    });
  });

  it('requires admin password before deleting a client', async () => {
    render(ClientManagement);

    await screen.findByText('Cliente Teste');
    await fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));
    await screen.findByText('Revisar Cliente');

    await fireEvent.click(screen.getByRole('button', { name: 'Excluir cliente' }));
    await fireEvent.input(screen.getByPlaceholderText('Digite sua senha atual'), {
      target: { value: 'secret-123' },
    });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Excluir cliente' })[1]);

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/reauth', {
        password: 'secret-123',
      });
    });

    expect(apiDeleteMock).toHaveBeenCalledWith('/admin/clients/7', {
      headers: {
        'X-Admin-Reauth': 'reauth-123',
      },
    });
  });
});
