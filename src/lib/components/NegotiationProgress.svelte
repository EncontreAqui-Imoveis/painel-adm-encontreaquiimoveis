<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';
  import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';

  type NegotiationItem = {
    id: string;
    status: string;
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    propertyImageUrl?: string | null;
    brokerName?: string | null;
    clientName?: string | null;
    clientCpf?: string | null;
    value?: number | null;
    approvedAt?: string | null;
  };

  type PropertyDetail = {
    id: number;
    code?: string | null;
    title: string;
    type?: string | null;
    purpose?: string | null;
    status?: string | null;
    city?: string | null;
    state?: string | null;
    bairro?: string | null;
    address?: string | null;
    numero?: string | null;
    broker_name?: string | null;
    broker_phone?: string | null;
    owner_name?: string | null;
    owner_phone?: string | null;
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    valor_condominio?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    garage_spots?: number | null;
    area_construida?: number | null;
    area_construida_unidade?: string | null;
    area_terreno?: number | null;
    area_terreno_unidade?: string | null;
    images?: unknown;
    image_url?: string | null;
    property_image_url?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  };

  let negotiations: NegotiationItem[] = [];
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let selected: NegotiationItem | null = null;
  let showConfirm = false;
  let processing = false;
  let cancelReason = '';
  let isReviewModalOpen = false;
  let selectedReviewItem: NegotiationItem | null = null;
  let reviewDetails: PropertyDetail | null = null;
  let isReviewLoading = false;
  let reviewError: string | null = null;
  let isImagePreviewOpen = false;
  let previewImageUrl: string | null = null;
  let previewImageAlt = 'Capa do imóvel';

  function requestFetch(resetPage = false) {
    if (resetPage) currentPage = 1;
    refreshKey += 1;
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  }

  function formatCurrency(value?: number | null) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return 'R$ 0,00';
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  function propertyStatusLabel(status?: string | null): string {
    const normalized = String(status ?? '').trim().toLowerCase();
    if (normalized === 'sold') return 'Vendido';
    if (normalized === 'rented') return 'Alugado';
    if (normalized === 'approved') return 'Aprovado';
    if (normalized === 'pending_approval') return 'Pendente';
    if (normalized === 'negociacao') return 'Em negociação';
    return normalized ? normalized : '-';
  }

  function purposeLabel(purpose?: string | null): string {
    const normalized = String(purpose ?? '').trim();
    return normalized.length > 0 ? normalized : '-';
  }

  function areaUnitLabel(unit?: string | null): string {
    if (unit === 'hectare') return 'ha';
    if (unit === 'alqueire') return 'alq';
    return 'm²';
  }

  function formatArea(value?: number | null, unit?: string | null): string {
    if (value == null || Number.isNaN(value)) return '-';
    return `${value} ${areaUnitLabel(unit)}`;
  }

  function normalizeImageUrl(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  function extractCoverUrl(
    source:
      | { propertyImageUrl?: unknown; image_url?: unknown; property_image_url?: unknown; images?: unknown }
      | null
      | undefined
  ): string | null {
    if (!source) return null;
    const direct =
      normalizeImageUrl(source.propertyImageUrl) ??
      normalizeImageUrl(source.image_url) ??
      normalizeImageUrl(source.property_image_url);
    if (direct) return direct;

    const rawImages = source.images;
    if (!rawImages) return null;

    if (typeof rawImages === 'string') {
      const trimmed = rawImages.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0] as Record<string, unknown>;
          return normalizeImageUrl(first?.url) ?? normalizeImageUrl(first?.image_url);
        }
      } catch {
        return normalizeImageUrl(trimmed.split(/[;,|]/)[0] ?? null);
      }
      return null;
    }

    if (Array.isArray(rawImages) && rawImages.length > 0) {
      const first = rawImages[0];
      if (typeof first === 'string') return normalizeImageUrl(first);
      if (first && typeof first === 'object') {
        const record = first as Record<string, unknown>;
        return normalizeImageUrl(record.url) ?? normalizeImageUrl(record.image_url);
      }
    }

    return null;
  }

  function openImagePreview(url: string | null | undefined, alt: string) {
    if (!url) return;
    previewImageUrl = url;
    previewImageAlt = alt;
    isImagePreviewOpen = true;
  }

  function closeImagePreview() {
    isImagePreviewOpen = false;
    previewImageUrl = null;
  }

  function handlePreviewKeydown(event: KeyboardEvent) {
    if (!isImagePreviewOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeImagePreview();
    }
  }

  function readClientName(item: NegotiationItem | null): string {
    if (!item) return '-';
    const raw =
      item.clientName ??
      (item as unknown as Record<string, unknown>).client_name ??
      (item as unknown as Record<string, unknown>).client;

    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }

    if (raw && typeof raw === 'object') {
      const nestedName = (raw as Record<string, unknown>).name;
      if (typeof nestedName === 'string' && nestedName.trim().length > 0) {
        return nestedName.trim();
      }
    }

    return '-';
  }

  async function fetchNegotiations() {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', 'APPROVED');
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));

      const response = await api.get<{ data?: NegotiationItem[]; total?: number } | NegotiationItem[]>(
        `/admin/negotiations?${params.toString()}`
      );
      const data = Array.isArray(response) ? response : response?.data;
      negotiations = Array.isArray(data) ? data : [];
      totalItems = Number((response as { total?: number })?.total ?? negotiations.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao listar negociações em andamento:', error);
      toast.error('Não foi possível carregar negociações em andamento.');
      negotiations = [];
    } finally {
      isLoading = false;
    }
  }

  function openCancelModal(item: NegotiationItem) {
    selected = item;
    showConfirm = true;
    cancelReason = '';
  }

  async function openReviewModal(item: NegotiationItem) {
    selectedReviewItem = item;
    isReviewModalOpen = true;
    reviewDetails = null;
    reviewError = null;
    isReviewLoading = true;

    try {
      const response = await api.get<PropertyDetail>(`/admin/properties/${item.propertyId}`);
      reviewDetails = response;
    } catch (error) {
      console.error('Erro ao carregar detalhes do imóvel em negociação:', error);
      reviewError = 'Não foi possível carregar os detalhes do imóvel.';
    } finally {
      isReviewLoading = false;
    }
  }

  function closeCancelModal(force = false) {
    if (processing && !force) return;
    showConfirm = false;
    selected = null;
    cancelReason = '';
  }

  function closeReviewModal() {
    if (isReviewLoading) return;
    isReviewModalOpen = false;
    selectedReviewItem = null;
    reviewDetails = null;
    reviewError = null;
  }

  async function confirmCancel() {
    if (!selected) return;
    const trimmedReason = cancelReason.trim();
    if (trimmedReason.length < 5) {
      toast.error('Informe um motivo com no mínimo 5 caracteres.');
      return;
    }
    processing = true;
    try {
      await api.put(`/admin/negotiations/${selected.id}/cancel`, { reason: trimmedReason });
      toast.success('Negociação cancelada e imóvel devolvido para a vitrine.');
      negotiations = negotiations.filter((item) => item.id !== selected!.id);
      closeCancelModal(true);
      requestFetch();
    } catch (error) {
      console.error('Erro ao cancelar negociação em andamento:', error);
      toast.error('Falha ao cancelar negociação.');
    } finally {
      processing = false;
    }
  }

  onMount(() => {
    hasMounted = true;
    requestFetch();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    refreshKey;
    fetchNegotiations();
  }
</script>

<svelte:window on:keydown={handlePreviewKeydown} />

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Imóveis em Negociação</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Negociações aprovadas que já retiraram o imóvel da vitrine.
      </p>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="negotiation-progress-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="negotiation-progress-items-per-page"
        bind:value={itemsPerPage}
        on:change={() => requestFetch(true)}
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      <span>entradas</span>
    </div>
    <Button variant="outline" on:click={() => requestFetch()} disabled={isLoading}>
      {#if isLoading}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Atualizar
    </Button>
  </div>

  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Foto
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Código / Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Usuário
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Comprador
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Valor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data Aprovação
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ação
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if isLoading}
          <tr>
            <td colspan="7" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando negociações em andamento...
            </td>
          </tr>
        {:else if negotiations.length === 0}
          <tr>
            <td colspan="7" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma negociação em andamento.
            </td>
          </tr>
        {:else}
          {#each negotiations as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4">
                {#if extractCoverUrl(item)}
                  <button
                    type="button"
                    aria-label={`Abrir imagem de ${item.propertyTitle ?? `Imóvel #${item.propertyId}`}`}
                    on:click|stopPropagation={() =>
                      openImagePreview(
                        extractCoverUrl(item),
                        item.propertyTitle ?? `Imóvel #${item.propertyId}`
                      )}
                  >
                    <img
                      src={extractCoverUrl(item)}
                      alt={item.propertyTitle ?? `Imóvel #${item.propertyId}`}
                      class="h-10 w-14 rounded-md border border-gray-200 object-cover dark:border-gray-700"
                      loading="lazy"
                    />
                  </button>
                {:else}
                  <div class="h-10 w-14 rounded-md border border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"></div>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-semibold">
                  {item.propertyCode ? `${item.propertyCode}` : `#${item.propertyId}`}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? '-'}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.brokerName ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {readClientName(item)}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatCurrency(item.value)}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.approvedAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    on:click={() => openReviewModal(item)}
                  >
                    Revisar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="bg-red-600 text-white hover:bg-red-700"
                    on:click={() => openCancelModal(item)}
                  >
                    Voltar para Disponível
                  </Button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <Pagination bind:currentPage {totalPages} {totalItems} {itemsPerPage} />
  </div>
</div>

{#if isReviewModalOpen && selectedReviewItem}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeReviewModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div
      class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
      role="dialog"
      aria-modal="true"
      aria-label="Revisar imóvel em negociação"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Revisar imóvel em negociação
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedReviewItem.propertyCode ? `${selectedReviewItem.propertyCode}` : `#${selectedReviewItem.propertyId}`}
            {#if selectedReviewItem.propertyTitle}
              - {selectedReviewItem.propertyTitle}
            {/if}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={closeReviewModal}
          aria-label="Fechar modal"
        >
          ×
        </button>
      </div>

      <div class="space-y-4">
        {#if isReviewLoading}
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 class="h-4 w-4 animate-spin" />
            Carregando detalhes...
          </div>
        {:else if reviewError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {reviewError}
          </div>
        {:else if reviewDetails}
          {#if extractCoverUrl(reviewDetails)}
            <div class="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                class="block w-full"
                on:click={() =>
                  openImagePreview(
                    extractCoverUrl(reviewDetails),
                    selectedReviewItem?.propertyTitle ?? 'Imóvel'
                  )}
                aria-label="Ver foto capa em tela cheia"
              >
                <img
                  src={extractCoverUrl(reviewDetails)}
                  alt={`Capa do imóvel ${selectedReviewItem.propertyTitle ?? 'Imóvel'}`}
                  class="h-52 w-full object-cover"
                  loading="lazy"
                />
              </button>
            </div>
          {/if}

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Tipo</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{reviewDetails.type ?? '-'}</p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Finalidade</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{purposeLabel(reviewDetails.purpose)}</p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status atual</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{propertyStatusLabel(reviewDetails.status)}</p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Última atualização</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {formatDate(reviewDetails.updated_at ?? reviewDetails.created_at)}
              </p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Valor de venda</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(reviewDetails.price_sale)}</p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Valor de aluguel</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(reviewDetails.price_rent)}</p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Condomínio</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(reviewDetails.valor_condominio)}</p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Quartos / Banheiros / Garagens</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {reviewDetails.bedrooms ?? '-'} / {reviewDetails.bathrooms ?? '-'} / {reviewDetails.garage_spots ?? '-'}
              </p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Áreas</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                Construída: {formatArea(reviewDetails.area_construida, reviewDetails.area_construida_unidade)}
              </p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                Terreno: {formatArea(reviewDetails.area_terreno, reviewDetails.area_terreno_unidade)}
              </p>
            </div>
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Localização</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {reviewDetails.address ?? '-'}{#if reviewDetails.numero} , {reviewDetails.numero}{/if}
            </p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {reviewDetails.bairro ?? '-'} • {reviewDetails.city ?? '-'} / {reviewDetails.state ?? '-'}
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Anunciante</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{reviewDetails.broker_name ?? '-'}</p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatPhoneDisplayBr(reviewDetails.broker_phone)}</p>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Proprietário</p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{reviewDetails.owner_name ?? '-'}</p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatPhoneDisplayBr(reviewDetails.owner_phone)}</p>
            </div>
          </div>
        {/if}
      </div>

      <div class="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button variant="outline" on:click={closeReviewModal}>
          Fechar
        </Button>
      </div>
    </div>
  </div>
{/if}

{#if isImagePreviewOpen && previewImageUrl}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
    role="button"
    tabindex="0"
    aria-label="Fechar visualização da imagem"
    on:click={closeImagePreview}
    on:keydown={handlePreviewKeydown}
  >
    <div class="relative max-h-[90vh] max-w-[95vw]" role="presentation">
      <img src={previewImageUrl} alt={previewImageAlt} class="max-h-[90vh] max-w-[95vw] rounded-md object-contain" />
      <button
        type="button"
        class="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
        aria-label="Fechar"
        on:click={closeImagePreview}
      >
        x
      </button>
    </div>
  </div>
{/if}

{#if showConfirm && selected}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeCancelModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Cancelar Negociação</h3>
      <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Tem a certeza? Esta ação cancelará a venda atual e o imóvel voltará a ficar disponível para todos os corretores no aplicativo.
      </p>
      <div class="mt-4">
        <label
          for="cancel-reason"
          class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Motivo do cancelamento
        </label>
        <textarea
          id="cancel-reason"
          bind:value={cancelReason}
          maxlength="500"
          rows={4}
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Digite o motivo do cancelamento (Ex: Comprador não obteve financiamento)..."
        ></textarea>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <Button
          variant="destructive"
          className="bg-red-600 text-white hover:bg-red-700"
          on:click={confirmCancel}
          disabled={processing || cancelReason.trim().length < 5}
        >
          {#if processing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Confirmar Cancelamento
        </Button>
      </div>
    </div>
  </div>
{/if}
