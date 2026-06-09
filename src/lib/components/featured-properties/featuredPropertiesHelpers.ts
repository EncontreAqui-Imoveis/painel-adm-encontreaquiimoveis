export type FeaturedPropertyLike = {
  id: number;
  code?: string | null;
  title: string;
  bairro?: string | null;
  city?: string | null;
  state?: string | null;
  price?: number | null;
  price_sale?: number | null;
  price_rent?: number | null;
  purpose?: string | null;
  broker_name?: string | null;
  property_image_url?: string | null;
  position?: number | null;
};

export function sortFeaturedList(items: FeaturedPropertyLike[]): FeaturedPropertyLike[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aPosition = Number.isFinite(Number(a.item.position))
        ? Number(a.item.position)
        : Number.MAX_SAFE_INTEGER;
      const bPosition = Number.isFinite(Number(b.item.position))
        ? Number(b.item.position)
        : Number.MAX_SAFE_INTEGER;
      if (aPosition !== bPosition) return aPosition - bPosition;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function mergeCandidatesWithFeatured(
  featuredSale: FeaturedPropertyLike[],
  featuredRent: FeaturedPropertyLike[],
  items: FeaturedPropertyLike[]
): FeaturedPropertyLike[] {
  const merged = new Map<number, FeaturedPropertyLike>();
  for (const item of [...featuredSale, ...featuredRent, ...items]) {
    merged.set(item.id, { ...(merged.get(item.id) ?? {}), ...item });
  }
  return Array.from(merged.values());
}

export function formatCurrency(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatLocation(item: FeaturedPropertyLike): string {
  const parts = [item.bairro, item.city, item.state]
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0);
  return parts.length > 0 ? parts.join(' - ') : '-';
}

export function purposeSupportsSale(p: string | null | undefined): boolean {
  const t = String(p ?? '').trim();
  return t === 'Venda' || t === 'Venda e Aluguel';
}

export function purposeSupportsRent(p: string | null | undefined): boolean {
  const t = String(p ?? '').trim();
  return t === 'Aluguel' || t === 'Venda e Aluguel';
}

export function isDualPurpose(p: string | null | undefined): boolean {
  return purposeSupportsSale(p) && purposeSupportsRent(p);
}

export function addStateLabel(
  item: FeaturedPropertyLike,
  featuredSale: FeaturedPropertyLike[],
  featuredRent: FeaturedPropertyLike[]
): string {
  const inS = featuredSale.some((i) => i.id === item.id);
  const inR = featuredRent.some((i) => i.id === item.id);
  if (inS && inR) return 'Nos dois';
  if (isDualPurpose(item.purpose) && inS && !inR) return 'Adicionar aluguel';
  if (isDualPurpose(item.purpose) && inR && !inS) return 'Adicionar venda';
  return 'Adicionar';
}

export function membershipLabel(
  item: FeaturedPropertyLike,
  featuredSale: FeaturedPropertyLike[],
  featuredRent: FeaturedPropertyLike[]
): string | null {
  const inS = featuredSale.some((i) => i.id === item.id);
  const inR = featuredRent.some((i) => i.id === item.id);
  if (inS && inR) return 'Já está em Venda e Aluguel';
  if (inS) return 'Já está em Venda';
  if (inR) return 'Já está em Aluguel';
  return null;
}

export function candidatePriceLabel(item: FeaturedPropertyLike): string {
  const supportsSale = purposeSupportsSale(item.purpose);
  const supportsRent = purposeSupportsRent(item.purpose);
  const saleValue = item.price_sale ?? (supportsSale && !supportsRent ? item.price : null);
  const rentValue = item.price_rent ?? (supportsRent && !supportsSale ? item.price : null);

  if (supportsSale && supportsRent) {
    return `Venda: ${formatCurrency(saleValue)} · Aluguel: ${formatCurrency(rentValue)}`;
  }
  if (supportsSale) return formatCurrency(saleValue);
  if (supportsRent) return formatCurrency(rentValue);
  return formatCurrency(item.price);
}

export function crossScopeBadge(
  scope: 'sale' | 'rent',
  item: FeaturedPropertyLike,
  featuredSale: FeaturedPropertyLike[],
  featuredRent: FeaturedPropertyLike[]
): string | null {
  const isAlsoInSale = featuredSale.some((featured) => featured.id === item.id);
  const isAlsoInRent = featuredRent.some((featured) => featured.id === item.id);

  if (scope === 'sale' && isAlsoInRent) return 'Também em Aluguel';
  if (scope === 'rent' && isAlsoInSale) return 'Também em Venda';
  return null;
}

export function rowAddDisabled(
  item: FeaturedPropertyLike,
  featuredSale: FeaturedPropertyLike[],
  featuredRent: FeaturedPropertyLike[],
  maxFeatured: number
): boolean {
  if (isDualPurpose(item.purpose)) {
    return (
      featuredSale.some((i) => i.id === item.id) && featuredRent.some((i) => i.id === item.id)
    );
  }
  if (purposeSupportsSale(item.purpose) && !purposeSupportsRent(item.purpose)) {
    return featuredSale.some((i) => i.id === item.id) || featuredSale.length >= maxFeatured;
  }
  if (purposeSupportsRent(item.purpose) && !purposeSupportsSale(item.purpose)) {
    return featuredRent.some((i) => i.id === item.id) || featuredRent.length >= maxFeatured;
  }
  return featuredSale.length >= maxFeatured;
}
