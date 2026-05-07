export const PROPERTY_AMENITY_OPTIONS = [
  'Wi-Fi',
  'Piscina',
  'Energia solar',
  'Automação',
  'Ar condicionado',
  'Poço artesiano',
  'Mobiliada',
  'Elevador',
  'Academia',
  'Churrasqueira',
  'Salão de festas',
  'Quadra',
  'Condomínio fechado',
  'Aceita pets',
  'Sistema de segurança/câmera',
  'Sauna',
] as const;

export type PropertyAmenity = (typeof PROPERTY_AMENITY_OPTIONS)[number];

const CANONICAL_AMENITY_LOOKUP: Record<string, PropertyAmenity> = {
  'wi-fi': 'Wi-Fi',
  'wifi': 'Wi-Fi',
  'wi fi': 'Wi-Fi',
  'piscina': 'Piscina',
  'energia solar': 'Energia solar',
  'energia': 'Energia solar',
  'automacao': 'Automação',
  'automação': 'Automação',
  'ar condicionado': 'Ar condicionado',
  'arcondicionado': 'Ar condicionado',
  'ar-condicionado': 'Ar condicionado',
  'poco artesanal': 'Poço artesiano',
  'poco artesiano': 'Poço artesiano',
  'poço artesiano': 'Poço artesiano',
  'mobiliada': 'Mobiliada',
  'elevador': 'Elevador',
  'academia': 'Academia',
  'churrasqueira': 'Churrasqueira',
  'salao de festas': 'Salão de festas',
  'quadra': 'Quadra',
  'condominio fechado': 'Condomínio fechado',
  'condomínio fechado': 'Condomínio fechado',
  'aceita pets': 'Aceita pets',
  'aceita pet': 'Aceita pets',
  'sistema de seguranca/camera': 'Sistema de segurança/câmera',
  'sistema de seguranca/câmera': 'Sistema de segurança/câmera',
  'sistema de seguranca': 'Sistema de segurança/câmera',
  'sistema de seguranca /camera': 'Sistema de segurança/câmera',
  'sistema de seguranca / câmera': 'Sistema de segurança/câmera',
  'sistema de seguranca /camara': 'Sistema de segurança/câmera',
  'sistema de seguranca/camara': 'Sistema de segurança/câmera',
  'sistema de segurança/câmera': 'Sistema de segurança/câmera',
  'sistema de segurança/camera': 'Sistema de segurança/câmera',
  'sistema de seguranca e camaras': 'Sistema de segurança/câmera',
  'sistema de seguranca e camera': 'Sistema de segurança/câmera',
  'sistema de segurança e câmera': 'Sistema de segurança/câmera',
  'sauna': 'Sauna',
};

const AMENITY_ID_TO_CANONICAL: Record<string, PropertyAmenity> = {
  '1': 'Poço artesiano',
  '2': 'Mobiliada',
  '4': 'Elevador',
  '5': 'Academia',
  '6': 'Churrasqueira',
  '7': 'Salão de festas',
  '8': 'Quadra',
  '9': 'Condomínio fechado',
  '10': 'Aceita pets',
  '11': 'Sistema de segurança/câmera',
  '12': 'Sauna',
};

const LEGACY_AMENITY_FLAG_TO_CANONICAL: Record<string, PropertyAmenity> = {
  haswifi: 'Wi-Fi',
  has_wifi: 'Wi-Fi',
  temwifi: 'Wi-Fi',
  wifi: 'Wi-Fi',
  piscina: 'Piscina',
  tempiscina: 'Piscina',
  haspiscina: 'Piscina',
  energiasolar: 'Energia solar',
  temenergiasolar: 'Energia solar',
  energiassolar: 'Energia solar',
  automacao: 'Automação',
  automação: 'Automação',
  temautomacao: 'Automação',
  temautomacaoesolar: 'Automação',
  arcondicionado: 'Ar condicionado',
  arecondicionado: 'Ar condicionado',
  ar_condicionado: 'Ar condicionado',
  temarcondicionado: 'Ar condicionado',
  pocouartesiano: 'Poço artesiano',
  pocofonte: 'Poço artesiano',
  pocoartesiano: 'Poço artesiano',
  poche: 'Poço artesiano',
  mobiliada: 'Mobiliada',
  ehmobiliada: 'Mobiliada',
  temmobiliada: 'Mobiliada',
  temmobiliado: 'Mobiliada',
  mobilia: 'Mobiliada',
  elevador: 'Elevador',
  temelevador: 'Elevador',
  haselevador: 'Elevador',
  academia: 'Academia',
  temaacademia: 'Academia',
  hasacademia: 'Academia',
  churrasqueira: 'Churrasqueira',
  temchurrasqueira: 'Churrasqueira',
  haschurrasqueira: 'Churrasqueira',
  salãodefestas: 'Salão de festas',
  salaofestas: 'Salão de festas',
  salao: 'Salão de festas',
  temsalaofestas: 'Salão de festas',
  quadra: 'Quadra',
  temquadra: 'Quadra',
  hasquadra: 'Quadra',
  condominio_fechado: 'Condomínio fechado',
  condominiofechado: 'Condomínio fechado',
  aceitaapets: 'Aceita pets',
  aceptapets: 'Aceita pets',
  aceitaanimais: 'Aceita pets',
  sistemadeseguranca: 'Sistema de segurança/câmera',
  sistemaseguranca: 'Sistema de segurança/câmera',
  seguranca: 'Sistema de segurança/câmera',
  temsistemadeseguranca: 'Sistema de segurança/câmera',
  temseguranca: 'Sistema de segurança/câmera',
  sauna: 'Sauna',
  hassauna: 'Sauna',
  temsauna: 'Sauna',
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

function toNumberishBoolean(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'sim' || normalized === 'yes';
  }
  return false;
}

function getLegacyAmenitiesFromRecord(source: Record<string, unknown>): PropertyAmenity[] {
  const detected = new Set<PropertyAmenity>();
  const toLookupKey = (value: string): string =>
    normalizeAmenityInputValue(value).replace(/[^a-z0-9]/g, '');

  for (const [rawKey, rawValue] of Object.entries(source)) {
    if (!toNumberishBoolean(rawValue)) continue;
    const lookupKey = toLookupKey(rawKey);
    const mapped = LEGACY_AMENITY_FLAG_TO_CANONICAL[rawKey] || LEGACY_AMENITY_FLAG_TO_CANONICAL[lookupKey];
    if (mapped) {
      detected.add(mapped);
    }
  }

  return Array.from(detected);
}

function getLegacyAmenitiesFromObjectValues(source: Record<string, unknown>): PropertyAmenity[] {
  const detected = new Set<PropertyAmenity>();
  const rawValues = source['amenities'];
  if (rawValues == null) {
    return [];
  }

  const normalizedValues = normalizeAmenityList(rawValues);
  for (const value of normalizedValues) {
    detected.add(value);
  }
  return Array.from(detected);
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

export function normalizeAmenityList(raw: unknown): PropertyAmenity[] {
  if (raw == null) return [];

  const values: string[] = Array.isArray(raw)
    ? raw.map((entry) => String(entry))
    : typeof raw === 'object'
      ? (() => {
          const source = raw as Record<string, unknown>;
          return [
            ...getLegacyAmenitiesFromObjectValues(source),
            ...getLegacyAmenitiesFromRecord(source),
          ];
        })()
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
