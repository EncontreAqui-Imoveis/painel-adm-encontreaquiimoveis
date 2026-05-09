import type { Notification } from '../types';

const PROPERTY_CREATED_PATTERNS: RegExp[] = [
  /imóve[l|is]\s*criad[oa]s?\b/i,
  /imovel\s*criad[oa]s?\b/i,
  /imóvel\s+adicionado\s+por\b/i,
  /imovel\s+adicionado\s+por\b/i,
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
  const message = typeof item.message === 'string' ? item.message : '';
  const metadata = parseNotificationMetadata(item);
  const clientName = getNotificationMetadataValue(metadata, 'clientName');
  const clientPhone = getNotificationMetadataValue(metadata, 'clientPhone');
  const clientPhoneRaw = getNotificationMetadataValue(metadata, 'clientPhoneRaw');
  const clientEmail = getNotificationMetadataValue(metadata, 'clientEmail');

  if (isPropertyCreatedNotification(message)) {
    return false;
  }

  const hasContactData =
    Boolean(clientName) || Boolean(clientPhone) || Boolean(clientPhoneRaw) || Boolean(clientEmail);

  return hasContactData || messageHasActionKeywords(message);
}
