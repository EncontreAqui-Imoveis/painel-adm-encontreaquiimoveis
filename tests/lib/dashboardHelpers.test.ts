import { beforeEach, describe, expect, it } from 'vitest';
import {
  dashboardViewConfig,
  formatNotificationDate,
  getAnnouncementClientPhone,
  getAnnouncementWhatsappUrl,
  getAnnouncementsForDisplay,
  getDocumentUrl,
  getMostRecentAnnouncementMarker,
  getViewConfig,
  hasRealDocuments,
  isAnnouncementMarkerNewer,
  isValidView,
  persistLastReadAnnouncementMarker,
  readLastReadAnnouncementMarkerFromStorage,
  readListData,
  readListTotal,
  shouldPatchDashboardListLocally,
  shouldPollPendingCounts,
  shouldShowUnreadAnnouncements,
} from '../../src/lib/dashboardHelpers';

describe('dashboardHelpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('resolve configuração de view com fallback seguro', () => {
    expect(getViewConfig('dashboard')).toEqual(dashboardViewConfig.dashboard);
    expect(isValidView('brokers')).toBe(true);
    expect(isValidView('nao-existe')).toBe(false);
    expect(shouldPatchDashboardListLocally('clients')).toBe(true);
    expect(shouldPatchDashboardListLocally('dashboard')).toBe(false);
    expect(shouldPollPendingCounts('verification', true)).toBe(true);
    expect(shouldPollPendingCounts('verification', false)).toBe(false);
  });

  it('lê payloads paginados e totais', () => {
    expect(readListTotal({ total: '42' })).toBe(42);
    expect(readListData([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(readListData({ data: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });

  it('normaliza documentos do corretor', () => {
    expect(getDocumentUrl('/uploads/x.pdf')).toBe('');
    expect(getDocumentUrl('https://example.com/doc.pdf')).toBe('https://example.com/doc.pdf');
    expect(
      hasRealDocuments({
        id: 1,
        name: 'Corretor',
        email: 'a@b.com',
        creci: '123',
        status: 'approved',
        created_at: '2025-01-01T00:00:00Z',
        documents: { creci_front_url: 'https://cdn.example.com/a.pdf' },
      })
    ).toBe(true);
  });

  it('filtra e interpreta anúncios', () => {
    const items = getAnnouncementsForDisplay([
      {
        id: 1,
        message: 'Novo lead com whatsapp',
        related_entity_type: 'broker',
        related_entity_id: null,
        is_read: false,
        created_at: new Date().toISOString(),
        metadata_json: { clientPhone: '11999999999', whatsappUrl: 'https://wa.me/5511999999999' },
      } as never,
      {
        id: 2,
        message: 'Outro',
        related_entity_type: 'other',
        related_entity_id: null,
        is_read: false,
        created_at: '2025-01-02T10:00:00Z',
      } as never,
    ]);
    expect(items).toHaveLength(1);
    expect(getAnnouncementClientPhone(items[0] as never)).toBe('11999999999');
    expect(getAnnouncementWhatsappUrl(items[0] as never)).toBe('https://wa.me/5511999999999');
    expect(formatNotificationDate('2025-01-01 10:15:00')).toContain('01/01/2025');
  });

  it('compara marcadores de leitura e persiste no storage', () => {
    const marker = getMostRecentAnnouncementMarker([
      {
        id: 1,
        message: 'A',
        related_entity_type: 'property',
        related_entity_id: null,
        is_read: false,
        created_at: '2025-01-01T10:00:00Z',
      } as never,
      {
        id: 2,
        message: 'B',
        related_entity_type: 'property',
        related_entity_id: null,
        is_read: false,
        created_at: '2025-01-02T10:00:00Z',
      } as never,
    ]);
    expect(marker?.id).toBe(2);
    expect(isAnnouncementMarkerNewer(marker, { id: 1, createdAtMs: 0 })).toBe(true);

    persistLastReadAnnouncementMarker('test-marker', marker!);
    expect(readLastReadAnnouncementMarkerFromStorage('test-marker')).toEqual(marker);
    expect(shouldShowUnreadAnnouncements(3, marker, null)).toBe(true);
    expect(shouldShowUnreadAnnouncements(0, marker, null)).toBe(false);
  });
});
