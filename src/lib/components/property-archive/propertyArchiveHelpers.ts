export type ArchiveStatus = 'sold' | 'rented';

export type ArchiveItemLike = {
  id: number;
  code?: string | null;
  title: string;
  brokerName?: string | null;
  status: ArchiveStatus;
  transactionDate?: string | null;
  imageUrl?: string | null;
  images?: unknown;
};

export type ArchivePropertyDetailLike = {
  id: number;
  code?: string | null;
  title: string;
  type?: string | null;
  purpose?: string | null;
  status?: string | null;
  city?: string | null;
  state?: string | null;
  bairro?: string | null;
  address?: string | null;
  numero?: string | null;
  broker_name?: string | null;
  broker_phone?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  price?: number | null;
  price_sale?: number | null;
  price_rent?: number | null;
  valor_condominio?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garage_spots?: number | null;
  area_construida?: number | null;
  area_construida_valor?: number | null;
  area_construida_unidade?: string | null;
  area_terreno?: number | null;
  area_terreno_valor?: number | null;
  area_terreno_unidade?: string | null;
  images?: unknown;
  image_url?: string | null;
  property_image_url?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR');
}

export function statusLabel(status: ArchiveStatus): string {
  return status === 'sold' ? 'Vendido' : 'Alugado';
}

export function statusClass(status: ArchiveStatus): string {
  if (status === 'sold') {
    return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
  return 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100';
}

export function propertyStatusLabel(status?: string | null): string {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'sold') return 'Vendido';
  if (normalized === 'rented') return 'Alugado';
  if (normalized === 'approved') return 'Aprovado';
  if (normalized === 'pending_approval') return 'Pendente';
  return normalized ? normalized : '-';
}

export function purposeLabel(purpose?: string | null): string {
  const normalized = String(purpose ?? '').trim();
  return normalized.length > 0 ? normalized : '-';
}

export function formatCurrency(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function areaUnitLabel(unit?: string | null): string {
  if (unit === 'hectare') return 'ha';
  if (unit === 'alqueire') return 'alq';
  return 'm²';
}

export function formatArea(value?: number | null, unit?: string | null): string {
  if (value == null || Number.isNaN(value)) return '-';
  return `${value} ${areaUnitLabel(unit)}`;
}

export function formatAreaFromDetail(
  originalValue?: number | null,
  fallbackM2?: number | null,
  unit?: string | null
): string {
  if (originalValue != null && !Number.isNaN(originalValue)) {
    return formatArea(originalValue, unit);
  }
  return formatArea(fallbackM2, unit);
}

export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

export function extractCoverUrl(
  source: { imageUrl?: unknown; image_url?: unknown; property_image_url?: unknown; images?: unknown } | null | undefined
): string | null {
  if (!source) return null;
  const direct =
    normalizeImageUrl(source.imageUrl) ??
    normalizeImageUrl(source.image_url) ??
    normalizeImageUrl(source.property_image_url);
  if (direct) return direct;

  const rawImages = source.images;
  if (!rawImages) return null;

  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0] as Record<string, unknown>;
        return normalizeImageUrl(first?.url) ?? normalizeImageUrl(first?.image_url);
      }
    } catch {
      return normalizeImageUrl(trimmed.split(/[;,|]/)[0] ?? null);
    }
    return null;
  }

  if (Array.isArray(rawImages) && rawImages.length > 0) {
    const first = rawImages[0];
    if (typeof first === 'string') return normalizeImageUrl(first);
    if (first && typeof first === 'object') {
      const record = first as Record<string, unknown>;
      return normalizeImageUrl(record.url) ?? normalizeImageUrl(record.image_url);
    }
  }

  return null;
}
