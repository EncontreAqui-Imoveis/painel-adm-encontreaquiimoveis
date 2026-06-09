import {
  getNotificationMetadataValue,
  isUrgentAnnouncement,
  parseNotificationMetadata,
} from './utils/announcementFilters';
import type { Broker, BrokerDocuments, Notification, View, ViewConfig } from './types';

export type AnnouncementReadMarker = {
  createdAtMs: number;
  id: number;
};

export const dashboardViewConfig: Record<View, ViewConfig> = {
  dashboard: {
    title: 'Dashboard',
  },
  properties: {
    endpoint: '/admin/properties-with-brokers',
    title: 'Imóveis disponíveis',
    headers: ['ID', 'Código', 'Título', 'Tipo', 'Status', 'Preço', 'Cidade', 'Anunciante'],
    filterOptions: [
      { value: 'p.id', label: 'ID' },
      { value: 'p.code', label: 'Código' },
      { value: 'p.title', label: 'Título' },
    ],
    sortColumn: 'p.title',
  },
  property_requests: {
    title: 'Solicitações de Imóveis',
  },
  property_highlights: {
    title: 'Destaques',
  },
  sold_properties: {
    title: 'Vendidos / Alugados',
  },
  negotiation_requests: {
    title: 'Solicitação de Propostas',
  },
  negotiation_progress: {
    title: 'Imóveis em Negociação',
  },
  negotiation_contracts: {
    title: 'Contratos',
  },
  commissions: {
    title: 'Comissões (VGV)',
  },
  create_property: {
    title: 'Cadastrar Imóvel',
  },
  create_user: {
    title: 'Cadastrar Usuário',
  },
  brokers: {
    endpoint: '/admin/brokers',
    title: 'Gerenciamento de Corretores',
    headers: ['ID', 'Nome', 'Email', 'CRECI', 'Criado em', 'Total de Imóveis'],
    filterOptions: [
      { value: 'name', label: 'Nome' },
      { value: 'email', label: 'Email' },
    ],
    sortColumn: 'name',
  },
  clients: {
    endpoint: '/admin/clients',
    title: 'Gerenciamento de Clientes',
    headers: ['ID', 'Nome', 'Email', 'Telefone', 'Criado em'],
    filterOptions: [
      { value: 'name', label: 'Nome' },
      { value: 'email', label: 'Email' },
    ],
    sortColumn: 'name',
  },
  notifications: {
    title: 'Notificações',
  },
  verification: {
    endpoint: '/admin/brokers/pending',
    title: 'Solicitações de Corretores',
    headers: ['ID', 'Nome', 'CRECI', 'Ações'],
    filterOptions: [],
  },
};

export function getViewConfig(view: View): ViewConfig {
  return dashboardViewConfig[view] || { title: 'Dashboard' };
}

export function shouldPatchDashboardListLocally(view: View): boolean {
  return view === 'properties' || view === 'brokers' || view === 'clients';
}

export function shouldPollPendingCounts(
  view: View,
  isPageVisible: boolean
): boolean {
  return (
    isPageVisible &&
    (view === 'dashboard' || view === 'verification' || view === 'property_requests')
  );
}

export function shouldShowUnreadAnnouncements(
  total: number,
  latestMarker: AnnouncementReadMarker | null,
  lastReadMarker: AnnouncementReadMarker | null
): boolean {
  return total > 0 && isAnnouncementMarkerNewer(latestMarker, lastReadMarker);
}

export function isValidView(view: string): view is View {
  return view in dashboardViewConfig;
}

export function readListTotal(payload: unknown): number {
  if (payload == null) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (typeof payload !== 'object') return 0;
  const raw = (payload as { total?: unknown }).total;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  if (typeof raw === 'bigint') return Number(raw);
  return 0;
}

export function readListData<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

export function getDocumentUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';
  if (trimmedUrl.startsWith('http') || trimmedUrl.includes('cloudinary')) {
    return trimmedUrl;
  }
  if (trimmedUrl.startsWith('/uploads/') || trimmedUrl.startsWith('uploads/')) {
    return '';
  }
  return trimmedUrl;
}

export function resolveBrokerDocumentField(
  broker: Broker,
  field: keyof BrokerDocuments
): string | null {
  const fromDocuments = broker.documents?.[field];
  if (typeof fromDocuments === 'string' && fromDocuments.trim().length > 0) {
    return fromDocuments;
  }

  const legacySource = broker as unknown as Record<string, unknown>;
  const legacyValue = legacySource[field as string];
  if (typeof legacyValue === 'string' && legacyValue.trim().length > 0) {
    return legacyValue;
  }

  return null;
}

export function hasRealDocuments(broker: Broker): boolean {
  return (
    Boolean(getDocumentUrl(resolveBrokerDocumentField(broker, 'creci_front_url'))) ||
    Boolean(getDocumentUrl(resolveBrokerDocumentField(broker, 'creci_back_url'))) ||
    Boolean(getDocumentUrl(resolveBrokerDocumentField(broker, 'selfie_url')))
  );
}

export function formatNotificationDate(value: string): string {
  if (!value) return '-';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getAnnouncementClientPhone(item: Notification): string | null {
  return getNotificationMetadataValue(parseNotificationMetadata(item), 'clientPhone');
}

export function getAnnouncementWhatsappUrl(item: Notification): string | null {
  return getNotificationMetadataValue(parseNotificationMetadata(item), 'whatsappUrl');
}

export function getAnnouncementsForDisplay(list: Notification[]): Notification[] {
  return list.filter(isUrgentAnnouncement);
}

export function parseAnnouncementCreatedAtMs(createdAt: string): number {
  const parsed = Date.parse(createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractAnnouncementMarker(
  item: Notification | null | undefined
): AnnouncementReadMarker | null {
  if (!item || typeof item.id !== 'number') return null;
  return {
    createdAtMs: parseAnnouncementCreatedAtMs(item.created_at),
    id: item.id,
  };
}

export function isAnnouncementMarkerNewer(
  candidate: AnnouncementReadMarker | null,
  reference: AnnouncementReadMarker | null
): boolean {
  if (!candidate) return false;
  if (!reference) return true;
  if (candidate.createdAtMs > reference.createdAtMs) return true;
  if (candidate.createdAtMs < reference.createdAtMs) return false;
  return candidate.id > reference.id;
}

export function getMostRecentAnnouncementMarker(
  list: Notification[]
): AnnouncementReadMarker | null {
  let mostRecent: AnnouncementReadMarker | null = null;
  for (const item of list) {
    const marker = extractAnnouncementMarker(item);
    if (isAnnouncementMarkerNewer(marker, mostRecent)) {
      mostRecent = marker;
    }
  }
  return mostRecent;
}

export function readLastReadAnnouncementMarkerFromStorage(
  storageKey: string
): AnnouncementReadMarker | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      createdAtMs?: unknown;
      id?: unknown;
    };
    const createdAtMs = Number(parsed.createdAtMs);
    const id = Number(parsed.id);
    if (!Number.isFinite(createdAtMs) || !Number.isFinite(id)) {
      return null;
    }
    return { createdAtMs, id };
  } catch {
    return null;
  }
}

export function persistLastReadAnnouncementMarker(
  storageKey: string,
  marker: AnnouncementReadMarker
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(marker));
}
