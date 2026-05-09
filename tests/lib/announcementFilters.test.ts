import { describe, expect, it } from 'vitest';
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
});
