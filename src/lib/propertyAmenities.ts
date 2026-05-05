export const PROPERTY_AMENITY_OPTIONS = [
  'Poço Artesiano',
  'Mobiliada',
  'Elevador',
  'Academia',
  'Churrasqueira',
  'Salão de festas',
  'Quadra',
  'Condomínio Fechado',
  'Aceita pets',
  'Sistema de segurança/câmera',
  'Sauna',
] as const;

export type PropertyAmenity = (typeof PROPERTY_AMENITY_OPTIONS)[number];

const CANONICAL_AMENITY_LOOKUP: Record<string, PropertyAmenity> = {
  'poco artesanal': 'Poço Artesiano',
  'mobiliada': 'Mobiliada',
  'elevador': 'Elevador',
  'academia': 'Academia',
  'churrasqueira': 'Churrasqueira',
  'salao de festas': 'Salão de festas',
  'quadra': 'Quadra',
  'condominio fechado': 'Condomínio Fechado',
  'condomínio fechado': 'Condomínio Fechado',
  'aceita pets': 'Aceita pets',
  'sistema de seguranca/camera': 'Sistema de segurança/câmera',
  'sistema de seguranca/câmera': 'Sistema de segurança/câmera',
  'sistema de seguranca': 'Sistema de segurança/câmera',
  'sistema de seguranca /camera': 'Sistema de segurança/câmera',
  'sistema de seguranca / câmera': 'Sistema de segurança/câmera',
  'sistema de seguranca /camara': 'Sistema de segurança/câmera',
  'sistema de seguranca/camara': 'Sistema de segurança/câmera',
  'sistema de segurança/câmera': 'Sistema de segurança/câmera',
  'sistema de segurança/camera': 'Sistema de segurança/câmera',
  'sauna': 'Sauna',
};

const AMENITY_ID_TO_CANONICAL: Record<string, PropertyAmenity> = {
  '1': 'Poço Artesiano',
  '2': 'Mobiliada',
  '4': 'Elevador',
  '5': 'Academia',
  '6': 'Churrasqueira',
  '7': 'Salão de festas',
  '8': 'Quadra',
  '9': 'Condomínio Fechado',
  '10': 'Aceita pets',
  '11': 'Sistema de segurança/câmera',
  '12': 'Sauna',
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
