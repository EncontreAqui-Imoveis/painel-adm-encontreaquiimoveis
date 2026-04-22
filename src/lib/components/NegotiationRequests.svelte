<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';

  type PaymentBreakdown = {
    dinheiro: number;
    permuta: number;
    financiamento: number;
    outros: number;
  };

  type NegotiationItem = {
    id: string;
    status: string;
    internalStatus: string;
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    brokerName?: string | null;
    capturingBrokerName?: string | null;
    sellingBrokerName?: string | null;
    clientName?: string | null;
    clientCpf?: string | null;
    value?: number | null;
    validityDate?: string | null;
    payment?: PaymentBreakdown | null;
    updatedAt?: string | null;
    signedDocumentId?: number | null;
  };

  type TopProposal = {
    negotiationId: string;
    value?: number | null;
    clientName?: string | null;
    createdAt?: string | null;
  };

  type NegotiationSummaryItem = {
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    proposalCount: number;
    updatedAt?: string | null;
    topProposal?: TopProposal | null;
  };

  type PaginatedResponse<T> = {
    data?: T[];
    page?: number;
    limit?: number;
    total?: number;
    propertyId?: number;
  };

  let summaryItems: NegotiationSummaryItem[] = [];
  let summaryLoading = true;
  let hasMounted = false;
  let summaryRefreshKey = 0;
  let summaryPage = 1;
  let summaryItemsPerPage = 10;
  let summaryTotalItems = 0;
  let summaryTotalPages = 1;

  let showPropertyModal = false;
  let selectedProperty: NegotiationSummaryItem | null = null;
  let propertyRequests: NegotiationItem[] = [];
  let propertyLoading = false;
  let propertyRefreshKey = 0;
  let propertyPage = 1;
  let propertyItemsPerPage = 10;
  let propertyTotalItems = 0;
  let propertyTotalPages = 1;

  let processingAction = false;
  let selectedProposal: NegotiationItem | null = null;
  let showDetailModal = false;
  let rejectMode = false;
  let rejectReason = '';
  let viewingPdf = false;

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

  function readClientCpf(item: NegotiationItem | null): string {
    if (!item) return '-';
    const raw =
      item.clientCpf ??
      (item as unknown as Record<string, unknown>).client_cpf ??
      (item as unknown as Record<string, unknown>).cpf ??
      (item as unknown as Record<string, unknown>).client;

    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }

    if (raw && typeof raw === 'object') {
      const nestedCpf = (raw as Record<string, unknown>).cpf;
      if (typeof nestedCpf === 'string' && nestedCpf.trim().length > 0) {
        return nestedCpf.trim();
      }
    }

    return '-';
  }

  function getBrokerName(item: NegotiationItem): string {
    return item.brokerName ?? item.capturingBrokerName ?? item.sellingBrokerName ?? '-';
  }

  function getStatusLabel(status?: string, internalStatus?: string): string {
    const value = String(status ?? internalStatus ?? '').trim().toUpperCase();
    if (!value) return '-';
    if (value === 'UNDER_REVIEW' || value === 'DOCUMENTATION_PHASE') return 'Em análise';
    if (value === 'APPROVED' || value === 'IN_NEGOTIATION') return 'Aprovada';
    if (value === 'PROPOSAL_SENT') return 'Proposta enviada';
    if (value === 'PROPOSAL_DRAFT') return 'Rascunho';
    if (value === 'REJECTED') return 'Rejeitada';
    if (value === 'CANCELLED') return 'Cancelada';
    return value;
  }

  function getStatusBadgeClass(status?: string, internalStatus?: string): string {
    const value = String(status ?? internalStatus ?? '').trim().toUpperCase();
    if (value === 'APPROVED' || value === 'IN_NEGOTIATION') {
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    }
    if (value === 'REJECTED' || value === 'CANCELLED') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  }

  function requestSummaryFetch(resetPage = false) {
    if (resetPage) summaryPage = 1;
    summaryRefreshKey += 1;
  }

  function requestPropertyFetch(resetPage = false) {
    if (resetPage) propertyPage = 1;
    propertyRefreshKey += 1;
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

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  }

  function paymentLines(payment?: PaymentBreakdown | null) {
    const normalized = payment ?? {
      dinheiro: 0,
      permuta: 0,
      financiamento: 0,
      outros: 0,
    };
    return [
      { label: 'Dinheiro', value: normalized.dinheiro ?? 0 },
      { label: 'Permuta', value: normalized.permuta ?? 0 },
      { label: 'Financiamento', value: normalized.financiamento ?? 0 },
      { label: 'Outros', value: normalized.outros ?? 0 },
    ];
  }

  function clearPropertyModalState() {
    showPropertyModal = false;
    selectedProperty = null;
    propertyRequests = [];
    propertyPage = 1;
    propertyTotalItems = 0;
    propertyTotalPages = 1;
  }

  async function fetchSummary() {
    summaryLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', 'UNDER_REVIEW');
      params.set('page', String(summaryPage));
      params.set('limit', String(summaryItemsPerPage));

      const response = await api.get<PaginatedResponse<NegotiationSummaryItem>>(
        `/admin/negotiations/requests/summary?${params.toString()}`
      );

      summaryItems = Array.isArray(response?.data) ? response.data : [];
      summaryTotalItems = Number(response?.total ?? summaryItems.length);
      summaryTotalPages = Math.max(1, Math.ceil(summaryTotalItems / summaryItemsPerPage));
      if (summaryPage > summaryTotalPages) {
        summaryPage = summaryTotalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar resumo de solicitações:', error);
      toast.error('Não foi possível carregar as solicitações de propostas.');
      summaryItems = [];
      summaryTotalItems = 0;
      summaryTotalPages = 1;
    } finally {
      summaryLoading = false;
    }
  }

  async function fetchPropertyRequests(propertyId: number) {
    propertyLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', 'UNDER_REVIEW');
      params.set('page', String(propertyPage));
      params.set('limit', String(propertyItemsPerPage));

      const response = await api.get<PaginatedResponse<NegotiationItem>>(
        `/admin/negotiations/requests/property/${propertyId}?${params.toString()}`
      );

      propertyRequests = Array.isArray(response?.data) ? response.data : [];
      propertyTotalItems = Number(response?.total ?? propertyRequests.length);
      propertyTotalPages = Math.max(1, Math.ceil(propertyTotalItems / propertyItemsPerPage));
      if (propertyPage > propertyTotalPages) {
        propertyPage = propertyTotalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar propostas do imóvel:', error);
      toast.error('Não foi possível carregar as propostas deste imóvel.');
      propertyRequests = [];
      propertyTotalItems = 0;
      propertyTotalPages = 1;
    } finally {
      propertyLoading = false;
    }
  }

  function openPropertyRequests(item: NegotiationSummaryItem) {
    selectedProperty = item;
    showPropertyModal = true;
    propertyPage = 1;
    requestPropertyFetch(true);
  }

  function openProposalDetail(item: NegotiationItem) {
    selectedProposal = item;
    rejectMode = false;
    rejectReason = '';
    showDetailModal = true;
  }

  function closeDetailModal(force = false) {
    if (processingAction && !force) return;
    showDetailModal = false;
    selectedProposal = null;
    rejectMode = false;
    rejectReason = '';
  }

  function closePropertyModal() {
    if (processingAction) return;
    clearPropertyModalState();
  }

  async function viewSignedPdf() {
    if (!selectedProposal) return;
    viewingPdf = true;
    try {
      const response = await apiClient.get(
        `/admin/negotiations/${selectedProposal.id}/signed-proposal/download`,
        {
          responseType: 'blob',
        }
      );
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error('Erro ao abrir PDF assinado:', error);
      toast.error('Não foi possível abrir o PDF assinado.');
    } finally {
      viewingPdf = false;
    }
  }

  async function approveSelected() {
    if (!selectedProposal) return;
    const confirmed = window.confirm(
      'Confirma aprovação desta proposta? Esta ação encaminha a negociação para contratos.'
    );
    if (!confirmed) return;
    const proposalId = selectedProposal.id;
    processingAction = true;
    try {
      await api.put(`/admin/negotiations/${proposalId}/approve`, {});
      toast.success('Proposta aprovada com sucesso.');
      propertyRequests = propertyRequests.filter((item) => item.id !== proposalId);
      closeDetailModal(true);
      requestSummaryFetch();
      requestPropertyFetch();
    } catch (error) {
      console.error('Erro ao aprovar proposta:', error);
      toast.error('Falha ao aprovar proposta.');
    } finally {
      processingAction = false;
    }
  }

  async function rejectSelected() {
    if (!selectedProposal) return;

    if (!rejectMode) {
      rejectMode = true;
      return;
    }

    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }

    const confirmed = window.confirm(
      'Confirma rejeição desta proposta? O imóvel volta para disponível quando aplicável.'
    );
    if (!confirmed) return;

    const proposalId = selectedProposal.id;
    processingAction = true;
    try {
      await api.put(`/admin/negotiations/${proposalId}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success('Proposta rejeitada e imóvel devolvido para disponível.');
      propertyRequests = propertyRequests.filter((item) => item.id !== proposalId);
      closeDetailModal(true);
      requestSummaryFetch();
      requestPropertyFetch();
    } catch (error) {
      console.error('Erro ao rejeitar proposta:', error);
      toast.error('Falha ao rejeitar proposta.');
    } finally {
      processingAction = false;
    }
  }

  onMount(() => {
    hasMounted = true;
    requestSummaryFetch();
  });

  $: if (hasMounted) {
    summaryPage;
    summaryRefreshKey;
    fetchSummary();
  }

  $: if (hasMounted && showPropertyModal && selectedProperty) {
    propertyPage;
    propertyRefreshKey;
    fetchPropertyRequests(selectedProperty.propertyId);
  }
</script>

<svelte:options runes={false} />

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitação de Propostas</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Acompanhe imóveis com propostas assinadas e revise cada solicitação.
      </p>
    </div>
    <Button variant="outline" on:click={() => requestSummaryFetch()} disabled={summaryLoading}>
      {#if summaryLoading}
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
            Código / Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Propostas
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Melhor proposta
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Atualizado em
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ação
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if summaryLoading}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando imóveis...
            </td>
          </tr>
        {:else if summaryItems.length === 0}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma proposta aguardando análise.
            </td>
          </tr>
        {:else}
          {#each summaryItems as item (item.propertyId)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-semibold">
                  {item.propertyCode ? `${item.propertyCode}` : `#${item.propertyId}`}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? item.propertyAddress ?? '-'}
                </div>
                {#if item.propertyAddress && item.propertyTitle}
                  <div class="text-xs text-gray-500 dark:text-gray-400">{item.propertyAddress}</div>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.proposalCount} {item.proposalCount === 1 ? 'proposta' : 'propostas'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {#if item.topProposal}
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {item.topProposal.clientName ?? '-'}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(item.topProposal.value)} - {formatDate(item.topProposal.createdAt)}
                  </div>
                {:else}
                  -
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.updatedAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button size="sm" variant="outline" on:click={() => openPropertyRequests(item)}>
                  Ver propostas
                </Button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <Pagination
      bind:currentPage={summaryPage}
      totalPages={summaryTotalPages}
      totalItems={summaryTotalItems}
      itemsPerPage={summaryItemsPerPage}
    />
  </div>
</div>

{#if showPropertyModal && selectedProperty}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closePropertyModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Propostas do imóvel</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedProperty.propertyCode ? `${selectedProperty.propertyCode}` : `#${selectedProperty.propertyId}`}
            {#if selectedProperty.propertyTitle}
              - {selectedProperty.propertyTitle}
            {:else if selectedProperty.propertyAddress}
              - {selectedProperty.propertyAddress}
            {/if}
          </p>
        </div>
        <Button variant="outline" size="sm" on:click={() => requestPropertyFetch()} disabled={propertyLoading}>
          {#if propertyLoading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Atualizar
        </Button>
      </div>

      <div class="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {#if propertyLoading}
          <div class="rounded-md border border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Carregando propostas...
          </div>
        {:else if propertyRequests.length === 0}
          <div class="rounded-md border border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Nenhuma proposta pendente para este imóvel.
          </div>
        {:else}
          {#each propertyRequests as item (item.id)}
            <div class="rounded-md border border-gray-200 p-4 dark:border-gray-700">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div class="grid flex-1 gap-2 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <span class={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(item.status, item.internalStatus)}`}>
                      {getStatusLabel(item.status, item.internalStatus)}
                    </span>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cliente</p>
                    <p class="text-sm text-gray-900 dark:text-gray-100">{readClientName(item)}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{readClientCpf(item)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Corretor</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{getBrokerName(item)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Valor</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{formatDate(item.validityDate)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{getStatusLabel(item.status, item.internalStatus)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Data</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{formatDate(item.updatedAt)}</p>
                  </div>
                </div>
                <div class="flex items-start">
                  <Button size="sm" variant="outline" on:click={() => openProposalDetail(item)}>
                    Ver detalhes
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="mt-4">
        <Pagination
          bind:currentPage={propertyPage}
          totalPages={propertyTotalPages}
          totalItems={propertyTotalItems}
          itemsPerPage={propertyItemsPerPage}
        />
      </div>

      <div class="mt-5 flex justify-end">
        <Button variant="outline" on:click={closePropertyModal} disabled={processingAction}>
          Fechar
        </Button>
      </div>
    </div>
  </div>
{/if}

{#if showDetailModal && selectedProposal}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeDetailModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Análise da proposta</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedProposal.propertyCode
              ? `${selectedProposal.propertyCode}`
              : `#${selectedProposal.propertyId}`}
            {#if selectedProposal.propertyTitle}
              - {selectedProposal.propertyTitle}
            {/if}
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cliente</p>
          <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{readClientName(selectedProposal)}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{readClientCpf(selectedProposal)}</p>
        </div>
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</p>
          <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {formatDate(selectedProposal.validityDate)}
          </p>
        </div>
      </div>

      <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
        <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Condições de pagamento</p>
        <div class="mt-2 grid gap-2 sm:grid-cols-2">
          {#each paymentLines(selectedProposal.payment) as item (item.label)}
            <div class="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <span class="font-semibold">{item.label}:</span> {formatCurrency(item.value)}
            </div>
          {/each}
        </div>
        <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Valor total: {formatCurrency(selectedProposal.value)}
        </p>
      </div>

      {#if rejectMode}
        <div class="mt-4">
          <label
            for="reject-reason"
            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Motivo da rejeição
          </label>
          <textarea
            id="reject-reason"
            bind:value={rejectReason}
            maxlength="500"
            rows={4}
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            placeholder="Descreva o motivo da rejeição..."
          ></textarea>
        </div>
      {/if}

      <div class="mt-5 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" on:click={viewSignedPdf} disabled={viewingPdf || processingAction}>
          {#if viewingPdf}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Visualizar PDF Assinado
        </Button>
        <Button
          variant="destructive"
          className="bg-red-600 text-white hover:bg-red-700"
          on:click={rejectSelected}
          disabled={processingAction}
        >
          {#if processingAction && rejectMode}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          {rejectMode ? 'Confirmar Rejeição' : 'Rejeitar'}
        </Button>
        <Button
          variant="outline"
          className="bg-green-600 text-white hover:bg-green-700"
          on:click={approveSelected}
          disabled={processingAction}
        >
          {#if processingAction && !rejectMode}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Aprovar
        </Button>
      </div>
    </div>
  </div>
{/if}
