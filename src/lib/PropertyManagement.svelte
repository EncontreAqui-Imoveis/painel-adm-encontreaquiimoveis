<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import PropertyFormShell from '$lib/components/property/PropertyFormShell.svelte';
  import PropertyLocationFields from '$lib/components/property/PropertyLocationFields.svelte';
  import PropertyStructureFields from '$lib/components/property/PropertyStructureFields.svelte';
  import PropertyAmenitiesFields from '$lib/components/property/PropertyAmenitiesFields.svelte';
  import PropertyGallerySection from '$lib/components/property/PropertyGallerySection.svelte';
  import PropertyImageUploadSection from '$lib/components/property/PropertyImageUploadSection.svelte';
  import PropertyPricingSection from '$lib/components/property/PropertyPricingSection.svelte';
  import PropertyVideoSection from '$lib/components/property/PropertyVideoSection.svelte';
  import PropertyManagementQueue from '$lib/components/property/PropertyManagementQueue.svelte';
  import PropertyManagementFooterActions from '$lib/components/property/PropertyManagementFooterActions.svelte';
  import PropertyDecisionDialogs from '$lib/components/property/PropertyDecisionDialogs.svelte';
  import PropertyManagementActionBar from '$lib/components/property/PropertyManagementActionBar.svelte';
  import {
    humanizePropertyRequestType,
    inferPropertyRequestType,
    propertyRequestTypeBadgeClasses,
    reviewPropertyRequestTypeLabel,
    type PropertyRequestTypeFilter,
  } from '$lib/components/property/propertyReviewHelpers';
  import {
    humanizePropertyStatus,
    propertyStatusBadgeClasses,
    normalizePublicCode,
    publicCodeLabel,
    resolveSelectedPropertyPublicCode,
  } from '$lib/components/property/propertyPresentationHelpers';
  import {
    resolvePropertyReviewState,
    submitPropertyReviewStatus,
  } from '$lib/components/property/propertyReviewFlowHelpers';
  import {
    buildPropertyModalResetState,
    buildSoldDialogResetState,
    resolvePropertyEditExtraState,
    resolvePropertyEditNumericFlags,
  } from '$lib/components/property/propertyModalStateHelpers';
  import {
    buildPropertyEditPayload,
    resolvePropertyEditUpdateStrategy,
  } from '$lib/components/property/propertyEditHelpers';
  import {
    formatAreaWithUnit,
    formatCurrency,
    formatNumeroDisplay,
    getPurposeFlags,
    isOptionalBairroPropertyType,
    isSemNumeroValue,
    normalizeAreaUnit,
    normalizeCityLabel,
    resolvePriceLines,
    type AreaUnit,
  } from '$lib/components/property/propertyFormattingHelpers';
  import {
    compareByAreaSort,
    propertyMatchesAreaFilter,
    type AreaMetric,
  } from '$lib/components/property/propertyAreaFilterHelpers';
  import * as Select from '$lib/components/ui/select';
  import { Input } from '$lib/components/ui/input';
  import {
    extractApiErrorMessage,
    formatPromotionPercentageInput,
    parsePromotionPercentage,
  } from '$lib/components/create-property-helpers';
  import { formatPropertySaveError } from '$lib/components/property/propertyErrorHelpers';
  import {
    RENT_PROPERTY_PRICE_MAX,
    RENT_PROPERTY_PRICE_INPUT_MAX_LENGTH,
    SALE_PROPERTY_PRICE_MAX,
    SALE_PROPERTY_PRICE_INPUT_MAX_LENGTH,
    clampPropertyPriceValue,
    formatPropertyPriceDisplay,
    formatPropertyPriceInput,
    parsePropertyPriceInput,
  } from '$lib/propertyPriceLimits';
  import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';
  import Pagination from '$lib/Pagination.svelte';
  import PromotionNotificationModal from '$lib/components/PromotionNotificationModal.svelte';
  import { fetchPlatformResponse, resolveApiAssetUrl } from './adminFetchService';
  import { clearSessionToken, hasSessionToken } from './sessionState';
  import { reconcilePropertyPreviewMediaState } from '$lib/propertyMediaState';
  import type { PropertyStatus, PropertyImage as PropertyImageType } from './types';
  import {
    PROPERTY_AMENITY_OPTIONS,
    hasAmenity,
    normalizeAmenityList,
    type PropertyAmenity,
  } from '$lib/propertyAmenities';
function parseNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const normalized = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

  interface PropertySummary {
    id: number;
    title: string;
    type?: string | null;
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
    public_id?: number | null;
    public_code?: string | null;
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
    area_construida_valor?: number | null;
    area_terreno_valor?: number | null;
    area_construida_m2?: number | null;
    area_terreno_m2?: number | null;
    amenities?: string[] | null;
    images?: Array<NormalizedImage | PropertyImageType | string> | string | null;
  }

  type NormalizedImage = PropertyImageType;

  type PropertyDetails = PropertySummary & {
    description?: string | null;
    purpose?: string | null;
    address?: string | null;
    quadra?: string | null;
    lote?: string | null;
    sem_quadra?: number | boolean | null;
    sem_lote?: number | boolean | null;
    numero?: string | null;
    bairro?: string | null;
    complemento?: string | null;
    sem_cep?: number | boolean | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    garage_spots?: number | null;
    area_construida?: number | null;
    area_construida_unidade?: AreaUnit | null;
    area_terreno?: number | null;
    area_terreno_unidade?: AreaUnit | null;
    area_construida_valor?: number | null;
    area_terreno_valor?: number | null;
    area_construida_m2?: number | null;
    area_terreno_m2?: number | null;
    public_code?: string | null;
    public_id?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    promotion_percentage?: number | null;
    promotion_price?: number | null;
    promotional_rent_price?: number | null;
    promotional_rent_percentage?: number | null;
    valor_condominio?: number | null;
    valor_iptu?: number | null;
    code?: string | null;
    sale_value?: number | null;
    commission_rate?: number | null;
    commission_value?: number | null;
    video_url?: string | null;
    amenities?: string[] | null;
    images?: Array<NormalizedImage | PropertyImageType | string> | string | null;
  };

  const propertyAmenityOptions = PROPERTY_AMENITY_OPTIONS;

  type SortConfig = {
    key: string;
    order: 'asc' | 'desc';
  };

  type PropertyFilters = {
    status: PropertyStatus | 'all';
    city: string;
    search: string;
    purpose: 'all' | 'Venda' | 'Aluguel';
  };
  export let initialStatus: PropertyStatus | 'all' = 'approved';
  export let allowApproval = false;
  export let initialReviewRequestType: PropertyRequestTypeFilter = 'all';
  let isReviewOnly = false;
  let reviewRequestType: PropertyRequestTypeFilter = initialReviewRequestType;
  $: isReviewOnly = allowApproval;

    let properties: PropertySummary[] = [];
  let isLoading = false;
  let error: string | null = null;
  let cities: string[] = [];
  let filters: PropertyFilters = {
    status: initialStatus,
    city: 'all',
    search: '',
    purpose: 'all',
  };
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let fetchKey = 0;
  let hasMounted = false;
  let sortConfig: SortConfig = { key: 'p.created_at', order: 'desc' };
  let selectedAmenityFilters: PropertyAmenity[] = [];
  let areaFilterMetric: AreaMetric = 'none';
  let areaFilterMin = '';
  let areaFilterMax = '';
  let areaFilterUnit: AreaUnit = 'm2';
  let areaSortMetric: AreaMetric = 'none';
  let areaSortDirection: 'asc' | 'desc' = 'desc';
  let isClientSideFiltering = false;
  let hasLoadedFullDatasetForLocalFilters = false;
  let shouldUseFullDatasetForLocalFilters = false;
  let listForDisplay: PropertySummary[] = [];
  let displayedProperties: PropertySummary[] = [];
  let totalItemsForDisplay = 0;
  let totalPagesForDisplay = 1;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isModalOpen = false;
  let selectedProperty: PropertyDetails | null = null;
  let isDetailLoading = false;
  let isProcessing = false;
  let isEditMode = false;
  let editableProperty: PropertyDetails | null = null;
  let editSemNumero = false;
  let editSemQuadra = false;
  let editSemLote = false;
  let editSemCep = false;
  let editBedroomsAsZero = false;
  let editBathroomsAsZero = false;
  let editGarageSpotsAsZero = false;
  let editSelectedAmenities: string[] = [];
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
  let selectedPropertyGalleryImages: NormalizedImage[] = [];
  let visibleSelectedPropertyGalleryImages: NormalizedImage[] = [];
  let selectedPropertyBrokenGalleryCount = 0;
  let brokenPreviewImages = new Set<string>();
  let galleryScrollEl: HTMLDivElement | null = null;
  type PreviewViewerState = {
    index: number;
    total: number;
    currentImage: NormalizedImage | null;
    canPrev: boolean;
    canNext: boolean;
  };
  let previewViewerState: PreviewViewerState = {
    index: 0,
    total: 0,
    currentImage: null,
    canPrev: false,
    canNext: false,
  };
  let brokenListThumbnails = new Set<number>();
  let isPromotionNotificationModalOpen = false;
  let promotionNotificationMessage = '';
  let promotionNotificationTitle = '';
  let promotionNotificationPropertyId: number | null = null;
  let skipAutoPromotionModalOnce = false;
  // Advertiser search (corretores + clientes)
  type AdvertiserResult = { id: number; name: string; email: string; phone?: string | null; role: string; creci?: string | null; };
  let advertiserQuery = '';
  let advertiserResults: AdvertiserResult[] = [];
  let advertiserSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let advertiserDropdownOpen = false;
  let advertiserSearchLoading = false;
  let selectedAdvertiser: AdvertiserResult | null = null;
  // Sold dialog
  let soldDialogOpen = false;
  let soldByPlatform: boolean | null = null;
  let soldSaleValue = '';
  let soldCommissionRate = '';
  let soldCommissionValue = '';
  let isSavingSold = false;
  // Property types (same as CreateProperty)
  const propertyTypes = [
    'Casa', 'Apartamento', 'Terreno', 'Flat', 'Condomínio Fechado',
    'Área rural', 'Rancho', 'Galpão / Barracão', 'Chácara',
    'Imóvel comercial', 'Área comercial', 'Cobertura / Penthouse',
    'Cobertura', 'Sobrado', 'Kitnet', 'Sala comercial', 'Sala Comercial',
    'Loja', 'Fazenda', 'Galpão', 'Empresa', 'Prédio',
  ];
  // Display values for condominio/IPTU
  let editValorCondominioDisplay = '';
  let editValorIptuDisplay = '';
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
    $: visibleSelectedPropertyGalleryImages = selectedPropertyGalleryImages.filter(
      (image) => !brokenPreviewImages.has(image.url),
    );
    $: selectedPropertyBrokenGalleryCount = selectedPropertyGalleryImages.filter((image) =>
      brokenPreviewImages.has(image.url),
    ).length;
    $: if (isImagePreviewOpen && previewTotal > 0 && previewImageIndex >= previewTotal) {
      previewImageIndex = previewTotal - 1;
      previewImageUrl = previewImages[previewImageIndex]?.url ?? null;
    }
    $: previewViewerState = {
      index: previewImageIndex,
      total: previewTotal,
      currentImage: previewImages[previewImageIndex] ?? null,
      canPrev: previewTotal > 1 && hasPrevImage(),
      canNext: previewTotal > 1 && hasNextImage(),
    };
  $: if (previewTotal > 0) {
    previewImages.forEach((image) => {
      if (!image?.url) return;
      if (brokenPreviewImages.has(image.url)) return;
      const img = new Image();
      img.src = image.url;
    });
  }

  $: hasAreaRangeFilterValues = areaFilterMin.trim() !== '' || areaFilterMax.trim() !== '';
  $: isClientSideFiltering =
    selectedAmenityFilters.length > 0 ||
    areaFilterMetric !== 'none' ||
    areaSortMetric !== 'none' ||
    areaFilterMin.trim() !== '' ||
    areaFilterMax.trim() !== '';
  $: shouldUseFullDatasetForLocalFilters = isClientSideFiltering || hasAreaRangeFilterValues;
  $: localFilterSignature = [
    selectedAmenityFilters.join('|'),
    areaFilterMetric,
    areaFilterMin,
    areaFilterMax,
    areaFilterUnit,
    areaSortMetric,
    areaSortDirection,
  ].join('::');
  $: listForDisplay = localFilterSignature && shouldUseFullDatasetForLocalFilters
    ? [...properties]
      .filter((property) => propertyMatchesAmenityFilter(property))
      .filter((property) =>
        propertyMatchesAreaFilter(
          property,
          areaFilterMetric,
          areaFilterMin,
          areaFilterMax,
          areaFilterUnit
        )
      )
      .sort((first, second) =>
        compareByAreaSort(first, second, areaSortMetric, areaSortDirection)
      )
    : properties;
  $: totalItemsForDisplay = isClientSideFiltering ? listForDisplay.length : totalItems;
  $: totalPagesForDisplay = Math.max(1, Math.ceil(totalItemsForDisplay / itemsPerPage));
  $: if (currentPage > totalPagesForDisplay) {
    currentPage = totalPagesForDisplay;
  }
  $: displayedProperties = isClientSideFiltering
    ? listForDisplay.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : properties;

  function openImagePreview(url: string, index = 0, sourceImages: NormalizedImage[] | null = null) {
    if (brokenPreviewImages.has(url)) {
      return;
    }
    const validImages =
      (sourceImages ?? selectedPropertyImages()).filter(
        (image): image is NormalizedImage => Boolean(image?.url)
      );
    if (validImages.length === 0) return;
    previewImagesSnapshot = validImages;
    const resolvedIndex = validImages.findIndex((image) => image.url === url);
    previewImageIndex =
      resolvedIndex >= 0 ? resolvedIndex : Math.max(0, Math.min(index, validImages.length - 1));
    previewImageUrl = validImages[previewImageIndex]?.url ?? null;
    isImagePreviewOpen = true;
  }

  function closeImagePreview() {
    isImagePreviewOpen = false;
    previewImageUrl = null;
    previewImagesSnapshot = [];
  }

  function markImageAsBroken(url?: string | null) {
    if (!url) return;
    if (/^(blob:|data:|file:)/i.test(url)) return;
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
    if (!isClientSideFiltering) {
      currentPage;
      itemsPerPage;
    }
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
      const shouldFetchFullDataset = shouldUseFullDatasetForLocalFilters;
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.city !== 'all') {
        params.append('city', filters.city);
      }
      if (filters.purpose !== 'all') {
        params.append('purpose', filters.purpose);
      }
      if (isReviewOnly && reviewRequestType !== 'all') {
        params.append('requestType', reviewRequestType);
      }
      params.append('sortBy', sortConfig.key);
      params.append('sortOrder', sortConfig.order);
      if (shouldFetchFullDataset) {
        params.append('paginate', 'false');
      } else {
        params.append('page', String(currentPage));
        params.append('limit', String(itemsPerPage));
      }
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }

      const query = params.toString();
      const response = await api.get<{ data: Array<Record<string, unknown>> }>(
        `/admin/properties-with-brokers${query ? `?${query}` : ''}`
      );

      const raw = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;
      hasLoadedFullDatasetForLocalFilters = shouldFetchFullDataset;
      totalItems = shouldFetchFullDataset
        ? raw.length
        : Number((response as { total?: number })?.total ?? raw.length);
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
          const publicIdValue = record['public_id'];
          const publicCodeValue = record['public_code'];
          const areaConstruidaValorRaw = record['area_construida_valor'];
          const areaTerrenoValorRaw = record['area_terreno_valor'];
          const areaConstruidaM2Raw = record['area_construida_m2'];
          const areaTerrenoM2Raw = record['area_terreno_m2'];
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
            normalizeAreaUnit(areaTerrenoUnidadeRaw) ?? 'm2';
          const areaConstruidaValor = parseNullableNumber(areaConstruidaValorRaw);
          const areaTerrenoValor = parseNullableNumber(areaTerrenoValorRaw);
          const areaConstruidaM2 = parseNullableNumber(areaConstruidaM2Raw);
          const areaTerrenoM2 = parseNullableNumber(areaTerrenoM2Raw);

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
            area_construida_valor: areaConstruidaValor,
            area_terreno_valor: areaTerrenoValor,
            area_construida_m2: areaConstruidaM2 ?? parseNullableNumber(record['area_construida']),
            area_terreno_m2: areaTerrenoM2 ?? parseNullableNumber(record['area_terreno']),
            area_construida: areaConstruidaM2 ?? parseNullableNumber(record['area_construida']),
            area_construida_unidade: areaConstruidaUnidade,
            area_terreno_unidade: areaTerrenoUnidade,
            area_terreno: areaTerrenoM2 ?? parseNullableNumber(record['area_terreno']),
            public_id: publicIdValue != null ? Number(publicIdValue) : null,
            public_code: normalizePublicCode(publicCodeValue),
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
            amenities: getAmenityPayload(record as Record<string, unknown>),
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
      hasLoadedFullDatasetForLocalFilters = false;
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
      const normalizedCities = Array.isArray(list)
        ? list
            .map((city) => normalizeCityLabel(city))
            .filter((city): city is string => Boolean(city))
        : [];
      cities = Array.from(new Set(normalizedCities)).sort((left, right) =>
        left.localeCompare(right, 'pt-BR')
      );
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
      toast.error('Erro ao buscar cidades.', {
        description: err instanceof Error ? err.message : 'Falha inesperada.',
      });
      cities = [];
    }
  }

  function onlyDigits(value: string) {
    return value.replace(/\D/g, '');
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
    return parsePromotionPercentage(value);
  }

  function formatPercentageInput(value: string): string {
    return formatPromotionPercentageInput(value);
  }

  function calculateDiscountedValue(basePrice: number | null, percentage: number | null): number | null {
    if (basePrice == null || basePrice <= 0 || percentage == null || percentage <= 0 || percentage > 100) {
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

  function isBrokerCredenciado(property?: PropertyDetails | null) {
    return Boolean(property?.broker_id) && property?.broker_status === 'approved';
  }

  function normalizeImageUrl(rawUrl: unknown): string | null {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) return null;
    const cleaned = rawUrl.trim();
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    if (/^(blob:|data:|file:)/i.test(cleaned)) return cleaned;
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

  function getAmenityPayload(record: Record<string, unknown>): string[] {
    return normalizeAmenityList(record);
  }

  function isAmenityChecked(
    property: PropertySummary | PropertyDetails | null | undefined,
    amenity: (typeof propertyAmenityOptions)[number]
  ): boolean {
    if (!property) return false;
    return hasAmenity(property.amenities, amenity);
  }

  function isFilterAmenityChecked(amenity: PropertyAmenity): boolean {
    return selectedAmenityFilters.includes(amenity);
  }

  function updateAmenityFilter(amenity: PropertyAmenity, checked: boolean): void {
    const nextAmenityFilters = checked
      ? Array.from(new Set([...selectedAmenityFilters, amenity]))
      : selectedAmenityFilters.filter((item) => item !== amenity);
    selectedAmenityFilters = nextAmenityFilters;
    if (!hasLoadedFullDatasetForLocalFilters) {
      requestFetch(true);
      return;
    }
    currentPage = 1;
  }

  function resetLocalPage(): void {
    if (!hasLoadedFullDatasetForLocalFilters) {
      requestFetch(true);
      return;
    }
    currentPage = 1;
  }

  function ensureAreaFilterMetricSelected(): void {
    if (areaFilterMetric === 'none') {
      areaFilterMetric = 'area_terreno_valor';
    }
  }

  function ensureAreaSortMetricSelected(): void {
    if (areaSortMetric === 'none') {
      areaSortMetric = 'area_terreno_valor';
    }
  }

  function handleAreaRangeInput(): void {
    if (areaFilterMin.trim() !== '' || areaFilterMax.trim() !== '') {
      ensureAreaFilterMetricSelected();
    }
    resetLocalPage();
  }

  function handleAreaUnitChange(): void {
    if (areaFilterMin.trim() !== '' || areaFilterMax.trim() !== '') {
      ensureAreaFilterMetricSelected();
    }
    resetLocalPage();
  }

  function handleAreaSortDirectionChange(): void {
    ensureAreaSortMetricSelected();
    resetLocalPage();
  }

  function clearLocalFilters() {
    selectedAmenityFilters = [];
    areaFilterMetric = 'none';
    areaFilterMin = '';
    areaFilterMax = '';
    areaSortMetric = 'none';
    areaSortDirection = 'desc';
    currentPage = 1;
  }

  function propertyMatchesAmenityFilter(property: PropertySummary): boolean {
    if (selectedAmenityFilters.length === 0) return true;
    return selectedAmenityFilters.every((amenity) => hasAmenity(property.amenities, amenity));
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
    return selectedPropertyGalleryImages;
  }

  function syncSelectedPropertyMedia(
    patch: Partial<Pick<PropertyDetails, 'images' | 'video_url'>>,
    options: {
      focusImageUrl?: string | null;
      galleryImages?: NormalizedImage[] | null;
    } = {},
  ) {
    if (!selectedProperty) return;
    selectedProperty = { ...selectedProperty, ...patch };
    properties = properties.map((item) =>
      item.id === selectedProperty?.id ? { ...item, ...patch } : item,
    );
    if (editableProperty && 'images' in patch) {
      editableProperty = { ...editableProperty, images: patch.images ?? null };
    }

    if ('images' in patch) {
      const nextImages = normalizeImages(patch.images ?? null);
      const nextGalleryImages =
        options.galleryImages === undefined
          ? nextImages
          : normalizeImages(options.galleryImages ?? null);
      selectedPropertyGalleryImages = nextGalleryImages;
      const nextPreviewState = reconcilePropertyPreviewMediaState({
        currentSnapshot: previewImagesSnapshot,
        currentIndex: previewImageIndex,
        currentUrl: previewImageUrl,
        nextImages: nextGalleryImages,
        isPreviewOpen: isImagePreviewOpen,
        focusImageUrl: options.focusImageUrl ?? null,
      });
      previewImagesSnapshot = nextPreviewState.snapshot;
      previewImageIndex = nextPreviewState.index;
      previewImageUrl = nextPreviewState.url;
    }
  }

  function revealGalleryImage(imageId: number | null | undefined) {
    const scrollContainer = galleryScrollEl;
    if (!scrollContainer || imageId == null || !Number.isFinite(imageId)) return;
    void tick().then(() => {
      const target = scrollContainer.querySelector<HTMLElement>(`[data-gallery-image-id="${imageId}"]`);
      if (!target) return;
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const nextLeft =
          scrollContainer.scrollLeft +
          (targetRect.left - containerRect.left) -
          (containerRect.width - targetRect.width) / 2;
        const resolvedLeft = Math.max(0, nextLeft);
        if (typeof scrollContainer.scrollTo === 'function') {
          scrollContainer.scrollTo({
            left: resolvedLeft,
            behavior: 'auto',
          });
        } else {
          scrollContainer.scrollLeft = resolvedLeft;
        }
      });
    }

  function patchSelectedPropertyDetails(patch: Partial<PropertyDetails>) {
    if (!selectedProperty) return;
    const nextSelected = { ...selectedProperty, ...patch };
    selectedProperty = nextSelected;
    editableProperty = sanitizeEditable({
      ...(editableProperty ?? nextSelected),
      ...patch,
    });
    properties = properties.map((item) =>
      item.id === nextSelected.id ? { ...item, ...patch } : item,
    );
    if ('images' in patch) {
      selectedPropertyGalleryImages = normalizeImages(patch.images ?? null);
    }
  }

  function setReviewRequestType(type: PropertyRequestTypeFilter) {
    if (reviewRequestType === type) return;
    reviewRequestType = type;
    requestFetch(true);
  }

  function sanitizeEditable(data: Partial<PropertyDetails>): PropertyDetails {
    const coerced: Record<string, unknown> = { ...data };
    const areaConstruidaUnidade = normalizeAreaUnit(data.area_construida_unidade) ?? 'm2';
    const areaTerrenoUnidade =
      normalizeAreaUnit(data.area_terreno_unidade) ?? 'm2';
    const areaConstruidaValor = data.area_construida_valor;
    const areaTerrenoValor = data.area_terreno_valor;

    const parsedAreaConstruidaValor = parseNullableNumber(areaConstruidaValor);
    const parsedAreaTerrenoValor = parseNullableNumber(areaTerrenoValor);

    coerced.area_construida_unidade = areaConstruidaUnidade;
    coerced.area_terreno_unidade = areaTerrenoUnidade;
    coerced.area_construida_valor = parsedAreaConstruidaValor;
    coerced.area_terreno_valor = parsedAreaTerrenoValor;
    coerced.area_construida = parseNullableNumber(data.area_construida_m2 ?? areaConstruidaValor);
    coerced.area_terreno = parseNullableNumber(data.area_terreno_m2 ?? areaTerrenoValor);
    const amenitiesFromPayload = normalizeAmenityList(data);
    coerced.amenities = amenitiesFromPayload;
    return coerced as unknown as PropertyDetails;
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

  function openCoverPreviewFromList(property: PropertySummary, event: Event) {
    event.stopPropagation();
    const images = normalizeImages(property.images ?? null).filter(
      (image): image is NormalizedImage => Boolean(image?.url)
    );
    if (images.length === 0) return;
    openImagePreview(images[0].url, 0, images);
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
    const clampedSale = clampPropertyPriceValue(resolvedSale, SALE_PROPERTY_PRICE_MAX);
    const clampedRent = clampPropertyPriceValue(resolvedRent, RENT_PROPERTY_PRICE_MAX);
    const resolvedSalePromotionPercentage =
      property.promotion_percentage != null
        ? Number(property.promotion_percentage)
        : resolvePromotionPercentage(
            clampedSale != null ? Number(clampedSale) : null,
            property.promotion_price != null ? Number(property.promotion_price) : null
          );
    const resolvedRentPromotionPercentage =
      property.promotional_rent_percentage != null
        ? Number(property.promotional_rent_percentage)
        : resolvePromotionPercentage(
            clampedRent != null ? Number(clampedRent) : null,
            property.promotional_rent_price != null
              ? Number(property.promotional_rent_price)
              : null
          );

    const salePromoPrice = calculateDiscountedValue(
      clampedSale != null ? Number(clampedSale) : null,
      resolvedSalePromotionPercentage
    );
    const rentPromoPrice = calculateDiscountedValue(
      clampedRent != null ? Number(clampedRent) : null,
      resolvedRentPromotionPercentage
    );

    editPriceSaleDisplay = formatPropertyPriceDisplay(clampedSale, SALE_PROPERTY_PRICE_MAX);
    editPriceRentDisplay = formatPropertyPriceDisplay(clampedRent, RENT_PROPERTY_PRICE_MAX);
    editPromotionSalePercentageDisplay = formatPromotionPercentageInput(
      String(resolvedSalePromotionPercentage ?? '').replace('.', ',')
    );
    editPromotionRentPercentageDisplay = formatPromotionPercentageInput(
      String(resolvedRentPromotionPercentage ?? '').replace('.', ',')
    );
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
    const nextState = resolvePropertyEditNumericFlags(property);
    editBedroomsAsZero = nextState.editBedroomsAsZero;
    editBathroomsAsZero = nextState.editBathroomsAsZero;
    editGarageSpotsAsZero = nextState.editGarageSpotsAsZero;
  }

  function syncEditLotFlags(property: PropertyDetails) {
    const nextState = resolvePropertyEditNumericFlags(property);
    editSemQuadra = nextState.editSemQuadra;
    editSemLote = nextState.editSemLote;
  }

  function toggleEditMode() {
    if (!selectedProperty) return;
    isEditMode = !isEditMode;
    editError = null;
    if (isEditMode && editableProperty) {
      syncEditPriceDisplays(editableProperty);
      syncEditExtraDisplays(editableProperty);
      editSemNumero = isSemNumeroValue(editableProperty.numero);
      editSemCep = Boolean(editableProperty.sem_cep);
      syncEditLotFlags(editableProperty);
      syncEditZeroFlags(editableProperty);
      editSelectedAmenities = normalizeAmenityList(editableProperty.amenities);
      if (editSemNumero) {
        editableProperty.numero = '';
      }
      if (editSemQuadra) {
        editableProperty.quadra = '';
      }
      if (editSemLote) {
        editableProperty.lote = '';
      }
    } else {
      editableProperty = sanitizeEditable(selectedProperty as PropertyDetails);
      editSemNumero = false;
      editSemQuadra = false;
      editSemLote = false;
      editSemCep = false;
      editBedroomsAsZero = false;
      editBathroomsAsZero = false;
      editGarageSpotsAsZero = false;
      editSelectedAmenities = normalizeAmenityList(editableProperty?.amenities);
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
    editSemCep = Boolean(editableProperty.sem_cep);
    editSelectedAmenities = normalizeAmenityList(editableProperty.amenities);
    brokenPreviewImages = new Set();

    try {
      const details = await api.get<PropertyDetails>(`/admin/properties/${property.id}`);
      const reviewState = resolvePropertyReviewState<PropertyDetails>({
        property: property as PropertyDetails,
        details: details as Partial<PropertyDetails>,
        normalizePublicCode,
        getPurposeFlags,
        clampPropertyPriceValue,
        saleMax: SALE_PROPERTY_PRICE_MAX,
        rentMax: RENT_PROPERTY_PRICE_MAX,
        sanitizeEditable,
        normalizeAmenityList,
        normalizeImages,
        isSemNumeroValue,
      });
      selectedProperty = reviewState.mergedProperty;
      editableProperty = reviewState.editableProperty;
      editSemCep = reviewState.editSemCep;
      editSelectedAmenities = reviewState.selectedAmenities;
      editSemNumero = reviewState.editSemNumero;
      editSemQuadra = reviewState.editSemQuadra;
      editSemLote = reviewState.editSemLote;
      syncEditZeroFlags(reviewState.mergedProperty);
      syncEditLotFlags(reviewState.mergedProperty);
      if (editSemNumero && editableProperty) {
        editableProperty.numero = '';
      }
      if (editSemQuadra && editableProperty) {
        editableProperty.quadra = '';
      }
      if (editSemLote && editableProperty) {
        editableProperty.lote = '';
      }
      if (editableProperty) {
        syncEditPriceDisplays(editableProperty);
        syncEditExtraDisplays(editableProperty);
      }
      selectedPropertyGalleryImages = reviewState.galleryImages;
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
    const resetState = buildPropertyModalResetState();
    isModalOpen = resetState.isModalOpen;
    selectedProperty = resetState.selectedProperty;
    editableProperty = resetState.editableProperty;
    editSemNumero = resetState.editSemNumero;
    editSemQuadra = resetState.editSemQuadra;
    editSemLote = resetState.editSemLote;
    editSemCep = resetState.editSemCep;
    editBedroomsAsZero = resetState.editBedroomsAsZero;
    editBathroomsAsZero = resetState.editBathroomsAsZero;
    editGarageSpotsAsZero = resetState.editGarageSpotsAsZero;
    editSelectedAmenities = resetState.editSelectedAmenities;
    editError = resetState.editError;
    rejectDialogOpen = resetState.rejectDialogOpen;
    rejectObservation = resetState.rejectObservation;
    rejectObservationError = resetState.rejectObservationError;
    brokenPreviewImages = resetState.brokenPreviewImages;
    selectedPropertyGalleryImages = resetState.selectedPropertyGalleryImages as NormalizedImage[];
    isEditMode = resetState.isEditMode;
    resetAdvertiserState();
    resetSoldDialogState();
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
      const result = await submitPropertyReviewStatus({
        api,
        propertyId: selectedProperty.id,
        newStatus,
      });
      if (!result.ok) {
        throw result.error;
      }
      toast.success(newStatus === 'approved' ? 'Imóvel aprovado.' : 'Imóvel rejeitado. O anunciante pode corrigir e reenviar.');
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
      const result = await submitPropertyReviewStatus({
        api,
        propertyId: selectedProperty.id,
        newStatus: 'rejected',
        reason,
      });
      if (!result.ok) {
        throw result.error;
      }
      toast.success('Imóvel rejeitado. O anunciante pode corrigir e reenviar.');
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
    exportToCsv(
      isClientSideFiltering ? listForDisplay : properties,
      `imoveis_${new Date().toISOString().split('T')[0]}.csv`
    );
  }

  function buildPromotionMessage(options: {
    title: string;
    salePercent: number | null;
    rentPercent: number | null;
  }) {
    const title = options.title.trim() || 'Imóvel';
    const salePercentText =
      typeof options.salePercent === 'number' && Number.isFinite(options.salePercent)
        ? options.salePercent.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : null;
    const rentPercentText =
      typeof options.rentPercent === 'number' && Number.isFinite(options.rentPercent)
        ? options.rentPercent.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : null;
    if (salePercentText && rentPercentText) {
      return `Imóvel "${title}" entrou em promoção: ${salePercentText}% (venda) e ${rentPercentText}% (aluguel).`;
    }
    if (salePercentText) {
      return `Imóvel "${title}" entrou em promoção: ${salePercentText}% de desconto na venda.`;
    }
    if (rentPercentText) {
      return `Imóvel "${title}" entrou em promoção: ${rentPercentText}% de desconto no aluguel.`;
    }
    return `Imóvel "${title}" entrou em promoção.`;
  }

  function openPromotionNotificationModal(options: {
    propertyId: number;
    title: string;
    salePercent: number | null;
    rentPercent: number | null;
  }) {
    promotionNotificationPropertyId = options.propertyId;
    promotionNotificationTitle = options.title;
    promotionNotificationMessage = buildPromotionMessage({
      title: options.title,
      salePercent: options.salePercent,
      rentPercent: options.rentPercent,
    });
    isPromotionNotificationModalOpen = true;
  }

  function openPromotionNotificationFromSelected() {
    if (!selectedProperty) return;
    openPromotionNotificationModal({
      propertyId: selectedProperty.id,
      title: selectedProperty.title ?? 'Imóvel',
      salePercent:
        selectedProperty.promotion_percentage != null
          ? Number(selectedProperty.promotion_percentage)
          : null,
      rentPercent:
        selectedProperty.promotional_rent_percentage != null
          ? Number(selectedProperty.promotional_rent_percentage)
          : null,
    });
  }

  async function saveEdits() {
    if (!selectedProperty || !editableProperty) return;

    isSavingEdit = true;
    editError = null;

    try {
      const editResult = buildPropertyEditPayload({
        originalProperty: selectedProperty as PropertyDetails,
        editableProperty,
        flags: {
          editSemNumero,
          editSemQuadra,
          editSemLote,
          editSemCep,
        },
        state: {
          editPromotionSalePercentageDisplay,
          editPromotionRentPercentageDisplay,
          editValorCondominioDisplay,
          editValorIptuDisplay,
          editSelectedAmenities,
        },
      });

      if (!editResult.ok) {
        editError = editResult.error;
        isSavingEdit = false;
        return;
      }

      const { payload, requestedStatus, shouldRefreshList } = editResult;

      if (requestedStatus === 'rejected') {
        rejectObservation = '';
        rejectObservationError = null;
        rejectDialogOpen = true;
        isSavingEdit = false;
        return;
      }

      if (requestedStatus === 'sold') {
        soldDialogOpen = true;
        soldByPlatform = null;
        soldSaleValue = '';
        soldCommissionRate = '';
        soldCommissionValue = '';
        isSavingEdit = false;
        return;
      }

      const updateStrategy = resolvePropertyEditUpdateStrategy(
        selectedProperty as PropertyDetails,
        payload,
        requestedStatus,
      );

      if (updateStrategy.useStatusOnlyUpdate) {
        if (updateStrategy.endpoint === 'approve') {
          await api.patch(`/admin/properties/${selectedProperty.id}/approve`, {});
        } else {
          await api.patch(`/admin/properties/${selectedProperty.id}/status`, {
            status: requestedStatus,
          });
        }
      } else {
        await apiClient.put(`/admin/properties/${selectedProperty.id}`, payload);
      }
      if (shouldRefreshList) {
        await fetchProperties();
      } else {
        patchSelectedPropertyDetails(payload as Partial<PropertyDetails>);
      }
      toast.success('Imóvel atualizado com sucesso.');
      isEditMode = false;
      closeModal();
    } catch (err: any) {
      console.error('Erro ao salvar imóvel:', err);
      const status = err?.response?.status;
      if (status === 403) {
        editError = formatPropertySaveError(
          err,
          'Permissão negada pelo servidor para atualizar este imóvel. Verifique campos obrigatórios e permissão do usuário.'
        );
      } else if (status === 404) {
        editError = formatPropertySaveError(
          err,
          'Imóvel não encontrado ou rota de atualização ausente no servidor.'
        );
      } else if (status === 500) {
        editError = formatPropertySaveError(
          err,
          'Erro interno no servidor ao salvar o imóvel. Tente novamente e revise os campos.'
        );
      } else {
        editError = formatPropertySaveError(err, 'Não foi possível salvar o imóvel.');
      }
    } finally {
      isSavingEdit = false;
    }
  }

  function clearStagedImages(options: { revokePreviews?: boolean } = {}) {
    const revokePreviews = options.revokePreviews ?? true;
    if (revokePreviews) {
      stagedImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      stagedImagePreviews = [];
    }
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
    const files = Array.from(event.dataTransfer?.files ?? []);
    stageImages(files);
  }

  function openImagePicker() {
    imageInputEl?.click();
  }

  async function uploadStagedImages() {
    if (!selectedProperty || stagedImages.length === 0) return;
    const stagedImagesSnapshot = [...stagedImages];
    const previousDataImages = normalizeImages(selectedProperty?.images ?? null);
    const previousGalleryImages = selectedPropertyImages();
    const optimisticImages = stagedImagePreviews.map((url, index) => ({
      id: -((Date.now() + index) || index + 1),
      url,
    }));
    imageUploading = true;
    imageUploadError = null;

    try {
        if (optimisticImages.length > 0) {
          syncSelectedPropertyMedia(
            { images: previousDataImages },
            {
              focusImageUrl: optimisticImages[optimisticImages.length - 1]?.url ?? null,
              galleryImages: [...previousGalleryImages, ...optimisticImages],
            },
          );
          revealGalleryImage(optimisticImages[optimisticImages.length - 1]?.id);
        }

      const form = new FormData();
      stagedImages.forEach((file) => form.append('images', file));

      const response = await apiClient.post<{
        images?: Array<{ id?: number; url?: string; image_url?: string }>;
      }>(`/admin/properties/${selectedProperty.id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Imagens enviadas com sucesso.');
      const uploadedImages = normalizeImages(response.data?.images ?? null);
        if (uploadedImages.length > 0) {
          const confirmedGalleryImages = [...previousGalleryImages];
          optimisticImages.forEach((optimisticImage, index) => {
          const confirmedImage = uploadedImages[index];
          confirmedGalleryImages.push({
            id: confirmedImage?.id ?? optimisticImage.id,
            url: optimisticImage.url,
          });
          });
          syncSelectedPropertyMedia(
            { images: [...previousDataImages, ...uploadedImages] },
            {
              focusImageUrl: uploadedImages[uploadedImages.length - 1]?.url ?? null,
              galleryImages: confirmedGalleryImages,
            },
          );
          revealGalleryImage(uploadedImages[uploadedImages.length - 1]?.id);
        } else {
        await reviewProperty(selectedProperty as PropertySummary);
      }
        clearStagedImages({ revokePreviews: false });
      } catch (err: any) {
      console.error('Erro ao enviar imagens:', err);
      syncSelectedPropertyMedia(
        { images: previousDataImages },
        {
          focusImageUrl: previousDataImages[0]?.url ?? null,
          galleryImages: previousGalleryImages,
        },
      );
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

  let previewImageDeleteBusy = false;

  async function handleImageDelete(imageId: number) {
    if (!selectedProperty) return;
    if (selectedPropertyImages().length <= 1) {
      imageDeleteError = 'O imóvel precisa manter ao menos 1 imagem.';
      toast.error(imageDeleteError);
      return;
    }
    imageDeleteError = null;
    const previousDataImages = normalizeImages(selectedProperty?.images ?? null);
      const previousGalleryImages = selectedPropertyImages();
      const nextDataImages = previousDataImages.filter((image) => image.id !== imageId);
      const nextGalleryImages = previousGalleryImages.filter((image) => image.id !== imageId);
    try {
      syncSelectedPropertyMedia(
        { images: nextDataImages },
        { galleryImages: nextGalleryImages },
      );
      const nextVisibleImage =
        nextGalleryImages[
          Math.min(
            previousGalleryImages.findIndex((image) => image.id === imageId),
            Math.max(nextGalleryImages.length - 1, 0),
          )
        ];
        revealGalleryImage(nextVisibleImage?.id);
        if (isImagePreviewOpen) {
          previewImagesSnapshot = nextGalleryImages;
          previewImageIndex = Math.min(previewImageIndex, Math.max(nextGalleryImages.length - 1, 0));
          previewImageUrl = nextGalleryImages[previewImageIndex]?.url ?? null;
        }
        await api.delete(`/admin/properties/${selectedProperty.id}/images/${imageId}`);
        const removedImage = previousGalleryImages.find((image) => image.id === imageId);
        if (removedImage?.url && /^blob:/i.test(removedImage.url)) {
          URL.revokeObjectURL(removedImage.url);
        }
        toast.success('Imagem removida com sucesso.');
      } catch (err: any) {
      syncSelectedPropertyMedia(
        { images: previousDataImages },
        {
          focusImageUrl: previousDataImages[0]?.url ?? null,
          galleryImages: previousGalleryImages,
        },
      );
      revealGalleryImage(imageId);
      if (isImagePreviewOpen) {
        previewImagesSnapshot = previousGalleryImages;
        previewImageIndex = Math.min(previewImageIndex, Math.max(previousGalleryImages.length - 1, 0));
        previewImageUrl = previousGalleryImages[previewImageIndex]?.url ?? null;
      }
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

  async function handleDeleteCurrentPreviewImage() {
    const img = previewImages[previewImageIndex];
    if (!img?.id || !selectedProperty) {
      toast.error('Não foi possível identificar a imagem.');
      return;
    }
    previewImageDeleteBusy = true;
    try {
      await handleImageDelete(img.id);
      const remaining = previewImagesSnapshot.length ? previewImagesSnapshot : selectedPropertyImages();
      if (remaining.length === 0) {
        closeImagePreview();
        return;
      }
      previewImageIndex = Math.min(previewImageIndex, remaining.length - 1);
      previewImageUrl = remaining[previewImageIndex]?.url ?? null;
    } finally {
      previewImageDeleteBusy = false;
    }
  }

  async function handleVideoDelete() {
    if (!selectedProperty) return;
    const confirmed = window.confirm('Confirma remover o vídeo atual?');
    if (!confirmed) return;
    videoDeleting = true;
    videoDeleteError = null;
    const previousVideoUrl = selectedProperty.video_url ?? null;
    try {
      syncSelectedPropertyMedia({ video_url: null });
      await api.delete(`/admin/properties/${selectedProperty.id}/video`);
      toast.success('Vídeo removido com sucesso.');
      clearStagedVideo();
      if (videoInputEl) {
        videoInputEl.value = '';
      }
    } catch (err: any) {
      syncSelectedPropertyMedia({ video_url: previousVideoUrl });
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
    const optimisticVideoUrl = stagedVideoPreview;
    const previousVideoUrl = selectedProperty.video_url ?? null;
    try {
      syncSelectedPropertyMedia({ video_url: optimisticVideoUrl });
      const form = new FormData();
      form.append('video', stagedVideo);
      const response = await apiClient.post<{ video?: string | null }>(
        `/admin/properties/${selectedProperty.id}/video`,
        form,
      );
      const responseData = response.data;
      const persistedVideoUrl =
        typeof responseData?.video === 'string' && responseData.video.trim().length > 0
          ? responseData.video.trim()
          : null;
      if (persistedVideoUrl) {
        syncSelectedPropertyMedia({ video_url: persistedVideoUrl });
      }
      toast.success('Vídeo enviado com sucesso.');
      clearStagedVideo();
    } catch (err: any) {
      syncSelectedPropertyMedia({ video_url: previousVideoUrl });
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

  async function fetchAdvertisers(searchTerm: string) {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      advertiserResults = [];
      return;
    }
    advertiserSearchLoading = true;
    try {
      const params = new URLSearchParams();
      params.append('includeBrokers', 'true');
      params.append('search', trimmed);
      params.append('page', '1');
      params.append('limit', '20');
      const response = await api.get<{ data?: AdvertiserResult[]; total?: number } | AdvertiserResult[]>(
        `/admin/users?${params.toString()}`
      );
      const data = Array.isArray(response) ? response : response?.data;
      advertiserResults = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Erro ao buscar anunciantes:', err);
      advertiserResults = [];
    } finally {
      advertiserSearchLoading = false;
    }
  }

  function handleAdvertiserQueryInput(value: string) {
    advertiserQuery = value;
    advertiserDropdownOpen = true;
    if (selectedAdvertiser && value.trim() !== (selectedAdvertiser.name ?? '').trim()) {
      selectedAdvertiser = null;
    }
    if (advertiserSearchTimer) {
      clearTimeout(advertiserSearchTimer);
    }
    advertiserSearchTimer = setTimeout(() => {
      fetchAdvertisers(value);
    }, 300);
  }

  function selectAdvertiser(adv: AdvertiserResult) {
    selectedAdvertiser = adv;
    advertiserQuery = adv.name ?? '';
    advertiserDropdownOpen = false;
    if (editableProperty) {
      editableProperty.broker_id = adv.role === 'broker' ? adv.id : null;
      editableProperty.broker_creci = adv.creci ?? null;
      editableProperty.owner_id = adv.id;
      editableProperty.owner_name = adv.name;
      editableProperty.owner_phone = adv.phone ?? null;
      editableProperty.broker_name = adv.name;
      editableProperty.broker_phone = adv.phone ?? null;
    }
  }

  function clearAdvertiserSelection() {
    selectedAdvertiser = null;
    advertiserQuery = '';
    advertiserResults = [];
    advertiserDropdownOpen = false;
    if (editableProperty) {
      editableProperty.broker_id = null;
      editableProperty.owner_id = null;
    }
  }

  function resetAdvertiserState() {
    advertiserQuery = '';
    advertiserResults = [];
    advertiserDropdownOpen = false;
    advertiserSearchLoading = false;
    selectedAdvertiser = null;
    if (advertiserSearchTimer) {
      clearTimeout(advertiserSearchTimer);
      advertiserSearchTimer = null;
    }
  }

  function resetSoldDialogState() {
    const nextState = buildSoldDialogResetState();
    soldDialogOpen = nextState.soldDialogOpen;
    soldByPlatform = nextState.soldByPlatform;
    soldSaleValue = nextState.soldSaleValue;
    soldCommissionRate = nextState.soldCommissionRate;
    soldCommissionValue = nextState.soldCommissionValue;
    isSavingSold = nextState.isSavingSold;
  }

  function syncEditExtraDisplays(property: PropertyDetails) {
    const nextState = resolvePropertyEditExtraState(property);
    editValorCondominioDisplay = nextState.editValorCondominioDisplay;
    editValorIptuDisplay = nextState.editValorIptuDisplay;
    advertiserQuery = nextState.advertiserQuery;
    selectedAdvertiser = nextState.selectedAdvertiser;
  }

  async function handleSoldSave() {
    if (!selectedProperty || !editableProperty) return;
    isSavingSold = true;

    try {
      const payload: Record<string, unknown> = {
        status: 'sold',
      };

      if (soldByPlatform) {
        const sv = parseCurrency(soldSaleValue);
        const cr = parseCurrency(soldCommissionRate);
        const cv = parseCurrency(soldCommissionValue);
        if (sv != null) payload.sale_value = sv;
        if (cr != null) payload.commission_rate = cr;
        if (cv != null) payload.commission_value = cv;
      }

      await apiClient.put(`/admin/properties/${selectedProperty.id}`, payload);
      toast.success('Imóvel marcado como vendido com sucesso.');
      resetSoldDialogState();
      closeModal();
      await fetchProperties();
    } catch (err: any) {
      console.error('Erro ao salvar venda:', err);
      toast.error(
        extractApiErrorMessage(err, 'Falha ao salvar dados da venda.')
      );
    } finally {
      isSavingSold = false;
    }
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
            Filtro: pendente de aprovação • {reviewPropertyRequestTypeLabel(reviewRequestType)}
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
          oninput={onSearchInput}
          onkeydown={handleKeydown}
          onkeyup={handleKeyup}
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
          on:change={() => {
            currentPage = 1;
            if (!isClientSideFiltering) requestFetch(true);
          }}
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
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          on:click={() => {
            filters.purpose = 'all';
            requestFetch(true);
          }}
          class={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            filters.purpose === 'all'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          on:click={() => {
            filters.purpose = 'Venda';
            requestFetch(true);
          }}
          class={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            filters.purpose === 'Venda'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Venda
        </button>
        <button
          type="button"
          on:click={() => {
            filters.purpose = 'Aluguel';
            requestFetch(true);
          }}
          class={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            filters.purpose === 'Aluguel'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Aluguel
        </button>
      </div>
      <Input
        className="w-full md:w-80"
        type="search"
        placeholder="Buscar por título, cidade, ID..."
        bind:value={filters.search}
        oninput={onSearchInput}
        onkeydown={handleKeydown}
        onkeyup={handleKeyup}
      />
    </div>
    <div class="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="property-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="property-items-per-page"
        bind:value={itemsPerPage}
        on:change={() => {
          currentPage = 1;
          if (!isClientSideFiltering) requestFetch(true);
        }}
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

  <div class="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <div class="flex flex-wrap items-start gap-3">
      <div class="grid gap-2">
        <label for="area-filter-metric" class="text-sm font-medium text-gray-700 dark:text-gray-300">Área para filtro</label>
        <select
          id="area-filter-metric"
          bind:value={areaFilterMetric}
          on:change={resetLocalPage}
          class="w-64 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="none">Sem filtro de área</option>
          <option value="area_construida_valor">Área construída</option>
          <option value="area_terreno_valor">Área do terreno</option>
        </select>
      </div>
      <div class="grid gap-2">
        <label for="area-filter-min" class="text-sm font-medium text-gray-700 dark:text-gray-300">Área mínima</label>
        <input
          id="area-filter-min"
          class="w-36 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={areaFilterMin}
          inputmode="decimal"
          placeholder="ex: 500"
          on:input={handleAreaRangeInput}
        />
      </div>
      <div class="grid gap-2">
        <label for="area-filter-max" class="text-sm font-medium text-gray-700 dark:text-gray-300">Área máxima</label>
        <input
          id="area-filter-max"
          class="w-36 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={areaFilterMax}
          inputmode="decimal"
          placeholder="ex: 2000"
          on:input={handleAreaRangeInput}
        />
      </div>
      <div class="grid gap-2">
        <label for="area-filter-unit" class="text-sm font-medium text-gray-700 dark:text-gray-300">Unidade</label>
        <select
          id="area-filter-unit"
          bind:value={areaFilterUnit}
          on:change={handleAreaUnitChange}
          class="w-40 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          {#each areaUnitOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="flex flex-wrap items-start gap-3">
      <div class="grid gap-2">
        <label for="area-sort-metric" class="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar área por</label>
        <select
          id="area-sort-metric"
          bind:value={areaSortMetric}
          on:change={resetLocalPage}
          class="w-56 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="none">Sem ordenação por área</option>
          <option value="area_construida_valor">Área construída</option>
          <option value="area_terreno_valor">Área do terreno</option>
        </select>
      </div>
      <div class="grid gap-2">
        <label for="area-sort-direction" class="text-sm font-medium text-gray-700 dark:text-gray-300">Ordem</label>
        <select
          id="area-sort-direction"
          bind:value={areaSortDirection}
          on:change={handleAreaSortDirectionChange}
          class="w-36 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="desc">Maior para menor</option>
          <option value="asc">Menor para maior</option>
        </select>
      </div>
      <button
        type="button"
        class="mt-6 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        on:click={clearLocalFilters}
      >
        Limpar filtros locais
      </button>
    </div>

    <div>
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Comodidades</p>
      <div class="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {#each propertyAmenityOptions as amenity (amenity)}
          <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              aria-label={amenity}
              checked={isFilterAmenityChecked(amenity)}
              on:change={(event) => {
                const target = event.currentTarget as HTMLInputElement;
                updateAmenityFilter(amenity, target.checked);
              }}
            />
            {amenity}
          </label>
        {/each}
      </div>
    </div>
  </div>
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
  {:else}
    <PropertyManagementQueue
      {displayedProperties}
      {isReviewOnly}
      {reviewRequestType}
      {selectedProperty}
      {isDetailLoading}
      {getPropertyCoverUrl}
      {openCoverPreviewFromList}
      {markThumbnailAsBroken}
      {inferPropertyRequestType}
      {reviewProperty}
      {handleSort}
      {getSortIndicator}
    />
    <div class="mt-4">
      <Pagination
        bind:currentPage
        totalPages={totalPagesForDisplay}
        totalItems={totalItemsForDisplay}
        {itemsPerPage}
      />
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
          <span class={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${propertyStatusBadgeClasses(selectedProperty.status)}`}>
            {humanizePropertyStatus(selectedProperty.status, selectedProperty.purpose)}
          </span>
        </Dialog.Description>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Dashboard / Imóveis / Referência {resolveSelectedPropertyPublicCode(selectedProperty)}
        </p>
      </Dialog.Header>

      <PropertyFormShell mode="edit" variant="orange" showHeader={false}>
      <div class="min-w-0 space-y-6 overflow-y-auto overflow-x-hidden px-6 py-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <PropertyPricingSection
            isEditMode={isEditMode}
            selectedProperty={selectedProperty}
            editableProperty={editableProperty}
            bind:editPriceSaleDisplay
            bind:editPriceRentDisplay
            bind:editPromotionSalePercentageDisplay
            bind:editPromotionRentPercentageDisplay
            bind:editPromotionPriceSaleDisplay
            bind:editPromotionPriceRentDisplay
            {refreshPromotionPreviewDisplays}
          />

              <PropertyManagementActionBar
                isEditMode={isEditMode}
                editableProperty={editableProperty}
                isSavingEdit={isSavingEdit}
                isProcessing={isProcessing}
                toggleEditMode={toggleEditMode}
                saveEdits={saveEdits}
                openPromotionNotificationFromSelected={openPromotionNotificationFromSelected}
              />
          </div>

          <PropertyGallerySection
            bind:containerEl={galleryScrollEl}
            images={selectedPropertyImages()}
            visibleImages={visibleSelectedPropertyGalleryImages}
            brokenCount={selectedPropertyBrokenGalleryCount}
            isEditMode={isEditMode}
            getImageIndexByUrl={findImageIndexByUrl}
            onOpenPreview={openImagePreview}
            onDeleteImage={handleImageDelete}
            onMarkBroken={markImageAsBroken}
          />
        {#if isEditMode}
          <PropertyImageUploadSection
            bind:inputEl={imageInputEl}
            stagedImages={stagedImages}
            stagedImagePreviews={stagedImagePreviews}
            imageUploading={imageUploading}
            imageUploadError={imageUploadError}
            onOpenPicker={openImagePicker}
            onSelection={handleImageSelection}
            onDrop={handleImageDrop}
            onRemoveStagedImage={removeStagedImage}
            onUpload={uploadStagedImages}
            onClear={() => clearStagedImages()}
          />
        {/if}

          {#if selectedProperty.video_url || isEditMode}
            <PropertyVideoSection
              bind:inputEl={videoInputEl}
              existingVideoUrl={selectedProperty.video_url ?? null}
              stagedVideo={stagedVideo}
              stagedVideoPreview={stagedVideoPreview}
              videoUploading={videoUploading}
              videoDeleting={videoDeleting}
              videoDeleteError={videoDeleteError}
              onOpenPicker={openVideoPicker}
              onSelection={handleVideoSelection}
              onDrop={handleVideoDrop}
              onUpload={uploadStagedVideo}
              onClear={clearStagedVideo}
              onDelete={handleVideoDelete}
            />
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
            {@const editBairroOptional = isOptionalBairroPropertyType(editableProperty.type)}
            <div class="mt-4 space-y-6">
              <PropertyLocationFields
                idPrefix="edit-property"
                bind:cep={editableProperty.cep}
                bind:semCep={editSemCep}
                bind:state={editableProperty.state}
                bind:city={editableProperty.city}
                bind:address={editableProperty.address}
                bind:bairro={editableProperty.bairro}
                bairroOptional={editBairroOptional}
                bind:numero={editableProperty.numero}
                bind:semNumero={editSemNumero}
                bind:quadra={editableProperty.quadra}
                bind:semQuadra={editSemQuadra}
                bind:lote={editableProperty.lote}
                bind:semLote={editSemLote}
                bind:complemento={editableProperty.complemento}
                {cities}
                citiesLoading={false}
                citiesError={null}
                bairros={[]}
                bairrosLoading={false}
                bairrosError={null}
                cepLookupError={null}
                onStateChange={() => {}}
                onCepLookup={() => {}}
              />
              <PropertyStructureFields
                idPrefix="edit-property"
                bind:bedrooms={editableProperty.bedrooms}
                bind:bedroomsAsZero={editBedroomsAsZero}
                bind:bathrooms={editableProperty.bathrooms}
                bind:bathroomsAsZero={editBathroomsAsZero}
                bind:garageSpots={editableProperty.garage_spots}
                bind:garageSpotsAsZero={editGarageSpotsAsZero}
                bind:areaConstruida={editableProperty.area_construida_valor}
                bind:areaConstruidaUnidade={editableProperty.area_construida_unidade}
                bind:areaTerreno={editableProperty.area_terreno_valor}
                bind:areaTerrenoUnidade={editableProperty.area_terreno_unidade}
              />
              <label class="flex flex-col gap-1 md:col-span-2">
                <strong>Tipo do imóvel:</strong>
                <select
                  name="type"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  bind:value={editableProperty.type}
                >
                  {#each propertyTypes as pt}
                    <option value={pt}>{pt}</option>
                  {/each}
                </select>
              </label>
              <label class="flex flex-col gap-1">
                <strong>Proprietário:</strong>
                <input name="owner_name" maxlength="120" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.owner_name} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Telefone do proprietário:</strong>
                <input name="owner_phone" maxlength="20" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.owner_phone} />
              </label>
              <div class="relative flex flex-col gap-1 md:col-span-2">
                <strong>Anunciante (corretor ou cliente):</strong>
                <div class="relative">
                  <input
                    name="advertiser_query"
                    maxlength="120"
                    class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                    placeholder="Digite ao menos 2 letras para buscar"
                    bind:value={advertiserQuery}
                    on:input={(event) => {
                      const target = event.target as HTMLInputElement;
                      handleAdvertiserQueryInput(target.value);
                    }}
                    on:focus={() => { if (advertiserQuery.trim().length >= 2) advertiserDropdownOpen = true; }}
                    on:blur={() => setTimeout(() => { advertiserDropdownOpen = false; }, 200)}
                  />
                  {#if selectedAdvertiser}
                    <button
                      type="button"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-500 hover:text-red-700"
                      on:click|preventDefault={clearAdvertiserSelection}
                    >Limpar</button>
                  {/if}
                </div>
                {#if advertiserDropdownOpen && advertiserQuery.trim().length >= 2}
                  <div class="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {#if advertiserSearchLoading}
                      <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Buscando...</p>
                    {:else if advertiserResults.length === 0}
                      <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum resultado encontrado.</p>
                    {:else}
                      {#each advertiserResults as adv}
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                          on:mousedown|preventDefault={() => selectAdvertiser(adv)}
                        >
                          <span class="font-medium">{adv.name}</span>
                          <span class="text-xs text-gray-400">{adv.email}</span>
                          <span class={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${adv.role === 'broker' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                            {adv.role === 'broker' ? 'Corretor' : 'Cliente'}
                          </span>
                        </button>
                      {/each}
                    {/if}
                  </div>
                {/if}
              </div>
              <label class="flex flex-col gap-1">
                <strong>Valor do condomínio:</strong>
                <input
                  name="valor_condominio"
                  type="text"
                  inputmode="numeric"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  bind:value={editValorCondominioDisplay}
                  placeholder="R$ 0,00"
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    editValorCondominioDisplay = formatCurrencyInput(target.value);
                  }}
                />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Valor do IPTU:</strong>
                <input
                  name="valor_iptu"
                  type="text"
                  inputmode="numeric"
                  class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  bind:value={editValorIptuDisplay}
                  placeholder="R$ 0,00"
                  on:input={(event) => {
                    const target = event.target as HTMLInputElement;
                    editValorIptuDisplay = formatCurrencyInput(target.value);
                  }}
                />
              </label>
                <label class="flex flex-col gap-1">
                <strong>Código de referência:</strong>
                <input name="code" class="w-full rounded border px-2 py-1 text-sm bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400" value={publicCodeLabel(editableProperty.public_code)} disabled readonly />
              </label>
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
              <li><strong>Quartos:</strong> {selectedProperty.bedrooms ?? '-'}</li>
              <li><strong>Banheiros:</strong> {selectedProperty.bathrooms ?? '-'}</li>
              <li><strong>Garagens:</strong> {selectedProperty.garage_spots ?? '-'}</li>
              <li><strong>Referência pública:</strong> {publicCodeLabel(selectedProperty.public_code)}</li>
              <li><strong>Área construída:</strong> {formatAreaWithUnit(selectedProperty.area_construida_valor, selectedProperty.area_construida_unidade)}</li>
              <li><strong>Área do terreno:</strong> {formatAreaWithUnit(selectedProperty.area_terreno_valor, selectedProperty.area_terreno_unidade)}</li>
              <li><strong>Proprietário:</strong> {selectedProperty.owner_name ?? '-'}</li>
              <li><strong>Telefone do proprietário:</strong> {formatPhoneDisplayBr(selectedProperty.owner_phone)}</li>
              <li><strong>Anunciante:</strong> {selectedProperty.broker_name ?? '-'}</li>
              <li><strong>Telefone do anunciante:</strong> {formatPhoneDisplayBr(selectedProperty.broker_phone)}</li>
              <li><strong>Corretor credenciado:</strong> {isBrokerCredenciado(selectedProperty) ? 'Sim' : 'Não'}</li>
              {#if isBrokerCredenciado(selectedProperty)}
                <li><strong>CRECI:</strong> {selectedProperty.broker_creci ?? '-'}</li>
              {/if}
            </ul>
          {/if}
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Comodidades</h3>
          {#if isEditMode && editableProperty}
            <PropertyAmenitiesFields bind:selectedAmenities={editSelectedAmenities} />
          {:else}
            <div class="mt-2 flex flex-wrap gap-2 text-sm">
              <div class="w-full">
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Ativas
                </p>
                <div class="mb-3 flex flex-wrap gap-2">
                  {#each propertyAmenityOptions.filter((amenity) => isAmenityChecked(selectedProperty, amenity)) as amenity}
                    <span class="rounded-full bg-green-100 px-3 py-1 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {amenity}
                    </span>
                  {/each}
                  {#if propertyAmenityOptions.filter((amenity) => isAmenityChecked(selectedProperty, amenity)).length === 0}
                    <span class="rounded-full bg-gray-100 px-3 py-1 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                      Nenhuma
                    </span>
                  {/if}
                </div>

                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Inativas
                </p>
                <div class="flex flex-wrap gap-2">
                  {#each propertyAmenityOptions.filter((amenity) => !isAmenityChecked(selectedProperty, amenity)) as amenity}
                    <span class="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {amenity}
                    </span>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
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
        <PropertyManagementFooterActions
          allowApproval={allowApproval}
          isEditMode={isEditMode}
          selectedStatus={selectedProperty.status}
          hasEditableProperty={Boolean(editableProperty)}
          isProcessing={isProcessing}
          isSavingEdit={isSavingEdit}
          onClose={closeModal}
          onReject={() => handleStatusUpdate('rejected')}
          onSave={saveEdits}
          onApprove={() => handleStatusUpdate('approved')}
        />
      </Dialog.Footer>
      </PropertyFormShell>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<PropertyDecisionDialogs
  rejectDialogOpen={rejectDialogOpen}
  bind:rejectObservation={rejectObservation}
  bind:rejectObservationError={rejectObservationError}
  isProcessing={isProcessing}
  confirmRejectProperty={confirmRejectProperty}
  closeRejectDialog={() => {
    rejectDialogOpen = false;
    rejectObservation = '';
    rejectObservationError = null;
  }}
  soldDialogOpen={soldDialogOpen}
  bind:soldByPlatform={soldByPlatform}
  bind:soldSaleValue={soldSaleValue}
  bind:soldCommissionRate={soldCommissionRate}
  bind:soldCommissionValue={soldCommissionValue}
  isSavingSold={isSavingSold}
  resetSoldDialogState={resetSoldDialogState}
  handleSoldSave={handleSoldSave}
/>

<PromotionNotificationModal
  open={isPromotionNotificationModalOpen}
  propertyId={promotionNotificationPropertyId}
  propertyTitle={promotionNotificationTitle}
  defaultMessage={promotionNotificationMessage}
  on:close={() => {
    isPromotionNotificationModalOpen = false;
  }}
  on:sent={() => {
    skipAutoPromotionModalOnce = true;
    isPromotionNotificationModalOpen = false;
  }}
/>

<svelte:window on:keydown={handlePreviewKeydown} />

{#if isImagePreviewOpen}
  <div
    class="fixed inset-0 z-50 pointer-events-auto"
    data-testid="image-preview-backdrop"
  >
    <div class="absolute inset-0 bg-black/85" aria-hidden="true"></div>
    <div
      class="relative mx-auto flex h-[94vh] w-[96vw] max-w-[1600px] flex-col items-center justify-center px-2 py-3 sm:px-4"
      role="dialog"
      aria-modal="true"
      tabindex="0"
      on:keydown={handlePreviewKeydown}
    >
      {#if previewTotal > 1}
        <button
          type="button"
          class="absolute left-0 top-0 z-10 flex h-full w-16 items-center justify-center bg-gradient-to-r from-black/35 to-transparent text-white transition hover:from-black/50 sm:w-20"
          on:click|stopPropagation={goPrevImage}
          disabled={!previewViewerState.canPrev}
          aria-label="Imagem anterior"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          class="absolute right-0 top-0 z-10 flex h-full w-16 items-center justify-center bg-gradient-to-l from-black/35 to-transparent text-white transition hover:from-black/50 sm:w-20"
          on:click|stopPropagation={goNextImage}
          disabled={!previewViewerState.canNext}
          aria-label="Próxima imagem"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      {/if}
      <div class="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        {#if previewViewerState.currentImage?.url}
          <img
            src={previewViewerState.currentImage.url}
            alt=""
            class="max-h-full max-w-full select-none object-contain"
            draggable="false"
            on:error={handlePreviewImageError}
          />
        {/if}
      </div>
      {#if previewTotal > 1}
        <div
          class="show-scrollbar mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] touch-pan-x"
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
      {#if selectedProperty && previewImages[previewImageIndex]?.id}
        <button
          type="button"
          class="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50"
          on:click|stopPropagation={handleDeleteCurrentPreviewImage}
          disabled={previewImageDeleteBusy || (previewTotal > 0 && selectedPropertyImages().length <= 1)}
          aria-label="Excluir foto atual"
        >
          {previewImageDeleteBusy ? 'Excluindo...' : 'Excluir foto'}
        </button>
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
