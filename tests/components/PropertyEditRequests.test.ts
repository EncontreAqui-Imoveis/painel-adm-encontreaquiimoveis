import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
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

import PropertyEditRequests from '../../src/lib/components/PropertyEditRequests.svelte';

const requestListPayload = {
  data: [
    {
      id: 9,
      propertyId: 101,
      propertyTitle: 'Casa teste',
      propertyCode: 'EA-101',
      requesterUserId: 45,
      requesterRole: 'broker',
      requesterName: 'Corretor Teste',
      status: 'PENDING',
      diff: {
        title: { before: 'Casa antiga', after: 'Casa teste' },
        priceSale: { before: 300000, after: 325000 },
      },
      createdAt: '2026-04-20T10:00:00.000Z',
    },
  ],
  total: 1,
};

const requestDetailPayload = {
  id: 9,
  propertyId: 101,
  propertyTitle: 'Casa teste',
  propertyCode: 'EA-101',
  requesterUserId: 45,
  requesterRole: 'broker',
  requesterName: 'Corretor Teste',
  status: 'PENDING',
  before: {
    title: 'Casa antiga',
    priceSale: 300000,
  },
  after: {
    title: 'Casa teste',
    priceSale: 325000,
  },
  diff: {
    title: { before: 'Casa antiga', after: 'Casa teste' },
    priceSale: { before: 300000, after: 325000 },
  },
  fieldReviews: {},
};

describe('PropertyEditRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/property-edit-requests/9')) {
        return requestDetailPayload;
      }
      return requestListPayload;
    });
    apiPostMock.mockResolvedValue({ status: 'APPROVED' });
  });

  it('allows approving the whole request directly from the modal', async () => {
    render(PropertyEditRequests);

    await screen.findAllByRole('button', { name: 'Revisar edição' });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Revisar edição' })[0]);
    await screen.findByText('Ação rápida da solicitação inteira');

    await fireEvent.click(screen.getByRole('button', { name: 'Aprovar solicitação inteira' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/property-edit-requests/9/approve', {});
    });
  });

  it('requires and submits a bulk rejection reason for the whole request', async () => {
    render(PropertyEditRequests);

    await screen.findAllByRole('button', { name: 'Revisar edição' });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Revisar edição' })[0]);
    await screen.findByText('Ação rápida da solicitação inteira');

    const rejectAllButton = screen.getByRole('button', { name: 'Rejeitar solicitação inteira' });
    expect(rejectAllButton).toBeDisabled();

    await fireEvent.input(
      screen.getByPlaceholderText('Motivo obrigatório para rejeitar toda a solicitação'),
      {
        target: { value: 'Dados inconsistentes na revisão.' },
      },
    );

    apiPostMock.mockResolvedValueOnce({ status: 'REJECTED' });
    await fireEvent.click(screen.getByRole('button', { name: 'Rejeitar solicitação inteira' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/property-edit-requests/9/reject', {
        reason: 'Dados inconsistentes na revisão.',
      });
    });
  });

  it('allows filling a rejection reason during partial field-by-field review', async () => {
    render(PropertyEditRequests);

    await screen.findAllByRole('button', { name: 'Revisar edição' });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Revisar edição' })[0]);
    await screen.findByText('Compare o que mudou antes de aprovar. Somente os campos alterados aparecem abaixo.');

    const priceRow = screen.getByText('Preço de venda').closest('tr');
    expect(priceRow).not.toBeNull();

    await fireEvent.click(within(priceRow!).getByRole('button', { name: 'Rejeitar' }));

    const updatedPriceRow = screen.getByText('Preço de venda').closest('tr');
    expect(updatedPriceRow).not.toBeNull();

    const rejectionReason = within(updatedPriceRow!).getByPlaceholderText(
      'Motivo da rejeição para este campo',
    ) as HTMLTextAreaElement;

    await fireEvent.input(rejectionReason, {
      target: { value: 'Preço fora da política.' },
    });
    await fireEvent.change(rejectionReason, {
      target: { value: 'Preço fora da política.' },
    });

    expect(rejectionReason.value).toBe('Preço fora da política.');
    expect(within(updatedPriceRow!).getByPlaceholderText('Motivo da rejeição para este campo')).toBeInTheDocument();
  });
});
