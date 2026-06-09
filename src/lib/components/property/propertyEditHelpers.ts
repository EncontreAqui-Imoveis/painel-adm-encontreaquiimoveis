import { parsePromotionPercentage } from '$lib/components/create-property-helpers';

export type PropertyStatus = 'approved' | 'sold' | 'rented' | 'rejected' | string;

export type PropertyEditLike = {
  id?: number;
  status?: PropertyStatus;
  purpose?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  price_sale?: number | null;
  price_rent?: number | null;
  promotion_percentage?: number | null;
  promotional_rent_percentage?: number | null;
  promotion_price?: number | null;
  promotional_rent_price?: number | null;
  address?: string | null;
  cep?: string | null;
  city?: string | null;
  state?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  sem_numero?: number | boolean | null;
  sem_quadra?: number | boolean | null;
  sem_lote?: number | boolean | null;
  sem_cep?: number | boolean | null;
  quadra?: string | null;
  lote?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garage_spots?: number | null;
  area_construida_valor?: number | null;
  area_construida_unidade?: string | null;
  area_terreno_valor?: number | null;
  area_terreno_unidade?: string | null;
  type?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  valor_condominio?: number | null;
  valor_iptu?: number | null;
  broker_id?: number | null;
  owner_id?: number | null;
  public_code?: string | null;
  video_url?: string | null;
};

export type PropertyEditFlags = {
  editSemNumero: boolean;
  editSemQuadra: boolean;
  editSemLote: boolean;
  editSemCep: boolean;
};

export type PropertyEditState = {
  editPromotionSalePercentageDisplay: string;
  editPromotionRentPercentageDisplay: string;
  editValorCondominioDisplay: string;
  editValorIptuDisplay: string;
  editSelectedAmenities: string[];
};

export type PropertyEditResult =
  | {
      ok: true;
      payload: Record<string, unknown>;
      requestedStatus: PropertyStatus | null;
      shouldRefreshList: boolean;
    }
  | {
      ok: false;
      error: string;
  };

export type PropertyEditUpdateStrategy =
  | {
      useStatusOnlyUpdate: true;
      endpoint: 'approve' | 'status';
    }
  | {
      useStatusOnlyUpdate: false;
      endpoint: null;
    };

type BuildPropertyEditPayloadInput = {
  originalProperty: PropertyEditLike;
  editableProperty: PropertyEditLike;
  flags: PropertyEditFlags;
  state: PropertyEditState;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function parseCurrencyDisplay(value: string): number | null {
  const digits = onlyDigits(value);
  if (!digits) return null;
  const parsed = Number(digits) / 100;
  return Number.isFinite(parsed) ? parsed : null;
}

function getPurposeFlags(purpose?: string | null) {
  const normalized = String(purpose ?? '').toLowerCase();
  const supportsSale = normalized.includes('vend');
  const supportsRent = normalized.includes('alug');
  return { supportsSale, supportsRent, isDual: supportsSale && supportsRent };
}

function sanitizeValue(key: string, value: unknown) {
  if (value === undefined) return undefined;
  if (value === '' || value === null) return null;
  if (key === 'description' && (value === null || value === undefined)) {
    return '';
  }
  if (
    [
      'price',
      'price_sale',
      'price_rent',
      'promotion_percentage',
      'promotional_rent_percentage',
      'promotion_price',
      'promotional_rent_price',
      'area_construida',
      'area_terreno',
      'area_construida_valor',
      'area_terreno_valor',
      'bedrooms',
      'bathrooms',
      'garage_spots',
      'sale_value',
      'commission_rate',
      'commission_value',
      'valor_condominio',
      'valor_iptu',
      'sem_numero',
      'sem_quadra',
      'sem_lote',
      'sem_cep',
      'is_promoted',
    ].includes(key)
  ) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return value;
}

export function shouldRefreshPropertyListAfterEdit(
  original: PropertyEditLike,
  patch: Record<string, unknown>
): boolean {
  const listSensitiveKeys = ['title', 'purpose', 'city', 'state', 'bairro', 'public_code'];
  return listSensitiveKeys.some((key) => {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) return false;
    return patch[key] !== (original as Record<string, unknown>)[key];
  });
}

export function resolvePropertyEditUpdateStrategy(
  original: PropertyEditLike,
  payload: Record<string, unknown>,
  requestedStatus: PropertyStatus | null
): PropertyEditUpdateStrategy {
  if (!requestedStatus) {
    return { useStatusOnlyUpdate: false, endpoint: null };
  }

  const statusChanged = requestedStatus !== original.status;
  if (!statusChanged) {
    return { useStatusOnlyUpdate: false, endpoint: null };
  }

  const fieldsBesidesStatus = Object.keys(payload).filter((key) => key !== 'status');
  const onlyStatusChanged = fieldsBesidesStatus.every(
    (key) => payload[key] === (original as Record<string, unknown>)[key]
  );

  if (!onlyStatusChanged) {
    return { useStatusOnlyUpdate: false, endpoint: null };
  }

  return {
    useStatusOnlyUpdate: true,
    endpoint: requestedStatus === 'approved' ? 'approve' : 'status',
  };
}

export function buildPropertyEditPayload(
  input: BuildPropertyEditPayloadInput
): PropertyEditResult {
  const { originalProperty, editableProperty, flags, state } = input;
  const numeroRaw = String(editableProperty.numero ?? '').trim();
  const numeroDigits = onlyDigits(numeroRaw);
  if (!flags.editSemNumero && numeroRaw.length > 0 && numeroDigits.length === 0) {
    return { ok: false, error: 'Número do endereço deve conter apenas dígitos.' };
  }

  const purposeFlags = getPurposeFlags(
    editableProperty.purpose ?? originalProperty.purpose ?? null
  );

  const rawPrice = editableProperty.price ?? null;
  const rawPriceSale = editableProperty.price_sale ?? null;
  const rawPriceRent = editableProperty.price_rent ?? null;
  const resolvedPriceSale = purposeFlags.supportsSale
    ? rawPriceSale ?? (purposeFlags.supportsRent ? null : rawPrice)
    : null;
  const resolvedPriceRent = purposeFlags.supportsRent
    ? rawPriceRent ?? (purposeFlags.supportsSale ? null : rawPrice)
    : null;
  const resolvedPrice = resolvedPriceSale ?? resolvedPriceRent ?? rawPrice ?? null;

  const resolvedPriceSaleValue = resolvedPriceSale != null ? Number(resolvedPriceSale) : null;
  const resolvedPriceRentValue = resolvedPriceRent != null ? Number(resolvedPriceRent) : null;
  const resolvedPriceValue = resolvedPrice != null ? Number(resolvedPrice) : null;

  const promotionSalePercentageValue = purposeFlags.supportsSale
    ? parsePromotionPercentage(state.editPromotionSalePercentageDisplay)
    : null;
  const promotionRentPercentageValue = purposeFlags.supportsRent
    ? parsePromotionPercentage(state.editPromotionRentPercentageDisplay)
    : null;

  const discountedSale = promotionSalePercentageValue != null
    ? Number((resolvedPriceSaleValue ?? 0) * (1 - promotionSalePercentageValue / 100))
    : null;
  const discountedRent = promotionRentPercentageValue != null
    ? Number((resolvedPriceRentValue ?? 0) * (1 - promotionRentPercentageValue / 100))
    : null;

  if (
    purposeFlags.supportsSale &&
    state.editPromotionSalePercentageDisplay.trim() &&
    promotionSalePercentageValue == null
  ) {
    return { ok: false, error: 'Percentual de desconto da venda inválido.' };
  }

  if (
    purposeFlags.supportsRent &&
    state.editPromotionRentPercentageDisplay.trim() &&
    promotionRentPercentageValue == null
  ) {
    return { ok: false, error: 'Percentual de desconto do aluguel inválido.' };
  }

  if (purposeFlags.isDual) {
    if (
      resolvedPriceSaleValue == null ||
      resolvedPriceSaleValue <= 0 ||
      resolvedPriceRentValue == null ||
      resolvedPriceRentValue <= 0
    ) {
      return { ok: false, error: 'Informe os preços de venda e aluguel.' };
    }
  } else if (resolvedPriceValue == null || resolvedPriceValue <= 0) {
    return { ok: false, error: 'Informe um preço válido.' };
  }

  if (
    discountedSale != null &&
    resolvedPriceSaleValue != null &&
    discountedSale >= resolvedPriceSaleValue
  ) {
    return {
      ok: false,
      error: 'Preço promocional de venda deve ser menor que o preço de venda.',
    };
  }

  if (
    discountedRent != null &&
    resolvedPriceRentValue != null &&
    discountedRent >= resolvedPriceRentValue
  ) {
    return {
      ok: false,
      error: 'Preço promocional de aluguel deve ser menor que o preço de aluguel.',
    };
  }

  const requestedStatus =
    editableProperty.status === 'approved' ||
    editableProperty.status === 'sold' ||
    editableProperty.status === 'rented' ||
    editableProperty.status === 'rejected'
      ? editableProperty.status
      : null;

  const basePayload: Record<string, unknown> = {
    title: editableProperty.title,
    description: editableProperty.description,
    purpose: editableProperty.purpose,
    price: resolvedPriceValue ?? undefined,
    price_sale: purposeFlags.supportsSale ? (resolvedPriceSaleValue ?? undefined) : null,
    price_rent: purposeFlags.supportsRent ? (resolvedPriceRentValue ?? undefined) : null,
    promotion_price: purposeFlags.supportsSale ? discountedSale : null,
    promotional_rent_price: purposeFlags.supportsRent ? discountedRent : null,
    promotion_percentage: purposeFlags.supportsSale ? promotionSalePercentageValue : null,
    promotional_rent_percentage: purposeFlags.supportsRent ? promotionRentPercentageValue : null,
    is_promoted:
      (discountedSale ?? 0) > 0 ||
      (discountedRent ?? 0) > 0 ||
      (promotionSalePercentageValue ?? 0) > 0 ||
      (promotionRentPercentageValue ?? 0) > 0
        ? 1
        : 0,
    address: editableProperty.address,
    cep: editableProperty.cep ? onlyDigits(editableProperty.cep) : editableProperty.cep,
    city: editableProperty.city,
    state: editableProperty.state,
    bairro: editableProperty.bairro,
    numero: flags.editSemNumero ? null : numeroDigits.length > 0 ? numeroDigits : null,
    sem_numero: flags.editSemNumero ? 1 : 0,
    complemento: editableProperty.complemento,
    sem_quadra: flags.editSemQuadra ? 1 : 0,
    sem_lote: flags.editSemLote ? 1 : 0,
    quadra: flags.editSemQuadra ? null : editableProperty.quadra,
    lote: flags.editSemLote ? null : editableProperty.lote,
    sem_cep: flags.editSemCep ? 1 : 0,
    bedrooms: editableProperty.bedrooms,
    bathrooms: editableProperty.bathrooms,
    garage_spots: editableProperty.garage_spots,
    area_construida: editableProperty.area_construida_valor,
    area_construida_valor: editableProperty.area_construida_valor,
    area_construida_unidade: editableProperty.area_construida_unidade ?? 'm2',
    area_terreno: editableProperty.area_terreno_valor,
    area_terreno_valor: editableProperty.area_terreno_valor,
    area_terreno_unidade: editableProperty.area_terreno_unidade ?? 'm2',
    amenities: state.editSelectedAmenities,
    video_url: editableProperty.video_url,
    type: editableProperty.type,
    owner_name: editableProperty.owner_name,
    owner_phone: editableProperty.owner_phone,
    valor_condominio: parseCurrencyDisplay(state.editValorCondominioDisplay),
    valor_iptu: parseCurrencyDisplay(state.editValorIptuDisplay),
    broker_id: editableProperty.broker_id,
    owner_id: editableProperty.owner_id,
  };

  if (requestedStatus) {
    basePayload.status = requestedStatus;
  }

  const payload = Object.fromEntries(
    Object.entries(basePayload)
      .map(([key, value]) => [key, sanitizeValue(key, value)])
      .filter(([, value]) => value !== undefined)
  );

  return {
    ok: true,
    payload,
    requestedStatus,
    shouldRefreshList: shouldRefreshPropertyListAfterEdit(originalProperty, payload),
  };
}
