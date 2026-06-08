import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import VerificationTable from '../../src/lib/VerificationTable.svelte';

describe('VerificationTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue({
      data: {
        id: 15,
        name: 'Broker Pendente',
        email: 'pendente@test.com',
        phone: '64999999999',
        street: 'Rua A',
        number: '10',
        bairro: 'Centro',
        city: 'Rio Verde',
        state: 'GO',
        cep: '75900000',
        creci: '12345',
        status: 'pending_verification',
        created_at: '2026-01-10T10:00:00.000Z',
      },
    });
  });

  it('opens the broker review modal with approve action for pending brokers', async () => {
    render(VerificationTable, {
      pendingBrokers: [
        {
          id: 15,
          name: 'Broker Pendente',
          email: 'pendente@test.com',
          creci: '12345',
          status: 'pending_verification',
          created_at: '2026-01-10T10:00:00.000Z',
          documents: {
            creci_front_url: 'https://example.com/front.jpg',
            creci_back_url: 'https://example.com/back.jpg',
            selfie_url: 'https://example.com/selfie.jpg',
          },
        },
      ],
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));

    expect(await screen.findByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
    expect(screen.getByText('Pendente de verificação')).toBeInTheDocument();
  });

  it('mostra corretores pendentes mesmo sem documentos reais', async () => {
    render(VerificationTable, {
      pendingBrokers: [
        {
          id: 15,
          name: 'Broker Com Doc',
          email: 'comdoc@test.com',
          creci: '11111',
          status: 'pending_verification',
          created_at: '2026-01-10T10:00:00.000Z',
          documents: {
            creci_front_url: 'https://example.com/front.jpg',
            creci_back_url: null,
            selfie_url: null,
          },
        },
        {
          id: 16,
          name: 'Broker Sem Doc',
          email: 'semdoc@test.com',
          creci: '22222',
          status: 'pending_verification',
          created_at: '2026-01-11T10:00:00.000Z',
          documents: {
            creci_front_url: null,
            creci_back_url: '/uploads/creci-back.jpg',
            selfie_url: null,
          },
        },
      ],
    });

    expect(screen.getByText('Broker Com Doc')).toBeInTheDocument();
    expect(screen.getByText('Broker Sem Doc')).toBeInTheDocument();
    expect(screen.getAllByText('Documentos enviados').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sem documentos enviados').length).toBeGreaterThan(0);
  });
});
