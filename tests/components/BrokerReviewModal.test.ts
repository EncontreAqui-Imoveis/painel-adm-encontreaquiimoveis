import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPutMock,
  apiPatchMock,
  apiPostMock,
  apiDeleteMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: apiPutMock,
    patch: apiPatchMock,
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

import BrokerReviewModal from '../../src/lib/components/BrokerReviewModal.svelte';

const broker = {
  id: 10,
  name: 'Broker Teste',
  email: 'broker@test.com',
  phone: '64999999999',
  creci: '12345',
  status: 'pending_verification',
  created_at: '2026-01-10T10:00:00.000Z',
};

describe('BrokerReviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue({
      data: {
        ...broker,
        street: 'Rua A',
        number: '10',
        complement: 'Sala 1',
        bairro: 'Centro',
        city: 'Rio Verde',
        state: 'GO',
        cep: '75900000',
      },
    });
    apiPutMock.mockResolvedValue({ message: 'ok' });
    apiPatchMock.mockResolvedValue({ message: 'ok', role: 'client' });
    apiPostMock.mockResolvedValue({ reauthToken: 'reauth-broker' });
    apiDeleteMock.mockResolvedValue({ message: 'ok' });
  });

  it('edits broker data from the modal currently used by the painel', async () => {
    render(BrokerReviewModal, { open: true, broker, showApprove: true });

    await screen.findByText('Revisar Corretor');
    await fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const dialog = screen.getByRole('dialog');
    const textboxes = within(dialog).getAllByRole('textbox');
    await fireEvent.input(textboxes[2], { target: { value: '64988887777' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/brokers/10',
        expect.objectContaining({
          phone: '64988887777',
          email: 'broker@test.com',
        }),
      );
    });
  });

  it('rejects broker through the unified status endpoint', async () => {
    render(BrokerReviewModal, { open: true, broker, showApprove: true });

    await screen.findByText('Revisar Corretor');
    await fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }));

    await waitFor(() => {
      expect(apiPatchMock).toHaveBeenCalledWith('/admin/brokers/10/status', {
        status: 'rejected',
      });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Corretor rebaixado para cliente.');
  });

  it('reads status response from nested data payload', async () => {
    apiPatchMock.mockResolvedValue({
      data: { status: 'rejected', role: 'client' },
    });
    render(BrokerReviewModal, { open: true, broker, showApprove: true });

    await screen.findByText('Revisar Corretor');
    await fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }));

    await waitFor(() => {
      expect(apiPatchMock).toHaveBeenCalledWith('/admin/brokers/10/status', {
        status: 'rejected',
      });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Corretor rebaixado para cliente.');
  });

  it('requires admin password before deleting a broker', async () => {
    render(BrokerReviewModal, { open: true, broker, showApprove: true });

    await screen.findByText('Revisar Corretor');
    await fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await fireEvent.input(screen.getByPlaceholderText('Digite sua senha atual'), {
      target: { value: 'secret-123' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Excluir corretor' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/reauth', {
        password: 'secret-123',
      });
    });

    expect(apiDeleteMock).toHaveBeenCalledWith('/admin/brokers/10', {
      headers: {
        'X-Admin-Reauth': 'reauth-broker',
      },
    });
  });
});
