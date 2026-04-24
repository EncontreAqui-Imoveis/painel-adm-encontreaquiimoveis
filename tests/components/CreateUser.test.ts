import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

import CreateUser from '../../src/lib/components/CreateUser.svelte';

describe('CreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiPostMock.mockResolvedValue({ message: 'ok' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ nome: 'Rio Verde' }],
      })
    );
  });

  async function fillCommonRequiredFields() {
    await fireEvent.input(screen.getByLabelText('Nome *'), {
      target: { value: 'Auxiliar Teste' },
    });
    await fireEvent.input(screen.getByLabelText('Email *'), {
      target: { value: 'auxiliar@teste.com' },
    });
    await fireEvent.input(screen.getByLabelText('Telefone *'), {
      target: { value: '+55 (64) 99999-9999' },
    });
    await fireEvent.input(screen.getByLabelText('Senha *'), {
      target: { value: 'SenhaSegura123' },
    });
    await fireEvent.input(screen.getByLabelText('Endereço *'), {
      target: { value: 'Rua das Flores' },
    });
    await fireEvent.input(screen.getByLabelText('Número *'), {
      target: { value: '100' },
    });
    await fireEvent.input(screen.getByLabelText('Bairro *'), {
      target: { value: 'Centro' },
    });
    await fireEvent.input(screen.getByLabelText('CEP *'), {
      target: { value: '75900000' },
    });
    await fireEvent.input(screen.getByLabelText('Cidade *'), {
      target: { value: 'Rio Verde' },
    });
  }

  it('exibe Cliente, Corretor e Auxiliar Administrativo no select de tipo', () => {
    render(CreateUser);

    const kindSelect = screen.getByLabelText('Tipo de usuário *') as HTMLSelectElement;
    const optionValues = Array.from(kindSelect.options).map((option) => option.value);
    const optionLabels = Array.from(kindSelect.options).map((option) => option.textContent?.trim());

    expect(optionValues).toEqual(['client', 'broker', 'auxiliary_administrative']);
    expect(optionLabels).toEqual(['Cliente', 'Corretor', 'Auxiliar Administrativo']);
  });

  it('envia profileType auxiliary_administrative e mantém UX de sucesso', async () => {
    render(CreateUser);

    await fireEvent.change(screen.getByLabelText('Tipo de usuário *'), {
      target: { value: 'auxiliary_administrative' },
    });
    await fillCommonRequiredFields();
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/admin/users',
        expect.objectContaining({
          name: 'Auxiliar Teste',
          email: 'auxiliar@teste.com',
          profileType: 'auxiliary_administrative',
        })
      );
    });

    expect(toastSuccessMock).toHaveBeenCalledWith('Auxiliar administrativo cadastrado com sucesso.');
  });

  it('nao exige CRECI quando tipo e auxiliar administrativo', async () => {
    render(CreateUser);

    await fireEvent.change(screen.getByLabelText('Tipo de usuário *'), {
      target: { value: 'auxiliary_administrative' },
    });
    await fillCommonRequiredFields();
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalled();
    });
    expect(toastErrorMock).not.toHaveBeenCalledWith('CRECI deve conter entre 4 e 8 números.');
  });
});
