import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPutMock,
  apiDeleteMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: apiPutMock,
    delete: apiDeleteMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

import CommissionsModule from '../../src/lib/components/CommissionsModule.svelte';

describe('CommissionsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue({
      month: 3,
      year: 2026,
      summary: {
        totalVGV: 100000,
        totalCaptadores: 30000,
        totalVendedores: 20000,
        totalPlataforma: 50000,
      },
      transactions: [
        {
          contractId: 'contract-final-1',
          negotiationId: 'neg-final-1',
          propertyId: 900,
          propertyTitle: 'Casa Centro',
          propertyCode: 'RV-900',
          propertyPurpose: 'Venda',
          capturingBrokerName: 'Captador Original',
          sellingBrokerName: 'Vendedor Original',
          finalizedAt: '2026-03-09T12:00:00.000Z',
          commissionData: {
            valorVenda: 100000,
            comissaoCaptador: 30000,
            comissaoVendedor: 20000,
            taxaPlataforma: 50000,
          },
        },
      ],
    });
  });

  it('mostra Editar e Excluir na tabela de VGV', async () => {
    render(CommissionsModule);

    expect((await screen.findAllByText(/Casa Centro/)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Excluir' }).length).toBeGreaterThan(0);
  });

  it('edita VGV em valor real e envia commission_data numérico', async () => {
    apiPutMock.mockResolvedValue({});

    render(CommissionsModule);

    await screen.findAllByText(/Casa Centro/);
    await fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    const captadorNomeInput = screen.getByLabelText('Nome do captador') as HTMLInputElement;
    const vendedorNomeInput = screen.getByLabelText('Nome do vendedor') as HTMLInputElement;
    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão Complementar') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(captadorNomeInput, { target: { value: 'Captador Manual' } });
    await fireEvent.input(vendedorNomeInput, { target: { value: 'Vendedor Manual' } });
    await fireEvent.input(valorInput, { target: { value: '100000' } });
    await fireEvent.input(captadorInput, { target: { value: '40000' } });
    await fireEvent.input(vendedorInput, { target: { value: '30000' } });
    await fireEvent.input(taxaInput, { target: { value: '30000' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/admin/contracts/contract-final-1/commission-data', {
        commission_data: {
          valorBaseComissao: 1000,
          comissaoCaptador: 400,
          comissaoVendedor: 300,
          taxaPlataforma: 300,
        },
      });
    });
  });

  it('edita VGV em percentual e converte para valor real', async () => {
    apiPutMock.mockResolvedValue({});

    render(CommissionsModule);

    await screen.findAllByText(/Casa Centro/);
    await fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    await fireEvent.click(screen.getByRole('button', { name: 'Comissão Captador em percentual' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Comissão Complementar em percentual' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Taxa Encontre Aqui em percentual' }));

    expect(screen.getByRole('button', { name: 'Comissão Captador em percentual' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Comissão Complementar em reais' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Taxa Encontre Aqui em reais' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão Complementar') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '100000' } });
    await fireEvent.input(captadorInput, { target: { value: '40' } });
    await fireEvent.input(vendedorInput, { target: { value: '30' } });
    await fireEvent.input(taxaInput, { target: { value: '30' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/admin/contracts/contract-final-1/commission-data', {
        commission_data: {
          valorBaseComissao: 1000,
          comissaoCaptador: 400,
          comissaoVendedor: 300,
          taxaPlataforma: 300,
        },
      });
    });
  });

  it('clampa valores e mantém modos independentes por campo', async () => {
    apiPutMock.mockResolvedValue({});

    render(CommissionsModule);

    await screen.findAllByText(/Casa Centro/);
    await fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorModeButton = screen.getByRole('button', { name: 'Comissão Captador em percentual' });
    const captadorInput = screen.getByLabelText('Comissão Captador') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '9999999999' } });
    expect(valorInput.value.replace(/\u00a0/g, ' ')).toBe('R$ 999.999,99');
    expect(valorInput.maxLength).toBe(13);

    await fireEvent.click(captadorModeButton);
    await fireEvent.input(captadorInput, { target: { value: '555555' } });
    expect(captadorInput.value).toBe('100,00');
    expect(captadorInput.maxLength).toBe(6);

    await fireEvent.click(screen.getByRole('button', { name: 'Taxa Encontre Aqui em percentual' }));
    await fireEvent.input(taxaInput, { target: { value: '100,5' } });
    expect(taxaInput.value).toBe('100,00');
  });

  it('exclui VGV sem remover o contrato finalizado da origem', async () => {
    apiDeleteMock.mockResolvedValue({});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(CommissionsModule);

    await screen.findAllByText(/Casa Centro/);
    await fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith('/admin/contracts/contract-final-1/commission-data');
    });

    confirmSpy.mockRestore();
  });
});
