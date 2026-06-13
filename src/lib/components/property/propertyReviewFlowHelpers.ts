export type PropertyReviewImage = {
  id: number;
  url: string;
};

export type PropertyReviewBase = {
  id: number;
  public_code?: string | null;
  purpose?: string | null;
  numero?: string | null;
  sem_quadra?: number | boolean | null;
  sem_lote?: number | boolean | null;
  sem_cep?: number | boolean | null;
  price?: number | null;
  price_sale?: number | null;
  price_rent?: number | null;
  promotion_percentage?: number | null;
  promotion_price?: number | null;
  promotional_rent_price?: number | null;
  promotional_rent_percentage?: number | null;
  images?: unknown;
  amenities?: unknown;
};

export type PropertyReviewResolvedState<TProperty extends PropertyReviewBase> = {
  mergedProperty: TProperty;
  editableProperty: TProperty;
  editSemNumero: boolean;
  editSemQuadra: boolean;
  editSemLote: boolean;
  editSemCep: boolean;
  galleryImages: PropertyReviewImage[];
  selectedAmenities: string[];
};

export type ResolvePropertyReviewStateInput<TProperty extends PropertyReviewBase> = {
  property: TProperty;
  details: Partial<TProperty>;
  normalizePublicCode: (value: unknown) => string | null;
  getPurposeFlags: (purpose?: string | null) => { supportsSale: boolean; supportsRent: boolean };
  clampPropertyPriceValue: (value: number | null | undefined, max: number) => number | null;
  saleMax: number;
  rentMax: number;
  sanitizeEditable: (data: Partial<TProperty>) => TProperty;
  normalizeAmenityList: (value: any) => string[];
  normalizeImages: (value: any) => PropertyReviewImage[];
  isSemNumeroValue: (value: unknown) => boolean;
};

export function resolvePropertyReviewState<TProperty extends PropertyReviewBase>(
  input: ResolvePropertyReviewStateInput<TProperty>
): PropertyReviewResolvedState<TProperty> {
  const { property, details, normalizePublicCode, getPurposeFlags, clampPropertyPriceValue } = input;
  const mergedPublicCode = normalizePublicCode(details.public_code ?? property.public_code);
  const safeDetails = Object.fromEntries(
    Object.entries(details ?? {}).filter(([, value]) => value !== undefined)
  ) as Partial<TProperty>;
  const merged = {
    ...property,
    ...safeDetails,
    public_code: mergedPublicCode,
  } as TProperty;
  const selectedAmenities = input.normalizeAmenityList(merged.amenities ?? null);
  const { supportsSale, supportsRent } = getPurposeFlags(merged.purpose ?? null);
  const resolvedSale =
    merged.price_sale ?? (supportsSale && !supportsRent ? merged.price ?? null : null);
  const resolvedRent =
    merged.price_rent ?? (supportsRent && !supportsSale ? merged.price ?? null : null);
  const clampedSale = clampPropertyPriceValue(resolvedSale, input.saleMax);
  const clampedRent = clampPropertyPriceValue(resolvedRent, input.rentMax);
  const editableProperty = input.sanitizeEditable({
    ...merged,
    price_sale: clampedSale,
    price_rent: clampedRent,
    promotion_percentage:
      merged.promotion_percentage != null ? Number(merged.promotion_percentage) : null,
    promotion_price: merged.promotion_price != null ? Number(merged.promotion_price) : null,
    promotional_rent_price:
      merged.promotional_rent_price != null ? Number(merged.promotional_rent_price) : null,
    promotional_rent_percentage:
      merged.promotional_rent_percentage != null ? Number(merged.promotional_rent_percentage) : null,
  });

  return {
    mergedProperty: merged,
    editableProperty,
    editSemNumero: input.isSemNumeroValue(merged.numero),
    editSemQuadra: Boolean(merged.sem_quadra),
    editSemLote: Boolean(merged.sem_lote),
    editSemCep: Boolean(merged.sem_cep),
    galleryImages: input.normalizeImages(merged.images ?? null),
    selectedAmenities,
  };
}

export type PropertyStatusMutationResult =
  | { ok: true }
  | { ok: false; status?: number; error: unknown };

export type SubmitPropertyReviewStatusInput = {
  api: { patch: (path: string, body: Record<string, unknown>) => Promise<unknown> };
  propertyId: number;
  newStatus: 'approved' | 'rejected';
  reason?: string | null;
};

export async function submitPropertyReviewStatus(
  input: SubmitPropertyReviewStatusInput
): Promise<PropertyStatusMutationResult> {
  try {
    await input.api.patch(
      `/admin/properties/${input.propertyId}/${input.newStatus === 'approved' ? 'approve' : 'reject'}`,
      input.newStatus === 'rejected' && input.reason ? { reason: input.reason } : {}
    );
    return { ok: true };
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return { ok: false, status, error };
  }
}
