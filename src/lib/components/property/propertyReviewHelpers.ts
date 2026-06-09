export type PropertyRequestType = 'creation' | 'edit';
export type PropertyRequestTypeFilter = 'all' | PropertyRequestType;

export type PropertySummaryLike = {
  request_type?: PropertyRequestType | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function inferPropertyRequestType(property: PropertySummaryLike): PropertyRequestType {
  if (property.request_type === 'creation' || property.request_type === 'edit') {
    return property.request_type;
  }

  const createdAtRaw = String(property.created_at ?? '').trim();
  const updatedAtRaw = String(property.updated_at ?? '').trim();
  if (!createdAtRaw || !updatedAtRaw) {
    return 'creation';
  }

  const createdAt = Date.parse(createdAtRaw);
  const updatedAt = Date.parse(updatedAtRaw);
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) {
    return 'creation';
  }

  return updatedAt - createdAt >= 60 * 1000 ? 'edit' : 'creation';
}

export function humanizePropertyRequestType(type: PropertyRequestType): string {
  return type === 'edit' ? 'Edição' : 'Criação';
}

export function propertyRequestTypeBadgeClasses(type: PropertyRequestType): string {
  if (type === 'edit') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
}

export function reviewPropertyRequestTypeLabel(type: PropertyRequestTypeFilter): string {
  if (type === 'edit') return 'somente edição';
  if (type === 'creation') return 'somente criação';
  return 'criação e edição';
}
