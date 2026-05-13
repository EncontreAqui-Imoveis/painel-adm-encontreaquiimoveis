import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isUrgentAnnouncement } from '../../src/lib/utils/announcementFilters';

const baseNotification = {
  id: 1,
  message: '',
  related_entity_type: 'announcement' as const,
  related_entity_id: null,
  is_read: 0,
  created_at: '2026-01-01T10:00:00.000Z',
};

describe('announcementFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('classifica como urgente quando tem dados de contato do cliente', () => {
    expect(
      isUrgentAnnouncement({
        ...baseNotification,
        message: 'Nova mensagem do cliente',
        metadata_json: {
          clientName: 'João Teste',
          clientPhone: '(61) 99999-0000',
          clientEmail: 'joao@example.com',
        },
      }),
    ).toBe(true);
  });

  it('classifica aviso acionavel recente (sem dados de contato) como urgente', () => {
    expect(
      isUrgentAnnouncement({
        ...baseNotification,
        id: 6,
        message: 'Contato por WhatsApp solicitado',
        metadata_json: {},
      }),
    ).toBe(true);
  });

  it('não classifica aviso informativo de imóvel criado', () => {
    expect(
      isUrgentAnnouncement({
        ...baseNotification,
        message: 'Imóvel criado por Maria Souza',
        metadata_json: null,
      }),
    ).toBe(false);
  });

  it('não classifica mensagem sem informações de contato ou palavra-chave', () => {
    expect(
      isUrgentAnnouncement({
        ...baseNotification,
        id: 2,
        message: 'Atualização geral no sistema',
        metadata_json: {},
      }),
    ).toBe(false);
  });

  it('não classifica aviso antigo (mais de 24h) como urgente', () => {
    expect(
      isUrgentAnnouncement({
        ...baseNotification,
        id: 3,
        message: 'Contato do cliente via whatsapp',
        created_at: '2025-12-31T11:59:59.000Z',
        metadata_json: { clientPhoneRaw: '62999990000' },
      }),
    ).toBe(false);
  });

  it('considera boundary de 24h como urgente', () => {
    expect(
      isUrgentAnnouncement({
        ...baseNotification,
        id: 4,
        message: 'Contato do cliente via telefone',
        created_at: '2026-01-01T12:00:00.000Z',
        metadata_json: { clientPhone: '(61) 99999-0000' },
      }),
    ).toBe(true);
  });

  it('não classifica aviso sem created_at válido como urgente', () => {
    expect(
      isUrgentAnnouncement({
        ...baseNotification,
        id: 5,
        message: 'Contato do cliente via WhatsApp',
        created_at: 'nao-e-data',
        metadata_json: { clientPhone: '(61) 99999-0000' },
      }),
    ).toBe(false);
  });

  it('não classifica aviso sem data de criação como urgente', () => {
    const alertWithoutCreatedAt = {
      id: 8,
      message: 'Contato do cliente via telefone',
      related_entity_type: 'announcement' as const,
      related_entity_id: null,
      is_read: 0,
      metadata_json: { clientPhone: '(61) 99999-0000' },
    } as unknown as Parameters<typeof isUrgentAnnouncement>[0];

    expect(isUrgentAnnouncement(alertWithoutCreatedAt)).toBe(false);
  });
});
