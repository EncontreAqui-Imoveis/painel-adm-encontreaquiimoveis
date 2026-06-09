import {
  getAnnouncementsForDisplay,
  getMostRecentAnnouncementMarker,
  hasRealDocuments,
  readListData,
  readListTotal,
} from './dashboardHelpers';
import type { Broker, Notification } from './types';

export type DashboardStats = {
  totalProperties: number;
  totalBrokers: number;
  totalUsers: number;
};

export type DashboardSreStats = unknown;

export function buildDashboardListParams(input: {
  currentPage: number;
  itemsPerPage: number;
  searchTerm: string;
  searchColumn: string;
  sortBy: string;
  sortOrder: string;
  statusFilter: string;
  includeStatusFilter?: boolean;
}): URLSearchParams {
  const params = new URLSearchParams({
    page: String(input.currentPage),
    limit: String(input.itemsPerPage),
    search: input.searchTerm,
    searchColumn: input.searchColumn,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  });

  if (input.includeStatusFilter && input.statusFilter) {
    params.append('status', input.statusFilter);
  }

  return params;
}

export function parseDashboardStatsPayload(payload: unknown): DashboardStats | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  return {
    totalProperties: Number(record.totalProperties ?? 0),
    totalBrokers: Number(record.totalBrokers ?? 0),
    totalUsers: Number(record.totalUsers ?? 0),
  };
}

export function parseSreDashboardPayload(payload: unknown): DashboardSreStats | null {
  return payload ?? null;
}

export function parseDashboardListPayload<T>(payload: unknown): {
  items: T[];
  total: number;
} {
  const items = readListData<T>(payload);
  const total = readListTotal(payload);
  return {
    items,
    total: total > 0 ? total : items.length,
  };
}

export function parseVerificationBrokersPayload(payload: unknown): {
  pendingBrokers: Broker[];
  pendingDocumentBrokers: Broker[];
  totalItems: number;
} {
  const requestList = readListData<Broker>(payload);
  const pendingBrokers = requestList.filter((broker) => hasRealDocuments(broker));
  const pendingDocumentBrokers = requestList.filter((broker) => !hasRealDocuments(broker));
  return {
    pendingBrokers,
    pendingDocumentBrokers,
    totalItems: pendingBrokers.length,
  };
}

export function parseAnnouncementFeedPayload(payload: unknown): {
  announcements: Notification[];
  total: number;
  latestMarker: ReturnType<typeof getMostRecentAnnouncementMarker>;
} {
  const announcements = getAnnouncementsForDisplay(readListData<Notification>(payload));
  return {
    announcements,
    total: announcements.length,
    latestMarker: getMostRecentAnnouncementMarker(announcements),
  };
}

export function shouldSkipListFetch(view: string): boolean {
  return (
    view === 'properties' ||
    view === 'property_highlights' ||
    view === 'property_requests' ||
    view === 'sold_properties' ||
    view === 'negotiation_requests' ||
    view === 'negotiation_progress' ||
    view === 'negotiation_contracts' ||
    view === 'commissions' ||
    view === 'brokers' ||
    view === 'create_property' ||
    view === 'create_user'
  );
}
