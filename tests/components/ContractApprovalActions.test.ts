import { render, screen } from '@testing-library/svelte';
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
});
