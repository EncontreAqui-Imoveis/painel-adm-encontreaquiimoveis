export type AreaUnit = 'm2' | 'hectare' | 'alqueire';

export function formatCurrency(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function normalizeCityLabel(city: unknown): string | null {
  if (typeof city === 'string') {
    const trimmed = city.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!city || typeof city !== 'object') {
    return null;
  }

  const record = city as Record<string, unknown>;
  const rawCity = record.nome ?? record.name ?? record.city ?? record.label ?? record.cidade;
  if (typeof rawCity === 'string') {
    const trimmed = rawCity.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

export function normalizeAreaUnit(value: unknown): AreaUnit | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'm2' || normalized === 'hectare' || normalized === 'alqueire') {
    return normalized;
  }
  if (normalized === 'm²' || normalized === 'm 2') {
    return 'm2';
  }
  if (normalized === 'ha' || normalized === 'ha.' || normalized === 'hectares') {
    return 'hectare';
  }
  return null;
}

export function areaUnitLabel(value: unknown): string {
  const normalized = normalizeAreaUnit(value);
  if (normalized === 'hectare') return 'ha';
  if (normalized === 'alqueire') return 'alqueire';
  return 'm²';
}

export function formatAreaWithUnit(value: unknown, unit: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${String(value)} ${areaUnitLabel(unit)}`;
  return `${parsed} ${areaUnitLabel(unit)}`;
}

export function isOptionalBairroPropertyType(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'área rural' || normalized === 'chácara' || normalized === 'rancho';
}

export function isSemNumeroValue(value: unknown): boolean {
  const normalized = String(value ?? '').trim();
  return normalized === '' || normalized === '0';
}

export function formatNumeroDisplay(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '0') return 'S/N';
  return raw;
}

export function getPurposeFlags(purpose?: string | null) {
  const normalized = (purpose ?? '').toLowerCase();
  const supportsSale = normalized.includes('vend');
  const supportsRent = normalized.includes('alug');
  return { supportsSale, supportsRent, isDual: supportsSale && supportsRent };
}

export function resolvePriceLines(property: {
  price?: number | null;
  price_sale?: number | null;
  price_rent?: number | null;
  purpose?: string | null;
}) {
  const lines: Array<{ label: string; value: number }> = [];
  const { supportsSale, supportsRent } = getPurposeFlags(property.purpose ?? null);
  const salePrice = property.price_sale ?? (supportsSale && !supportsRent ? property.price ?? null : null);
  const rentPrice = property.price_rent ?? (supportsRent && !supportsSale ? property.price ?? null : null);

  if (salePrice != null && Number(salePrice) > 0) {
    lines.push({ label: 'Venda', value: Number(salePrice) });
  }
  if (rentPrice != null && Number(rentPrice) > 0) {
    lines.push({ label: 'Aluguel', value: Number(rentPrice) });
  }
  if (lines.length === 0 && property.price != null) {
    lines.push({ label: 'Preço', value: Number(property.price) });
  }
  return lines;
}

/** Números da API usam ponto decimal; entradas pt-BR podem usar vírgula. */
export function parsePropertyAreaNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim().replace(/\s+/g, '');
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export type PropertyAreaValues = {
  area_construida?: unknown;
  area_construida_m2?: unknown;
  area_construida_valor?: unknown;
  area_construida_unidade?: unknown;
  area_terreno?: unknown;
  area_terreno_m2?: unknown;
  area_terreno_valor?: unknown;
  area_terreno_unidade?: unknown;
};

function resolveAreaValue(value: unknown, canonical: unknown, legacy: unknown, unitRaw: unknown) {
  const unit = normalizeAreaUnit(unitRaw) ?? 'm2';
  // Mesma conversão canônica do backend: alqueire goiano = 48.400 m².
  const factor = unit === 'hectare' ? 10000 : unit === 'alqueire' ? 48400 : 1;
  const input = parsePropertyAreaNumber(value);
  const m2 = parsePropertyAreaNumber(canonical) ?? parsePropertyAreaNumber(legacy);
  return { value: input ?? (m2 == null ? null : m2 / factor), unit, m2: m2 ?? (input == null ? null : input * factor) };
}

export function resolvePropertyAreaValues(property: PropertyAreaValues) {
  const built = resolveAreaValue(property.area_construida_valor, property.area_construida_m2, property.area_construida, property.area_construida_unidade);
  const land = resolveAreaValue(property.area_terreno_valor, property.area_terreno_m2, property.area_terreno, property.area_terreno_unidade);
  return {
    area_construida_valor: built.value, area_construida_unidade: built.unit,
    area_construida: built.m2, area_construida_m2: built.m2,
    area_terreno_valor: land.value, area_terreno_unidade: land.unit,
    area_terreno: land.m2, area_terreno_m2: land.m2,
  };
}
