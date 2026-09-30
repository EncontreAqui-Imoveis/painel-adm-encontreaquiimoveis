import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, apiPostMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('$lib/sessionState', () => ({
  hasSessionToken: () => true,
}));

import SendNotification from '../../src/lib/components/SendNotification.svelte';

describe('SendNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiPostMock.mockResolvedValue({ message: 'ok' });
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/admin/users?')) {
        return {
          data: [{ id: 7, name: 'Cliente Teste', email: 'cliente@teste.com', role: 'client' }],
          total: 1,
        };
      }
      if (endpoint.startsWith('/admin/properties-with-brokers?')) {
        return {
          data: [
            { id: 42, title: 'Casa no Centro' },
            { id: 85, title: 'Apartamento Jardim das Flores' },
          ],
        };
      }
      return { data: [] };
    });
  });

  async function renderReadyForm() {
    render(SendNotification);
    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(expect.stringContaining('/admin/users?'));
    });
    await fireEvent.input(screen.getByLabelText('Mensagem'), {
      target: { value: 'Aviso administrativo' },
    });
  }

  async function submitForm() {
    await fireEvent.click(screen.getByRole('button', { name: 'Enviar Notificação' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
  }

  it('envia home como destino padrão sem route arbitrária', async () => {
    await renderReadyForm();

    expect(screen.getByLabelText('Ao tocar na notificação')).toHaveValue('home');
    await submitForm();

    expect(apiPostMock).toHaveBeenCalledWith('/admin/notifications/send', {
      message: 'Aviso administrativo',
      recipientIds: null,
      audience: 'all',
      related_entity_type: 'announcement',
      target: 'home',
    });
    expect(apiPostMock.mock.calls[0][1]).not.toHaveProperty('route');
  });

  it.each([
    ['Nenhuma ação', 'none'],
    ['Notificações', 'notifications'],
    ['Propostas', 'proposal_list'],
    ['Contratos', 'contracts_tab'],
  ] as const)('envia %s com o target canônico %s', async (_label, target) => {
    await renderReadyForm();

    await fireEvent.change(screen.getByLabelText('Ao tocar na notificação'), {
      target: { value: target },
    });
    await submitForm();

    expect(apiPostMock).toHaveBeenCalledWith(
      '/admin/notifications/send',
      expect.objectContaining({ target }),
    );
    expect(apiPostMock.mock.calls[0][1]).not.toHaveProperty('property_id');
    expect(apiPostMock.mock.calls[0][1]).not.toHaveProperty('route');
  });

  it('exige a escolha de imóvel para property_details e envia apenas property_id', async () => {
    await renderReadyForm();

    await fireEvent.change(screen.getByLabelText('Ao tocar na notificação'), {
      target: { value: 'property_details' },
    });
    expect(screen.getByRole('button', { name: 'Enviar Notificação' })).toBeDisabled();

    const propertySelect = await screen.findByLabelText('Imóvel');
    expect(propertySelect).toHaveTextContent('Casa no Centro — ID 42');
    await fireEvent.change(propertySelect, { target: { value: '42' } });
    expect(screen.getByRole('button', { name: 'Enviar Notificação' })).toBeEnabled();

    await submitForm();

    expect(apiPostMock).toHaveBeenCalledWith(
      '/admin/notifications/send',
      expect.objectContaining({ target: 'property_details', property_id: 42 }),
    );
    expect(apiPostMock.mock.calls[0][1]).not.toHaveProperty('route');
  });

  it('limpa property_id ao trocar de imóvel específico para outro destino', async () => {
    await renderReadyForm();

    await fireEvent.change(screen.getByLabelText('Ao tocar na notificação'), {
      target: { value: 'property_details' },
    });
    await fireEvent.change(await screen.findByLabelText('Imóvel'), {
      target: { value: '42' },
    });
    await fireEvent.change(screen.getByLabelText('Ao tocar na notificação'), {
      target: { value: 'notifications' },
    });
    await submitForm();

    expect(apiPostMock).toHaveBeenCalledWith(
      '/admin/notifications/send',
      expect.objectContaining({ target: 'notifications' }),
    );
    expect(apiPostMock.mock.calls[0][1]).not.toHaveProperty('property_id');
  });
});
