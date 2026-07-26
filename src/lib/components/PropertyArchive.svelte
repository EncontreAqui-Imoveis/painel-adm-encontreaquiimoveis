<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import * as Dialog from '$lib/components/ui/dialog';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';
  import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';
  import { apiClient } from '$lib/apiClient';
  import PromotionNotificationModal from '$lib/components/PromotionNotificationModal.svelte';
  import {
    areaUnitLabel,
    extractCoverUrl,
    formatArea,
    formatAreaFromDetail,
    formatCurrency,
    formatDate,
    propertyStatusLabel,
    purposeLabel,
    statusClass,
    statusLabel,
    type ArchiveItemLike,
    type ArchivePropertyDetailLike,
    type ArchiveStatus,
  } from '$lib/components/property-archive/propertyArchiveHelpers';

  type ArchiveItem = ArchiveItemLike;
  type ArchivePropertyDetail = ArchivePropertyDetailLike;

  let rows: ArchiveItem[] = [];
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let search = '';
  let searchDraft = '';
  /** Filtro exclusivo: vendidos ou alugados (padrão: vendidos). */
  let archiveKind: ArchiveStatus = 'sold';
  let isFiltersModalOpen = false;
  let isRelisting = false;
  let isMobileLayout = false;
  let selected: ArchiveItem | null = null;
  let showModal = false;
  let isReviewModalOpen = false;
  let selectedReviewItem: ArchiveItem | null = null;
  let reviewDetails: ArchivePropertyDetail | null = null;
  let isReviewLoading = false;
  let reviewError: string | null = null;
  let isImagePreviewOpen = false;
  let previewImageUrl: string | null = null;
  let previewImageAlt = 'Capa do imóvel';
  let isPromotionNotificationModalOpen = false;
  let promotionNotificationPropertyId: number | null = null;
  let promotionNotificationTitle = '';
  let promotionNotificationMessage = '';

  function openNotificationModal(item: ArchiveItem) {
    promotionNotificationPropertyId = item.id;
    promotionNotificationTitle = `Imóvel ${item.status === 'sold' ? 'Vendido' : 'Alugado'}: ${item.title}`;
    promotionNotificationMessage = `O imóvel ${item.code || 'sem código'} foi ${item.status === 'sold' ? 'vendido' : 'alugado'} com sucesso!`;
    isPromotionNotificationModalOpen = true;
  }

  function openImagePreview(url: string | null | undefined, alt: string) {
    if (!url) return;
    previewImageUrl = url;
    previewImageAlt = alt;
    isImagePreviewOpen = true;
  }

  function openFiltersModal() {
    searchDraft = search;
    isFiltersModalOpen = true;
  }

  function applyArchiveFilters() {
    search = searchDraft.trim();
    isFiltersModalOpen = false;
    requestFetch(true);
  }

  function resetArchiveFilters() {
    searchDraft = '';
    search = '';
    requestFetch(true);
  }

  function selectArchiveKind(kind: ArchiveStatus) {
    if (archiveKind === kind) return;
    archiveKind = kind;
    requestFetch(true);
  }

  function closeImagePreview() {
    isImagePreviewOpen = false;
    previewImageUrl = null;
  }

  function syncIsMobileLayout() {
    if (typeof window === 'undefined') return;
    isMobileLayout = window.innerWidth < 768;
  }

  function openRelistModal(item: ArchiveItem) {
    selected = item;
    showModal = true;
  }

  async function openReviewModal(item: ArchiveItem) {
    selectedReviewItem = item;
    isReviewModalOpen = true;
    reviewDetails = null;
    reviewError = null;
    isReviewLoading = true;

    try {
      const response = await api.get<ArchivePropertyDetail>(`/admin/properties/${item.id}`);
      reviewDetails = response;
    } catch (error) {
      console.error('Erro ao carregar detalhes do imóvel finalizado:', error);
      reviewError = 'Não foi possível carregar os detalhes do imóvel.';
    } finally {
      isReviewLoading = false;
    }
  }

  function closeModal(force = false) {
    if (isRelisting && !force) return;
    showModal = false;
    selected = null;
  }

  function closeReviewModal() {
    if (isReviewLoading) return;
    isReviewModalOpen = false;
    selectedReviewItem = null;
    reviewDetails = null;
    reviewError = null;
  }

  function handlePreviewKeydown(event: KeyboardEvent) {
    if (!isImagePreviewOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeImagePreview();
    }
  }

  function requestFetch(resetPage = false) {
    if (resetPage) currentPage = 1;
    refreshKey += 1;
  }

  async function fetchArchive() {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      params.set('status', archiveKind);
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await api.get<{
        data?: ArchiveItem[];
        total?: number;
      }>(`/admin/properties/archive?${params.toString()}`);

      rows = Array.isArray(response?.data) ? response.data : [];
      totalItems = Number(response?.total ?? rows.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar arquivo de imóveis:', error);
      rows = [];
      totalItems = 0;
      totalPages = 1;
      toast.error('Não foi possível carregar o arquivo de imóveis.');
    } finally {
      isLoading = false;
    }
  }

  async function confirmRelist() {
    if (!selected) return;
    const confirmed = window.confirm(
      'Tem certeza? O imóvel voltará para disponível e poderá ser anunciado novamente.'
    );
    if (!confirmed) return;
    isRelisting = true;
    try {
      await api.put(`/admin/properties/${selected.id}/relist`, {});
      toast.success('Imóvel disponibilizado novamente com sucesso.');
      rows = rows.filter((item) => item.id !== selected!.id);
      totalItems = Math.max(0, totalItems - 1);
      closeModal(true);
      requestFetch();
    } catch (error) {
      console.error('Erro ao disponibilizar imóvel novamente:', error);
      toast.error('Não foi possível disponibilizar o imóvel novamente.');
    } finally {
      isRelisting = false;
    }
  }

  async function relistFromReview() {
    const reviewItem = selectedReviewItem;
    if (!reviewItem) return;
    const confirmed = window.confirm(
      'Tem certeza? O imóvel voltará para disponível e poderá ser anunciado novamente.'
    );
    if (!confirmed) return;
    isRelisting = true;
    try {
      await api.put(`/admin/properties/${reviewItem.id}/relist`, {});
      toast.success('Imóvel retornou para disponível com sucesso.');
      rows = rows.filter((row) => row.id !== reviewItem.id);
      totalItems = Math.max(0, totalItems - 1);
      closeReviewModal();
    } catch (error) {
      console.error('Erro ao relistar imóvel pela revisão:', error);
      toast.error('Não foi possível voltar o imóvel para disponível.');
    } finally {
      isRelisting = false;
    }
  }

  onMount(() => {
    syncIsMobileLayout();
    hasMounted = true;
    requestFetch();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    refreshKey;
    archiveKind;
    fetchArchive();
  }
</script>

<svelte:window on:resize={syncIsMobileLayout} on:keydown={handlePreviewKeydown} />

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-3">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Imóveis Arquivados</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Histórico de imóveis finalizados. Você pode rever e devolver imóveis para disponível quando necessário.
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className={archiveKind === 'sold'
            ? 'border-green-500 bg-green-100 text-green-900 dark:border-green-500 dark:bg-green-900/40 dark:text-green-100'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'}
          on:click={() => selectArchiveKind('sold')}
        >
          Vendidos
        </Button>
        <Button
          variant="outline"
          className={archiveKind === 'rented'
            ? 'border-green-500 bg-green-100 text-green-900 dark:border-green-500 dark:bg-green-900/40 dark:text-green-100'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'}
          on:click={() => selectArchiveKind('rented')}
        >
          Alugados
        </Button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        on:click={openFiltersModal}
      >
        Filtros
      </Button>
      <Button variant="outline" on:click={() => requestFetch()} disabled={isLoading}>
        {#if isLoading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Atualizar
      </Button>
    </div>
  </div>

  <Dialog.Root bind:open={isFiltersModalOpen}>
    <Dialog.Content className="max-w-xl max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:px-4 max-sm:py-6">
      <Dialog.Header>
        <Dialog.Title>Filtros</Dialog.Title>
        <Dialog.Description>
          Filtre o arquivo por texto.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 px-1 py-4">
        <div class="grid gap-2">
          <label for="archive-search" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Busca
          </label>
          <input
            id="archive-search"
            type="text"
            bind:value={searchDraft}
            maxlength="120"
            placeholder="Buscar por código, título ou corretor"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

      </div>

      <Dialog.Footer className="flex flex-wrap gap-2">
        <Button variant="outline" on:click={resetArchiveFilters}>
          Limpar
        </Button>
        <Button variant="outline" on:click={() => (isFiltersModalOpen = false)}>
          Cancelar
        </Button>
        <Button on:click={applyArchiveFilters}>
          Aplicar
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  {#if isMobileLayout}
  <div class="space-y-3">
    {#if isLoading}
      <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Carregando imóveis...
      </div>
    {:else if rows.length === 0}
      <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Nenhum imóvel vendido ou alugado encontrado.
      </div>
    {:else}
      {#each rows as item (item.id)}
        <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              {#if extractCoverUrl(item)}
                <button
                  type="button"
                  class="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700"
                  on:click|stopPropagation={() => openImagePreview(extractCoverUrl(item), item.title)}
                  aria-label={`Ver capa de ${item.title}`}
                >
                  <img src={extractCoverUrl(item)} alt={`Capa do imóvel ${item.title}`} class="h-full w-full object-cover" loading="lazy" />
                </button>
              {/if}
              <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.code ? item.code : 'Código indisponível'}
              </p>
              <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.title}</p>
              </div>
            </div>
            <span class={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
              {statusLabel(item.status)}
            </span>
          </div>
          <dl class="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <div class="flex items-center justify-between gap-3">
              <dt>Corretor</dt>
              <dd class="text-right">{item.brokerName ?? '-'}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Data da transação</dt>
              <dd class="text-right">{formatDate(item.transactionDate)}</dd>
            </div>
          </dl>
          <div class="mt-4 flex flex-col gap-2">
            <Button variant="outline" on:click={() => openReviewModal(item)}>
              Revisar
            </Button>
            {#if item.status === 'rented' || item.status === 'sold'}
              <Button variant="outline" on:click={() => openRelistModal(item)}>
                Voltar para Disponível
              </Button>
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-900/30"
                on:click={() => openNotificationModal(item)}
              >
                Notificar {item.status === 'sold' ? 'Venda' : 'Aluguel'}
              </Button>
            {/if}
          </div>
        </article>
      {/each}
    {/if}
  </div>

  {:else}
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Foto
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Código
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Título
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Corretor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Status
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data da Transação
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
              Carregando imóveis...
            </td>
          </tr>
        {:else if rows.length === 0}
          <tr>
            <td colspan="7" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum imóvel vendido ou alugado encontrado.
            </td>
          </tr>
        {:else}
          {#each rows as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4">
                {#if extractCoverUrl(item)}
                  <button
                    type="button"
                    class="h-12 w-16 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700"
                    on:click|stopPropagation={() => openImagePreview(extractCoverUrl(item), item.title)}
                    aria-label={`Ver capa de ${item.title}`}
                  >
                    <img src={extractCoverUrl(item)} alt={`Capa do imóvel ${item.title}`} class="h-full w-full object-cover" loading="lazy" />
                  </button>
                {:else}
                  <div class="h-12 w-16 rounded-md border border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"></div>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                {item.code ? item.code : 'Código indisponível'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.title}</td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.brokerName ?? '-'}</td>
              <td class="px-6 py-4">
                <span class={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.transactionDate)}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" on:click={() => openReviewModal(item)}>
                    Revisar
                  </Button>
                  {#if item.status === 'rented' || item.status === 'sold'}
                    <Button size="sm" variant="outline" on:click={() => openRelistModal(item)}>
                      Voltar para Disponível
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-900/30"
                      on:click={() => openNotificationModal(item)}
                    >
                      Notificar
                    </Button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
  {/if}

  <div class="mt-4">
    <Pagination bind:currentPage {totalPages} {totalItems} {itemsPerPage} />
  </div>
</div>

{#if isReviewModalOpen && selectedReviewItem}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeReviewModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div
      class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-review-title"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 id="archive-review-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Revisar imóvel finalizado
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedReviewItem.code ? selectedReviewItem.code : 'Código indisponível'} - {selectedReviewItem.title}
          </p>
        </div>
        <span class={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(selectedReviewItem.status)}`}>
          {statusLabel(selectedReviewItem.status)}
        </span>
      </div>

      <div class="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
                    selectedReviewItem?.title ?? 'Imóvel'
                  )}
                aria-label="Ver foto capa em tela cheia"
              >
                <img
                  src={extractCoverUrl(reviewDetails)}
                  alt={`Capa do imóvel ${selectedReviewItem?.title ?? 'Imóvel'}`}
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
                Construída: {formatAreaFromDetail(reviewDetails.area_construida_valor, reviewDetails.area_construida, reviewDetails.area_construida_unidade)}
              </p>
              <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                Terreno: {formatAreaFromDetail(reviewDetails.area_terreno_valor, reviewDetails.area_terreno, reviewDetails.area_terreno_unidade)}
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

      <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          on:click={relistFromReview}
          disabled={isRelisting || isReviewLoading || !reviewDetails}
        >
          {#if isRelisting}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Voltar para Disponível
        </Button>
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

{#if showModal && selected}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Disponibilizar Imóvel</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Tem certeza que deseja disponibilizar este imóvel novamente? Ele retornará imediatamente para o catálogo do aplicativo de todos os corretores.
          </p>
          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <strong>Imóvel:</strong> {selected.code ? `${selected.code} - ` : ''}{selected.title}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={() => closeModal()}
          aria-label="Fechar modal"
        >
          ×
        </button>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <Button
          variant="outline"
          className="bg-blue-600 text-white hover:bg-blue-700"
          on:click={confirmRelist}
          disabled={isRelisting}
        >
          {#if isRelisting}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Confirmar
        </Button>
      </div>
    </div>
  </div>
{/if}

<PromotionNotificationModal
  bind:open={isPromotionNotificationModalOpen}
  propertyId={promotionNotificationPropertyId}
  propertyTitle={promotionNotificationTitle}
  defaultMessage={promotionNotificationMessage}
/>
