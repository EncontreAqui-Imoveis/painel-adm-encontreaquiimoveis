export const PROPERTY_AMENITY_OPTIONS = [
  'POÇO ARTESIANO',
  'MOBILIADA',
  'PLANEJADOS',
  'ELEVADOR',
  'ACADEMIA',
  'CHURRASQUEIRA',
  'SALÃO DE FESTAS',
  'QUADRA',
  'CONDOMÍNIO FECHADO',
  'ACEITA PETS',
  'SISTEMA DE SEGURANÇA/CÂMARA',
  'SAUNA',
] as const;

export type PropertyAmenity = (typeof PROPERTY_AMENITY_OPTIONS)[number];

const CANONICAL_AMENITY_LOOKUP: Record<string, PropertyAmenity> = {
  'poco artesanal': 'POÇO ARTESIANO',
  'mobiliada': 'MOBILIADA',
  'planejados': 'PLANEJADOS',
  'elevador': 'ELEVADOR',
  'academia': 'ACADEMIA',
  'churrasqueira': 'CHURRASQUEIRA',
  'salao de festas': 'SALÃO DE FESTAS',
  'quadra': 'QUADRA',
  'condominio fechado': 'CONDOMÍNIO FECHADO',
  'condomínio fechado': 'CONDOMÍNIO FECHADO',
  'aceita pets': 'ACEITA PETS',
  'sistema de seguranca/camera': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de seguranca/câmera': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de seguranca': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de seguranca /camera': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de seguranca / câmera': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de seguranca /camara': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de seguranca/camara': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de segurança/câmera': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sistema de segurança/camera': 'SISTEMA DE SEGURANÇA/CÂMARA',
  'sauna': 'SAUNA',
};

const AMENITY_ID_TO_CANONICAL: Record<string, PropertyAmenity> = {
  '1': 'POÇO ARTESIANO',
  '2': 'MOBILIADA',
  '3': 'PLANEJADOS',
  '4': 'ELEVADOR',
  '5': 'ACADEMIA',
  '6': 'CHURRASQUEIRA',
  '7': 'SALÃO DE FESTAS',
  '8': 'QUADRA',
  '9': 'CONDOMÍNIO FECHADO',
  '10': 'ACEITA PETS',
  '11': 'SISTEMA DE SEGURANÇA/CÂMARA',
  '12': 'SAUNA',
};

function normalizeAmenityInputValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizePropertyAmenity(value: string): PropertyAmenity | null {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }

  if (/^-?\d+$/.test(cleaned)) {
    return AMENITY_ID_TO_CANONICAL[cleaned] ?? null;
  }

  const normalized = normalizeAmenityInputValue(cleaned).replace(/[\u2012\u2013\u2014]/g, '-');
  const mapped = CANONICAL_AMENITY_LOOKUP[normalized];
  if (mapped) return mapped;

  const canonicalValue = PROPERTY_AMENITY_OPTIONS.find((item) => {
    const normalizedItem = normalizeAmenityInputValue(item);
    return normalizedItem === normalized;
  });
  return canonicalValue ?? null;
}

function parseAmenityRawText(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry));
      }
    } catch {
      return [trimmed];
    }
  }

  if (trimmed.includes(',')) {
    return trimmed.split(',').map((entry) => entry.trim());
  }

  if (trimmed.includes(';')) {
    return trimmed.split(';').map((entry) => entry.trim());
  }

  return [trimmed];
}

export function normalizeAmenityList(raw: unknown): string[] {
  if (raw == null) return [];

  const values: string[] = Array.isArray(raw)
    ? raw.map((entry) => String(entry))
    : typeof raw === 'object'
      ? [String(raw)]
      : parseAmenityRawText(String(raw));

  const normalized = new Set<PropertyAmenity>();
  for (const value of values) {
    const normalizedValue = normalizePropertyAmenity(value);
    if (normalizedValue) {
      normalized.add(normalizedValue);
    }
  }

  return Array.from(normalized);
}

export function hasAmenity(amenities: unknown, amenity: PropertyAmenity): boolean {
  return normalizeAmenityList(amenities).includes(amenity);
}

export function toggleAmenity(
  amenities: unknown,
  amenity: PropertyAmenity,
  checked: boolean
): string[] {
  const normalized = new Set(normalizeAmenityList(amenities));
  if (checked) {
    normalized.add(amenity);
  } else {
    normalized.delete(amenity);
  }
  return Array.from(normalized);
}
