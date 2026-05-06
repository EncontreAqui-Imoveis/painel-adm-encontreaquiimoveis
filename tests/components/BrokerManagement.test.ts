import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPutMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: apiPutMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

import BrokerManagement from '../../src/lib/BrokerManagement.svelte';
import { authToken } from '../../src/lib/store';
import { formatPhoneDisplayBr } from '../../src/lib/utils/phoneFormat';

const baseBroker = {
  id: 1,
  name: 'Corretor Exemplo',
  email: 'corr@test.com',
  phone: '62999990000',
  creci: '12345',
  property_count: 2,
  created_at: '2026-01-01T00:00:00.000Z',
  status: 'approved',
};

function setupBrokerListMock() {
  const broker = { ...baseBroker };
  apiGetMock.mockImplementation(async (endpoint: string) => {
    if (endpoint.startsWith('/admin/brokers?')) {
      return {
        data: [broker],
        total: 1,
      };
    }
    if (endpoint.startsWith('/admin/brokers/')) {
      return broker;
    }
    return { data: [], total: 0 };
  });

  apiPutMock.mockImplementation(async (_endpoint: string, payload: Record<string, unknown>) => {
    Object.assign(broker, payload);
    return { data: broker };
  });
}

describe('BrokerManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authToken.set('token-teste');
    setupBrokerListMock();
  });

  afterEach(() => {
    authToken.set(null);
  });

  it('aplica classe de scroll visível na tabela de corretores', async () => {
    const { container } = render(BrokerManagement);

    await waitFor(() => {
      expect(screen.getByText('Corretor Exemplo')).toBeInTheDocument();
    });

    const tableWrapper = container.querySelector('.broker-table-scroll');
    expect(tableWrapper).not.toBeNull();
    expect(tableWrapper).toHaveClass('overflow-x-auto');
    expect(tableWrapper).toHaveClass('broker-table-scroll');
  });

  it('persiste edição no fluxo do pai e atualiza a lista com o novo telefone', async () => {
    render(BrokerManagement);

    await waitFor(() => {
      expect(screen.getByText('Corretor Exemplo')).toBeInTheDocument();
    });

    const reviewButtons = await screen.findAllByRole('button', { name: 'Revisar' });
    expect(reviewButtons.length).toBeGreaterThan(0);
    await fireEvent.click(reviewButtons[0]);

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('Revisar Corretor')).toBeInTheDocument();
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar' }));
    const phoneInput = within(dialog).getByRole('textbox', { name: 'Telefone' }) as HTMLInputElement;
    await fireEvent.input(phoneInput, { target: { value: '63999990000' } });
    const listCallsBeforeSave = apiGetMock.mock.calls.length;
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/admin/brokers/1', expect.objectContaining({ phone: '63999990000' }));
    });
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Corretor atualizado.');
    });

    await waitFor(() => {
      expect(apiGetMock.mock.calls.length).toBeGreaterThan(listCallsBeforeSave);
    });

    const reopenedDialog = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(reopenedDialog).getByText(formatPhoneDisplayBr('63999990000', 'N/A'))).toBeInTheDocument();
    });
  });

  it('não fecha modal e mostra erro real quando a edição do corretor falha', async () => {
    apiPutMock.mockRejectedValueOnce(new Error('Falha de atualização'));
    render(BrokerManagement);

    await waitFor(() => {
      expect(screen.getByText('Corretor Exemplo')).toBeInTheDocument();
    });

    const reviewButtons = await screen.findAllByRole('button', { name: 'Revisar' });
    await fireEvent.click(reviewButtons[0]);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('Revisar Corretor')).toBeInTheDocument();
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar' }));
    const phoneInput = within(dialog).getByRole('textbox', { name: 'Telefone' }) as HTMLInputElement;
    await fireEvent.input(phoneInput, { target: { value: '63999990000' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('Falha de atualização'));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });
});
