<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import { Input } from '$lib/components/ui/input';
  import AdminPasswordConfirmDialog from '$lib/components/AdminPasswordConfirmDialog.svelte';
  import { clampAreaInput, clampCountInput, extractApiErrorMessage } from '$lib/components/create-property-helpers';
  import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';
  import Pagination from '$lib/Pagination.svelte';
  import { fetchPlatformResponse, resolveApiAssetUrl } from './adminFetchService';
  import { clearSessionToken, hasSessionToken } from './sessionState';
  import type { PropertyStatus, PropertyImage as PropertyImageType } from './types';

  interface PropertySummary {
    id: number;
    title: string;
    bairro?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    promotion_percentage?: number | null;
    promotion_price?: number | null;
    promotional_rent_price?: number | null;
    promotional_rent_percentage?: number | null;
    status: PropertyStatus;
    purpose?: string | null;
    broker_id?: number | null;
    owner_id?: number | null;
    owner_name?: string | null;
    owner_phone?: string | null;
    broker_name?: string | null;
    broker_phone?: string | null;
    broker_status?: string | null;
    broker_creci?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    request_type?: 'creation' | 'edit' | null;
    area_construida_unidade?: AreaUnit | null;
    area_terreno_unidade?: AreaUnit | null;
    images?: Array<NormalizedImage | PropertyImageType | string> | string | null;
  }

  type NormalizedImage = PropertyImageType;
  type AreaUnit = 'm2' | 'hectare' | 'alqueire';

  type PropertyDetails = PropertySummary & {
    description?: string | null;
    purpose?: string | null;
    address?: string | null;
    quadra?: string | null;
    lote?: string | null;
    numero?: string | null;
    bairro?: string | null;
    complemento?: string | null;
    tipo_lote?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    garage_spots?: number | null;
    area_construida?: number | null;
    area_construida_unidade?: AreaUnit | null;
    area_terreno?: number | null;
    area_terreno_unidade?: AreaUnit | null;
    price_sale?: number | null;
    price_rent?: number | null;
    promotion_percentage?: number | null;
    promotion_price?: number | null;
    promotional_rent_price?: number | null;
    promotional_rent_percentage?: number | null;
    valor_condominio?: number | null;
    video_url?: string | null;
    has_wifi?: boolean | null;
    tem_piscina?: boolean | null;
    tem_energia_solar?: boolean | null;
    tem_automacao?: boolean | null;
    tem_ar_condicionado?: boolean | null;
    eh_mobiliada?: boolean | null;
    images?: Array<NormalizedImage | PropertyImageType | string> | string | null;
  };

  type SortConfig = {
    key: string;
    order: 'asc' | 'desc';
  };

  type PropertyFilters = {
    status: PropertyStatus | 'all';
    city: string;
    search: string;
  };
  type PropertyRequestTypeFilter = 'all' | 'creation' | 'edit';

  export let initialStatus: PropertyStatus | 'all' = 'approved';
  export let allowApproval = false;
  let isReviewOnly = false;
  let reviewRequestType: PropertyRequestTypeFilter = 'all';
  $: isReviewOnly = allowApproval;

    let properties: PropertySummary[] = [];
  let isLoading = false;
  let error: string | null = null;
  let cities: string[] = [];
  let filters: PropertyFilters = {
    status: initialStatus,
    city: 'all',
    search: '',
  };
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let fetchKey = 0;
  let hasMounted = false;
  let sortConfig: SortConfig = { key: 'p.created_at', order: 'desc' };
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isModalOpen = false;
  let selectedProperty: PropertyDetails | null = null;
  let isDetailLoading = false;
  let isProcessing = false;
  let isDeleteDialogOpen = false;
  let deleteError: string | null = null;
  let isEditMode = false;
  let editableProperty: PropertyDetails | null = null;
  let editSemNumero = false;
  let editBedroomsAsZero = false;
  let editBathroomsAsZero = false;
  let editGarageSpotsAsZero = false;
  let isSavingEdit = false;
  let editError: string | null = null;
  let editPriceSaleDisplay = '';
  let editPriceRentDisplay = '';
  let editPromotionSalePercentageDisplay = '';
  let editPromotionRentPercentageDisplay = '';
  let editPromotionPriceSaleDisplay = '';
  let editPromotionPriceRentDisplay = '';
  let imageUploading = false;
  let imageUploadError: string | null = null;
  let imageDeleteError: string | null = null;
  let stagedImages: File[] = [];
  let stagedImagePreviews: string[] = [];
  let imageInputEl: HTMLInputElement | null = null;
  let stagedVideo: File | null = null;
  let stagedVideoPreview: string | null = null;
  let isImageDropActive = false;
  let isVideoDropActive = false;
  let videoUploading = false;
  let videoDeleting = false;
  let videoDeleteError: string | null = null;
  let videoInputEl: HTMLInputElement | null = null;
  let rejectDialogOpen = false;
  let rejectObservation = '';
  let rejectObservationError: string | null = null;
  let isImagePreviewOpen = false;
  let previewImageUrl: string | null = null;
  let previewImageIndex = 0;
  let previewImagesSnapshot: NormalizedImage[] = [];
  let brokenPreviewImages = new Set<string>();
  let brokenListThumbnails = new Set<number>();
  const MAX_TOTAL_IMAGES = 20;
  const cloudinaryCloudName = String(import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim();
  const areaUnitOptions: Array<{ value: AreaUnit; label: string }> = [
    { value: 'm2', label: 'm²' },
    { value: 'hectare', label: 'Hectare (ha)' },
    { value: 'alqueire', label: 'Alqueire' },
  ];

  $: previewImages = previewImagesSnapshot.length
    ? previewImagesSnapshot
    : selectedPropertyImages();
  $: previewTotal = previewImages.length;
  $: if (isImagePreviewOpen && previewTotal > 0 && previewImageIndex >= previewTotal) {
    previewImageIndex = previewTotal - 1;
    previewImageUrl = previewImages[previewImageIndex]?.url ?? null;
  }
  $: if (previewTotal > 0) {
    previewImages.forEach((image) => {
      if (!image?.url) return;
      if (brokenPreviewImages.has(image.url)) return;
      const img = new Image();
      img.src = image.url;
    });
  }

  function openImagePreview(url: string, index = 0) {
    if (brokenPreviewImages.has(url)) {
      return;
    }
    previewImagesSnapshot = selectedPropertyImages();
    previewImageIndex = index;
    previewImageUrl = url;
    isImagePreviewOpen = true;
  }

  function closeImagePreview() {
    isImagePreviewOpen = false;
    previewImageUrl = null;
    previewImagesSnapshot = [];
  }

  function markImageAsBroken(url?: string | null) {
    if (!url) return;
    if (brokenPreviewImages.has(url)) return;
    brokenPreviewImages = new Set(brokenPreviewImages);
    brokenPreviewImages.add(url);
  }

  function findValidIndex(fromIndex: number, direction: 1 | -1) {
    let idx = fromIndex + direction;
    while (idx >= 0 && idx < previewImagesSnapshot.length) {
      const url = previewImagesSnapshot[idx]?.url;
      if (url && !brokenPreviewImages.has(url)) return idx;
      idx += direction;
    }
    return -1;
  }

  function hasPrevImage() {
    return findValidIndex(previewImageIndex, -1) !== -1;
  }

  function hasNextImage() {
    return findValidIndex(previewImageIndex, 1) !== -1;
  }

  function goPrevImage() {
    const idx = findValidIndex(previewImageIndex, -1);
    if (idx === -1) return;
    previewImageIndex = idx;
    previewImageUrl = previewImagesSnapshot[previewImageIndex]?.url ?? null;
  }

  function goNextImage() {
    const idx = findValidIndex(previewImageIndex, 1);
    if (idx === -1) return;
    previewImageIndex = idx;
    previewImageUrl = previewImagesSnapshot[previewImageIndex]?.url ?? null;
  }

  function handlePreviewImageError() {
    markImageAsBroken(previewImageUrl);
    const nextIdx = findValidIndex(previewImageIndex, 1);
    if (nextIdx !== -1) {
      previewImageIndex = nextIdx;
      previewImageUrl = previewImagesSnapshot[previewImageIndex]?.url ?? null;
      return;
    }
    const prevIdx = findValidIndex(previewImageIndex, -1);
    if (prevIdx !== -1) {
      previewImageIndex = prevIdx;
      previewImageUrl = previewImagesSnapshot[previewImageIndex]?.url ?? null;
      return;
    }
    closeImagePreview();
  }

  function handlePreviewKeydown(event: KeyboardEvent) {
    if (!isImagePreviewOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeImagePreview();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevImage();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNextImage();
      return;
    }
  }

  function requestFetch(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }
    fetchKey += 1;
  }

  onMount(() => {
    hasMounted = true;
    requestFetch();
    fetchCities();
  });

  onDestroy(() => {
    clearStagedImages();
    clearStagedVideo();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    fetchKey;
    fetchProperties();
  }

  async function fetchProperties() {
    isLoading = true;
    error = null;

    if (!hasSessionToken()) {
      error = 'Sessão expirada. Faca login novamente.';
      clearSessionToken();
      isLoading = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.city !== 'all') {
        params.append('city', filters.city);
      }
      if (isReviewOnly && reviewRequestType !== 'all') {
        params.append('requestType', reviewRequestType);
      }
      params.append('sortBy', sortConfig.key);
      params.append('sortOrder', sortConfig.order);
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }

      const query = params.toString();
      const response = await api.get<{ data: Array<Record<string, unknown>> }>(
        `/admin/properties-with-brokers${query ? `?${query}` : ''}`
      );

      const raw = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;
      totalItems = Number((response as { total?: number })?.total ?? raw.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

      properties = raw
        .map((item) => {
          const record = item as Record<string, unknown>;
          const idValue = record['id'];
          const id = idValue != null ? Number(idValue) : NaN;
          if (!Number.isFinite(id)) return null;

          const priceValue = record['price'];
          const priceSaleValue = record['price_sale'];
          const priceRentValue = record['price_rent'];
          const promotionPercentageValue = record['promotion_percentage'];
          const promotionPriceValue = record['promotion_price'];
          const promotionalRentPriceValue = record['promotional_rent_price'];
          const promotionalRentPercentageValue = record['promotional_rent_percentage'];
          const brokerIdValue = record['broker_id'];
          const ownerIdValue = record['owner_id'];
          const ownerNameValue = record['owner_name'];
          const ownerPhoneValue = record['owner_phone'];
          const brokerPhoneValue = record['broker_phone'];
          const brokerStatusValue = record['broker_status'];
          const brokerCreciValue = record['broker_creci'];
          const createdAtValue = record['created_at'];
          const updatedAtValue = record['updated_at'];
          const requestTypeValue = String(record['request_type'] ?? '').trim().toLowerCase();
          const cepValue = record['cep'];
          const areaConstruidaUnidade = normalizeAreaUnit(record['area_construida_unidade']);
          const areaTerrenoUnidadeRaw =
            record['area_terreno_unidade'] ?? record['area_terreno_medida'];
          const areaTerrenoUnidade =
            normalizeAreaUnit(areaTerrenoUnidadeRaw) ?? areaConstruidaUnidade ?? 'm2';

          return {
            id,
            title: String(record['title'] ?? 'Imóvel sem título'),
            bairro: (record['bairro'] as string | null | undefined) ?? null,
            city: (record['city'] as string | null | undefined) ?? null,
            state: (record['state'] as string | null | undefined) ?? null,
            cep: cepValue != null ? String(cepValue) : null,
            price: priceValue != null ? Number(priceValue) : null,
            price_sale: priceSaleValue != null ? Number(priceSaleValue) : null,
            price_rent: priceRentValue != null ? Number(priceRentValue) : null,
            area_construida_unidade: areaConstruidaUnidade,
            area_terreno_unidade: areaTerrenoUnidade,
            promotion_percentage:
              promotionPercentageValue != null ? Number(promotionPercentageValue) : null,
            promotion_price:
              promotionPriceValue != null ? Number(promotionPriceValue) : null,
            promotional_rent_price:
              promotionalRentPriceValue != null
                ? Number(promotionalRentPriceValue)
                : null,
            promotional_rent_percentage:
              promotionalRentPercentageValue != null
                ? Number(promotionalRentPercentageValue)
                : null,
            status: (record['status'] as PropertyStatus) ?? 'pending_approval',
            purpose: (record['purpose'] as string | null | undefined) ?? null,
            broker_id: brokerIdValue != null ? Number(brokerIdValue) : null,
            owner_id: ownerIdValue != null ? Number(ownerIdValue) : null,
            owner_name: ownerNameValue != null ? String(ownerNameValue) : null,
            owner_phone: ownerPhoneValue != null ? String(ownerPhoneValue) : null,
            broker_name: (record['broker_name'] as string | null | undefined) ?? null,
            broker_phone: (brokerPhoneValue as string | null | undefined) ?? null,
            broker_status: (brokerStatusValue as string | null | undefined) ?? null,
            broker_creci: (brokerCreciValue as string | null | undefined) ?? null,
            created_at: createdAtValue != null ? String(createdAtValue) : null,
            updated_at: updatedAtValue != null ? String(updatedAtValue) : null,
            request_type:
              requestTypeValue === 'edit'
                ? 'edit'
                : requestTypeValue === 'creation'
                ? 'creation'
                : null,
            images:
              (record['images'] as
                | Array<NormalizedImage | PropertyImageType | string>
                | string
                | null
                | undefined) ??
              (record['image_urls'] as
                | Array<NormalizedImage | PropertyImageType | string>
                | string
                | null
                | undefined) ??
              (record['property_image_url'] as string | null | undefined) ??
              (record['image_url'] as string | null | undefined) ??
              null,
          } as PropertySummary;
        })
        .filter((item): item is PropertySummary => item !== null);
      brokenListThumbnails = new Set();

      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }

    } catch (err) {
      console.error('Erro ao carregar imóveis:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        error = 'Sessão expirada. Faça login novamente.';
        clearSessionToken();
      } else {
        error = err instanceof Error ? err.message : 'Erro inesperado ao carregar imóveis.';
      }
      properties = [];
    } finally {
      isLoading = false;
    }
  }

  async function fetchCities() {
    try {
      const response = await fetchPlatformResponse('/properties/cities', { skipAuth: true });
      if (!response) {
        cities = [];
        return;
      }
      if (!response.ok) {
        const errorMsg = await response.text();
        toast.error('Erro ao buscar cidades.', {
          description: errorMsg || 'A solicitação retornou erro.',
        });
        cities = [];
        return;
      }

      const payload = await response.json();
      const list = Array.isArray(payload) ? payload : payload?.data;
      cities = Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
      toast.error('Erro ao buscar cidades.', {
        description: err instanceof Error ? err.message : 'Falha inesperada.',
      });
      cities = [];
    }
  }

  function formatCurrency(value?: number | null): string {
    if (value == null || Number.isNaN(value)) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function onlyDigits(value: string) {
    return value.replace(/\D/g, '');
  }

  function formatCep(value: string) {
    const digits = onlyDigits(value).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  function formatCurrencyInput(raw: string) {
    const digits = onlyDigits(raw);
    if (!digits) return '';
    const numberValue = Number(digits) / 100;
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  function parseCurrency(value: string) {
    const digits = onlyDigits(value);
    if (!digits) return null;
    const parsed = Number(digits) / 100;
    return Number.isNaN(parsed) ? null : parsed;
  }

  function parsePercentage(value: string): number | null {
    const normalized = String(value ?? '').replace('%', '').replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return null;
    return Number(parsed.toFixed(2));
  }

  function formatPercentageInput(value: string): string {
    const sanitized = String(value ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
    if (!sanitized) return '';
    const parsed = Number(sanitized);
    if (!Number.isFinite(parsed)) return '';
    return Math.min(100, Math.max(0, parsed)).toString();
  }

  function calculateDiscountedValue(basePrice: number | null, percentage: number | null): number | null {
    if (basePrice == null || basePrice <= 0 || percentage == null || percentage <= 0 || percentage >= 100) {
      return null;
    }
    return Number((basePrice * (1 - percentage / 100)).toFixed(2));
  }

  function resolvePromotionPercentage(basePrice: number | null, promoPrice: number | null): number | null {
    if (basePrice == null || basePrice <= 0 || promoPrice == null || promoPrice <= 0 || promoPrice >= basePrice) {
      return null;
    }
    return Number((((basePrice - promoPrice) / basePrice) * 100).toFixed(2));
  }

  function sanitizeDigitsInput(value: string) {
    return onlyDigits(value);
  }

  function sanitizeDecimalInput(value: string) {
    const cleaned = value.replace(/[^\d.,]/g, '');
    const parts = cleaned.split(/[.,]/);
    const integer = parts.shift() ?? '';
    const decimal = parts.join('');
    if (!decimal) return integer;
    return `${integer},${decimal}`;
  }

  function getPurposeFlags(purpose?: string | null) {
    const normalized = (purpose ?? '').toLowerCase();
    const supportsSale = normalized.includes('vend');
    const supportsRent = normalized.includes('alug');
    return { supportsSale, supportsRent, isDual: supportsSale && supportsRent };
  }

  function isBrokerCredenciado(property?: PropertyDetails | null) {
    return Boolean(property?.broker_id) && property?.broker_status === 'approved';
  }

  function resolvePriceLines(property: {
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    purpose?: string | null;
  }) {
    const lines: Array<{ label: string; value: number }> = [];
    const { supportsSale, supportsRent } = getPurposeFlags(property.purpose ?? null);
    const salePrice =
      property.price_sale ?? (supportsSale && !supportsRent ? property.price ?? null : null);
    const rentPrice =
      property.price_rent ?? (supportsRent && !supportsSale ? property.price ?? null : null);

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

  function normalizeImageUrl(rawUrl: unknown): string | null {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) return null;
    const cleaned = rawUrl.trim();
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    if (/^\/\/res\.cloudinary\.com\//i.test(cleaned)) return `https:${cleaned}`;
    if (/^res\.cloudinary\.com\//i.test(cleaned)) return `https://${cleaned}`;
    if (/^\/\//.test(cleaned)) return `https:${cleaned}`;
    // fallback: assume relative path from API
    return resolveApiAssetUrl(cleaned);
  }

  function encodeCloudinaryPublicId(publicId: string): string {
    return publicId
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  function cloudinaryUrlFromPublicId(rawPublicId: unknown): string | null {
    if (typeof rawPublicId !== 'string') return null;
    const publicId = rawPublicId.trim().replace(/^\/+|\/+$/g, '');
    if (!publicId) return null;
    if (!cloudinaryCloudName) return null;
    return `https://res.cloudinary.com/${encodeURIComponent(cloudinaryCloudName)}/image/upload/${encodeCloudinaryPublicId(publicId)}`;
  }

  function parseImagesJsonString(raw: string): unknown | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{') && !trimmed.startsWith('"')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') {
        const nested = parseImagesJsonString(parsed);
        return nested ?? parsed;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function splitImageTokens(raw: string): string[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.includes(';')) {
      return trimmed.split(';').map((item) => item.trim()).filter(Boolean);
    }
    if (trimmed.includes('|')) {
      return [trimmed];
    }
    if (/https?:\/\//i.test(trimmed)) {
      return trimmed
        .split(/\s*,\s*(?=https?:\/\/)/gi)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  function parseDelimitedImages(raw: string): NormalizedImage[] {
    const tokens = splitImageTokens(raw);
    return tokens
      .map((token, idx) => {
        const separatorIndex = token.indexOf('|');
        const hasIdPrefix = separatorIndex > 0;
        const maybeId = hasIdPrefix ? token.slice(0, separatorIndex) : '';
        const maybeUrl = hasIdPrefix ? token.slice(separatorIndex + 1) : token;
        const urlPart = maybeUrl || maybeId;
        const parsedUrl = normalizeImageUrl(urlPart);
        if (!parsedUrl) return null;
        const parsedId = hasIdPrefix ? Number(maybeId) : idx;
        return { id: Number.isFinite(parsedId) ? parsedId : idx, url: parsedUrl };
      })
      .filter((img): img is NormalizedImage => Boolean(img));
  }

  function normalizeImages(
    images?:
      | Array<NormalizedImage | PropertyImageType | Record<string, unknown> | string>
      | Record<string, unknown>
      | string
      | null
  ): NormalizedImage[] {
    if (!images) return [];

    // Backend pode enviar lista serializada em JSON como string.
    if (typeof images === 'string') {
      const parsed = parseImagesJsonString(images);
      if (parsed != null) {
        return normalizeImages(parsed as Record<string, unknown> | Array<NormalizedImage | PropertyImageType | Record<string, unknown> | string> | string | null);
      }
      return parseDelimitedImages(images);
    }

    const list = Array.isArray(images) ? images : [images];

    return list
      .flatMap<NormalizedImage | null>((image, index) => {
        if (typeof image === 'string') {
          const parsed = parseImagesJsonString(image);
          if (parsed != null) {
            return normalizeImages(parsed as Record<string, unknown> | Array<NormalizedImage | PropertyImageType | Record<string, unknown> | string> | string | null);
          }
          // Se a string tiver vários itens, faça split
          if (image.includes('|') || image.includes(';') || image.includes(',')) {
            return parseDelimitedImages(image);
          }
          const url = normalizeImageUrl(image);
          if (!url) return null;
          return [{ id: index, url }];
        }
        if (image && typeof image === 'object') {
          const anyImg = image as Record<string, unknown>;
          const candidateUrl =
            normalizeImageUrl((anyImg.secure_url as string | undefined) ?? null) ||
            normalizeImageUrl((anyImg.url as string | undefined) ?? null) ||
            normalizeImageUrl((anyImg.image_url as string | undefined) ?? null) ||
            cloudinaryUrlFromPublicId((anyImg.public_id as string | undefined) ?? null);
          if (!candidateUrl) return null;
          const fallbackId = Number.isFinite(Number(index)) ? index : 0;
          const rawId = (anyImg.id as number | undefined) ?? fallbackId;
          const parsedId = Number(rawId);
          return [{
            id: Number.isFinite(parsedId) ? parsedId : index,
            url: candidateUrl,
          }];
        }
        return null;
      })
      .filter((img): img is NormalizedImage => Boolean(img));
  }

  function selectedPropertyImages() {
    return normalizeImages(selectedProperty?.images ?? null);
  }

  function humanizeStatus(status: PropertyStatus, purpose?: string | null): string {
    if (status === 'approved' && purpose) {
      return purpose;
    }
    const map: Record<string, string> = {
      pending_approval: 'Aprovação Pendente',
      approved: 'Disponível',
      rented: 'Alugado',
      sold: 'Vendido',
    };
    return map[status] ?? status ?? 'Indefinido';
  }

  function statusBadgeClasses(status: PropertyStatus): string {
    const classes: Record<string, string> = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rented: 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
      sold: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };

    return classes[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  function inferRequestType(property: PropertySummary): 'creation' | 'edit' {
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

  function humanizeRequestType(type: 'creation' | 'edit'): string {
    return type === 'edit' ? 'Edição' : 'Criação';
  }

  function requestTypeBadgeClasses(type: 'creation' | 'edit'): string {
    if (type === 'edit') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
  }

  function reviewRequestTypeLabel(type: PropertyRequestTypeFilter): string {
    if (type === 'edit') return 'somente edição';
    if (type === 'creation') return 'somente criação';
    return 'criação e edição';
  }

  function setReviewRequestType(type: PropertyRequestTypeFilter) {
    if (reviewRequestType === type) return;
    reviewRequestType = type;
    requestFetch(true);
  }

  const booleanKeys = [
    'has_wifi',
    'tem_piscina',
    'tem_energia_solar',
    'tem_automacao',
    'tem_ar_condicionado',
    'eh_mobiliada'
  ] as const;

  function sanitizeEditable(data: Partial<PropertyDetails>): PropertyDetails {
    const coerced: Record<string, unknown> = { ...data };
    const areaConstruidaUnidade = normalizeAreaUnit(data.area_construida_unidade) ?? 'm2';
    const areaTerrenoUnidade =
      normalizeAreaUnit(data.area_terreno_unidade) ?? areaConstruidaUnidade;
    coerced.area_construida_unidade = areaConstruidaUnidade;
    coerced.area_terreno_unidade = areaTerrenoUnidade;
    for (const key of booleanKeys) {
      coerced[key] = Boolean((data as any)?.[key]);
    }
    return coerced as unknown as PropertyDetails;
  }

  function normalizeAreaUnit(value: unknown): AreaUnit | null {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'm2' || normalized === 'hectare' || normalized === 'alqueire') {
      return normalized;
    }
    return null;
  }

  function areaUnitLabel(value: unknown): string {
    const normalized = normalizeAreaUnit(value);
    if (normalized === 'hectare') return 'ha';
    if (normalized === 'alqueire') return 'alqueire';
    return 'm²';
  }

  function formatAreaWithUnit(value: unknown, unit: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    return `${value} ${areaUnitLabel(unit)}`;
  }

  function markThumbnailAsBroken(propertyId: number) {
    if (brokenListThumbnails.has(propertyId)) return;
    brokenListThumbnails = new Set(brokenListThumbnails);
    brokenListThumbnails.add(propertyId);
  }

  function getPropertyCoverUrl(property: PropertySummary): string | null {
    if (brokenListThumbnails.has(property.id)) return null;
    const list = normalizeImages(property.images ?? null);
    if (list.length > 0) return list[0]?.url ?? null;
    return null;
  }

  function isSemNumeroValue(value: unknown): boolean {
    const normalized = String(value ?? '').trim();
    return normalized === '' || normalized === '0';
  }

  function formatNumeroDisplay(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '0') return 'S/N';
    return raw;
  }

  function visibleSelectedPropertyImages() {
    return selectedPropertyImages().filter((image) => !brokenPreviewImages.has(image.url));
  }

  function brokenSelectedPropertyImagesCount() {
    return selectedPropertyImages().filter((image) => brokenPreviewImages.has(image.url)).length;
  }

  function findImageIndexByUrl(url: string) {
    const index = selectedPropertyImages().findIndex((image) => image.url === url);
    return index >= 0 ? index : 0;
  }

  function syncEditPriceDisplays(property: PropertyDetails) {
    const { supportsSale, supportsRent } = getPurposeFlags(property.purpose ?? null);
    const resolvedSale =
      property.price_sale ?? (supportsSale && !supportsRent ? property.price ?? null : null);
    const resolvedRent =
      property.price_rent ?? (supportsRent && !supportsSale ? property.price ?? null : null);
    const resolvedSalePromotionPercentage =
      property.promotion_percentage != null
        ? Number(property.promotion_percentage)
        : resolvePromotionPercentage(
            resolvedSale != null ? Number(resolvedSale) : null,
            property.promotion_price != null ? Number(property.promotion_price) : null
          );
    const resolvedRentPromotionPercentage =
      property.promotional_rent_percentage != null
        ? Number(property.promotional_rent_percentage)
        : resolvePromotionPercentage(
            resolvedRent != null ? Number(resolvedRent) : null,
            property.promotional_rent_price != null
              ? Number(property.promotional_rent_price)
              : null
          );

    const salePromoPrice = calculateDiscountedValue(
      resolvedSale != null ? Number(resolvedSale) : null,
      resolvedSalePromotionPercentage
    );
    const rentPromoPrice = calculateDiscountedValue(
      resolvedRent != null ? Number(resolvedRent) : null,
      resolvedRentPromotionPercentage
    );

    editPriceSaleDisplay = resolvedSale != null ? formatCurrency(Number(resolvedSale)) : '';
    editPriceRentDisplay = resolvedRent != null ? formatCurrency(Number(resolvedRent)) : '';
    editPromotionSalePercentageDisplay =
      resolvedSalePromotionPercentage != null
        ? String(resolvedSalePromotionPercentage)
        : '';
    editPromotionRentPercentageDisplay =
      resolvedRentPromotionPercentage != null
        ? String(resolvedRentPromotionPercentage)
        : '';
    editPromotionPriceSaleDisplay = salePromoPrice != null ? formatCurrency(salePromoPrice) : '';
    editPromotionPriceRentDisplay = rentPromoPrice != null ? formatCurrency(rentPromoPrice) : '';
  }

  function refreshPromotionPreviewDisplays() {
    if (!editableProperty) return;
    const { supportsSale, supportsRent } = getPurposeFlags(editableProperty.purpose ?? null);
    const baseSale =
      editableProperty.price_sale ??
      (supportsSale && !supportsRent ? editableProperty.price ?? null : null);
    const baseRent =
      editableProperty.price_rent ??
      (supportsRent && !supportsSale ? editableProperty.price ?? null : null);
    const salePercentage = supportsSale ? parsePercentage(editPromotionSalePercentageDisplay) : null;
    const rentPercentage = supportsRent ? parsePercentage(editPromotionRentPercentageDisplay) : null;
    const salePromo = calculateDiscountedValue(
      baseSale != null ? Number(baseSale) : null,
      salePercentage
    );
    const rentPromo = calculateDiscountedValue(
      baseRent != null ? Number(baseRent) : null,
      rentPercentage
    );
    editPromotionPriceSaleDisplay = salePromo != null ? formatCurrency(salePromo) : '';
    editPromotionPriceRentDisplay = rentPromo != null ? formatCurrency(rentPromo) : '';
    editableProperty.promotion_percentage = salePercentage;
    editableProperty.promotional_rent_percentage = rentPercentage;
    editableProperty.promotion_price = salePromo;
    editableProperty.promotional_rent_price = rentPromo;
  }

  function syncEditZeroFlags(property: PropertyDetails) {
    editBedroomsAsZero = Number(property.bedrooms ?? -1) === 0;
    editBathroomsAsZero = Number(property.bathrooms ?? -1) === 0;
    editGarageSpotsAsZero = Number(property.garage_spots ?? -1) === 0;
  }

  function toggleEditMode() {
    if (!selectedProperty) return;
    isEditMode = !isEditMode;
    editError = null;
    if (isEditMode && editableProperty) {
      syncEditPriceDisplays(editableProperty);
      editSemNumero = isSemNumeroValue(editableProperty.numero);
      syncEditZeroFlags(editableProperty);
      if (editSemNumero) {
        editableProperty.numero = '';
      }
    } else {
      editableProperty = sanitizeEditable(selectedProperty as PropertyDetails);
      editSemNumero = false;
      editBedroomsAsZero = false;
      editBathroomsAsZero = false;
      editGarageSpotsAsZero = false;
    }
  }

  async function reviewProperty(property: PropertySummary, event?: Event) {
    event?.stopPropagation?.();
    if (isDetailLoading && selectedProperty?.id === property.id) {
      return;
    }

    isDetailLoading = true;
    isEditMode = false;
    selectedProperty = property;
    editableProperty = sanitizeEditable({ ...property } as PropertyDetails);
    brokenPreviewImages = new Set();

    try {
      const details = await api.get<PropertyDetails>(`/admin/properties/${property.id}`);
      const merged = { ...property, ...details } as PropertyDetails;
      const { supportsSale, supportsRent } = getPurposeFlags(merged.purpose ?? null);
      const resolvedSale =
        merged.price_sale ?? (supportsSale && !supportsRent ? merged.price ?? null : null);
      const resolvedRent =
        merged.price_rent ?? (supportsRent && !supportsSale ? merged.price ?? null : null);
      selectedProperty = merged;
      editableProperty = sanitizeEditable({
        ...merged,
        price_sale: resolvedSale,
        price_rent: resolvedRent,
        promotion_percentage:
          merged.promotion_percentage != null
            ? Number(merged.promotion_percentage)
            : null,
        promotion_price:
          merged.promotion_price != null ? Number(merged.promotion_price) : null,
        promotional_rent_price:
          merged.promotional_rent_price != null
            ? Number(merged.promotional_rent_price)
            : null,
        promotional_rent_percentage:
          merged.promotional_rent_percentage != null
            ? Number(merged.promotional_rent_percentage)
            : null,
      });
      editSemNumero = isSemNumeroValue(merged.numero);
      syncEditZeroFlags(merged);
      if (editSemNumero && editableProperty) {
        editableProperty.numero = '';
      }
      if (editableProperty) {
        syncEditPriceDisplays(editableProperty);
      }
      isModalOpen = true;
    } catch (err) {
      console.error('Falha ao buscar detalhes do imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        clearSessionToken();
      } else {
        toast.error('Não foi possível carregar os detalhes do imóvel.');
      }
    } finally {
      isDetailLoading = false;
    }
  }

  function closeModal() {
    if (isProcessing) return;
    clearStagedImages();
    clearStagedVideo();
    isModalOpen = false;
    isDeleteDialogOpen = false;
    deleteError = null;
    selectedProperty = null;
    editableProperty = null;
    editSemNumero = false;
    editBedroomsAsZero = false;
    editBathroomsAsZero = false;
    editGarageSpotsAsZero = false;
    brokenPreviewImages = new Set();
    isEditMode = false;
    editError = null;
    rejectDialogOpen = false;
    rejectObservation = '';
    rejectObservationError = null;
  }

  async function handleStatusUpdate(newStatus: 'approved' | 'rejected') {
    if (!selectedProperty) {
      toast.error('Erro de estado: o imóvel selecionado esta nulo. Tente fechar e reabrir o modal.');
      return;
    }
    if (newStatus === 'rejected') {
      rejectObservation = '';
      rejectObservationError = null;
      rejectDialogOpen = true;
      return;
    }
    isProcessing = true;
    try {
      if (newStatus === 'approved') {
        await api.patch(`/admin/properties/${selectedProperty.id}/approve`, {});
        toast.success('Imóvel aprovado.');
      } else {
        await api.patch(`/admin/properties/${selectedProperty.id}/reject`, {});
        toast.success('Imóvel rejeitado e removido.');
      }
      isModalOpen = false;
      clearStagedImages();
      clearStagedVideo();
      selectedProperty = null;
      await fetchProperties();
    } catch (err) {
      console.error('Falha ao atualizar status do imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        clearSessionToken();
      } else {
        toast.error(extractApiErrorMessage(err, 'Falha ao atualizar o status.'));
      }
    } finally {
      isProcessing = false;
    }
  }

  async function handleDeleteProperty() {
    if (!selectedProperty) {
      toast.error('Erro de estado: o imóvel selecionado esta nulo. Tente fechar e reabrir o modal.');
      return;
    }

    isDeleteDialogOpen = true;
  }

  async function confirmDeleteProperty(password: string) {
    if (!selectedProperty) {
      return;
    }

    isProcessing = true;
    deleteError = null;
    try {
      const response = await api.post<{ reauthToken: string }>('/admin/reauth', {
        password,
      });
      await api.delete(`/admin/properties/${selectedProperty.id}`, {
        headers: {
          'X-Admin-Reauth': response.reauthToken,
        },
      });
      toast.success('Imóvel excluido com sucesso.');
      isDeleteDialogOpen = false;
      isModalOpen = false;
      clearStagedImages();
      clearStagedVideo();
      selectedProperty = null;
      await fetchProperties();
    } catch (err) {
      console.error('Falha ao excluir o imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        clearSessionToken();
      } else {
        deleteError = extractApiErrorMessage(err, 'Falha ao excluir o imóvel.');
      }
    } finally {
      isProcessing = false;
    }
  }

  async function confirmRejectProperty() {
    if (!selectedProperty) {
      rejectDialogOpen = false;
      return;
    }

    const reason = rejectObservation.trim();
    if (!reason) {
      rejectObservationError = 'Informe a observação da rejeição.';
      return;
    }

    isProcessing = true;
    rejectObservationError = null;
    try {
      await api.patch(`/admin/properties/${selectedProperty.id}/reject`, { reason });
      toast.success('Imóvel rejeitado e removido.');
      rejectDialogOpen = false;
      isModalOpen = false;
      clearStagedImages();
      clearStagedVideo();
      selectedProperty = null;
      await fetchProperties();
    } catch (err) {
      console.error('Falha ao rejeitar o imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        clearSessionToken();
      } else {
        toast.error(extractApiErrorMessage(err, 'Falha ao rejeitar o imóvel.'));
      }
    } finally {
      isProcessing = false;
    }
  }

  function handleSort(column: string) {
    if (sortConfig.key === column) {
      sortConfig = {
        ...sortConfig,
        order: sortConfig.order === 'asc' ? 'desc' : 'asc',
      };
    } else {
      sortConfig = { key: column, order: 'desc' };
    }
    requestFetch(true);
  }

  function sortAlphabetical() {
    sortConfig = { key: 'p.title', order: 'asc' };
    requestFetch(true);
  }

  function sortByCreatedDesc() {
    sortConfig = { key: 'p.created_at', order: 'desc' };
    requestFetch(true);
  }

  function getSortIndicator(column: string) {
    if (sortConfig.key !== column) {
      return '';
    }
    return sortConfig.order === 'asc' ? '▲' : '▼';
  }

  function handleRefresh() {
    requestFetch();
  }

  function handleKeydown(event: KeyboardEvent | CustomEvent<KeyboardEvent>) {
    const key = event instanceof CustomEvent ? event.detail?.key : event.key;
    if (key === 'Enter') {
      requestFetch(true);
    }
  }

  function handleKeyup(event: KeyboardEvent | CustomEvent<KeyboardEvent>) {
    const key = event instanceof CustomEvent ? event.detail?.key : event.key;
    const target = event instanceof CustomEvent ? (event.detail as any)?.target : (event.target as HTMLInputElement | undefined);
    if (key === 'Enter') {
      requestFetch(true);
    } else if (target && target.value.trim() === '') {
      requestFetch(true);
    }
  }

  function onFilterChange() {
    requestFetch(true);
  }

  function handleExport() {
    exportToCsv(properties, `imoveis_${new Date().toISOString().split('T')[0]}.csv`);
  }

  async function saveEdits() {
    if (!selectedProperty || !editableProperty) return;

    isSavingEdit = true;
    editError = null;

    try {
      const numericKeys = new Set([
        'price',
        'price_sale',
        'price_rent',
        'promotion_percentage',
        'promotional_rent_percentage',
        'promotion_price',
        'promotional_rent_price',
        'area_construida',
        'area_terreno',
        'bedrooms',
        'bathrooms',
        'garage_spots',
        'sale_value',
        'commission_rate',
        'commission_value',
      ]);

      const normalizeInput = (value: unknown) =>
        value === '' || value === undefined || value === null ? null : value;
      const numeroRaw = String(editableProperty.numero ?? '').trim();
      const numeroDigits = sanitizeDigitsInput(numeroRaw);
      if (!editSemNumero && numeroRaw.length > 0 && numeroDigits.length === 0) {
        editError = 'Número do endereço deve conter apenas dígitos.';
        isSavingEdit = false;
        return;
      }
      const purposeFlags = getPurposeFlags(
        editableProperty.purpose ?? selectedProperty.purpose ?? null
      );
      const rawPrice = normalizeInput(editableProperty.price);
      const rawPriceSale = normalizeInput(editableProperty.price_sale);
      const rawPriceRent = normalizeInput(editableProperty.price_rent);
      const resolvedPriceSale =
        purposeFlags.supportsSale
          ? rawPriceSale ?? (purposeFlags.supportsRent ? null : rawPrice)
          : null;
      const resolvedPriceRent =
        purposeFlags.supportsRent
          ? rawPriceRent ?? (purposeFlags.supportsSale ? null : rawPrice)
          : null;
      const resolvedPrice = resolvedPriceSale ?? resolvedPriceRent ?? rawPrice ?? null;
      const resolvedPriceSaleValue =
        resolvedPriceSale != null ? Number(resolvedPriceSale) : null;
      const resolvedPriceRentValue =
        resolvedPriceRent != null ? Number(resolvedPriceRent) : null;
      const resolvedPriceValue =
        resolvedPrice != null ? Number(resolvedPrice) : null;
      const promotionSalePercentageValue = purposeFlags.supportsSale
        ? parsePercentage(editPromotionSalePercentageDisplay)
        : null;
      const promotionRentPercentageValue = purposeFlags.supportsRent
        ? parsePercentage(editPromotionRentPercentageDisplay)
        : null;
      const promotionPriceSaleValue = calculateDiscountedValue(
        resolvedPriceSaleValue,
        promotionSalePercentageValue
      );
      const promotionPriceRentValue = calculateDiscountedValue(
        resolvedPriceRentValue,
        promotionRentPercentageValue
      );

      if (
        purposeFlags.supportsSale &&
        editPromotionSalePercentageDisplay.trim() &&
        promotionSalePercentageValue == null
      ) {
        editError = 'Percentual de desconto da venda inválido.';
        isSavingEdit = false;
        return;
      }

      if (
        purposeFlags.supportsRent &&
        editPromotionRentPercentageDisplay.trim() &&
        promotionRentPercentageValue == null
      ) {
        editError = 'Percentual de desconto do aluguel inválido.';
        isSavingEdit = false;
        return;
      }

      if (purposeFlags.isDual) {
        if (
          resolvedPriceSaleValue == null ||
          resolvedPriceSaleValue <= 0 ||
          resolvedPriceRentValue == null ||
          resolvedPriceRentValue <= 0
        ) {
          editError = 'Informe os preços de venda e aluguel.';
          isSavingEdit = false;
          return;
        }
      } else if (resolvedPriceValue == null || resolvedPriceValue <= 0) {
        editError = 'Informe um preço válido.';
        isSavingEdit = false;
        return;
      }

      if (
        promotionPriceSaleValue != null &&
        resolvedPriceSaleValue != null &&
        promotionPriceSaleValue >= resolvedPriceSaleValue
      ) {
        editError = 'Preço promocional de venda deve ser menor que o preço de venda.';
        isSavingEdit = false;
        return;
      }

      if (
        promotionPriceRentValue != null &&
        resolvedPriceRentValue != null &&
        promotionPriceRentValue >= resolvedPriceRentValue
      ) {
        editError = 'Preço promocional de aluguel deve ser menor que o preço de aluguel.';
        isSavingEdit = false;
        return;
      }

      const normalizeValue = (key: string, value: unknown) => {
        if (value === undefined) return undefined;
        if (value === '' || value === null) return null;
        if (key === 'description' && (value === null || value === undefined)) {
          return '';
        }
        if (booleanKeys.includes(key as any)) {
          return Boolean(value) ? 1 : 0;
        }
        if (numericKeys.has(key)) {
          const num = Number(value);
          return Number.isFinite(num) ? num : null;
        }
        return value;
      };

      const basePayload = {
        title: editableProperty.title,
        description: editableProperty.description,
        purpose: editableProperty.purpose,
        price: resolvedPriceValue ?? undefined,
        price_sale: resolvedPriceSaleValue ?? undefined,
        price_rent: resolvedPriceRentValue ?? undefined,
        promotion_price: promotionPriceSaleValue,
        promotional_rent_price: promotionPriceRentValue,
        promotion_percentage: promotionSalePercentageValue,
        promotional_rent_percentage: promotionRentPercentageValue,
        is_promoted:
          (promotionPriceSaleValue ?? 0) > 0 ||
          (promotionPriceRentValue ?? 0) > 0 ||
          (promotionSalePercentageValue ?? 0) > 0 ||
          (promotionRentPercentageValue ?? 0) > 0
            ? 1
            : 0,
        address: editableProperty.address,
        cep: editableProperty.cep ? onlyDigits(editableProperty.cep) : editableProperty.cep,
        city: editableProperty.city,
        state: editableProperty.state,
        bairro: editableProperty.bairro,
        numero: editSemNumero ? null : (numeroDigits.length > 0 ? numeroDigits : null),
        sem_numero: editSemNumero ? 1 : 0,
        complemento: editableProperty.complemento,
        quadra: editableProperty.quadra,
        lote: editableProperty.lote,
        tipo_lote: editableProperty.tipo_lote,
        bedrooms: editableProperty.bedrooms,
        bathrooms: editableProperty.bathrooms,
        area_construida: editableProperty.area_construida,
        area_construida_unidade: editableProperty.area_construida_unidade ?? 'm2',
        area_terreno: editableProperty.area_terreno,
        area_terreno_unidade:
          editableProperty.area_terreno_unidade ??
          editableProperty.area_construida_unidade ??
          'm2',
        has_wifi: editableProperty.has_wifi,
        tem_piscina: editableProperty.tem_piscina,
        tem_energia_solar: editableProperty.tem_energia_solar,
        tem_automacao: editableProperty.tem_automacao,
        tem_ar_condicionado: editableProperty.tem_ar_condicionado,
        eh_mobiliada: editableProperty.eh_mobiliada,
        video_url: editableProperty.video_url,
        status: editableProperty.status ?? selectedProperty.status,
      };

      // Enviar todos os campos normalizados (inclusive booleans) para garantir persistência
      const payload = Object.fromEntries(
        Object.entries(basePayload)
          .map(([key, value]) => [key, normalizeValue(key, value)])
          .filter(([, value]) => value !== undefined)
      );

      const original = selectedProperty as PropertyDetails;
      const statusChanged =
        (payload as any).status && (payload as any).status !== original.status;

      const fieldsBesidesStatus = Object.keys(payload).filter((k) => k !== 'status');
      const onlyStatusChanged =
        statusChanged && fieldsBesidesStatus.every((k) => (payload as any)[k] === (original as any)[k]);
      const requestedStatus = (payload as any).status;

      if (requestedStatus === 'rejected') {
        rejectObservation = '';
        rejectObservationError = null;
        rejectDialogOpen = true;
        return;
      }

      if (onlyStatusChanged) {
        if (requestedStatus === 'approved') {
          await api.patch(`/admin/properties/${selectedProperty.id}/approve`, {});
        } else {
          await api.patch(`/admin/properties/${selectedProperty.id}/status`, {
            status: requestedStatus,
          });
        }
      } else {
        await apiClient.put(`/admin/properties/${selectedProperty.id}`, payload);
      }
      toast.success('Imóvel atualizado com sucesso.');
      isEditMode = false;
      await fetchProperties();
      // Atualiza estado local para refletir a ?ltima versao
      selectedProperty = { ...(selectedProperty as PropertySummary), ...(payload as any) } as PropertySummary;
      editableProperty = sanitizeEditable(selectedProperty as any);
    } catch (err: any) {
      console.error('Erro ao salvar imóvel:', err);
      const status = err?.response?.status;
      if (status === 403) {
        editError = extractApiErrorMessage(
          err,
          'Permissão negada pelo servidor para atualizar este imóvel. Verifique campos obrigatórios e permissão do usuário.'
        );
      } else if (status === 404) {
        editError = extractApiErrorMessage(
          err,
          'Imóvel não encontrado ou rota de atualização ausente no servidor.'
        );
      } else if (status === 500) {
        editError = extractApiErrorMessage(
          err,
          'Erro interno no servidor ao salvar o imóvel. Tente novamente e revise os campos.'
        );
      } else {
        editError =
          extractApiErrorMessage(err, '') ||
          (err instanceof Error ? err.message : 'Não foi possível salvar o imóvel.');
      }
    } finally {
      isSavingEdit = false;
    }
  }

  function clearStagedImages() {
    stagedImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    stagedImagePreviews = [];
    stagedImages = [];
    if (imageInputEl) {
      imageInputEl.value = '';
    }
  }

  function removeStagedImage(index: number) {
    if (index < 0 || index >= stagedImages.length) return;
    const preview = stagedImagePreviews[index];
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    stagedImages = stagedImages.filter((_, i) => i !== index);
    stagedImagePreviews = stagedImagePreviews.filter((_, i) => i !== index);
    if (stagedImages.length === 0 && imageInputEl) {
      imageInputEl.value = '';
    }
  }

  function stageImages(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      imageUploadError = 'Selecione apenas arquivos de imagem.';
      return;
    }

    const existingCount = selectedPropertyImages().length;
    const availableSlots = Math.max(0, MAX_TOTAL_IMAGES - existingCount);
    if (availableSlots <= 0) {
      imageUploadError = `Este imóvel já possui ${MAX_TOTAL_IMAGES} imagens. Remova alguma imagem para adicionar novas.`;
      if (imageInputEl) {
        imageInputEl.value = '';
      }
      return;
    }

    clearStagedImages();
    const selectedFiles = imageFiles.slice(0, availableSlots);
    if (selectedFiles.length < imageFiles.length) {
      imageUploadError = `Você selecionou mais imagens do que o limite permitido. Apenas ${selectedFiles.length} serão consideradas.`;
    } else {
      imageUploadError = null;
    }
    stagedImages = selectedFiles;
    stagedImagePreviews = stagedImages.map((file) => URL.createObjectURL(file));
  }

  function handleImageSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    stageImages(files);
    if (imageInputEl) {
      imageInputEl.value = '';
    }
  }

  function handleImageDrop(event: DragEvent) {
    event.preventDefault();
    isImageDropActive = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    stageImages(files);
  }

  function openImagePicker() {
    imageInputEl?.click();
  }

  async function uploadStagedImages() {
    if (!selectedProperty || stagedImages.length === 0) return;
    const stagedImagesSnapshot = [...stagedImages];
    imageUploading = true;
    imageUploadError = null;

    try {
      const form = new FormData();
      stagedImages.forEach((file) => form.append('images', file));

      await apiClient.post(`/admin/properties/${selectedProperty.id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Imagens enviadas com sucesso.');
      await reviewProperty(selectedProperty as PropertySummary);
      clearStagedImages();
    } catch (err: any) {
      console.error('Erro ao enviar imagens:', err);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        clearSessionToken();
      }
      imageUploadError =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Falha ao enviar imagens.');
      if (stagedImages.length === 0 && stagedImagesSnapshot.length > 0) {
        stagedImages = stagedImagesSnapshot;
        stagedImagePreviews = stagedImages.map((file) => URL.createObjectURL(file));
      }
    } finally {
      imageUploading = false;
    }
  }

  async function handleImageDelete(imageId: number) {
    if (!selectedProperty) return;
    if (selectedPropertyImages().length <= 1) {
      imageDeleteError = 'O imóvel precisa manter ao menos 1 imagem.';
      toast.error(imageDeleteError);
      return;
    }
    imageDeleteError = null;
    try {
      await api.delete(`/admin/properties/${selectedProperty.id}/images/${imageId}`);
      toast.success('Imagem removida com sucesso.');
      await reviewProperty(selectedProperty as PropertySummary);
    } catch (err: any) {
      console.error('Erro ao remover imagem:', err);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        clearSessionToken();
      }
      imageDeleteError =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Falha ao remover imagem.');
    }
  }

  async function handleVideoDelete() {
    if (!selectedProperty) return;
    const confirmed = window.confirm('Confirma remover o vídeo atual?');
    if (!confirmed) return;
    videoDeleting = true;
    videoDeleteError = null;
    try {
      await api.delete(`/admin/properties/${selectedProperty.id}/video`);
      toast.success('Vídeo removido com sucesso.');
      await reviewProperty(selectedProperty as PropertySummary);
      clearStagedVideo();
      if (videoInputEl) {
        videoInputEl.value = '';
      }
    } catch (err: any) {
      console.error('Erro ao remover vídeo:', err);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        clearSessionToken();
      }
      videoDeleteError =
        extractApiErrorMessage(err, '') ||
        (err instanceof Error ? err.message : 'Falha ao remover vídeo.');
    } finally {
      videoDeleting = false;
    }
  }

  function clearStagedVideo() {
    if (stagedVideoPreview) {
      URL.revokeObjectURL(stagedVideoPreview);
    }
    stagedVideoPreview = null;
    stagedVideo = null;
    if (videoInputEl) {
      videoInputEl.value = '';
    }
  }

  function setStagedVideo(file: File | null) {
    if (!file) {
      clearStagedVideo();
      return;
    }
    clearStagedVideo();
    stagedVideo = file;
    stagedVideoPreview = URL.createObjectURL(file);
    videoDeleteError = null;
  }

  function handleVideoSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    setStagedVideo(file);
  }

  function handleVideoDrop(event: DragEvent) {
    event.preventDefault();
    isVideoDropActive = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    const videoFile = files.find((file) => file.type.startsWith('video/')) ?? null;
    if (!videoFile) {
      videoDeleteError = 'Selecione um arquivo de video valido.';
      return;
    }
    setStagedVideo(videoFile);
  }

  function openVideoPicker() {
    videoInputEl?.click();
  }

  async function uploadStagedVideo() {
    if (!selectedProperty || !stagedVideo) return;
    videoUploading = true;
    videoDeleteError = null;
    try {
      const form = new FormData();
      form.append('video', stagedVideo);
      await apiClient.post(`/admin/properties/${selectedProperty.id}/video`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Vídeo enviado com sucesso.');
      clearStagedVideo();
      await reviewProperty(selectedProperty as PropertySummary);
    } catch (err: any) {
      console.error('Erro ao enviar video:', err);
      videoDeleteError =
        extractApiErrorMessage(err, '') ||
        (err instanceof Error ? err.message : 'Falha ao enviar video.');
    } finally {
      videoUploading = false;
    }
  }

  function onSearchInput(event?: Event) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const target = event?.target as HTMLInputElement | undefined;
    if (target && target.value.trim() === '') {
      requestFetch(true);
      return;
    }
    debounceTimer = setTimeout(() => {
      requestFetch(true);
    }, 300);
  }
</script>

<div class="space-y-4">
  {#if isReviewOnly}
    <section class="rounded-2xl border border-green-200/70 bg-gradient-to-r from-green-50 via-white to-emerald-50 p-6 shadow-sm dark:border-green-800/60 dark:from-green-900/30 dark:via-gray-900 dark:to-emerald-900/20">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-2">
          <span class="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/60 dark:text-green-100">
            Fila de revisão
          </span>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitações de imóveis</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Revise informações, avalie fotos e aprove ou rejeite. Apenas pendentes aparecem aqui.
          </p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <div class="rounded-lg border border-green-100 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm dark:border-green-900/60 dark:bg-gray-900/70 dark:text-gray-200">
            Pendentes: {isLoading ? '...' : totalItems}
          </div>
          <div class="rounded-lg border border-green-100 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm dark:border-green-900/60 dark:bg-gray-900/70 dark:text-gray-200">
            Filtro: pendente de aprovação • {reviewRequestTypeLabel(reviewRequestType)}
          </div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="flex items-center gap-2 border-green-200 text-green-800 hover:bg-green-100/60 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-900/30"
          on:click={handleRefresh}
          disabled={isLoading}
        >
          {#if isLoading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {/if}
          Atualizar fila
        </Button>
        <Button
          variant="outline"
          className="border-green-200 text-green-800 hover:bg-green-100/60 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-900/30"
          on:click={sortByCreatedDesc}
          disabled={isLoading}
        >
          Mais recentes
        </Button>
        <Button
          variant="outline"
          className="border-green-200 text-green-800 hover:bg-green-100/60 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-900/30"
          on:click={sortAlphabetical}
          disabled={isLoading}
        >
          Ordenar A-Z
        </Button>
        <Button
          variant="outline"
          className={reviewRequestType === 'all'
            ? 'border-green-500 bg-green-100 text-green-900 dark:border-green-500 dark:bg-green-900/40 dark:text-green-100'
            : 'border-green-200 text-green-800 hover:bg-green-100/60 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-900/30'}
          on:click={() => setReviewRequestType('all')}
          disabled={isLoading}
        >
          Todas
        </Button>
        <Button
          variant="outline"
          className={reviewRequestType === 'creation'
            ? 'border-green-500 bg-green-100 text-green-900 dark:border-green-500 dark:bg-green-900/40 dark:text-green-100'
            : 'border-green-200 text-green-800 hover:bg-green-100/60 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-900/30'}
          on:click={() => setReviewRequestType('creation')}
          disabled={isLoading}
        >
          Criação
        </Button>
        <Button
          variant="outline"
          className={reviewRequestType === 'edit'
            ? 'border-green-500 bg-green-100 text-green-900 dark:border-green-500 dark:bg-green-900/40 dark:text-green-100'
            : 'border-green-200 text-green-800 hover:bg-green-100/60 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-900/30'}
          on:click={() => setReviewRequestType('edit')}
          disabled={isLoading}
        >
          Edição
        </Button>
      </div>
    </section>
  {:else}
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gerenciamento de Imóveis</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Consulte os imóveis cadastrados e utilize filtros rápidos para priorizar as análises.
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          on:click={handleRefresh}
          disabled={isLoading}
        >
          {#if isLoading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {/if}
          Recarregar
        </Button>
        <Button variant="outline" on:click={sortAlphabetical} disabled={isLoading}>
          Ordenar A-Z
        </Button>
        <Button variant="outline" on:click={sortByCreatedDesc} disabled={isLoading}>
          Mais recentes
        </Button>
        <Button variant="outline" on:click={handleExport}>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar Imóveis (CSV)
        </Button>
      </div>
    </header>
  {/if}

  {#if isReviewOnly}
    <div class="rounded-xl border border-green-100 bg-white/80 p-4 shadow-sm dark:border-green-900/50 dark:bg-gray-900/70">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          className="w-full md:w-96"
          type="search"
          placeholder="Buscar por título, cidade, ID..."
          bind:value={filters.search}
          on:input={onSearchInput}
          on:keydown={handleKeydown}
          on:keyup={handleKeyup}
        />
        <div class="text-xs text-green-700 dark:text-green-200">
          Dica: clique em Revisar para ver os detalhes completos.
        </div>
      </div>
      <div class="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <label for="property-items-per-page-review" class="font-medium">Mostrar</label>
        <select
          id="property-items-per-page-review"
          bind:value={itemsPerPage}
          on:change={() => requestFetch(true)}
          class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>entradas</span>
      </div>
      <div class="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="relative">
          <Select.Root bind:value={filters.city} on:valueChange={onFilterChange}>
            <Select.Trigger>
              <Select.Value placeholder="Filtrar por cidade" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">Todas as cidades</Select.Item>
              {#each cities as city (city)}
                <Select.Item value={city}>{city}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Input
        className="w-full md:w-80"
        type="search"
        placeholder="Buscar por título, cidade, ID..."
        bind:value={filters.search}
        on:input={onSearchInput}
        on:keydown={handleKeydown}
        on:keyup={handleKeyup}
      />
    </div>
    <div class="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="property-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="property-items-per-page"
        bind:value={itemsPerPage}
        on:change={() => requestFetch(true)}
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
      <span>entradas</span>
    </div>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div class="relative">
        <Select.Root bind:value={filters.city} on:valueChange={onFilterChange}>
          <Select.Trigger>
            <Select.Value placeholder="Filtrar por cidade" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">Todas as cidades</Select.Item>
            {#each cities as city (city)}
              <Select.Item value={city}>{city}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
  {/if}
  {#if isLoading}
    <div class="flex h-48 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600"></span>
        Carregando imóveis...
      </div>
    </div>
  {:else if error}
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {error}
    </div>
  {:else if properties.length === 0}
    <div class="rounded-md border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">
        {#if isReviewOnly}
          Nenhuma solicitação encontrada
        {:else}
          Nenhum imóvel encontrado
        {/if}
      </h2>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {#if isReviewOnly}
          Não há itens pendentes no recorte "{reviewRequestTypeLabel(reviewRequestType)}".
        {:else}
          Ajuste os filtros para visualizar outros resultados.
        {/if}
      </p>
    </div>
  {:else}
    <div class="space-y-3 md:hidden">
      {#each properties as property}
        <button
          type="button"
          class={`w-full rounded-lg border p-4 text-left shadow-sm transition ${
            isReviewOnly
              ? 'border-green-200 bg-green-50/40 dark:border-green-800/60 dark:bg-gray-900/70'
              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
          }`}
          on:click={(event) => reviewProperty(property, event)}
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-100 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {#if getPropertyCoverUrl(property)}
                  <img
                    src={getPropertyCoverUrl(property)}
                    alt={`Capa do imóvel ${property.title}`}
                    class="h-full w-full object-cover"
                    loading="lazy"
                    on:error={() => markThumbnailAsBroken(property.id)}
                  />
                {:else}
                  Sem imagem
                {/if}
              </div>
              <div class="min-w-0">
                <div class="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {property.title}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">ID: {property.id}</div>
              </div>
            </div>
            <span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(property.status)}`}>
              {humanizeStatus(property.status, property.purpose)}
            </span>
          </div>
          {#if isReviewOnly}
            {@const requestType = inferRequestType(property)}
            <div class="mt-2">
              <span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${requestTypeBadgeClasses(requestType)}`}>
                Solicitação: {humanizeRequestType(requestType)}
              </span>
            </div>
          {/if}
          <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {property.bairro ?? '-'}
            {#if property.city}
              {' - '}{property.city}
            {/if}
            {#if property.state}
              / {property.state}
            {/if}
          </div>
          <div class="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            {#each resolvePriceLines(property) as line}
              <div>{line.label}: {formatCurrency(line.value)}</div>
            {/each}
          </div>
          <div class="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Anunciante: {property.broker_name ?? '-'}
          </div>
          <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Telefone: {formatPhoneDisplayBr(property.broker_phone)}
          </div>
          <div class="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
              on:click={(event) => {
                event.stopPropagation();
                reviewProperty(property, event);
              }}
              disabled={isDetailLoading && selectedProperty?.id === property.id}
            >
              {#if isDetailLoading && selectedProperty?.id === property.id}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              {:else}
                Revisar
              {/if}
            </Button>
          </div>
        </button>
      {/each}
    </div>
    <div
      class={`hidden md:block show-scrollbar overflow-x-auto rounded-lg border shadow-sm ${
        isReviewOnly
          ? 'border-green-200 bg-green-50/40 dark:border-green-800/60 dark:bg-gray-900/70'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
      }`}
    >
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-900/70">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.title')}>
                Imóvel
                <span>{getSortIndicator('p.title')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.city')}>
                Localização
                <span>{getSortIndicator('p.city')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.price')}>
                Valor
                <span>{getSortIndicator('p.price')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.status')}>
                Status
                <span>{getSortIndicator('p.status')}</span>
              </button>
            </th>
            {#if isReviewOnly}
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Solicitação
              </th>
            {/if}
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Anunciante</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Telefone</th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          {#each properties as property}
            <tr
              class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              on:click={(event) => reviewProperty(property, event)}
            >
              <td class="px-6 py-4">
                <div class="flex min-w-0 items-start gap-3">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-100 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {#if getPropertyCoverUrl(property)}
                      <img
                        src={getPropertyCoverUrl(property)}
                        alt={`Capa do imóvel ${property.title}`}
                        class="h-full w-full object-cover"
                        loading="lazy"
                        on:error={() => markThumbnailAsBroken(property.id)}
                      />
                    {:else}
                      Sem imagem
                    {/if}
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-gray-900 dark:text-gray-100">{property.title}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">ID: {property.id}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {property.bairro ?? '-'}
                {#if property.city}
                  {' - '}{property.city}
                {/if}
                {#if property.state}
                  / {property.state}
                {/if}
              </td>
              <td class="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                <div class="flex flex-col gap-1">
                  {#each resolvePriceLines(property) as line}
                    <span>{line.label}: {formatCurrency(line.value)}</span>
                  {/each}
                </div>
              </td>
              <td class="px-6 py-4">
                <span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(property.status)}`}>
                  {humanizeStatus(property.status, property.purpose)}
                </span>
              </td>
              {#if isReviewOnly}
                {@const requestType = inferRequestType(property)}
                <td class="px-6 py-4">
                  <span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${requestTypeBadgeClasses(requestType)}`}>
                    {humanizeRequestType(requestType)}
                  </span>
                </td>
              {/if}
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {property.broker_name ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {formatPhoneDisplayBr(property.broker_phone)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
                  on:click={(event) => reviewProperty(property, event)}
                  disabled={isDetailLoading && selectedProperty?.id === property.id}
                >
                  {#if isDetailLoading && selectedProperty?.id === property.id}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  {:else}
                    Revisar
                  {/if}
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="mt-4">
      <Pagination bind:currentPage {totalPages} {totalItems} {itemsPerPage} />
    </div>
  {/if}
</div>

<Dialog.Root bind:open={isModalOpen}>
  <Dialog.Content className="max-h-[85vh] overflow-y-auto overflow-x-hidden max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:px-4 max-sm:py-6">
    {#if selectedProperty}
      <Dialog.Header>
        <Dialog.Title>{selectedProperty.title}</Dialog.Title>
        <Dialog.Description>
          Status:
          <span class={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(selectedProperty.status)}`}>
            {humanizeStatus(selectedProperty.status, selectedProperty.purpose)}
          </span>
        </Dialog.Description>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Dashboard / Imóveis / Revisão #{selectedProperty.id}
        </p>
      </Dialog.Header>

      <div class="min-w-0 space-y-6 overflow-y-auto overflow-x-hidden px-6 py-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">Finalidade</p>
            {#if isEditMode && editableProperty}
              <div class="flex flex-col gap-2">
                <label class="text-xs text-gray-500 dark:text-gray-400" for="purpose-select">Finalidade</label>
                <select
                  id="purpose-select"
                  name="purpose"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  bind:value={editableProperty.purpose}
                  on:change={() => {
                    const flags = getPurposeFlags(editableProperty?.purpose ?? null);
                    if (!flags.supportsSale) {
                      editPromotionSalePercentageDisplay = '';
                    }
                    if (!flags.supportsRent) {
                      editPromotionRentPercentageDisplay = '';
                    }
                    refreshPromotionPreviewDisplays();
                  }}
                >
                  <option value="Venda">Venda</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Venda e Aluguel">Venda e Aluguel</option>
                </select>
              </div>
              {@const flags = getPurposeFlags(editableProperty.purpose ?? null)}
              {#if flags.isDual}
                <div class="grid gap-3 md:grid-cols-2">
                  <input
                    name="price_sale_display"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
                    type="text"
                    inputmode="numeric"
                    bind:value={editPriceSaleDisplay}
                    placeholder="Preço de venda"
                    on:input={(event) => {
                      const target = event.target as HTMLInputElement;
                      editPriceSaleDisplay = formatCurrencyInput(target.value);
                      if (editableProperty) {
                        editableProperty.price_sale = parseCurrency(editPriceSaleDisplay);
                        editableProperty.price = editableProperty.price_sale ?? editableProperty.price;
                        refreshPromotionPreviewDisplays();
                      }
                    }}
                  />
                  <input
                    name="price_rent_display"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
                    type="text"
                    inputmode="numeric"
                    bind:value={editPriceRentDisplay}
                    placeholder="Preço do aluguel"
                    on:input={(event) => {
                      const target = event.target as HTMLInputElement;
                      editPriceRentDisplay = formatCurrencyInput(target.value);
                      if (editableProperty) {
                        editableProperty.price_rent = parseCurrency(editPriceRentDisplay);
                        editableProperty.price = editableProperty.price_rent ?? editableProperty.price;
                        refreshPromotionPreviewDisplays();
                      }
                    }}
                  />
                </div>
              {:else if flags.supportsRent}
                <input
                  name="price_rent_display"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
                  type="text"
                  inputmode="numeric"
                  bind:value={editPriceRentDisplay}
                  placeholder="Preço do aluguel"
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    editPriceRentDisplay = formatCurrencyInput(target.value);
                    if (editableProperty) {
                      editableProperty.price_rent = parseCurrency(editPriceRentDisplay);
                      editableProperty.price = editableProperty.price_rent ?? editableProperty.price;
                      refreshPromotionPreviewDisplays();
                    }
                  }}
                />
              {:else}
                <input
                  name="price_sale_display"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
                  type="text"
                  inputmode="numeric"
                  bind:value={editPriceSaleDisplay}
                  placeholder="Preço de venda"
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    editPriceSaleDisplay = formatCurrencyInput(target.value);
                    if (editableProperty) {
                      editableProperty.price_sale = parseCurrency(editPriceSaleDisplay);
                      editableProperty.price = editableProperty.price_sale ?? editableProperty.price;
                      refreshPromotionPreviewDisplays();
                    }
                  }}
                />
              {/if}

              {#if flags.isDual}
                <div class="mt-2 grid gap-3 md:grid-cols-2">
                  <label class="flex flex-col gap-1">
                    <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Venda)</span>
                    <input
                      name="promotion_percentage"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
                      type="text"
                      inputmode="decimal"
                      bind:value={editPromotionSalePercentageDisplay}
                      placeholder="Ex: 8.5"
                      on:input={(event) => {
                        const target = event.target as HTMLInputElement;
                        editPromotionSalePercentageDisplay = formatPercentageInput(target.value);
                        refreshPromotionPreviewDisplays();
                      }}
                    />
                    <span class="text-xs text-emerald-700 dark:text-emerald-300">
                      Valor promocional: {editPromotionPriceSaleDisplay || '-'}
                    </span>
                  </label>
                  <label class="flex flex-col gap-1">
                    <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Aluguel)</span>
                    <input
                      name="promotional_rent_percentage"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
                      type="text"
                      inputmode="decimal"
                      bind:value={editPromotionRentPercentageDisplay}
                      placeholder="Ex: 12"
                      on:input={(event) => {
                        const target = event.target as HTMLInputElement;
                        editPromotionRentPercentageDisplay = formatPercentageInput(target.value);
                        refreshPromotionPreviewDisplays();
                      }}
                    />
                    <span class="text-xs text-emerald-700 dark:text-emerald-300">
                      Valor promocional: {editPromotionPriceRentDisplay || '-'}
                    </span>
                  </label>
                </div>
              {:else if flags.supportsRent}
                <label class="mt-2 flex flex-col gap-1">
                  <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Aluguel)</span>
                  <input
                    name="promotional_rent_percentage"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
                    type="text"
                    inputmode="decimal"
                    bind:value={editPromotionRentPercentageDisplay}
                    placeholder="Ex: 12"
                    on:input={(event) => {
                      const target = event.target as HTMLInputElement;
                      editPromotionRentPercentageDisplay = formatPercentageInput(target.value);
                      refreshPromotionPreviewDisplays();
                    }}
                  />
                  <span class="text-xs text-emerald-700 dark:text-emerald-300">
                    Valor promocional: {editPromotionPriceRentDisplay || '-'}
                  </span>
                </label>
              {:else}
                <label class="mt-2 flex flex-col gap-1">
                  <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Venda)</span>
                  <input
                    name="promotion_percentage"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
                    type="text"
                    inputmode="decimal"
                    bind:value={editPromotionSalePercentageDisplay}
                    placeholder="Ex: 8.5"
                    on:input={(event) => {
                      const target = event.target as HTMLInputElement;
                      editPromotionSalePercentageDisplay = formatPercentageInput(target.value);
                      refreshPromotionPreviewDisplays();
                    }}
                  />
                  <span class="text-xs text-emerald-700 dark:text-emerald-300">
                    Valor promocional: {editPromotionPriceSaleDisplay || '-'}
                  </span>
                </label>
              {/if}
            {:else}
              <p class="text-base text-gray-800 dark:text-gray-200">{selectedProperty.purpose ?? '-'} </p>
              <div class="space-y-1">
                {#each resolvePriceLines(selectedProperty) as line}
                  <p class="text-3xl font-bold text-green-600 dark:text-green-400">
                    {line.label}: {formatCurrency(line.value)}
                  </p>
                {/each}
                {#if selectedProperty.promotion_price != null && selectedProperty.promotion_price > 0}
                  <p class="text-sm font-semibold text-amber-600 dark:text-amber-300">
                    Promoção venda: {formatCurrency(selectedProperty.promotion_price)}
                  </p>
                {/if}
                {#if selectedProperty.promotional_rent_price != null && selectedProperty.promotional_rent_price > 0}
                  <p class="text-sm font-semibold text-amber-600 dark:text-amber-300">
                    Promoção aluguel: {formatCurrency(selectedProperty.promotional_rent_price)}
                  </p>
                {/if}
              </div>
            {/if}
          </div>

              <div class="flex items-center gap-2">
                <Button variant="outline" on:click={toggleEditMode} disabled={isSavingEdit}>
                  {isEditMode ? 'Cancelar edicao' : 'Editar dados'}
                </Button>
                {#if isEditMode && editableProperty}
                  <div class="flex items-center gap-2">
                    <label class="text-xs text-gray-500 dark:text-gray-400" for="status-select">Status</label>
                    <select
                      id="status-select"
                      name="status"
                      class="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      bind:value={editableProperty.status}
                    >
                      <option value="approved">Disponível</option>
                      <option value="rented">Alugado</option>
                      <option value="sold">Vendido</option>
                    </select>
                  </div>
                {/if}
              </div>
          </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria</h3>
          {#if selectedPropertyImages().length > 0}
            <div
              class="show-scrollbar mt-2 flex max-w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain rounded-md bg-gray-50 p-3 touch-pan-x [-webkit-overflow-scrolling:touch] dark:bg-gray-800/60"
            >
                {#each visibleSelectedPropertyImages() as image (image.id)}
                <div class="relative flex shrink-0 flex-col items-center gap-2">
                  <button
                    type="button"
                    class="rounded-md p-0 shadow focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Abrir imagem do imóvel"
                    on:click={() => openImagePreview(image.url, findImageIndexByUrl(image.url))}
                  >
                    <img
                      src={image.url}
                      alt="Foto do imóvel"
                      class="h-32 w-48 max-w-none rounded-md object-cover sm:w-56"
                      loading="lazy"
                      on:error={() => markImageAsBroken(image.url)}
                    />
                  </button>
                  {#if isEditMode && image.id != null}
                    <Button variant="destructive" size="sm" on:click={() => handleImageDelete(image.id!)}>
                      Remover
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
            {#if brokenSelectedPropertyImagesCount() > 0}
              <p class="mt-2 text-xs text-amber-600 dark:text-amber-300">
                {brokenSelectedPropertyImagesCount()} imagem(ns) corrompida(s) foram ocultada(s).
              </p>
            {/if}
          {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma imagem cadastrada.</p>
          {/if}
        </div>
        {#if isEditMode}
          <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="upload-images-input">Enviar novas imagens</label>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Limite total: 20 imagens por imóvel.
          </p>
          <div
            class={`rounded-md border-2 border-dashed p-3 transition ${
              isImageDropActive
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
            role="group"
            aria-label="Envio de imagens do imóvel"
            on:dragover|preventDefault={() => (isImageDropActive = true)}
            on:dragenter|preventDefault={() => (isImageDropActive = true)}
            on:dragleave={() => (isImageDropActive = false)}
            on:drop={handleImageDrop}
          >
            <input id="upload-images-input" name="images" bind:this={imageInputEl} class="sr-only" type="file" accept="image/*" multiple on:change={handleImageSelection} disabled={imageUploading} />
            <div class="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" on:click={openImagePicker} disabled={imageUploading}>
                Escolher imagens
              </Button>
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {#if stagedImages.length > 0}
                  {stagedImages.length} imagem(ns) selecionada(s)
                {:else}
                  Nenhuma imagem selecionada
                {/if}
              </span>
            </div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Arraste e solte imagens aqui ou clique para selecionar.
            </p>
          </div>
          {#if stagedImages.length > 0}
            <div class="show-scrollbar mt-3 flex gap-3 overflow-x-auto rounded-md bg-gray-50 p-3 dark:bg-gray-800/60">
              {#each stagedImagePreviews as preview, index}
                <div class="relative flex-shrink-0">
                  <img
                    src={preview}
                    alt="Prévia da imagem"
                    class="h-24 w-auto rounded-md object-cover shadow"
                  />
                  <button
                    type="button"
                    class="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white hover:bg-black/80"
                    on:click={() => removeStagedImage(index)}
                    aria-label="Remover imagem selecionada"
                  >
                    X
                  </button>
                </div>
              {/each}
            </div>
            <div class="flex flex-wrap gap-2">
              <Button on:click={uploadStagedImages} disabled={imageUploading}>
                {#if imageUploading}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Salvar
              </Button>
              <Button variant="outline" on:click={clearStagedImages} disabled={imageUploading}>
                Sair
              </Button>
            </div>
          {/if}
          {#if imageUploading}
            <p class="text-xs text-gray-500 dark:text-gray-400">Enviando imagens...</p>
          {/if}
          {#if imageUploadError}
            <p class="text-xs text-red-500 dark:text-red-400">{imageUploadError}</p>
          {/if}
          </div>
        {/if}

          {#if selectedProperty.video_url || isEditMode}
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Video</h3>

              {#if selectedProperty.video_url}
                <div class="mt-2 overflow-hidden rounded-lg bg-black/10 dark:bg-gray-800">
                  <video
                    class="h-64 w-full rounded-lg object-cover"
                    src={selectedProperty.video_url}
                    controls
                    preload="metadata"
                  >
                    <track kind="captions" srclang="pt" label="Portugues" />
                  </video>
                </div>
              {:else}
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Nenhum video cadastrado.</p>
              {/if}

              {#if isEditMode}
                <div class="mt-3 space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="upload-video-input">Enviar vídeo</label>
                  <div
                    class={`rounded-md border-2 border-dashed p-3 transition ${
                      isVideoDropActive
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                    }`}
                    role="group"
                    aria-label="Envio de video do imóvel"
                    on:dragover|preventDefault={() => (isVideoDropActive = true)}
                    on:dragenter|preventDefault={() => (isVideoDropActive = true)}
                    on:dragleave={() => (isVideoDropActive = false)}
                    on:drop={handleVideoDrop}
                  >
                    <input id="upload-video-input" name="video" bind:this={videoInputEl} class="sr-only" type="file" accept="video/*" on:change={handleVideoSelection} disabled={videoUploading || videoDeleting} />
                    <div class="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" on:click={openVideoPicker} disabled={videoUploading || videoDeleting}>
                        Escolher vídeo
                      </Button>
                      <span class="text-sm text-gray-600 dark:text-gray-300">
                        {stagedVideo ? stagedVideo.name : 'Nenhum vídeo selecionado'}
                      </span>
                    </div>
                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Arraste e solte um vídeo aqui ou clique para selecionar.
                    </p>
                  </div>

                  {#if stagedVideoPreview}
                    <div class="mt-2 overflow-hidden rounded-lg bg-black/10 dark:bg-gray-800">
                      <video
                        class="h-64 w-full rounded-lg object-cover"
                        src={stagedVideoPreview}
                        controls
                        preload="metadata"
                      >
                        <track kind="captions" srclang="pt" label="Portugues" />
                      </video>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <Button on:click={uploadStagedVideo} disabled={videoUploading || videoDeleting}>
                        {#if videoUploading}
                          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        Salvar
                      </Button>
                      <Button variant="outline" on:click={clearStagedVideo} disabled={videoUploading || videoDeleting}>
                        Sair
                      </Button>
                    </div>
                  {/if}

                  {#if selectedProperty.video_url}
                    <div class="flex flex-wrap items-center gap-2">
                      <Button variant="outline" on:click={handleVideoDelete} disabled={videoDeleting || videoUploading}>
                        {#if videoDeleting}
                          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        Remover vídeo
                      </Button>
                    </div>
                  {/if}

                  {#if videoUploading}
                    <p class="text-xs text-gray-500 dark:text-gray-400">Enviando video...</p>
                  {/if}
                  {#if videoDeleteError}
                    <p class="text-xs text-red-500 dark:text-red-400">{videoDeleteError}</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Descrição</h3>
          {#if isEditMode && editableProperty}
            <textarea
              name="description"
              maxlength="500"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              rows="3"
              bind:value={editableProperty.description}
              placeholder="Descricao do imóvel"
            ></textarea>
          {:else}
            <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {selectedProperty.description ?? 'Sem descricao.'}
            </p>
          {/if}
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Localização e atributos</h3>
          {#if isEditMode && editableProperty}
            <div class="mt-2 grid gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
              <label class="flex flex-col gap-1">
                <strong>Estado:</strong>
                <input name="state" maxlength="2" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.state} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>CEP:</strong>
                <input
                  name="cep"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  bind:value={editableProperty.cep}
                  inputmode="numeric"
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    if (editableProperty) {
                      editableProperty.cep = formatCep(target.value);
                    }
                  }}
                />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Cidade:</strong>
                <input
                  name="city"
                  list="property-cities-list"
                  maxlength="120"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  bind:value={editableProperty.city}
                />
                <datalist id="property-cities-list">
                  {#each cities as cityOption}
                    <option value={cityOption}></option>
                  {/each}
                </datalist>
              </label>
              <label class="flex flex-col gap-1">
                <strong>Bairro:</strong>
                <input name="bairro" maxlength="120" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.bairro} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Endereço:</strong>
                <input name="address" maxlength="120" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.address} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Número:</strong>
                <input
                  name="numero"
                  maxlength="25"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  bind:value={editableProperty.numero}
                  inputmode="numeric"
                  disabled={editSemNumero}
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    if (editableProperty) {
                      editableProperty.numero = sanitizeDigitsInput(target.value);
                    }
                  }}
                />
              </label>
              <label class="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  name="sem_numero"
                  bind:checked={editSemNumero}
                  on:change={() => {
                    if (editSemNumero && editableProperty) {
                      editableProperty.numero = '';
                    }
                  }}
                />
                <span>Sem número</span>
              </label>
              <label class="flex flex-col gap-1">
                <strong>Complemento:</strong>
                <input name="complemento" maxlength="120" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.complemento} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Quadra:</strong>
                <input name="quadra" maxlength="25" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.quadra} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Lote:</strong>
                <input name="lote" maxlength="25" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.lote} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Tipo do lote:</strong>
                <input name="tipo_lote" maxlength="25" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.tipo_lote} />
              </label>
              <label class="flex flex-col gap-1">
                <strong class="flex items-center justify-between gap-3">
                  <span>Quartos:</span>
                  <span class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      bind:checked={editBedroomsAsZero}
                      on:change={() => {
                        if (editBedroomsAsZero && editableProperty) {
                          editableProperty.bedrooms = 0;
                        }
                      }}
                    />
                    Sem quarto
                  </span>
                </strong>
                <input
                  name="bedrooms"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900"
                  bind:value={editableProperty.bedrooms}
                  disabled={editBedroomsAsZero}
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    if (editableProperty) {
                      const digits = clampCountInput(target.value);
                      editableProperty.bedrooms = digits ? Number(digits) : null;
                    }
                  }}
                />
              </label>
              <label class="flex flex-col gap-1">
                <strong class="flex items-center justify-between gap-3">
                  <span>Banheiros:</span>
                  <span class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      bind:checked={editBathroomsAsZero}
                      on:change={() => {
                        if (editBathroomsAsZero && editableProperty) {
                          editableProperty.bathrooms = 0;
                        }
                      }}
                    />
                    Sem banheiro
                  </span>
                </strong>
                <input
                  name="bathrooms"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900"
                  bind:value={editableProperty.bathrooms}
                  disabled={editBathroomsAsZero}
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    if (editableProperty) {
                      const digits = clampCountInput(target.value);
                      editableProperty.bathrooms = digits ? Number(digits) : null;
                    }
                  }}
                />
              </label>
              <label class="flex flex-col gap-1">
                <strong class="flex items-center justify-between gap-3">
                  <span>Garagens:</span>
                  <span class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      bind:checked={editGarageSpotsAsZero}
                      on:change={() => {
                        if (editGarageSpotsAsZero && editableProperty) {
                          editableProperty.garage_spots = 0;
                        }
                      }}
                    />
                    Sem garagem
                  </span>
                </strong>
                <input
                  name="garage_spots"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900"
                  bind:value={editableProperty.garage_spots}
                  disabled={editGarageSpotsAsZero}
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    if (editableProperty) {
                      const digits = clampCountInput(target.value);
                      editableProperty.garage_spots = digits ? Number(digits) : null;
                    }
                  }}
                />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Área construída:</strong>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    name="area_construida"
                    type="text"
                    inputmode="decimal"
                    maxlength="12"
                    class="w-full min-w-0 rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                    bind:value={editableProperty.area_construida}
                    on:input={(event) => {
                      const target = event.target as HTMLInputElement;
                      if (editableProperty) {
                        const sanitized = clampAreaInput(target.value);
                        editableProperty.area_construida = sanitized
                          ? Number(sanitized.replace(',', '.'))
                          : null;
                      }
                    }}
                  />
                  <select
                    name="area_construida_unidade"
                    class="w-full rounded border px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:w-44"
                    bind:value={editableProperty.area_construida_unidade}
                  >
                    {#each areaUnitOptions as unit}
                      <option value={unit.value}>{unit.label}</option>
                    {/each}
                  </select>
                </div>
              </label>
              <label class="flex flex-col gap-1">
                <strong>Área do terreno:</strong>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    name="area_terreno"
                    type="text"
                    inputmode="decimal"
                    maxlength="12"
                    class="w-full min-w-0 rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                    bind:value={editableProperty.area_terreno}
                    on:input={(event) => {
                      const target = event.target as HTMLInputElement;
                      if (editableProperty) {
                        const sanitized = clampAreaInput(target.value);
                        editableProperty.area_terreno = sanitized
                          ? Number(sanitized.replace(',', '.'))
                          : null;
                      }
                    }}
                  />
                  <select
                    name="area_terreno_unidade"
                    class="w-full rounded border px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:w-44"
                    bind:value={editableProperty.area_terreno_unidade}
                  >
                    {#each areaUnitOptions as unit}
                      <option value={unit.value}>{unit.label}</option>
                    {/each}
                  </select>
                </div>
              </label>
              <p><strong>Proprietário:</strong> {selectedProperty.owner_name ?? '-'}</p>
              <p><strong>Telefone do proprietário:</strong> {formatPhoneDisplayBr(selectedProperty.owner_phone)}</p>
              <p><strong>Anunciante:</strong> {selectedProperty.broker_name ?? '-'}</p>
              <p><strong>Telefone:</strong> {formatPhoneDisplayBr(selectedProperty.broker_phone)}</p>
              <p><strong>Corretor credenciado:</strong> {isBrokerCredenciado(selectedProperty) ? 'Sim' : 'Não'}</p>
              {#if isBrokerCredenciado(selectedProperty)}
                <p><strong>CRECI:</strong> {selectedProperty.broker_creci ?? '-'}</p>
              {/if}
            </div>
          {:else}
            <ul class="mt-2 grid gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
              <li><strong>Estado:</strong> {selectedProperty.state ?? '-'}</li>
              <li><strong>CEP:</strong> {selectedProperty.cep ?? '-'}</li>
              <li><strong>Cidade:</strong> {selectedProperty.city ?? '-'}</li>
              <li><strong>Bairro:</strong> {selectedProperty.bairro ?? '-'}</li>
              <li><strong>Endereço:</strong> {selectedProperty.address ?? '-'}</li>
              <li><strong>Número:</strong> {formatNumeroDisplay(selectedProperty.numero)}</li>
              <li><strong>Complemento:</strong> {selectedProperty.complemento ?? '-'}</li>
              <li><strong>Quadra:</strong> {selectedProperty.quadra ?? '-'}</li>
              <li><strong>Lote:</strong> {selectedProperty.lote ?? '-'}</li>
              <li><strong>Tipo do lote:</strong> {selectedProperty.tipo_lote ?? '-'}</li>
              <li><strong>Quartos:</strong> {selectedProperty.bedrooms ?? '-'}</li>
              <li><strong>Banheiros:</strong> {selectedProperty.bathrooms ?? '-'}</li>
              <li><strong>Garagens:</strong> {selectedProperty.garage_spots ?? '-'}</li>
              <li><strong>Área construída:</strong> {formatAreaWithUnit(selectedProperty.area_construida, selectedProperty.area_construida_unidade)}</li>
              <li><strong>Área do terreno:</strong> {formatAreaWithUnit(selectedProperty.area_terreno, selectedProperty.area_terreno_unidade ?? selectedProperty.area_construida_unidade)}</li>
              <li><strong>Proprietário:</strong> {selectedProperty.owner_name ?? '-'}</li>
              <li><strong>Telefone do proprietário:</strong> {formatPhoneDisplayBr(selectedProperty.owner_phone)}</li>
              <li><strong>Anunciante:</strong> {selectedProperty.broker_name ?? '-'}</li>
              <li><strong>Telefone:</strong> {formatPhoneDisplayBr(selectedProperty.broker_phone)}</li>
              <li><strong>Corretor credenciado:</strong> {isBrokerCredenciado(selectedProperty) ? 'Sim' : 'Não'}</li>
              {#if isBrokerCredenciado(selectedProperty)}
                <li><strong>CRECI:</strong> {selectedProperty.broker_creci ?? '-'}</li>
              {/if}
            </ul>
          {/if}
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Comodidades</h3>
          <div class="mt-2 flex flex-wrap gap-2 text-sm">
            {#if isEditMode && editableProperty}
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" name="has_wifi" bind:checked={editableProperty.has_wifi} />
                Wi-Fi
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" name="tem_piscina" bind:checked={editableProperty.tem_piscina} />
                Piscina
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" name="tem_energia_solar" bind:checked={editableProperty.tem_energia_solar} />
                Energia solar
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" name="tem_automacao" bind:checked={editableProperty.tem_automacao} />
                Automação
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" name="tem_ar_condicionado" bind:checked={editableProperty.tem_ar_condicionado} />
                Ar-condicionado
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" name="eh_mobiliada" bind:checked={editableProperty.eh_mobiliada} />
                Mobiliada
              </label>
            {:else}
              {#each [
                { label: 'Wi-Fi', value: selectedProperty.has_wifi },
                { label: 'Piscina', value: selectedProperty.tem_piscina },
                { label: 'Energia solar', value: selectedProperty.tem_energia_solar },
                { label: 'Automação', value: selectedProperty.tem_automacao },
                { label: 'Ar condicionado', value: selectedProperty.tem_ar_condicionado },
                { label: 'Mobiliada', value: selectedProperty.eh_mobiliada }
              ] as amenity}
                <span class={`rounded-full px-3 py-1 ${amenity.value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {amenity.label}: {amenity.value ? 'Sim' : 'Não'}
                </span>
              {/each}
            {/if}
          </div>
        </div>

        {#if editError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {editError}
          </div>
        {/if}
        {#if imageDeleteError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {imageDeleteError}
          </div>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="outline" on:click={closeModal} disabled={isProcessing}>
          Sair
        </Button>
        {#if allowApproval}
          {#if selectedProperty.status !== 'rejected'}
            <Button variant="destructive" on:click={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
              {#if isProcessing}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Rejeitar
            </Button>
          {/if}
        {:else}
          <Button variant="destructive" on:click={handleDeleteProperty} disabled={isProcessing}>
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Excluir
          </Button>
        {/if}
          {#if isEditMode && editableProperty}
            <Button
              className={allowApproval
                ? 'bg-green-500 text-black hover:bg-green-600'
                : 'bg-emerald-400 text-white hover:bg-emerald-500'}
              on:click={saveEdits}
              disabled={isSavingEdit || isProcessing}
            >
            {#if isSavingEdit}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Salvar
          </Button>
        {/if}
        {#if allowApproval && selectedProperty.status !== 'approved'}
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            on:click={() => handleStatusUpdate('approved')}
            disabled={isProcessing}
          >
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Aprovar
          </Button>
        {/if}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

{#if rejectDialogOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Rejeitar imóvel</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Informe a observação que justifica a rejeição antes de concluir a ação.
        </p>
      </div>
      <label class="mt-4 block">
        <span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Observação</span>
        <textarea
          rows="4"
          maxlength="500"
          bind:value={rejectObservation}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Explique o motivo da rejeição"
        ></textarea>
      </label>
      {#if rejectObservationError}
        <p class="mt-2 text-sm text-red-600 dark:text-red-300">{rejectObservationError}</p>
      {/if}
      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" on:click={() => {
          rejectDialogOpen = false;
          rejectObservation = '';
          rejectObservationError = null;
        }} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button variant="destructive" on:click={confirmRejectProperty} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Confirmar rejeição
        </Button>
      </div>
    </div>
  </div>
{/if}

<AdminPasswordConfirmDialog
  bind:open={isDeleteDialogOpen}
  title="Excluir imóvel"
  description={selectedProperty ? `Confirme sua senha para excluir o imóvel ${selectedProperty.title}.` : ''}
  confirmLabel="Excluir imóvel"
  isSubmitting={isProcessing}
  error={deleteError}
  on:confirm={(event) => confirmDeleteProperty(event.detail.password)}
/>

<svelte:window on:keydown={handlePreviewKeydown} />

  {#if isImagePreviewOpen}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      role="button"
      tabindex="0"
      aria-label="Fechar visualização da imagem"
      on:click={closeImagePreview}
      on:keydown={handlePreviewKeydown}
    >
      <div
        class="relative flex max-h-[90vh] max-w-[100vw] flex-col items-center"
        role="dialog"
        aria-modal="true"
        tabindex="0"
        on:click|stopPropagation
        on:keydown={(event) => {
          handlePreviewKeydown(event);
          event.stopPropagation();
        }}
      >
      {#if previewTotal > 1}
        <button
          type="button"
          class="absolute left-2 top-[40%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow transition hover:bg-black/50"
          on:click={goPrevImage}
          disabled={!hasPrevImage()}
          aria-label="Imagem anterior"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          class="absolute right-2 top-[40%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow transition hover:bg-black/50"
          on:click={goNextImage}
          disabled={!hasNextImage()}
          aria-label="Próxima imagem"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      {/if}
      {#if previewImageUrl}
        <img
          src={previewImageUrl}
          alt=""
          class="max-h-[min(72vh,85vw)] max-w-[95vw] shrink-0 select-none object-contain"
          draggable="false"
          on:error={handlePreviewImageError}
        />
      {/if}
      {#if previewTotal > 1}
        <div
          class="show-scrollbar mt-3 max-w-[95vw] overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] touch-pan-x"
          role="navigation"
          aria-label="Miniaturas da galeria"
        >
          <div class="flex w-max min-w-full justify-center gap-2 px-1">
            {#each previewImages as image, thumbIdx}
              {#if image?.url && !brokenPreviewImages.has(image.url)}
                <button
                  type="button"
                  class="shrink-0 overflow-hidden rounded-md ring-2 transition focus:outline-none focus-visible:ring-green-400 {thumbIdx ===
                  previewImageIndex
                    ? 'ring-white'
                    : 'ring-transparent opacity-80 hover:opacity-100'}"
                  aria-label={`Foto ${thumbIdx + 1} de ${previewTotal}`}
                  aria-current={thumbIdx === previewImageIndex ? 'true' : undefined}
                  on:click|stopPropagation={() => {
                    previewImageIndex = thumbIdx;
                    previewImageUrl = image.url;
                  }}
                >
                  <img
                    src={image.url}
                    alt=""
                    class="h-16 w-24 object-cover sm:h-[4.5rem] sm:w-28"
                    draggable="false"
                  />
                </button>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
      <button
        type="button"
        class="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white shadow hover:bg-black/70"
        on:click={closeImagePreview}
        aria-label="Fechar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
{/if}
