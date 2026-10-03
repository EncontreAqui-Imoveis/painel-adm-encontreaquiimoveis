import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ContractApprovalActions from '../../src/lib/components/contracts/ContractApprovalActions.svelte';
import type { ContractItem } from '../../src/lib/components/contracts/types';

function buildContract(dealType: 'rent' | 'sale'): ContractItem {
  return {
    id: `contract-${dealType}`,
    status: 'AWAITING_DOCS',
    negotiationId: `negotiation-${dealType}`,
    propertyId: 1,
    dealType,
  };
}

describe('ContractApprovalActions', () => {
  it('usa Locador e Locatário para aluguel', () => {
    render(ContractApprovalActions, { contract: buildContract('rent') });

    expect(screen.getByText('Avaliação Locador')).toBeInTheDocument();
    expect(screen.getByText('Avaliação Locatário')).toBeInTheDocument();
  });

  it('mantém Vendedor e Comprador para venda', () => {
    render(ContractApprovalActions, { contract: buildContract('sale') });

    expect(screen.getByText('Avaliação Vendedor')).toBeInTheDocument();
    expect(screen.getByText('Avaliação Comprador')).toBeInTheDocument();
  });

  it('mantém somente Reiniciar para o lado aprovado', () => {
    render(ContractApprovalActions, {
      contract: {
        ...buildContract('rent'),
        sellerApprovalStatus: 'APPROVED',
        buyerApprovalStatus: 'PENDING',
      },
      getSideApprovalUiState: (status) =>
        status === 'APPROVED' || status === 'APPROVED_WITH_RES' ? 'approved' : 'pending',
    });

    const sellerSection = screen.getByText('Avaliação Locador').parentElement;
    expect(sellerSection).not.toBeNull();
    expect(sellerSection).toHaveTextContent('Reiniciar');
    expect(sellerSection).not.toHaveTextContent('Rejeitar');
    expect(sellerSection).not.toHaveTextContent('Aprovar c/ ressalvas');
  });

  it('mantém somente Reiniciar para o lado rejeitado até a análise ser reiniciada', async () => {
    const evaluateContractSide = vi.fn();
    const uiState = (status?: ContractItem['sellerApprovalStatus']) =>
      status === 'REJECTED'
        ? 'rejected'
        : status === 'APPROVED' || status === 'APPROVED_WITH_RES'
          ? 'approved'
          : 'pending';
    const view = render(ContractApprovalActions, {
      contract: {
        ...buildContract('rent'),
        sellerApprovalStatus: 'REJECTED',
        buyerApprovalStatus: 'PENDING',
      },
      getSideApprovalUiState: uiState,
      evaluateContractSide,
    });

    const sellerSection = screen.getByText('Avaliação Locador').parentElement;
    expect(sellerSection).toHaveTextContent('Reiniciar');
    expect(sellerSection).not.toHaveTextContent('Aprovar');
    expect(sellerSection).not.toHaveTextContent('Rejeitar');
    await fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(evaluateContractSide).toHaveBeenCalledWith('seller', 'PENDING');

    await view.rerender({
      contract: {
        ...buildContract('rent'),
        sellerApprovalStatus: 'PENDING',
        buyerApprovalStatus: 'PENDING',
      },
      getSideApprovalUiState: uiState,
      evaluateContractSide,
    });
    expect(sellerSection).toHaveTextContent('Aprovar');
    expect(sellerSection).toHaveTextContent('Aprovar c/ ressalvas');
    expect(sellerSection).toHaveTextContent('Rejeitar');
  });
});
