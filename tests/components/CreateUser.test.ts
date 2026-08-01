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

  afterEach(() => {
    vi.unstubAllGlobals();
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
    await fireEvent.input(screen.getByPlaceholderText('Senha inicial'), {
      target: { value: 'SenhaMuitoSegura123' },
    });
    await fireEvent.input(screen.getByLabelText('Rua *'), {
      target: { value: 'Rua das Flores' },
    });
    await fireEvent.input(screen.getByLabelText('Número'), {
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

  it('exibe somente Cliente e Corretor no select de tipo', () => {
    render(CreateUser);

    const kindSelect = screen.getByLabelText('Tipo de usuário *') as HTMLSelectElement;
    const optionValues = Array.from(kindSelect.options).map((option) => option.value);
    const optionLabels = Array.from(kindSelect.options).map((option) => option.textContent?.trim());

    expect(optionValues).toEqual(['client', 'broker']);
    expect(optionLabels).toEqual(['Cliente', 'Corretor']);
  });

  it('exibe status inicial do corretor com labels normalizadas', async () => {
    render(CreateUser);

    await fireEvent.change(screen.getByLabelText('Tipo de usuário *'), {
      target: { value: 'broker' },
    });

    const brokerStatusSelect = screen.getByLabelText('Status inicial do corretor *') as HTMLSelectElement;
    const optionLabels = Array.from(brokerStatusSelect.options).map((option) => option.textContent?.trim());

    expect(optionLabels).toEqual(['Aprovado', 'Pendente de verificação']);
  });

  it('aceita cadastro sem CEP quando marcado Sem CEP', async () => {
    render(CreateUser);

    await fireEvent.change(screen.getByLabelText('Tipo de usuário *'), {
      target: { value: 'client' },
    });
    await fillCommonRequiredFields();
    await fireEvent.click(screen.getByLabelText('Sem CEP'));
    await fireEvent.input(screen.getByLabelText('CEP *'), { target: { value: '' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/admin/users',
        expect.objectContaining({
          sem_cep: 1,
          cep: '',
        })
      );
    });
    expect(toastErrorMock).not.toHaveBeenCalledWith('Informe o CEP.');
  });

  it('aceita cadastro sem número quando marcado Sem número', async () => {
    render(CreateUser);

    await fireEvent.change(screen.getByLabelText('Tipo de usuário *'), {
      target: { value: 'client' },
    });
    await fillCommonRequiredFields();
    await fireEvent.click(screen.getByLabelText('Sem número'));
    await fireEvent.input(screen.getByLabelText('Número'), { target: { value: '' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/admin/users',
        expect.objectContaining({
          sem_numero: 1,
          number: '',
        })
      );
    });
    expect(toastErrorMock).not.toHaveBeenCalledWith('Informe o número.');
  });

  it('preenche rua, bairro, cidade e estado ao informar CEP válido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('viacep.com.br')) {
          return {
            ok: true,
            json: async () => ({
              logradouro: 'Rua Automática',
              bairro: 'Centro Novo',
              localidade: 'Rio Verde',
              uf: 'GO',
            }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => [{ nome: 'Rio Verde' }],
        } as Response;
      }),
    );

    render(CreateUser);

    await fireEvent.input(screen.getByLabelText('CEP *'), {
      target: { value: '75900000' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Rua *')).toHaveValue('Rua Automática');
      expect(screen.getByLabelText('Bairro *')).toHaveValue('Centro Novo');
      expect(screen.getByLabelText('Cidade *')).toHaveValue('Rio Verde');
      expect(screen.getByLabelText('Estado *')).toHaveValue('GO');
    });
  });

  it('envia sem_cep e sem_numero no payload do cadastro de corretor', async () => {
    render(CreateUser);

    await fireEvent.change(screen.getByLabelText('Tipo de usuário *'), {
      target: { value: 'broker' },
    });
    await fillCommonRequiredFields();
    await fireEvent.input(screen.getByLabelText('CRECI *'), {
      target: { value: '12345' },
    });
    await fireEvent.click(screen.getByLabelText('Sem CEP'));
    await fireEvent.click(screen.getByLabelText('Sem número'));

    const front = screen.getByLabelText('Documento CRECI (frente)') as HTMLInputElement;
    const back = screen.getByLabelText('Documento CRECI (verso)') as HTMLInputElement;
    const selfie = screen.getByLabelText('Selfie') as HTMLInputElement;

    Object.defineProperty(front, 'files', {
      value: [new File(['front'], 'front.png', { type: 'image/png' })],
    });
    Object.defineProperty(back, 'files', {
      value: [new File(['back'], 'back.png', { type: 'image/png' })],
    });
    Object.defineProperty(selfie, 'files', {
      value: [new File(['selfie'], 'selfie.png', { type: 'image/png' })],
    });
    await fireEvent.change(front);
    await fireEvent.change(back);
    await fireEvent.change(selfie);

    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalled();
      const calls = apiPostMock.mock.calls;
      const formData = calls.at(-1)?.[1];
      expect(formData).toBeInstanceOf(FormData);
      if (formData instanceof FormData) {
        expect(formData.get('sem_cep')).toBe('1');
        expect(formData.get('sem_numero')).toBe('1');
      }
    });
  });
});
