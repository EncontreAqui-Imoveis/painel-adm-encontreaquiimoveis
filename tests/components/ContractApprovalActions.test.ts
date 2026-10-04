import { fireEvent, render, screen, within } from '@testing-library/svelte';
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

  it('mantém somente Reiniciar para aprovação com ressalvas', () => {
    render(ContractApprovalActions, {
      contract: {
        ...buildContract('sale'),
        sellerApprovalStatus: 'APPROVED_WITH_RES',
        buyerApprovalStatus: 'PENDING',
      },
      getSideApprovalUiState: (status) =>
        status === 'APPROVED' || status === 'APPROVED_WITH_RES' ? 'approved' : 'pending',
    });

    const sellerSection = screen.getByText('Avaliação Vendedor').parentElement;
    expect(sellerSection).toHaveTextContent('Reiniciar');
    expect(sellerSection).not.toHaveTextContent('Rejeitar');
    expect(sellerSection).not.toHaveTextContent('Aprovar');
  });

  it('mantém o lado pendente aguardando reenvio com ações normais, sem Reiniciar', () => {
    render(ContractApprovalActions, {
      contract: {
        ...buildContract('rent'),
        sellerApprovalStatus: 'PENDING',
        buyerApprovalStatus: 'PENDING',
        workflowMetadata: {
          awaiting_document_resubmission: {
            seller: {
              reason: 'Documentos ilegíveis.',
              requestedAt: '2026-10-03T12:00:00.000Z',
              requestedBy: 1,
              rejectedDocumentIds: [11],
            },
          },
        },
      },
    });

    const sellerSection = screen.getByText('Avaliação Locador').parentElement;
    expect(sellerSection).toHaveTextContent('Aguardando reenvio de documentos');
    expect(sellerSection).toHaveTextContent('Aprovar');
    expect(sellerSection).toHaveTextContent('Aprovar c/ ressalvas');
    expect(sellerSection).toHaveTextContent('Rejeitar');
    expect(sellerSection).not.toHaveTextContent('Reiniciar');
  });

  it('mostra o loading da ação atual e bloqueia somente as ações do mesmo lado', () => {
    render(ContractApprovalActions, {
      contract: { ...buildContract('sale'), sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING' },
      evaluatingSide: 'seller',
      evaluatingSideAction: 'APPROVED_WITH_RES',
    });

    const sellerSection = screen.getByText('Avaliação Vendedor').parentElement as HTMLElement;
    const buyerSection = screen.getByText('Avaliação Comprador').parentElement as HTMLElement;
    expect(within(sellerSection).getByRole('button', { name: 'Aprovando…' })).toBeDisabled();
    expect(within(sellerSection).getByRole('button', { name: 'Rejeitar' })).toBeDisabled();
    expect(within(buyerSection).getByRole('button', { name: /^Aprovarcomprador$/i })).toBeEnabled();
  });

  it('mostra Rejeitando somente na ação de rejeição em andamento', () => {
    render(ContractApprovalActions, {
      contract: { ...buildContract('sale'), sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING' },
      evaluatingSide: 'seller',
      evaluatingSideAction: 'REJECTED',
    });

    const sellerSection = screen.getByText('Avaliação Vendedor').parentElement as HTMLElement;
    expect(within(sellerSection).getByRole('button', { name: 'Rejeitando…' })).toBeDisabled();
    expect(within(sellerSection).getByRole('button', { name: /^Aprovarvendedor$/i })).toBeDisabled();
  });

  it('mantém somente Reiniciar para o lado rejeitado até a análise ser reiniciada', async () => {
    const requestSideRestart = vi.fn();
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
      requestSideRestart,
    });

    const sellerSection = screen.getByText('Avaliação Locador').parentElement;
    expect(sellerSection).toHaveTextContent('Reiniciar');
    expect(sellerSection).not.toHaveTextContent('Aprovar');
    expect(sellerSection).not.toHaveTextContent('Rejeitar');
    await fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(requestSideRestart).toHaveBeenCalledWith('seller');

    await view.rerender({
      contract: {
        ...buildContract('rent'),
        sellerApprovalStatus: 'PENDING',
        buyerApprovalStatus: 'PENDING',
      },
      getSideApprovalUiState: uiState,
      requestSideRestart,
    });
    expect(sellerSection).toHaveTextContent('Aprovar');
    expect(sellerSection).toHaveTextContent('Aprovar c/ ressalvas');
    expect(sellerSection).toHaveTextContent('Rejeitar');
  });
});
