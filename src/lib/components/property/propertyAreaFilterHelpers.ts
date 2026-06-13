import { normalizeAreaUnit, type AreaUnit } from '$lib/components/property/propertyFormattingHelpers';

export type AreaMetric = 'none' | 'area_construida_valor' | 'area_terreno_valor';

type AreaFilterLike = {
  area_construida_valor?: number | null;
  area_terreno_valor?: number | null;
  area_construida_m2?: number | null;
  area_terreno_m2?: number | null;
  area_construida_unidade?: unknown;
  area_terreno_unidade?: unknown;
};

export function isAreaUnitConvertibleUnit(unit: AreaUnit): boolean {
  return unit === 'm2' || unit === 'hectare' || unit === 'alqueire';
}

export function convertAreaToSquareMeters(value: number, unit: AreaUnit): number | null {
  if (!Number.isFinite(value)) return null;
  if (unit === 'm2') return value;
  if (unit === 'hectare') return value * 10000;
  if (unit === 'alqueire') return value * 24200;
  return null;
}

export function parseAreaFilterInput(raw: string): number | null {
  const normalized = String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getAreaComparableValue(
  property: AreaFilterLike,
  metric: Exclude<AreaMetric, 'none'>
): number | null {
  const m2Value =
    metric === 'area_construida_valor' ? property.area_construida_m2 : property.area_terreno_m2;
  if (m2Value != null && Number.isFinite(m2Value)) {
    return m2Value;
  }

  const areaValue =
    metric === 'area_construida_valor' ? property.area_construida_valor : property.area_terreno_valor;
  if (areaValue == null) return null;
  const areaUnit =
    metric === 'area_construida_valor'
      ? normalizeAreaUnit(property.area_construida_unidade) ?? 'm2'
      : normalizeAreaUnit(property.area_terreno_unidade) ?? 'm2';
  return convertAreaToSquareMeters(areaValue, areaUnit);
}

export function propertyMatchesAreaFilter(
  property: AreaFilterLike,
  areaFilterMetric: AreaMetric,
  areaFilterMin: string,
  areaFilterMax: string,
  areaFilterUnit: AreaUnit
): boolean {
  if (areaFilterMetric === 'none') return true;
  const minM2Raw = parseAreaFilterInput(areaFilterMin);
  const maxM2Raw = parseAreaFilterInput(areaFilterMax);
  const hasMin = minM2Raw !== null;
  const hasMax = maxM2Raw !== null;
  if (!hasMin && !hasMax) return true;

  const minM2 = hasMin ? convertAreaToSquareMeters(minM2Raw, areaFilterUnit) : null;
  const maxM2 = hasMax ? convertAreaToSquareMeters(maxM2Raw, areaFilterUnit) : null;

  if ((minM2 != null || maxM2 != null) && !isAreaUnitConvertibleUnit(areaFilterUnit)) {
    return false;
  }

  const areaM2 = getAreaComparableValue(property, areaFilterMetric);
  if (areaM2 == null) return false;
  if (minM2 != null && areaM2 < minM2) return false;
  if (maxM2 != null && areaM2 > maxM2) return false;
  return true;
}

export function compareByAreaSort(
  first: AreaFilterLike,
  second: AreaFilterLike,
  areaSortMetric: AreaMetric,
  areaSortDirection: 'asc' | 'desc'
): number {
  if (areaSortMetric === 'none') return 0;
  const areaA = getAreaComparableValue(first, areaSortMetric);
  const areaB = getAreaComparableValue(second, areaSortMetric);

  if (areaA == null && areaB == null) return 0;
  if (areaA == null) return areaSortDirection === 'asc' ? 1 : -1;
  if (areaB == null) return areaSortDirection === 'asc' ? -1 : 1;

  const delta = areaA - areaB;
  return areaSortDirection === 'asc' ? delta : -delta;
}
