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

  it('mantem o modal visível e exibe erro se salvar corretor falhar', async () => {
    apiPutMock.mockRejectedValueOnce(new Error('Falha de atualização'));

    render(BrokerReviewModal, { open: true, broker, showApprove: true });

    await screen.findByText('Revisar Corretor');
    await fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const dialog = screen.getByRole('dialog');
    const textboxes = within(dialog).getAllByRole('textbox');
    await fireEvent.input(textboxes[2], { target: { value: '64988887777' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('Falha de atualização'));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
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

  it('shows explicit demote action for approved broker and calls demote endpoint', async () => {
    render(BrokerReviewModal, {
      open: true,
      broker: { ...broker, status: 'approved' },
      showApprove: false,
      showReject: false,
      showDemote: true,
    });

    await screen.findByText('Revisar Corretor');
    await fireEvent.click(screen.getByRole('button', { name: 'Tornar Usuário' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/admin/clients/10/demote-broker',
        {},
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Usuario voltou para cliente.');
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

  it('does not render empty/invalid document URLs as real documents', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        ...broker,
        creci_front_url: '',
        creci_back_url: '/uploads/creci-back.jpg',
        selfie_url: '   ',
        documents: {
          creci_front_url: '',
          creci_back_url: '/uploads/creci-back.jpg',
          selfie_url: '   ',
        },
      },
    });

    render(BrokerReviewModal, { open: true, broker, showApprove: true });

    await screen.findByText('Revisar Corretor');
    expect(
      screen.queryByText('O corretor ainda não enviou documentos reais para revisão.'),
    ).toBeInTheDocument();
    expect(screen.queryByAltText('Frente do CRECI')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Verso do CRECI')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Selfie')).not.toBeInTheDocument();
  });

  it('mostra erro ao reenviar documento quando o endpoint responde falha', async () => {
    apiPostMock.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Arquivo inválido para upload.',
        },
      },
    });

    render(BrokerReviewModal, { open: true, broker, showApprove: true });

    await screen.findByText('Revisar Corretor');
    const uploadButtons = screen.getAllByRole('button', { name: 'Enviar Documento' });
    await fireEvent.click(uploadButtons[0]);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    await fireEvent.change(fileInput, {
      target: {
        files: [new File(['conteudo'], 'doc-rejeitado.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/admin/brokers/10/documents',
        expect.any(FormData),
      );
    });
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Arquivo inválido para upload.');
    });
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
