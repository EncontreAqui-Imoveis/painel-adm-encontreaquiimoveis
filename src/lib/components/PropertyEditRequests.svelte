<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';
  import { api } from '$lib/apiClient';
  import { extractApiErrorMessage } from '$lib/components/create-property-helpers';

  function getRequestIdFromError(error: unknown): string {
    const requestId = (error as { requestId?: unknown })?.requestId;
    if (typeof requestId === 'string' && requestId.trim()) {
      return requestId.trim();
    }

    const response = (error as {
      response?: {
        data?: { requestId?: unknown; request_id?: unknown };
        headers?: unknown;
      };
    })?.response;

    const payloadRequestId =
      typeof response?.data?.requestId === 'string'
        ? response.data.requestId.trim()
        : typeof response?.data?.request_id === 'string'
          ? response.data.request_id.trim()
          : '';
    if (payloadRequestId) return payloadRequestId;

    const headers = response?.headers;
    if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
      const headerMap = headers as Record<string, unknown>;
      const rawHeader = headerMap['x-request-id'] ?? headerMap['X-Request-Id'];
      if (typeof rawHeader === 'string' && rawHeader.trim()) return rawHeader.trim();
      if (Array.isArray(rawHeader) && rawHeader[0]) {
        const value = String(rawHeader[0]).trim();
        if (value) return value;
      }
    }

    return '';
  }

  function formatApiErrorMessage(error: unknown, fallback: string): string {
    const message = extractApiErrorMessage(error, fallback);
    const requestId = getRequestIdFromError(error);
    return requestId ? `${message} (requestId: ${requestId})` : message;
  }

  interface PropertyEditRequest {
    id: number;
    propertyId: number;
    propertyTitle?: string | null;
    propertyCode?: string | null;
    requesterUserId: number;
    requesterRole: string;
    requesterName?: string | null;
    status: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    diff: Record<string, { before: unknown; after: unknown }>;
    fieldReviews?: Record<string, { decision?: string; reason?: string | null }>;
    reviewReason?: string | null;
    reviewedBy?: number | null;
    reviewedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }

  const fieldLabels: Record<string, string> = {
    title: 'Título',
    description: 'Descrição',
    type: 'Tipo',
    marketStage: 'Lançamento',
    purpose: 'Finalidade',
    code: 'Código',
    ownerName: 'Nome do proprietário',
    ownerPhone: 'Telefone do proprietário',
    address: 'Endereço',
    quadra: 'Quadra',
    lote: 'Lote',
    numero: 'Número',
    bairro: 'Bairro',
    complemento: 'Complemento',
    semCep: 'Sem CEP',
    city: 'Cidade',
    state: 'Estado',
    cep: 'CEP',
    bedrooms: 'Quartos',
    bathrooms: 'Banheiros',
    areaConstruida: 'Área construída',
    areaTerreno: 'Área do terreno',
    garageSpots: 'Garagens',
    amenities: 'Comodidades',
    valorCondominio: 'Condomínio',
    priceSale: 'Preço de venda',
    priceRent: 'Preço de aluguel',
    isPromoted: 'Promoção ativa',
    promotionPercentage: '% Promoção',
    promotionPrice: 'Preço promocional venda',
    promotionalRentPrice: 'Preço promocional aluguel',
    promotionalRentPercentage: '% Promoção aluguel',
    promotionStart: 'Início da promoção',
    promotionEnd: 'Fim da promoção',
  };

  const currencyFields = new Set([
    'valorCondominio',
    'priceSale',
    'priceRent',
    'promotionPrice',
    'promotionalRentPrice',
  ]);

  const percentageFields = new Set([
    'promotionPercentage',
    'promotionalRentPercentage',
  ]);

  const booleanFields = new Set([
    'isPromoted',
  ]);

  let items: PropertyEditRequest[] = [];
  let isLoading = false;
  let error: string | null = null;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let refreshKey = 0;
  let hasMounted = false;

  let showModal = false;
  let selected: PropertyEditRequest | null = null;
  let isDetailLoading = false;
  let isSubmitting = false;
  let canSubmitPartialReview = false;
  let bulkRejectReason = '';
  let draftFieldReviews: Record<
    string,
    { decision: 'UNDECIDED' | 'APPROVED' | 'REJECTED'; reason: string }
  > = {};
  let diffEntries: Array<{ key: string; before: unknown; after: unknown }> = [];
  let reviewPendingItems: Array<{ key: string; label: string; message: string }> = [];

  onMount(() => {
    hasMounted = true;
    fetchRequests();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    refreshKey;
    fetchRequests();
  }

  $: diffEntries =
    selected == null
      ? []
      : Object.entries(selected.diff ?? {}).map(([key, value]) => ({
          key,
          before: value.before,
          after: value.after,
        }));

  $: if (selected && diffEntries.length > 0) {
    const missingKeys = diffEntries.some(({ key }) => draftFieldReviews[key] == null);
    if (missingKeys) {
      draftFieldReviews = syncDraftFieldReviews(selected, draftFieldReviews);
    }
  }

  $: reviewPendingItems = buildReviewPendingItems();
  $: canSubmitPartialReview = evaluateCanSubmitReview();

  async function fetchRequests() {
    isLoading = true;
    error = null;

    try {
      const response = await api.get<{
        data?: PropertyEditRequest[];
        total?: number;
      }>(
        `/admin/property-edit-requests?status=PENDING&page=${currentPage}&limit=${itemsPerPage}`
      );
      items = Array.isArray(response?.data) ? response.data : [];
      totalItems = Number(response?.total ?? items.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (loadError) {
      console.error('Erro ao carregar solicitações de edição:', loadError);
      items = [];
      error =
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar as solicitações de edição.';
    } finally {
      isLoading = false;
    }
  }

  function requestTitle(item: PropertyEditRequest) {
    return item.propertyCode ? `${item.propertyCode} · ${item.propertyTitle ?? '-'}` : item.propertyTitle ?? `Imóvel #${item.propertyId}`;
  }

  function changedFieldsCount(item: PropertyEditRequest) {
    return Object.keys(item.diff ?? {}).length;
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('pt-BR');
  }

  function formatValue(key: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (key === 'marketStage') {
      return String(value).trim().toUpperCase() === 'LAUNCH' ? 'Sim' : 'Não';
    }
    if (booleanFields.has(key)) {
      return value === true ? 'Sim' : value === false ? 'Não' : String(value);
    }
    if (currencyFields.has(key) && typeof value === 'number') {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    if (percentageFields.has(key) && typeof value === 'number') {
      return `${value}%`;
    }
    if ((key === 'promotionStart' || key === 'promotionEnd') && typeof value === 'string') {
      return formatDate(value);
    }
    return String(value);
  }

  async function openRequest(item: PropertyEditRequest) {
    showModal = true;
    selected = null;
    bulkRejectReason = '';
    draftFieldReviews = {};
    isDetailLoading = true;

    try {
      selected = await api.get<PropertyEditRequest>(`/admin/property-edit-requests/${item.id}`);
      draftFieldReviews = buildDraftFieldReviews(selected);
    } catch (loadError) {
      console.error('Erro ao carregar detalhe da solicitação:', loadError);
      toast.error('Não foi possível carregar os detalhes da solicitação.');
      showModal = false;
    } finally {
      isDetailLoading = false;
    }
  }

  function closeModal() {
    if (isSubmitting) return;
    showModal = false;
    selected = null;
    bulkRejectReason = '';
    draftFieldReviews = {};
  }

  function buildDraftFieldReviews(request: PropertyEditRequest) {
    const next: Record<
      string,
      { decision: 'UNDECIDED' | 'APPROVED' | 'REJECTED'; reason: string }
    > = {};

    for (const key of Object.keys(request.diff ?? {})) {
      const current = request.fieldReviews?.[key];
      const decision = String(current?.decision ?? '').trim().toUpperCase();
      next[key] = {
        decision:
          decision === 'APPROVED' || decision === 'REJECTED'
            ? (decision as 'APPROVED' | 'REJECTED')
            : 'UNDECIDED',
        reason: String(current?.reason ?? '').trim(),
      };
    }

    return next;
  }

  function syncDraftFieldReviews(
    request: PropertyEditRequest,
    current: Record<string, { decision: 'UNDECIDED' | 'APPROVED' | 'REJECTED'; reason: string }>
  ) {
    const seeded = buildDraftFieldReviews(request);
    for (const [key, value] of Object.entries(current)) {
      if (seeded[key]) {
        seeded[key] = {
          decision: value.decision,
          reason: value.reason,
        };
      }
    }
    return seeded;
  }

  function getRelevantReviewKeys() {
    const keys = diffEntries.map((entry) => entry.key);
    return Array.from(new Set(keys));
  }

  function getFieldReviewByKey(key: string) {
    const current = draftFieldReviews[key];
    return {
      decision: current?.decision ?? 'UNDECIDED',
      reason: current?.reason ?? '',
    };
  }

  function updateFieldDecision(
    key: string,
    decision: 'UNDECIDED' | 'APPROVED' | 'REJECTED'
  ) {
    const current = getFieldReviewByKey(key);
    draftFieldReviews = {
      ...draftFieldReviews,
      [key]: {
        decision,
        reason: current.reason,
      },
    };
  }

  function updateFieldReason(key: string, reason: string) {
    const current = getFieldReviewByKey(key);
    draftFieldReviews = {
      ...draftFieldReviews,
      [key]: {
        decision: current.decision,
        reason,
      },
    };
  }

  function markAllFields(decision: 'APPROVED' | 'REJECTED') {
    const next = { ...draftFieldReviews };
    for (const key of getRelevantReviewKeys()) {
      const current = getFieldReviewByKey(key);
      next[key] = {
        decision,
        reason: current.reason,
      };
    }
    draftFieldReviews = next;
  }

  function reviewCount(decision: 'APPROVED' | 'REJECTED') {
    return getRelevantReviewKeys().filter((key) => getFieldReviewByKey(key).decision === decision).length;
  }

  function buildReviewPendingItems() {
    if (!selected || diffEntries.length === 0) return [];

    const pending: Array<{ key: string; label: string; message: string }> = [];

    for (const key of getRelevantReviewKeys()) {
      const field = getFieldReviewByKey(key);
      const label = fieldLabels[key] ?? key;
      if (field.decision === 'UNDECIDED') {
        pending.push({
          key,
          label,
          message: `${label}: selecione Aprovar ou Rejeitar.`,
        });
        continue;
      }
      if (field.decision === 'REJECTED' && field.reason.trim().length === 0) {
        pending.push({
          key,
          label,
          message: `${label}: informe o motivo da rejeição.`,
        });
      }
    }

    return pending;
  }

  function evaluateCanSubmitReview() {
    return selected != null && diffEntries.length > 0 && reviewPendingItems.length === 0;
  }

  async function submitReview() {
    if (!selected || isSubmitting) return;
    if (reviewPendingItems.length > 0) {
      const details = reviewPendingItems
        .slice(0, 2)
        .map((item) => item.message)
        .join(' ');
      toast.error(`Revise os campos pendentes antes de concluir. ${details}`);
      return;
    }

    const fieldReviews = Object.fromEntries(
      getRelevantReviewKeys().map((key) => {
        const value = getFieldReviewByKey(key);
        return [
          key,
          {
            decision: value.decision,
            ...(value.decision === 'REJECTED'
              ? { reason: value.reason.trim() }
              : {}),
          },
        ];
      })
    );

    isSubmitting = true;
    try {
      const response = await api.post<{ status?: string; data?: { status?: string } }>(
        `/admin/property-edit-requests/${selected.id}/review`,
        { fieldReviews }
      );
      const responsePayload = response as
        | { status?: string; data?: { status?: string } }
        | undefined;
      const resolvedStatus = String(
        responsePayload?.status ?? responsePayload?.data?.status ?? ''
      ).trim().toUpperCase();
      toast.success(
        resolvedStatus === 'PARTIALLY_APPROVED'
          ? 'Solicitação revisada com aprovação parcial.'
          : resolvedStatus === 'REJECTED'
          ? 'Solicitação rejeitada com sucesso.'
          : 'Solicitação aprovada com sucesso.'
      );
      closeModal();
      refreshKey += 1;
    } catch (submitError) {
      console.error('Erro ao revisar solicitação de edição:', submitError);
      toast.error(formatApiErrorMessage(submitError, 'Não foi possível concluir a revisão.'));
    } finally {
      isSubmitting = false;
    }
  }

  async function submitBulkReview(mode: 'approve_all' | 'reject_all') {
    if (!selected || isSubmitting) return;
    if (mode === 'reject_all' && bulkRejectReason.trim().length === 0) {
      toast.error('Informe um motivo para rejeitar toda a solicitação.');
      return;
    }

    isSubmitting = true;
    try {
      const response = await api.post<{ status?: string; data?: { status?: string } }>(
        `/admin/property-edit-requests/${selected.id}/${mode === 'approve_all' ? 'approve' : 'reject'}`,
        mode === 'reject_all' ? { reason: bulkRejectReason.trim() } : {}
      );
      const responsePayload = response as
        | { status?: string; data?: { status?: string } }
        | undefined;
      const resolvedStatus = String(
        responsePayload?.status ?? responsePayload?.data?.status ?? ''
      ).trim().toUpperCase();
      toast.success(
        resolvedStatus === 'REJECTED'
          ? 'Solicitação rejeitada com sucesso.'
          : 'Solicitação aprovada com sucesso.'
      );
      closeModal();
      refreshKey += 1;
    } catch (submitError) {
      console.error('Erro ao concluir revisão em massa:', submitError);
      toast.error(formatApiErrorMessage(submitError, 'Não foi possível concluir a revisão.'));
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-sm text-gray-600 dark:text-gray-300">
      Fila de pedidos de edição aguardando aprovação.
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="property-edit-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="property-edit-items-per-page"
        bind:value={itemsPerPage}
        on:change={() => (currentPage = 1)}
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      <span>entradas</span>
    </div>
  </div>

  {#if isLoading}
    <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
      Carregando solicitações de edição...
    </div>
  {:else if error}
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {error}
    </div>
  {:else if items.length === 0}
    <div class="rounded-md border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Nenhuma solicitação pendente</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Quando alguém pedir edição de um imóvel, ela aparece aqui para revisão.
      </p>
    </div>
  {:else}
    <div class="space-y-3 md:hidden">
      {#each items as item}
        <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">{requestTitle(item)}</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Solicitante: {item.requesterName ?? `Usuário #${item.requesterUserId}`}
              </p>
            </div>
            <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {changedFieldsCount(item)} mudança(s)
            </span>
          </div>
          <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Enviado em {formatDate(item.createdAt)}
          </p>
          <div class="mt-4 flex justify-end">
            <Button variant="outline" size="sm" on:click={() => openRequest(item)}>
              Revisar edição
            </Button>
          </div>
        </article>
      {/each}
    </div>

    <div class="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 md:block">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-900/70">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Imóvel</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Solicitante</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mudanças</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Data</th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          {#each items as item}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-semibold">{requestTitle(item)}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">ID da solicitação: {item.id}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.requesterName ?? `Usuário #${item.requesterUserId}`}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {changedFieldsCount(item)} mudança(s)
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.createdAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button variant="outline" size="sm" on:click={() => openRequest(item)}>
                  Revisar edição
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

<Dialog.Root bind:open={showModal}>
  <Dialog.Content className="max-h-[85vh] overflow-y-auto max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:px-4 max-sm:py-6">
    {#if isDetailLoading}
      <div class="flex min-h-[240px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        Carregando comparação...
      </div>
    {:else if selected}
      <Dialog.Header>
        <Dialog.Title>{requestTitle(selected)}</Dialog.Title>
        <Dialog.Description>
          Solicitação enviada por {selected.requesterName ?? `Usuário #${selected.requesterUserId}`}
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 px-1 py-4">
        <div class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
          Compare o que mudou antes de aprovar. Somente os campos alterados aparecem abaixo.
        </div>

        <div class="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Ação rápida da solicitação inteira
              </div>
              <div class="text-xs text-emerald-800/90 dark:text-emerald-200/90">
                Use isso quando decisão vale para todos os campos. Revisão campo a campo continua disponível abaixo.
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" on:click={() => submitBulkReview('approve_all')} disabled={isSubmitting}>
                Aprovar solicitação inteira
              </Button>
              <Button variant="destructive" size="sm" on:click={() => submitBulkReview('reject_all')} disabled={isSubmitting || bulkRejectReason.trim().length === 0}>
                Rejeitar solicitação inteira
              </Button>
            </div>
          </div>
          <textarea
            rows={3}
            placeholder="Motivo obrigatório para rejeitar toda a solicitação"
            class="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-emerald-900 dark:bg-gray-900 dark:text-gray-100"
            bind:value={bulkRejectReason}
            disabled={isSubmitting}
          ></textarea>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-200">
            Aprovados: {reviewCount('APPROVED')}
          </span>
          <span class="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-200">
            Rejeitados: {reviewCount('REJECTED')}
          </span>
          <span class="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Pendentes: {reviewPendingItems.length}
          </span>
          <div class="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" on:click={() => markAllFields('APPROVED')} disabled={isSubmitting}>
              Aprovar tudo
            </Button>
            <Button variant="outline" size="sm" on:click={() => markAllFields('REJECTED')} disabled={isSubmitting}>
              Rejeitar tudo
            </Button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead class="bg-gray-50 dark:bg-gray-900/70">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Campo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Antes</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Depois</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Revisão</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              {#each diffEntries as entry}
                <tr>
                  <td class="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {fieldLabels[entry.key] ?? entry.key}
                  </td>
                  <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {formatValue(entry.key, entry.before)}
                  </td>
                  <td class="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {formatValue(entry.key, entry.after)}
                  </td>
                  <td class="px-4 py-3">
                    <div class="space-y-2">
                      <div class="flex flex-wrap gap-2">
                        <button
                          type="button"
                          class={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            draftFieldReviews[entry.key]?.decision === 'APPROVED'
                              ? 'bg-green-600 text-white'
                              : 'border border-green-200 bg-white text-green-700 dark:border-green-800 dark:bg-gray-900 dark:text-green-300'
                          }`}
                          on:click={() => updateFieldDecision(entry.key, 'APPROVED')}
                          disabled={isSubmitting}
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          class={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            draftFieldReviews[entry.key]?.decision === 'REJECTED'
                              ? 'bg-red-600 text-white'
                              : 'border border-red-200 bg-white text-red-700 dark:border-red-800 dark:bg-gray-900 dark:text-red-300'
                          }`}
                          on:click={() => updateFieldDecision(entry.key, 'REJECTED')}
                          disabled={isSubmitting}
                        >
                          Rejeitar
                        </button>
                      </div>
                      {#if draftFieldReviews[entry.key]?.decision === 'REJECTED'}
                        {@const missingReason =
                          (draftFieldReviews[entry.key]?.reason ?? '').trim().length === 0}
                        <textarea
                          rows={3}
                          placeholder="Motivo da Alteração"
                          class={`w-full rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 ${
                            missingReason
                              ? 'border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200 dark:border-red-700 dark:bg-red-950/20 dark:text-red-200'
                              : 'border-gray-300 dark:border-gray-700'
                          }`}
                          value={draftFieldReviews[entry.key]?.reason ?? ''}
                          on:input={(event) =>
                            updateFieldReason(
                              entry.key,
                              (event.currentTarget as HTMLTextAreaElement).value
                            )}
                        ></textarea>
                        {#if missingReason}
                          <p class="text-xs font-medium text-red-600 dark:text-red-300">
                            O motivo é obrigatório para manter o histórico de auditoria
                          </p>
                        {/if}
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" on:click={closeModal} disabled={isSubmitting}>
            Fechar
          </Button>
          {#if reviewPendingItems.length > 0}
            <div class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div class="font-semibold">Pendências para concluir revisão:</div>
              <ul class="mt-1 list-disc pl-5">
                {#each reviewPendingItems as pending}
                  <li>{pending.message}</li>
                {/each}
              </ul>
            </div>
          {/if}
          <button
            type="button"
            class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:has-[.animate-spin]:cursor-wait bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-400 disabled:text-white/60"
            on:click={submitReview}
            disabled={isSubmitting}
          >
            Concluir revisão
          </button>
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
