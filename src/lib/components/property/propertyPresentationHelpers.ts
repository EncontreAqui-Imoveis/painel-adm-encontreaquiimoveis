export function humanizePropertyStatus(status: string, purpose?: string | null): string {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  if (normalizedStatus === 'approved' && purpose) {
    return purpose;
  }
  const map: Record<string, string> = {
    pending_approval: 'Aprovação Pendente',
    approved: 'Disponível',
    rented: 'Alugado',
    sold: 'Vendido',
  };
  return map[normalizedStatus] ?? status ?? 'Indefinido';
}

export function propertyStatusBadgeClasses(status: string): string {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  const classes: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rented: 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
    sold: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  return classes[normalizedStatus] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
}

export function normalizePublicCode(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    const normalized = String(value).trim();
    if (!normalized || normalized === '-') return null;
    return normalized;
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    const fromCommonKeys = candidate.public_code ?? candidate.publicCode ?? candidate.code ?? candidate.value;
    if (typeof fromCommonKeys === 'string' || typeof fromCommonKeys === 'number' || typeof fromCommonKeys === 'bigint') {
      return normalizePublicCode(fromCommonKeys);
    }
  }

  return null;
}

export function publicCodeLabel(value: unknown, fallback = 'Sem referência pública'): string {
  return normalizePublicCode(value) || fallback;
}

export function resolveSelectedPropertyPublicCode(publicCode: unknown): string {
  return publicCodeLabel(publicCode);
}
