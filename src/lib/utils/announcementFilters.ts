import type { Notification } from '../types';

const PROPERTY_CREATED_PATTERNS: RegExp[] = [
  /imóve[l|is]\s*criad[oa]s?\b/i,
  /imovel\s*criad[oa]s?\b/i,
  /imóvel\s+adicionado\s+por\b/i,
  /imovel\s+adicionado\s+por\b/i,
  /imóvel\s+cadastrad[oa]s?\b/i,
  /imovel\s+cadastrad[oa]s?\b/i,
  /novo\s+imóve[l|is]\b/i,
  /novo\s+imovel\b/i,
  /imóve[l|is]\s+publicad[oa]s?\b/i,
  /imovel\s+publicad[oa]s?\b/i,
];

const IMPORTANT_KEYWORDS: RegExp[] = [
  /\bcontato\b/i,
  /\btelefone\b/i,
  /\bwhatsapp\b/i,
  /\bcliente\b/i,
  /\blead\b/i,
  /\bsolicit/i,
  /\bvisita/i,
  /\bagend/i,
];

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function parseNotificationCreatedAtMs(item: Notification): number | null {
  const createdAt = typeof item?.created_at === 'string'
    ? item.created_at.trim()
    : '';
  if (!createdAt) {
    return null;
  }
  const parsed = Date.parse(createdAt);
  return Number.isFinite(parsed) ? parsed : null;
}

function isWithinLast24h(createdAtMs: number | null): boolean {
  if (!Number.isFinite(createdAtMs ?? NaN)) {
    return false;
  }
  const nowMs = Date.now();
  const ageMs = nowMs - createdAtMs!;
  return ageMs >= 0 && ageMs <= TWENTY_FOUR_HOURS_MS;
}

export function parseNotificationMetadata(
  item: Notification,
): Record<string, unknown> | null {
  const raw = item.metadata_json;
  if (!raw) return null;

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

export function getNotificationMetadataValue(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function messageHasActionKeywords(message: string): boolean {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return false;
  }
  return IMPORTANT_KEYWORDS.some((pattern) => pattern.test(normalizedMessage));
}

function isPropertyCreatedNotification(message: string): boolean {
  return PROPERTY_CREATED_PATTERNS.some((pattern) => pattern.test(message));
}

export function isUrgentAnnouncement(item: Notification): boolean {
  if (item.related_entity_type === 'property') {
    return false;
  }

  const message = typeof item.message === 'string' ? item.message : '';
  const metadata = parseNotificationMetadata(item);
  const clientName = getNotificationMetadataValue(metadata, 'clientName');
  const clientPhone = getNotificationMetadataValue(metadata, 'clientPhone');
  const clientPhoneRaw = getNotificationMetadataValue(metadata, 'clientPhoneRaw');
  const clientEmail = getNotificationMetadataValue(metadata, 'clientEmail');
  const createdAtMs = parseNotificationCreatedAtMs(item);

  if (!isWithinLast24h(createdAtMs)) {
    return false;
  }

  if (isPropertyCreatedNotification(message)) {
    return false;
  }

  const hasContactData =
    Boolean(clientName) || Boolean(clientPhone) || Boolean(clientPhoneRaw) || Boolean(clientEmail);

  return hasContactData || messageHasActionKeywords(message);
}
