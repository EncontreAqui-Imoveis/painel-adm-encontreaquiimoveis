<script lang="ts">
  import { onMount } from 'svelte';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import { api } from '$lib/apiClient';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Loader2 } from 'lucide-svelte';
  import BrokerReviewModal from '$lib/components/BrokerReviewModal.svelte';
  import Pagination from '$lib/Pagination.svelte';
  import { clearSessionToken, hasSessionToken } from './sessionState';
  import { toast } from 'svelte-sonner';
  import type { Broker, BrokerDocuments, Property } from './types';
  import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';

  type SortConfig = {
    key: string;
    order: 'asc' | 'desc';
  };

  type BrokerFilters = {
    search: string;
  };

  let brokers: Broker[] = [];
  let isLoading = false;
  let error: string | null = null;
  let feedback: { type: 'success' | 'error'; text: string } | null = null;

  let isDocumentsModalOpen = false;
  let selectedBroker: Broker | null = null;
  let selectedDocuments: BrokerDocuments | null = null;
  let docsError: string | null = null;

  let isPropertiesModalOpen = false;
  let brokerProperties: Property[] = [];
  let propertiesLoading = false;
  let propertiesError: string | null = null;
  let propertiesModalTitle = '';
  let filters: BrokerFilters = {
    search: '',
  };
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let fetchKey = 0;
  let hasMounted = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isReviewModalOpen = false;
  let brokerUnderReview: Broker | null = null;
  let sortConfig: SortConfig = { key: 'created_at', order: 'desc' };
  let docErrorMessage = '';

  let isSelfiePreviewOpen = false;
  let selfiePreviewUrl: string | null = null;
  function openSelfieFullscreen(url: string) {
    selfiePreviewUrl = url;
    isSelfiePreviewOpen = true;
  }
  function closeSelfieFullscreen() {
    isSelfiePreviewOpen = false;
    selfiePreviewUrl = null;
  }
  function handleSelfiePreviewKeydown(event: KeyboardEvent) {
    if (!isSelfiePreviewOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSelfieFullscreen();
    }
  }

  const DOCUMENT_TILES: ReadonlyArray<{ key: keyof BrokerDocuments; label: string }> = [
    { key: 'creci_front_url', label: 'Frente do CRECI' },
    { key: 'creci_back_url', label: 'Verso do CRECI' },
    { key: 'selfie_url', label: 'Selfie com documento' },
  ];

  function showFeedback(type: 'success' | 'error', text: string) {
    feedback = { type, text };
    setTimeout(() => (feedback = null), 4000);
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatCurrency(value: unknown): string {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return '-';
    }
    return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function brokerSelfieThumb(b: Broker): string | null {
    const docs = b.documents;
    if (docs && typeof docs.selfie_url === 'string' && docs.selfie_url.trim()) {
      return docs.selfie_url.trim();
    }
    const extra = b as Broker & { selfie_url?: string | null };
    if (typeof extra.selfie_url === 'string' && extra.selfie_url.trim()) {
      return extra.selfie_url.trim();
    }
    return null;
  }

  function getPurposeFlags(purpose?: string | null) {
    const normalized = (purpose ?? '').toLowerCase();
    const supportsSale = normalized.includes('vend');
    const supportsRent = normalized.includes('alug');
    return { supportsSale, supportsRent };
  }

  function resolvePriceLines(property: Property) {
    const lines: Array<{ label: string; value: number }> = [];
    const { supportsSale, supportsRent } = getPurposeFlags(property.purpose ?? null);
    const salePrice =
      property.price_sale ??
      (supportsSale && !supportsRent ? property.price ?? null : null);
    const rentPrice =
      property.price_rent ??
      (supportsRent && !supportsSale ? property.price ?? null : null);

    if (salePrice != null && salePrice > 0) {
      lines.push({ label: 'Venda', value: Number(salePrice) });
    }
    if (rentPrice != null && rentPrice > 0) {
      lines.push({ label: 'Aluguel', value: Number(rentPrice) });
    }
    if (lines.length === 0 && property.price != null) {
      lines.push({ label: 'Preco', value: Number(property.price) });
    }
    return lines;
  }

  function formatPropertyStatus(status?: string | null): string {
    if (!status) {
      return '-';
    }
    const map: Record<string, string> = {
      pending_approval: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      rented: 'Alugado',
      sold: 'Vendido'
    };
    return map[status] ?? status;
  }

  function propertyStatusBadge(status?: string | null): string {
    if (!status) {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    }
    const map: Record<string, string> = {
      pending_approval:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      rented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return map[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  function requestFetch(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }
    fetchKey += 1;
  }

  async function fetchBrokers() {
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
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }
      params.append('sortBy', sortConfig.key);
      params.append('sortOrder', sortConfig.order);
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));

      const response = await api.get<{ data?: Broker[]; total?: number } | Broker[]>(
        `/admin/brokers?${params.toString()}`
      );
      const data = Array.isArray(response) ? response : response?.data;
      brokers = Array.isArray(data) ? data : [];
      totalItems = Number((response as { total?: number })?.total ?? brokers.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
    } catch (err) {
      console.error('Erro ao buscar corretores:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        error = 'Sessão expirada. Faca login novamente.';
        clearSessionToken();
      } else {
        error =
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro inesperado ao carregar os corretores.';
      }
    } finally {
      isLoading = false;
    }
  }

  async function openDocumentModal(broker: Broker) {
    const baseDocs = broker.documents ?? {
      creci_front_url: (broker as any)?.creci_front_url ?? null,
      creci_back_url: (broker as any)?.creci_back_url ?? null,
      selfie_url: (broker as any)?.selfie_url ?? null
    };

    selectedBroker = broker;
    selectedDocuments = {
      creci_front_url: baseDocs.creci_front_url ?? null,
      creci_back_url: baseDocs.creci_back_url ?? null,
      selfie_url: baseDocs.selfie_url ?? null
    };
    docErrorMessage = '';

    const hasDocs =
      Boolean(selectedDocuments?.creci_front_url) ||
      Boolean(selectedDocuments?.creci_back_url) ||
      Boolean(selectedDocuments?.selfie_url);

    docsError = hasDocs ? null : 'Documentos não disponíveis para este corretor.';
    isDocumentsModalOpen = true;
  }

  function markDocMissing(label: string) {
    docErrorMessage = `Documento "${label}" não disponível ou removido.`;
  }

  async function openPropertiesModal(broker: Broker) {
    if (!hasSessionToken()) {
      showFeedback('error', 'Sessão expirada. Faca login novamente.');
      clearSessionToken();
      return;
    }

    propertiesModalTitle = broker.name;
    isPropertiesModalOpen = true;
    propertiesLoading = true;
    propertiesError = null;
    brokerProperties = [];

    try {
      const payload = await api.get<{ data?: Property[] } | Property[]>(
        `/admin/brokers/${broker.id}/properties`
      );
      const data = Array.isArray(payload) ? payload : payload?.data;
      brokerProperties = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Erro ao carregar imóveis do corretor:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faca login novamente.');
        propertiesError = 'Sessão expirada. Faca login novamente.';
        clearSessionToken();
      } else {
        propertiesError =
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro ao carregar os imóveis deste corretor.';
      }
    } finally {
      propertiesLoading = false;
    }
  }

  function closeDocumentsModal() {
    isDocumentsModalOpen = false;
    selectedBroker = null;
    selectedDocuments = null;
    docsError = null;
  }

  function closePropertiesModal() {
    isPropertiesModalOpen = false;
    brokerProperties = [];
    propertiesError = null;
    propertiesModalTitle = '';
  }

  onMount(() => {
    hasMounted = true;
    requestFetch();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    fetchKey;
    fetchBrokers();
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

  function handleSort(key: string) {
    if (sortConfig.key === key) {
      sortConfig = {
        key,
        order: sortConfig.order === 'asc' ? 'desc' : 'asc'
      };
    } else {
      const defaultOrder = key === 'property_count' ? 'desc' : 'asc';
      sortConfig = { key, order: defaultOrder };
    }
    requestFetch(true);
  }

  function getSortIndicator(column: string) {
    if (sortConfig.key !== column) {
      return '';
    }
    return sortConfig.order === 'asc' ? '^' : 'v';
  }

  function reviewBroker(broker: Broker, event?: Event) {
    event?.stopPropagation();
    brokerUnderReview = broker;
    isReviewModalOpen = true;
  }

  function handleBrokerReviewUpdate(event: CustomEvent<{ brokerId: number; status: string }>) {
    const brokerId = Number(event.detail?.brokerId);
    const nextStatus = String(event.detail?.status ?? '').trim();
    if (Number.isFinite(brokerId) && brokerId > 0) {
      brokers = brokers.map((broker) =>
        broker.id === brokerId ? { ...broker, status: nextStatus as Broker['status'] } : broker
      );
    }
    requestFetch();
  }

  function handleExport() {
    exportToCsv(brokers, 'corretores.csv');
  }
</script>

<section class="space-y-6">
  <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Corretores</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Consulte os corretores cadastrados, aprove ou rejeite solicitações e visualize os documentos enviados.
      </p>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        className="w-full sm:w-64"
        type="search"
        maxLength={120}
        placeholder="Buscar por nome, email ou CRECI..."
        bind:value={filters.search}
        oninput={onSearchInput}
        onkeydown={handleKeydown}
        onkeyup={handleKeyup}
      />
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <label for="brokers-items-per-page" class="font-medium">Mostrar</label>
        <select
          id="brokers-items-per-page"
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
      <Button
        variant="outline"
        className="flex items-center gap-2"
        on:click={handleRefresh}
        disabled={isLoading}
      >
        {#if isLoading}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4.5 4.5h5v-3m0 3-2.5 2.5M19.5 19.5h-5v3m0-3 2.5-2.5M4 13a8 8 0 0 1 7-7.93M20 11a8 8 0 0 1-7 7.93"
            />
          </svg>
        {/if}
        Recarregar lista
      </Button>
      <Button
        variant="outline"
        on:click={handleExport}
        disabled={brokers.length === 0 || isLoading}
      >
        Exportar Corretores (CSV)
      </Button>
      <Button variant="outline" on:click={() => handleSort('name')} disabled={isLoading}>
        Nome <span aria-hidden="true">{getSortIndicator('name')}</span>
      </Button>
      <Button variant="outline" on:click={() => handleSort('property_count')} disabled={isLoading}>
        Qtd. Imóveis <span aria-hidden="true">{getSortIndicator('property_count')}</span>
      </Button>
    </div>
  </header>

  {#if feedback}
    <div
      class="rounded-md px-4 py-3 text-sm font-medium text-white shadow-sm {feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'}"
    >
      {feedback.text}
    </div>
  {/if}

  {#if error}
    <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
      {error}
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      Carregando corretores...
    </div>
  {:else if brokers.length === 0}
    <div class="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
      <svg class="mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16h8m-4-4h4m-5-8a3 3 0 016 0v12a5 5 0 01-5 5H7a5 5 0 01-5-5V7a3 3 0 016 0" />
      </svg>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Nenhum corretor encontrado</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Novos corretores aparecerão aqui assim que forem cadastrados.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900/60">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('name')}>
                Corretor
                <span aria-hidden="true">{getSortIndicator('name')}</span>
              </button>
            </th>
            <th
              class="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Telefone
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('creci')}>
                CRECI
                <span aria-hidden="true">{getSortIndicator('creci')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('property_count')}>
                Qtd. Imóveis
                <span aria-hidden="true">{getSortIndicator('property_count')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('created_at')}>
                Criado em
                <span aria-hidden="true">{getSortIndicator('created_at')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          {#each brokers as broker}
            {@const phoneDisplay = formatPhoneDisplayBr(broker.phone)}
            <tr class="hover:bg-gray-50 transition-colors dark:hover:bg-gray-900/50">
              <td class="px-6 py-4">
                <div class="flex min-w-0 items-center gap-3">
                  <div
                    class="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
                  >
                    {#if brokerSelfieThumb(broker)}
                      {@const thumb = brokerSelfieThumb(broker)}
                      <button
                        type="button"
                        class="block h-full w-full cursor-zoom-in p-0 text-left focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:ring-offset-gray-900"
                        aria-label="Abrir selfie em tela cheia"
                        on:click|stopPropagation={() => thumb && openSelfieFullscreen(thumb)}
                      >
                        <img
                          src={thumb}
                          alt=""
                          class="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    {:else}
                      <div class="flex h-full w-full items-center justify-center text-[10px] text-gray-400">—</div>
                    {/if}
                  </div>
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-gray-900 dark:text-white">{broker.name}</div>
                    <div class="truncate text-sm text-gray-500 dark:text-gray-400">{broker.email}</div>
                  </div>
                </div>
              </td>
              <td
                class="whitespace-nowrap px-6 py-4 align-top font-mono text-sm tabular-nums text-gray-600 dark:text-gray-300"
              >
                {phoneDisplay}
              </td>
              <td class="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{broker.creci}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{broker.property_count ?? 0}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {broker.created_at ? formatDate(broker.created_at) : '-'}
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col items-end gap-2 sm:flex-row">
                  <button
                    class="inline-flex items-center justify-center gap-2 rounded-md border border-yellow-500 px-3 py-1.5 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-50 dark:border-yellow-400 dark:text-yellow-200 dark:hover:bg-yellow-900/40"
                    on:click={(event) => reviewBroker(broker, event)}
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Revisar
                  </button>
                  <button
                    class="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500"
                    on:click={() => openDocumentModal(broker)}
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c1.38 0 2.5-1.12 2.5-2.5S13.38 3 12 3s-2.5 1.12-2.5 2.5S10.62 8 12 8zm0 0c2.21 0 4 1.79 4 4v1a2 2 0 002 2v3h-12v-3a2 2 0 002-2v-1c0-2.21 1.79-4 4-4z" />
                    </svg>
                    Ver documentos
                  </button>
                  <button
                    class="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                    on:click={() => openPropertiesModal(broker)}
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9-4 9 4-9 4-9-4zm9 10l-9-4v-6l9 4 9-4v6l-9 4z" />
                    </svg>
                    Ver imóveis
                  </button>
                </div>
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
</section>

<BrokerReviewModal
  bind:open={isReviewModalOpen}
  broker={brokerUnderReview}
  showReject={false}
  on:update={handleBrokerReviewUpdate}
  on:close={() => (brokerUnderReview = null)}
/>

<svelte:window on:keydown={handleSelfiePreviewKeydown} />

{#if isSelfiePreviewOpen && selfiePreviewUrl}
  <div
    class="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Selfie em tela cheia"
    tabindex="0"
    on:keydown={(e) => {
      if (e.key === 'Escape') closeSelfieFullscreen();
    }}
  >
    <button
      type="button"
      class="pointer-events-auto absolute inset-0 z-0 border-0 bg-black/85 p-0"
      aria-label="Fechar visualização"
      on:click={closeSelfieFullscreen}
    >
      <span class="sr-only">Fechar</span>
    </button>
    <div class="pointer-events-auto relative z-10 inline-block max-h-full max-w-full">
      <img
        src={selfiePreviewUrl}
        alt="Selfie com documento do corretor"
        class="max-h-[min(92vh,92vw)] max-w-[min(96vw,1200px)] select-none object-contain"
        draggable="false"
      />
      <button
        type="button"
        class="absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md ring-1 ring-gray-200 hover:bg-white dark:bg-gray-800 dark:text-white dark:ring-gray-600"
        on:click|stopPropagation={closeSelfieFullscreen}
        aria-label="Fechar visualização"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
{/if}

{#if isDocumentsModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
    role="dialog"
    aria-modal="true"
  >
    <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Documentos do corretor {selectedBroker?.name}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Visualize os arquivos enviados para validação.
          </p>
        </div>
        <button
          class="rounded-md bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          on:click={closeDocumentsModal}
          aria-label="Fechar modal de documentos"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {#if docsError}
        <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
          {docsError}
        </div>
      {:else if !selectedDocuments}
        <div class="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum documento disponível para este corretor.
        </div>
      {:else}
        {#if docErrorMessage}
          <div class="mb-4 rounded-md bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            {docErrorMessage}
          </div>
        {/if}
        <div class="grid gap-6 md:grid-cols-3">
          {#each DOCUMENT_TILES as doc}
            {@const docValue = selectedDocuments?.[doc.key] ?? null}
            <div class="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">{doc.label}</div>
              {#if docValue}
                <a
                  class="block overflow-hidden rounded-md border border-gray-200 transition-transform hover:scale-[1.02] dark:border-gray-700"
                  href={docValue ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={docValue ?? ''}
                    alt={`Documento - ${doc.label}`}
                    class="h-48 w-full object-cover"
                    loading="lazy"
                    on:error={() => markDocMissing(doc.label)}
                  />
                </a>
              {:else}
                <div class="flex h-48 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  Documento não disponível
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if isPropertiesModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
    role="dialog"
    aria-modal="true"
  >
    <div class="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Imóveis do corretor {propertiesModalTitle}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Lista dos imóveis associados a este corretor.
          </p>
        </div>
        <button
          class="rounded-md bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          on:click={closePropertiesModal}
          aria-label="Fechar modal de imóveis"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {#if propertiesLoading}
        <div class="flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Carregando imóveis...
        </div>
      {:else if propertiesError}
        <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
          {propertiesError}
        </div>
      {:else if brokerProperties.length === 0}
        <div class="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Este corretor ainda não possui imóveis cadastrados.
        </div>
      {:else}
        <ul class="space-y-4">
          {#each brokerProperties as property}
            <li class="rounded-lg border border-gray-200 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-700/60">
              <a
                href={`https://encontreaquiimoveis.app/property/${property.id}`}
                target="_blank"
                rel="noreferrer"
                class="block p-4"
              >
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{property.title ?? `Imóvel #${property.id}`}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {property.city ?? '-'}{#if property.state} / {property.state}{/if}
                    </p>
                  </div>
                  <div class="flex items-center gap-3 text-sm">
                    <span class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${propertyStatusBadge(property.status ?? null)}`}>
                      {formatPropertyStatus(property.status ?? null)}
                    </span>
                    <div class="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
                      {#each resolvePriceLines(property) as line}
                        <span class="font-medium">
                          {line.label}: {formatCurrency(line.value)}
                        </span>
                      {/each}
                    </div>
                  </div>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}
