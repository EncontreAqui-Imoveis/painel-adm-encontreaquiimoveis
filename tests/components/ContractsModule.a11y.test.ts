import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  apiPutMock,
  apiPatchMock,
  apiDeleteMock,
  apiClientGetMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  apiClientGetMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
    put: apiPutMock,
    patch: apiPatchMock,
    delete: apiDeleteMock,
  },
  apiClient: {
    get: apiClientGetMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

import ContractsModule from '../../src/lib/components/ContractsModule.svelte';

describe('ContractsModule accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the review modal as an accessible dialog with blocking feedback', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-a11y-1',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-a11y-1',
          propertyId: 707,
          propertyCode: 'RV-707',
          propertyTitle: 'Casa A11y',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: {},
          buyerInfo: {},
          sellerApprovalStatus: 'PENDING',
          buyerApprovalStatus: 'PENDING',
          documents: [],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    const { container } = render(ContractsModule);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    const dialog = await screen.findByRole('dialog', {
      name: 'Análise de Documentação',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Aprovação bloqueada.');
    expect(screen.getByRole('button', { name: 'Aprovar captador' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aprovar vendedor' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aprovar c/ ressalvas captador' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Aprovar c/ ressalvas vendedor' })).toBeEnabled();

    const result = await axe.run(container, {
      rules: {
        'color-contrast': {
          enabled: false,
        },
      },
    });

    expect(result.violations).toHaveLength(0);
  });
});
