<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import PropertyFormShell from '$lib/components/property/PropertyFormShell.svelte';
  import PropertyBasicFields from '$lib/components/property/PropertyBasicFields.svelte';
  import PropertyLocationFields from '$lib/components/property/PropertyLocationFields.svelte';
  import PropertyStructureFields from '$lib/components/property/PropertyStructureFields.svelte';
  import PropertyAmenitiesFields from '$lib/components/property/PropertyAmenitiesFields.svelte';
  import { uploadMultipartWithProgress } from '$lib/mediaUploadService';
  import type { Broker } from '$lib/types';
  import {
    formatCep,
    extractApiErrorMessage,
    formatPromotionPercentageInput,
    formatPhoneBr,
    hasValidPhoneBr,
    normalizeDecimal,
    parsePromotionPercentage,
    onlyDigits,
    resolveCreatePropertyPrices,
    sanitizeDecimalInput,
    sanitizeDigitsInput,
  } from '$lib/components/create-property-helpers';
  import {
    RENT_PROPERTY_PRICE_MAX,
    SALE_PROPERTY_PRICE_MAX,
    formatPropertyPriceInput,
    getPropertyPriceInputMaxLength,
    parsePropertyPriceInput,
  } from '$lib/propertyPriceLimits';
  import { normalizeAmenityList } from '$lib/propertyAmenities';

  const MAX_IMAGE_SIZE_MB = 15;
  const MAX_VIDEO_SIZE_MB = 100;
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
  const IMAGE_OPTIMIZATION_MIN_BYTES = 1024 * 1024;
  const IMAGE_OPTIMIZATION_MAX_DIMENSION = 1920;
  const IMAGE_OPTIMIZATION_QUALITY = 0.82;
  const DIRECT_UPLOAD_IMAGE_CONCURRENCY = 4;
  const CREATE_REQUEST_TIMEOUT_MS = 420000;
  const DIRECT_UPLOAD_TIMEOUT_MS = 240000;
  const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const BLOCKED_IMAGE_MIME_TYPES = new Set(['image/gif', 'image/svg+xml']);
  const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
  const BLOCKED_IMAGE_EXTENSIONS = new Set(['gif', 'svg', 'svgz']);
  const states = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO'
  ];
  const dispatch = createEventDispatcher<{
    created: { propertyId: number };
  }>();

  let brokers: Broker[] = [];
  let brokersLoading = false;
  let brokersError: string | null = null;

  let title = '';
  let description = '';
  let type = 'Casa';
  let purpose = 'Venda';
  let marketStage: 'STANDARD' | 'LAUNCH' = 'STANDARD';
  let status = 'approved';
  let priceSale = '';
  let priceRent = '';
  let promotionSalePercentage = '';
  let promotionRentPercentage = '';
  let promotionPriceSale = '';
  let promotionPriceRent = '';
  let salePromotionPercentageValue: number | null = null;
  let rentPromotionPercentageValue: number | null = null;
  let salePriceValue: number | null = null;
  let rentPriceValue: number | null = null;
  let ownerName = '';
  let ownerPhone = '';
  let address = '';
  let city = '';
  let state = 'GO';
  let cep = '';
  let semCep = false;
  let bairro = '';
  let numero = '';
  let semNumero = false;
  let quadra = '';
  let lote = '';
  let semQuadra = false;
  let semLote = false;
  /** Unidade da área construída informada (o backend grava em m² + esta unidade). */
  let areaConstruidaUnidade: 'm2' | 'hectare' | 'alqueire' = 'm2';
  /** Unidade da área de terreno informada. */
  let areaTerrenoUnidade: 'm2' | 'hectare' | 'alqueire' = 'm2';
  let complemento = '';
  let bedrooms = '';
  let bedroomsAsZero = false;
  let bathrooms = '';
  let bathroomsAsZero = false;
  let garageSpots = '';
  let garageSpotsAsZero = false;
  let areaConstruida = '';
  let areaTerreno = '';
  let brokerId = '';
  let brokerPhone = '';
  let brokerQuery = '';
  let brokerSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let brokerDropdownOpen = false;
  let selectedBroker: Broker | null = null;

  let imagesInput: HTMLInputElement | null = null;
  let videoInput: HTMLInputElement | null = null;
  let selectedImages: File[] = [];
  let imagePreviewUrls: string[] = [];
  let video: File | null = null;
  let videoPreviewUrl: string | null = null;
  let isImageDropActive = false;
  let isVideoDropActive = false;
  let isSubmitting = false;
  let uploadProgress = 0;
  let uploadStatus = '';
  let submitFeedback: { type: 'success' | 'error'; message: string } | null = null;
  let selectedAmenities: string[] = [];

  const SALE_PRICE_MAX_LENGTH = getPropertyPriceInputMaxLength(SALE_PROPERTY_PRICE_MAX);
  const RENT_PRICE_MAX_LENGTH = getPropertyPriceInputMaxLength(RENT_PROPERTY_PRICE_MAX);

  type LocationPage<T> = { data?: T[] };
  type LocationCity = { id: number; name: string; state?: string | null };
  type LocationNeighborhood = { id: number; cityId?: number; city_id?: number; name: string };
  const cityCache: Record<string, LocationCity[]> = {};
  const bairroCache: Record<string, string[]> = {};
  const cityIdsByName: Record<string, number> = {};
  let cities: string[] = [];
  let bairros: string[] = [];
  let citiesLoading = false;
  let bairrosLoading = false;
  let bairrosError: string | null = null;
  let citiesError: string | null = null;
  let selectedCityId: number | null = null;
  let lastBairroLookupCity = '';
  let citySearchTimer: ReturnType<typeof setTimeout> | null = null;
  let bairroSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let cepLookupError: string | null = null;
  let lastCepLookup = '';
  const optionalBairroPropertyTypes = new Set(['Área rural', 'Chácara', 'Rancho']);
  $: bairroOptional = optionalBairroPropertyTypes.has(type);

  function getFileExtension(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    if (index < 0) return '';
    return fileName.slice(index + 1).toLowerCase();
  }

  function isAllowedRasterImage(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    const extension = getFileExtension(file.name);
    if (BLOCKED_IMAGE_MIME_TYPES.has(mime) || BLOCKED_IMAGE_EXTENSIONS.has(extension)) {
      return false;
    }
    if (ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      return true;
    }
    return ALLOWED_IMAGE_EXTENSIONS.has(extension);
  }

  function calculateDiscountedValue(basePrice: number | null, percentage: number | null): number | null {
    if (
      basePrice == null ||
      basePrice <= 0 ||
      percentage == null ||
      percentage <= 0 ||
      percentage > 99.99
    ) {
      return null;
    }
    return Number((basePrice * (1 - percentage / 100)).toFixed(2));
  }

  function toCurrencyDisplay(value: number | null): string {
    if (value == null || value <= 0) return '';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  $: if (purpose === 'Venda' && promotionRentPercentage) {
    promotionRentPercentage = '';
  }

  $: if (purpose === 'Aluguel' && promotionSalePercentage) {
    promotionSalePercentage = '';
  }

  $: salePromotionPercentageValue = parsePromotionPercentage(promotionSalePercentage);
  $: rentPromotionPercentageValue = parsePromotionPercentage(promotionRentPercentage);
  $: salePriceValue = parsePropertyPriceInput(priceSale, SALE_PROPERTY_PRICE_MAX);
  $: rentPriceValue = parsePropertyPriceInput(priceRent, RENT_PROPERTY_PRICE_MAX);
  $: promotionPriceSale = toCurrencyDisplay(
    calculateDiscountedValue(
      purpose !== 'Aluguel' ? salePriceValue : null,
      purpose !== 'Aluguel' ? salePromotionPercentageValue : null
    )
  );
  $: promotionPriceRent = toCurrencyDisplay(
    calculateDiscountedValue(
      purpose !== 'Venda' ? rentPriceValue : null,
      purpose !== 'Venda' ? rentPromotionPercentageValue : null
    )
  );

  async function fetchBrokers(searchTerm = '') {
    brokersLoading = true;
    brokersError = null;
    try {
      const params = new URLSearchParams();
      params.append('status', 'approved');
      params.append('page', '1');
      params.append('limit', '20');
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch.length >= 2) {
        params.append('search', trimmedSearch);
      }
      const response = await api.get<{ data?: Broker[]; total?: number } | Broker[]>(
        `/admin/brokers?${params.toString()}`
      );
      const data = Array.isArray(response) ? response : response?.data;
      brokers = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar corretores:', error);
      brokersError = 'Não foi possível carregar corretores aprovados.';
    } finally {
      brokersLoading = false;
    }
  }

  function clearBrokerSelection() {
    brokerId = '';
    brokerPhone = '';
    selectedBroker = null;
    brokerQuery = '';
  }

  function selectBroker(broker: Broker) {
    selectedBroker = broker;
    brokerId = String(broker.id);
    brokerPhone = formatPhoneBr(broker.phone ?? '');
    brokerQuery = broker.name ?? '';
    brokerDropdownOpen = false;
  }

  function handleBrokerQueryInput(value: string) {
    brokerQuery = value;
    brokerDropdownOpen = true;
    if (selectedBroker && value.trim() !== (selectedBroker.name ?? '').trim()) {
      brokerId = '';
      selectedBroker = null;
      brokerPhone = '';
    }
    if (brokerSearchTimer) {
      clearTimeout(brokerSearchTimer);
    }
    brokerSearchTimer = setTimeout(() => {
      fetchBrokers(value);
    }, 300);
  }

  async function fetchCitiesForState(uf: string) {
    selectedCityId = null;
    city = '';
    bairro = '';
    bairros = [];
    lastBairroLookupCity = '';
    await fetchCitiesBySearch('');
  }

  async function fetchCitiesBySearch(searchTerm: string) {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (cityCache[normalizedSearch]) {
      cities = cityCache[normalizedSearch].map((item) => item.name);
      return;
    }
    citiesLoading = true;
    citiesError = null;
    try {
      const payload = await api.get<LocationPage<LocationCity> | LocationCity[]>(
        `/locations/cities?search=${encodeURIComponent(normalizedSearch)}&limit=15`
      );
      const records = Array.isArray(payload) ? payload : payload?.data ?? [];
      cityCache[normalizedSearch] = records;
      for (const item of records) {
        cityIdsByName[item.name.trim().toLowerCase()] = Number(item.id);
      }
      cities = records.map((item) => item.name);
      const currentCity = city.trim().toLowerCase();
      const matchingCity = records.find((item) => item.name.trim().toLowerCase() === currentCity);
      if (matchingCity) {
        selectedCityId = Number(matchingCity.id);
        scheduleBairroSearch('');
      }
    } catch (error) {
      console.error('Erro ao carregar cidades do catálogo:', error);
      citiesError = 'Não foi possível carregar cidades.';
      cities = [];
    } finally {
      citiesLoading = false;
    }
  }

  async function fetchBairrosForCity(cityName: string, searchTerm = '') {
    const normalizedCity = cityName.trim();
    if (!normalizedCity) {
      bairros = [];
      bairrosError = null;
      return;
    }
    const cityId = cityIdsByName[normalizedCity.toLowerCase()];
    if (!cityId) {
      bairros = [];
      return;
    }
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const cacheKey = `${cityId}:${normalizedSearch}`;
    if (bairroCache[cacheKey]) {
      bairros = bairroCache[cacheKey];
      bairrosError = null;
      return;
    }
    bairrosLoading = true;
    bairrosError = null;
    try {
      const payload = await api.get<LocationPage<LocationNeighborhood> | LocationNeighborhood[]>(
        `/locations/neighborhoods?cityId=${cityId}&search=${encodeURIComponent(normalizedSearch)}&limit=15`
      );
      const records = Array.isArray(payload) ? payload : payload?.data ?? [];
      const names = records.map((item) => String(item.name ?? '').trim()).filter(Boolean);
      bairros = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      bairroCache[cacheKey] = bairros;
    } catch (error) {
      console.error('Erro ao carregar bairros:', error);
      bairros = [];
      bairrosError = 'Não foi possível carregar bairros para esta cidade.';
    } finally {
      bairrosLoading = false;
    }
  }

  function scheduleCitySearch(searchTerm: string) {
    const normalizedCity = searchTerm.trim().toLowerCase();
    selectedCityId = cityIdsByName[normalizedCity] ?? null;
    bairro = '';
    bairros = [];
    bairrosError = null;
    lastBairroLookupCity = '';
    if (citySearchTimer) clearTimeout(citySearchTimer);
    citySearchTimer = setTimeout(() => void fetchCitiesBySearch(searchTerm), 300);
  }

  function scheduleBairroSearch(searchTerm: string) {
    if (bairroSearchTimer) clearTimeout(bairroSearchTimer);
    bairroSearchTimer = setTimeout(() => void fetchBairrosForCity(city, searchTerm), 300);
  }

  async function lookupCep(value: string) {
    const digits = onlyDigits(value);
    if (digits.length !== 8) return;
    if (digits === lastCepLookup) return;
    lastCepLookup = digits;
    cepLookupError = null;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('Falha ao consultar CEP.');
      const data = await response.json();
      if (data?.erro) return;
      if (data?.uf) {
        state = String(data.uf);
        await fetchCitiesForState(state);
      }
      if (data?.logradouro) {
        address = String(data.logradouro);
      }
      if (data?.bairro) {
        bairro = String(data.bairro);
      }
      if (data?.localidade) {
        city = String(data.localidade);
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      cepLookupError = 'CEP não encontrado.';
    }
  }

  function revokeImagePreviews() {
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    imagePreviewUrls = [];
  }

  function refreshImagePreviews() {
    revokeImagePreviews();
    imagePreviewUrls = selectedImages.map((file) => URL.createObjectURL(file));
  }

  function loadImageFromObjectUrl(objectUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao processar imagem.'));
      image.src = objectUrl;
    });
  }

  async function optimizeImageForUpload(file: File): Promise<File> {
    const isImage = isAllowedRasterImage(file);
    const isOptimizableType = ALLOWED_IMAGE_MIME_TYPES.has((file.type || '').toLowerCase());

    if (!isImage || !isOptimizableType || file.size < IMAGE_OPTIMIZATION_MIN_BYTES) {
      return file;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImageFromObjectUrl(objectUrl);
      const originalWidth = image.naturalWidth || image.width;
      const originalHeight = image.naturalHeight || image.height;

      if (!originalWidth || !originalHeight) {
        return file;
      }

      const resizeRatio = Math.min(
        1,
        IMAGE_OPTIMIZATION_MAX_DIMENSION / originalWidth,
        IMAGE_OPTIMIZATION_MAX_DIMENSION / originalHeight
      );
      const targetWidth = Math.max(1, Math.round(originalWidth * resizeRatio));
      const targetHeight = Math.max(1, Math.round(originalHeight * resizeRatio));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        return file;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', IMAGE_OPTIMIZATION_QUALITY);
      });

      if (!blob || blob.size >= file.size * 0.98) {
        return file;
      }

      return new File([blob], file.name, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      });
    } catch (error) {
      console.warn('Falha ao otimizar imagem, enviando original:', error);
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function addSelectedImages(files: File[]) {
    const imageFiles = files.filter((file) => isAllowedRasterImage(file));
    const rejectedFiles = files.filter((file) => !isAllowedRasterImage(file));
    if (imageFiles.length === 0) {
      toast.error('Formato de arquivo não suportado. Use apenas JPG, PNG ou WEBP.');
      return;
    }

    if (rejectedFiles.length > 0) {
      toast.error('Formato de arquivo não suportado. Use apenas JPG, PNG ou WEBP.');
    }

    const current = [...selectedImages];
    const existingKeys = new Set(current.map((file) => `${file.name}:${file.lastModified}`));
    const candidates: File[] = [];
    const maxImages = 20;
    let ignoredCount = 0;

    for (const file of imageFiles) {
      if (current.length + candidates.length >= maxImages) {
        ignoredCount++;
        continue;
      }
      const fileKey = `${file.name}:${file.lastModified}`;
      if (existingKeys.has(fileKey)) {
        ignoredCount++;
        continue;
      }
      existingKeys.add(fileKey);
      candidates.push(file);
    }

    const optimizedImages = await Promise.all(candidates.map((file) => optimizeImageForUpload(file)));
    const compressedCount = optimizedImages.reduce((count, optimized, index) => {
      const original = candidates[index];
      return optimized.size < original.size ? count + 1 : count;
    }, 0);

    for (const optimizedFile of optimizedImages) {
      current.push(optimizedFile);
    }

    selectedImages = current;
    refreshImagePreviews();

    if (ignoredCount > 0) {
      toast.warning('Algumas imagens foram ignoradas por duplicidade ou limite de 20 arquivos.');
    }
    if (compressedCount > 0) {
      toast.success(`${compressedCount} imagem(ns) foram otimizadas para acelerar o envio.`);
    }
  }

  async function handleImagesChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    if (files.length === 0) return;
    await addSelectedImages(files);
    target.value = '';
  }

  async function handleImagesDrop(event: DragEvent) {
    event.preventDefault();
    isImageDropActive = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    await addSelectedImages(files);
  }

  function removeSelectedImage(index: number) {
    selectedImages = selectedImages.filter((_, fileIndex) => fileIndex !== index);
    refreshImagePreviews();
  }

  function revokeVideoPreview() {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      videoPreviewUrl = null;
    }
  }

  function setVideoFile(file: File | null) {
    revokeVideoPreview();
    video = file;
    videoPreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  function handleVideoChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files && target.files.length > 0 ? target.files[0] : null;
    setVideoFile(file);
  }

  function handleVideoDrop(event: DragEvent) {
    event.preventDefault();
    isVideoDropActive = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    const videoFile = files.find((file) => file.type.startsWith('video/')) ?? null;
    if (!videoFile) {
      toast.error('Selecione um arquivo de video valido.');
      return;
    }
    setVideoFile(videoFile);
  }

  function clearVideoSelection() {
    video = null;
    revokeVideoPreview();
    if (videoInput) {
      videoInput.value = '';
    }
  }

  function openImagesPicker() {
    imagesInput?.click();
  }

  function openVideoPicker() {
    videoInput?.click();
  }

  type UploadResourceType = 'image' | 'video';

  interface CloudinarySignatureResponse {
    apiKey: string;
    cloudName: string;
    signature: string;
    timestamp: number;
    folder: string;
    maxFileSize: number;
    allowedFormats: string[];
    resourceType: UploadResourceType;
    uploadUrl: string;
  }

  async function requestCloudinarySignature(
    resourceType: UploadResourceType
  ): Promise<CloudinarySignatureResponse> {
    return api.post<CloudinarySignatureResponse>('/admin/uploads/sign', {
      resource_type: resourceType,
    });
  }

  async function uploadFileToCloudinaryDirect(
    file: File,
    signature: CloudinarySignatureResponse,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);
    formData.append('allowed_formats', signature.allowedFormats.join(','));

    const response = await uploadMultipartWithProgress<{ secure_url?: string }>(
      signature.uploadUrl,
      formData,
      {
        timeout: DIRECT_UPLOAD_TIMEOUT_MS,
        onProgress,
      }
    );

    const secureUrl = response.secure_url;
    if (!secureUrl) {
      throw new Error('Upload concluído sem URL de mídia.');
    }

    return secureUrl;
  }

  async function uploadImagesToCloudinary(
    files: File[],
    signature: CloudinarySignatureResponse
  ): Promise<string[]> {
    const results: string[] = new Array(files.length);
    let nextIndex = 0;
    let completed = 0;

    const workerCount = Math.min(DIRECT_UPLOAD_IMAGE_CONCURRENCY, files.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= files.length) {
          break;
        }

        const url = await uploadFileToCloudinaryDirect(files[currentIndex], signature);
        results[currentIndex] = url;
        completed += 1;
        uploadProgress = Math.round((completed / files.length) * 100);
        uploadStatus = `Enviando imagens... ${uploadProgress}%`;
      }
    });

    await Promise.all(workers);
    return results;
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    submitFeedback = null;
    const numeroDigits = onlyDigits(numero);
    const resolvedBedrooms = bedroomsAsZero ? '0' : bedrooms;
    const resolvedBathrooms = bathroomsAsZero ? '0' : bathrooms;
    const resolvedGarageSpots = garageSpotsAsZero ? '0' : garageSpots;
    const requiredMessage =
      !title.trim()
        ? 'Informe o título do imóvel.'
        : !description.trim()
          ? 'Informe a descrição do imóvel.'
          : !type
            ? 'Informe o tipo do imóvel.'
            : !purpose
              ? 'Informe a finalidade do imóvel.'
              : ownerPhone.trim() && !hasValidPhoneBr(ownerPhone)
                ? 'Informe o telefone do proprietário no formato (00)00000-0000.'
                : !address.trim()
                    ? 'Informe o endereço.'
                    : !semNumero && !numero.trim()
                      ? 'Informe o número do endereço ou marque "Sem número".'
                      : !semNumero && numeroDigits.length === 0
                        ? 'Número do endereço deve conter apenas dígitos.'
                        : !bairroOptional && !bairro.trim()
                      ? 'Informe o bairro.'
                          : !semCep && cep.trim() && onlyDigits(cep).length !== 8
                            ? 'Informe um CEP válido.'
                              : !city.trim()
                                ? 'Informe a cidade.'
                              : !state.trim()
                                ? 'Informe o estado.'
                                : !semQuadra && !quadra.trim()
                                  ? 'Informe a quadra ou marque "Sem quadra".'
                                  : !semLote && !lote.trim()
                                    ? 'Informe o lote ou marque "Sem lote".'
                                      : !resolvedBedrooms.trim()
                                        ? 'Informe a quantidade de quartos.'
                                        : !resolvedBathrooms.trim()
                                          ? 'Informe a quantidade de banheiros.'
                                          : !resolvedGarageSpots.trim()
                                            ? 'Informe a quantidade de garagens.'
                                              : !areaConstruida.trim()
                                              ? 'Informe a área construída.'
                                    : !areaTerreno.trim()
                                        ? 'Informe a área do terreno.'
                                        : null;
    if (requiredMessage) {
      toast.error(requiredMessage);
      return;
    }

    if (selectedImages.length < 1) {
      toast.error('Envie pelo menos 1 imagem do imóvel.');
      return;
    }
    if (selectedImages.length > 20) {
      toast.error('Limite máximo de 20 imagens por imóvel.');
      return;
    }
    const oversizedImage = selectedImages.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversizedImage) {
      toast.error(
        `A imagem "${oversizedImage.name}" excede ${MAX_IMAGE_SIZE_MB}MB. Reduza o arquivo e tente novamente.`
      );
      return;
    }
    if (video && video.size > MAX_VIDEO_SIZE_BYTES) {
      toast.error(`O vídeo excede ${MAX_VIDEO_SIZE_MB}MB. Reduza o arquivo e tente novamente.`);
      return;
    }

    const {
      error,
      price,
      priceSale: resolvedSale,
      priceRent: resolvedRent,
    } = resolveCreatePropertyPrices(purpose, priceSale, priceRent, {
      saleMaxValue: SALE_PROPERTY_PRICE_MAX,
      rentMaxValue: RENT_PROPERTY_PRICE_MAX,
    });
    if (error) {
      toast.error(error);
      return;
    }

    const supportsSale = purpose.toLowerCase().includes('vend');
    const supportsRent = purpose.toLowerCase().includes('alug');
    const parsedPromotionPercentageSale =
    supportsSale ? parsePromotionPercentage(promotionSalePercentage) : null;
    const parsedPromotionPercentageRent =
      supportsRent ? parsePromotionPercentage(promotionRentPercentage) : null;
    const parsedPromotionPriceSale =
      supportsSale ? parsePropertyPriceInput(promotionPriceSale, SALE_PROPERTY_PRICE_MAX) : null;
    const parsedPromotionPriceRent =
      supportsRent ? parsePropertyPriceInput(promotionPriceRent, RENT_PROPERTY_PRICE_MAX) : null;

    if (supportsSale && promotionSalePercentage.trim() && parsedPromotionPercentageSale == null) {
      toast.error('Percentual de desconto da venda inválido. Use valor entre 0,1 e 100.');
      return;
    }

    if (supportsRent && promotionRentPercentage.trim() && parsedPromotionPercentageRent == null) {
      toast.error('Percentual de desconto do aluguel inválido. Use valor entre 0,1 e 100.');
      return;
    }

    if (
      parsedPromotionPriceSale != null &&
      resolvedSale != null &&
      parsedPromotionPriceSale >= resolvedSale
    ) {
      toast.error('Preço promocional de venda deve ser menor que o preço de venda.');
      return;
    }

    if (
      parsedPromotionPriceRent != null &&
      resolvedRent != null &&
      parsedPromotionPriceRent >= resolvedRent
    ) {
      toast.error('Preço promocional de aluguel deve ser menor que o preço de aluguel.');
      return;
    }

    const hasPromotion =
      (parsedPromotionPriceSale ?? 0) > 0 ||
      (parsedPromotionPriceRent ?? 0) > 0 ||
      (parsedPromotionPercentageSale ?? 0) > 0 ||
      (parsedPromotionPercentageRent ?? 0) > 0;

    const normalizedAmenities = normalizeAmenityList(selectedAmenities);

    const parsedBedrooms = resolvedBedrooms ? Number(resolvedBedrooms) : null;
    const parsedBathrooms = resolvedBathrooms ? Number(resolvedBathrooms) : null;
    const parsedGarage = resolvedGarageSpots ? Number(resolvedGarageSpots) : null;
    const parsedAreaConstruida = normalizeDecimal(areaConstruida);
    const parsedAreaTerreno = normalizeDecimal(areaTerreno);

    if (
      parsedBedrooms == null ||
      !Number.isFinite(parsedBedrooms) ||
      parsedBathrooms == null ||
      !Number.isFinite(parsedBathrooms) ||
      parsedGarage == null ||
      !Number.isFinite(parsedGarage) ||
      parsedAreaConstruida == null ||
      parsedAreaTerreno == null
    ) {
      toast.error('Campos numéricos obrigatórios estão inválidos.');
      return;
    }

    isSubmitting = true;
    uploadProgress = 0;
    uploadStatus = 'Preparando envio...';
    try {
      const syncBrokerPhoneIfNeeded = async () => {
        if (!brokerId) return;
        const broker =
          selectedBroker ?? brokers.find((item) => item.id === Number(brokerId)) ?? null;
        if (!broker || onlyDigits(brokerPhone) === onlyDigits(broker.phone ?? '')) {
          return;
        }
        try {
          await api.put(`/admin/brokers/${brokerId}`, {
            name: broker.name,
            email: broker.email,
            phone: onlyDigits(brokerPhone),
          });
          brokers = brokers.map((entry) =>
            entry.id === Number(brokerId)
              ? { ...entry, phone: onlyDigits(brokerPhone) }
              : entry
          );
        } catch (updateBrokerError) {
          console.error('Erro ao atualizar telefone do corretor:', updateBrokerError);
          toast.warning(
            'Não foi possível atualizar o telefone do corretor. O imóvel será enviado mesmo assim.'
          );
        }
      };

      uploadStatus = 'Autorizando upload de imagens...';
      const imageSignature = await requestCloudinarySignature('image');
      const oversizedByCloudinary = selectedImages.find(
        (file) => file.size > imageSignature.maxFileSize
      );
      if (oversizedByCloudinary) {
        toast.error(
          `A imagem "${oversizedByCloudinary.name}" excede o limite de ${Math.round(
            imageSignature.maxFileSize / (1024 * 1024)
          )}MB do Cloudinary.`
        );
        return;
      }

      uploadProgress = 0;
      uploadStatus = 'Enviando imagens... 0%';
      const uploadedImageUrls = await uploadImagesToCloudinary(selectedImages, imageSignature);

      let uploadedVideoUrl: string | null = null;
      if (video) {
        uploadStatus = 'Autorizando upload de vídeo...';
        const videoSignature = await requestCloudinarySignature('video');
        if (video.size > videoSignature.maxFileSize) {
          toast.error(
            `O vídeo excede o limite de ${Math.round(videoSignature.maxFileSize / (1024 * 1024))}MB do Cloudinary.`
          );
          return;
        }

        uploadProgress = 0;
        uploadStatus = 'Enviando vídeo... 0%';
        uploadedVideoUrl = await uploadFileToCloudinaryDirect(video, videoSignature, (progress) => {
          uploadProgress = progress;
          uploadStatus = `Enviando vídeo... ${progress}%`;
        });
      }

      const payload = {
        broker_id: brokerId ? Number(brokerId) : null,
        title: title.trim(),
        description: description.trim(),
        type,
        purpose,
        market_stage: marketStage,
        status,
        price,
        price_sale: resolvedSale,
        price_rent: resolvedRent,
        is_promoted: hasPromotion ? 1 : 0,
        promotion_percentage: parsedPromotionPercentageSale,
        promotional_rent_percentage: parsedPromotionPercentageRent,
        promotion_price: parsedPromotionPriceSale,
        promotional_rent_price: parsedPromotionPriceRent,
        owner_name: ownerName.trim() || null,
        owner_phone: ownerPhone.trim() ? onlyDigits(ownerPhone) : null,
        address: address.trim(),
        quadra: quadra.trim(),
        lote: lote.trim(),
        sem_quadra: semQuadra ? 1 : 0,
        sem_lote: semLote ? 1 : 0,
        numero: semNumero ? null : numeroDigits,
        sem_numero: semNumero ? 1 : 0,
        bairro: bairro.trim(),
        complemento: complemento.trim() || null,
        city: city.trim(),
        state: state.trim(),
        cep: semCep ? null : cep.trim() ? onlyDigits(cep) : null,
        sem_cep: semCep ? 1 : 0,
        bedrooms: parsedBedrooms,
        bathrooms: parsedBathrooms,
        area_construida: parsedAreaConstruida,
        area_construida_valor: parsedAreaConstruida,
        area_construida_unidade: areaConstruidaUnidade,
        area_terreno: parsedAreaTerreno,
        area_terreno_valor: parsedAreaTerreno,
        area_terreno_unidade: areaTerrenoUnidade,
        garage_spots: parsedGarage,
        amenities: normalizedAmenities,
        image_urls: uploadedImageUrls,
        video_url: uploadedVideoUrl,
      };

      uploadProgress = 100;
      uploadStatus = 'Criando imóvel...';
      const createResponse = await apiClient.post('/admin/properties', payload, {
        timeout: CREATE_REQUEST_TIMEOUT_MS,
        skipErrorToast: true,
      } as Parameters<typeof apiClient.post>[2]);

      const createdPayload = createResponse.data as {
        propertyId?: unknown;
        public_code?: unknown;
      };
      const propertyId = Number(createdPayload?.propertyId ?? 0);
      if (!Number.isFinite(propertyId) || propertyId <= 0) {
        throw new Error('Imóvel criado sem ID retornado pelo backend.');
      }

      void syncBrokerPhoneIfNeeded();
      submitFeedback = {
        type: 'success',
        message: `Imóvel criado com sucesso. Referência pública: #${String(
          createdPayload.public_code ?? propertyId
        )}.`,
      };
      toast.success('Imóvel criado com sucesso.');
      title = '';
      description = '';
      purpose = 'Venda';
      marketStage = 'STANDARD';
      type = 'Casa';
      status = 'approved';
      priceSale = '';
      priceRent = '';
      promotionSalePercentage = '';
      promotionRentPercentage = '';
      promotionPriceSale = '';
      promotionPriceRent = '';
      ownerName = '';
      ownerPhone = '';
      address = '';
      city = '';
      state = 'GO';
      cep = '';
      semCep = false;
      bairro = '';
      numero = '';
      semNumero = false;
      quadra = '';
      lote = '';
      semQuadra = false;
      semLote = false;
      areaConstruidaUnidade = 'm2';
      areaTerrenoUnidade = 'm2';
      complemento = '';
      bedrooms = '';
      bedroomsAsZero = false;
      bathrooms = '';
      bathroomsAsZero = false;
      garageSpots = '';
      garageSpotsAsZero = false;
      areaConstruida = '';
      areaTerreno = '';
      brokerId = '';
      brokerPhone = '';
      selectedBroker = null;
      selectedImages = [];
      revokeImagePreviews();
      video = null;
      selectedAmenities = [];
      if (imagesInput) imagesInput.value = '';
      clearVideoSelection();
      dispatch('created', { propertyId });
    } catch (error) {
      console.error('Erro ao criar imóvel:', error);
      const backendMessage = extractApiErrorMessage(error, '');
      if (selectedImages.length > 0 && imagePreviewUrls.length === 0) {
        refreshImagePreviews();
      }
      if (video && !videoPreviewUrl) {
        videoPreviewUrl = URL.createObjectURL(video);
      }
      const errorMessage =
        backendMessage ||
        (error instanceof Error ? error.message : null) ||
        'Não foi possível criar o imóvel.';
      submitFeedback = {
        type: 'error',
        message: errorMessage,
      };
      toast.error(errorMessage);
    } finally {
      isSubmitting = false;
      uploadStatus = '';
    }
  }

  onMount(() => {
    fetchBrokers('');
    fetchCitiesForState(state);
  });

  $: {
    const normalizedCity = city.trim().toLowerCase();
    if (normalizedCity.length > 0 && normalizedCity !== lastBairroLookupCity) {
      lastBairroLookupCity = normalizedCity;
      if (selectedCityId) scheduleBairroSearch('');
    } else if (normalizedCity.length === 0) {
      selectedCityId = null;
      bairro = '';
      lastBairroLookupCity = '';
      bairros = [];
      bairrosError = null;
    }
  }
  $: if (!city.trim().length) {
    bairros = [];
    bairrosError = null;
  }

  onDestroy(() => {
    if (brokerSearchTimer) {
      clearTimeout(brokerSearchTimer);
    }
    if (citySearchTimer) clearTimeout(citySearchTimer);
    if (bairroSearchTimer) clearTimeout(bairroSearchTimer);
    revokeImagePreviews();
    revokeVideoPreview();
  });
</script>

<PropertyFormShell
  mode="create"
  variant="orange"
  title="Cadastrar imóvel"
  description="Preencha os dados principais do imóvel, envie fotos e finalize o cadastro."
>
  <div class="space-y-6">
    <PropertyBasicFields
      bind:title
      bind:type
      bind:purpose
      bind:marketStage
      bind:status
      bind:ownerName
      bind:ownerPhone
      bind:brokerId
      bind:brokerPhone
      bind:brokerQuery
      bind:brokerDropdownOpen
      {brokers}
      bind:brokersLoading
      bind:brokersError
      bind:selectedBroker
      bind:description
      bind:priceSale
      bind:priceRent
      bind:promotionSalePercentage
      bind:promotionRentPercentage
      bind:promotionPriceSale
      bind:promotionPriceRent
      onBrokerQueryInput={handleBrokerQueryInput}
      onBrokerFocus={() => (brokerDropdownOpen = true)}
      onBrokerBlur={() =>
        setTimeout(() => {
          brokerDropdownOpen = false;
        }, 120)}
      onClearBrokerSelection={clearBrokerSelection}
      onSelectBroker={selectBroker}
    />

    <PropertyStructureFields
      idPrefix="create-property"
      bind:bedrooms
      bind:bedroomsAsZero
      bind:bathrooms
      bind:bathroomsAsZero
      bind:garageSpots
      bind:garageSpotsAsZero
      bind:areaConstruida
      bind:areaConstruidaUnidade
      bind:areaTerreno
      bind:areaTerrenoUnidade
    />

    <PropertyLocationFields
      idPrefix="create-property"
      bind:cep
      bind:semCep
      bind:state
      bind:city
      bind:address
      bind:bairro
      bairroOptional={bairroOptional}
      bind:numero
      bind:semNumero
      bind:quadra
      bind:semQuadra
      bind:lote
      bind:semLote
      bind:complemento
      {cities}
      bind:citiesLoading
      bind:citiesError
      {bairros}
      bind:bairrosLoading
      bind:bairrosError
      bairroDisabled={!selectedCityId}
      bind:cepLookupError
      onStateChange={fetchCitiesForState}
      onCityInput={scheduleCitySearch}
      onBairroInput={scheduleBairroSearch}
      onCepLookup={lookupCep}
    />

      <PropertyAmenitiesFields bind:selectedAmenities />

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="create-images-input">
          Fotos do imóvel *
        </label>
        <div
          class={`rounded-md border-2 border-dashed p-3 transition ${
            isImageDropActive
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
          }`}
          role="group"
          aria-label="Envio de imagens do imóvel"
          on:dragover|preventDefault={() => (isImageDropActive = true)}
          on:dragenter|preventDefault={() => (isImageDropActive = true)}
          on:dragleave={() => (isImageDropActive = false)}
          on:drop={handleImagesDrop}
        >
          <input id="create-images-input" name="images" bind:this={imagesInput} class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple on:change={handleImagesChange} />
          <div class="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" on:click={openImagesPicker} disabled={isSubmitting}>
              Escolher imagens
            </Button>
            <span class="text-sm text-gray-600 dark:text-gray-300">
              {#if selectedImages.length > 0}
                {selectedImages.length} imagem(ns) selecionada(s)
              {:else}
                Nenhuma imagem selecionada
              {/if}
            </span>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Arraste e solte imagens aqui ou clique para selecionar.
          </p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Mínimo de 1 imagem e máximo de 20. Tamanho máximo por imagem: {MAX_IMAGE_SIZE_MB}MB.
        </p>
        {#if selectedImages.length > 0}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {#each selectedImages as file, index}
              <div class="rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
                <div class="aspect-[4/3] overflow-hidden rounded">
                  {#if imagePreviewUrls[index]}
                    <img
                      src={imagePreviewUrls[index]}
                      alt={file.name}
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                  {/if}
                </div>
                <p class="mt-2 truncate text-xs text-gray-600 dark:text-gray-300">{file.name}</p>
                <button
                  type="button"
                  class="mt-2 w-full rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600"
                  on:click={() => removeSelectedImage(index)}
                >
                  Remover
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="create-video-input">
          Vídeo (opcional)
        </label>
        <div
          class={`rounded-md border-2 border-dashed p-3 transition ${
            isVideoDropActive
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
          }`}
          role="group"
          aria-label="Envio de video do imóvel"
          on:dragover|preventDefault={() => (isVideoDropActive = true)}
          on:dragenter|preventDefault={() => (isVideoDropActive = true)}
          on:dragleave={() => (isVideoDropActive = false)}
          on:drop={handleVideoDrop}
        >
          <input id="create-video-input" name="video" bind:this={videoInput} class="sr-only" type="file" accept="video/*" on:change={handleVideoChange} />
          <div class="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" on:click={openVideoPicker} disabled={isSubmitting}>
              Escolher vídeo
            </Button>
            <span class="text-sm text-gray-600 dark:text-gray-300">
              {video ? video.name : 'Nenhum vídeo selecionado'}
            </span>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Arraste e solte um video aqui ou clique para selecionar.
          </p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Tamanho máximo do vídeo: {MAX_VIDEO_SIZE_MB}MB.
        </p>
        {#if videoPreviewUrl}
          <div class="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            <video src={videoPreviewUrl} controls class="max-h-64 w-full rounded-md bg-black">
              <track kind="captions" srclang="pt-BR" label="Sem legendas disponíveis" />
            </video>
            <button
              type="button"
              class="mt-3 rounded-md bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600"
              on:click={clearVideoSelection}
            >
              Remover vídeo
            </button>
          </div>
        {/if}
      </div>

      {#if submitFeedback}
        <div
          class={`rounded-md border px-4 py-3 text-sm ${
            submitFeedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
          }`}
          role="status"
          aria-live="polite"
        >
          {submitFeedback.message}
        </div>
      {/if}

      <div class="sticky bottom-0 -mx-6 border-t border-gray-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
              Revise os dados antes de enviar
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              O imóvel será criado assim que as imagens terminarem de subir e o backend confirmar o cadastro.
            </p>
          </div>
          <div class="flex justify-end">
            <Button on:click={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Cadastrar imóvel'}
            </Button>
          </div>
        </div>
      </div>
      {#if uploadStatus}
        <p class="text-xs text-gray-500 dark:text-gray-400">{uploadStatus}</p>
      {/if}
    </div>
</PropertyFormShell>
