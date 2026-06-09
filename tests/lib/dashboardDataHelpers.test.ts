import { describe, expect, it } from 'vitest';
import {
  buildDashboardListParams,
  parseAnnouncementFeedPayload,
  parseDashboardListPayload,
  parseDashboardStatsPayload,
  parseSreDashboardPayload,
  shouldSkipListFetch,
  parseVerificationBrokersPayload,
} from '../../src/lib/dashboardDataHelpers';

describe('dashboardDataHelpers', () => {
  it('builds list params and identifies listless views', () => {
    const params = buildDashboardListParams({
      currentPage: 2,
      itemsPerPage: 25,
      searchTerm: 'abc',
      searchColumn: 'name',
      sortBy: 'id',
      sortOrder: 'desc',
      statusFilter: 'pending',
      includeStatusFilter: true,
    });
    expect(params.get('page')).toBe('2');
    expect(params.get('limit')).toBe('25');
    expect(params.get('status')).toBe('pending');
    expect(shouldSkipListFetch('commissions')).toBe(true);
    expect(shouldSkipListFetch('dashboard')).toBe(false);
  });

  it('parses dashboard payloads defensively', () => {
    expect(parseDashboardStatsPayload({ totalProperties: '3', totalBrokers: 2, totalUsers: 1 })).toEqual({
      totalProperties: 3,
      totalBrokers: 2,
      totalUsers: 1,
    });
    expect(parseSreDashboardPayload({ latency: 12 })).toEqual({ latency: 12 });
    expect(parseDashboardListPayload([{ id: 10 }])).toEqual({
      items: [{ id: 10 }],
      total: 1,
    });
  });

  it('splits verification brokers by document completeness', () => {
    const payload = {
      data: [
        {
          id: 1,
          name: 'Com docs',
          email: 'a@example.com',
          status: 'pending_verification',
          documents: { creci_front_url: 'https://cdn.example.com/front.jpg' },
        },
        {
          id: 2,
          name: 'Sem docs',
          email: 'b@example.com',
          status: 'pending_verification',
          documents: {},
        },
      ],
    };
    const split = parseVerificationBrokersPayload(payload);
    expect(split.pendingBrokers).toHaveLength(1);
    expect(split.pendingDocumentBrokers).toHaveLength(1);
    expect(split.pendingBrokers[0].id).toBe(1);
    expect(split.totalItems).toBe(1);
  });

  it('normalizes announcements for dashboard feed consumption', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const payload = {
      data: [
        {
          id: 1,
          message: 'Novo lead com contato',
          related_entity_type: 'announcement',
          related_entity_id: null,
          is_read: false,
          created_at: recent,
          metadata_json: { clientPhone: '11999999999' },
        },
      ],
    };

    const parsed = parseAnnouncementFeedPayload(payload);
    expect(parsed.announcements).toHaveLength(1);
    expect(parsed.total).toBe(1);
    expect(parsed.latestMarker?.id).toBe(1);
  });
});
