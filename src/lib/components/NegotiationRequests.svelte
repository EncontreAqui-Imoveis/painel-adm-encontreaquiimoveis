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

  let requests: NegotiationItem[] = [];
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let processingAction = false;
  let selected: NegotiationItem | null = null;
  let showModal = false;
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

  function requestFetch(resetPage = false) {
    if (resetPage) currentPage = 1;
    refreshKey += 1;
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

  async function fetchRequests() {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', 'UNDER_REVIEW');
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));

      const response = await api.get<{ data?: NegotiationItem[]; total?: number } | NegotiationItem[]>(
        `/admin/negotiations?${params.toString()}`
      );

      const data = Array.isArray(response) ? response : response?.data;
      requests = Array.isArray(data) ? data : [];
      totalItems = Number((response as { total?: number })?.total ?? requests.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações de propostas:', error);
      toast.error('Não foi possível carregar as solicitações de propostas.');
      requests = [];
    } finally {
      isLoading = false;
    }
  }

  function openAnalysis(item: NegotiationItem) {
    console.log('Negotiation Item:', item);
    selected = item;
    rejectMode = false;
    rejectReason = '';
    showModal = true;
  }

  function closeModal(force = false) {
    if (processingAction && !force) return;
    showModal = false;
    selected = null;
    rejectMode = false;
    rejectReason = '';
  }

  async function viewSignedPdf() {
    if (!selected) return;
    viewingPdf = true;
    try {
      const response = await apiClient.get(`/admin/negotiations/${selected.id}/signed-proposal/download`, {
        responseType: 'blob',
      });
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
    if (!selected) return;
    processingAction = true;
    try {
      await api.put(`/admin/negotiations/${selected.id}/approve`, {});
      toast.success('Proposta aprovada com sucesso.');
      requests = requests.filter((item) => item.id !== selected!.id);
      closeModal(true);
      requestFetch();
    } catch (error) {
      console.error('Erro ao aprovar proposta:', error);
      toast.error('Falha ao aprovar proposta.');
    } finally {
      processingAction = false;
    }
  }

  async function rejectSelected() {
    if (!selected) return;

    if (!rejectMode) {
      rejectMode = true;
      return;
    }

    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }

    processingAction = true;
    try {
      await api.put(`/admin/negotiations/${selected.id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success('Proposta rejeitada e imóvel devolvido para disponível.');
      requests = requests.filter((item) => item.id !== selected!.id);
      closeModal(true);
      requestFetch();
    } catch (error) {
      console.error('Erro ao rejeitar proposta:', error);
      toast.error('Falha ao rejeitar proposta.');
    } finally {
      processingAction = false;
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
    fetchRequests();
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitação de Propostas</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Revise propostas assinadas e decida entre aprovar ou rejeitar.
      </p>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="negotiation-requests-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="negotiation-requests-items-per-page"
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
            Código / Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Corretor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Cliente
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Valor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ação
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if isLoading}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando propostas...
            </td>
          </tr>
        {:else if requests.length === 0}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma proposta aguardando análise.
            </td>
          </tr>
        {:else}
          {#each requests as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-semibold">
                  {item.propertyCode ? `${item.propertyCode}` : `#${item.propertyId}`}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? item.propertyAddress ?? '-'}
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
                {formatDate(item.updatedAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button size="sm" variant="outline" on:click={() => openAnalysis(item)}>
                  Analisar
                </Button>
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
    <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Análise da proposta
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selected.propertyCode ? `${selected.propertyCode}` : `#${selected.propertyId}`}
            {#if selected.propertyTitle}
              {' - '}{selected.propertyTitle}
            {/if}
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cliente</p>
          <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{readClientName(selected)}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{readClientCpf(selected)}</p>
        </div>
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</p>
          <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(selected.validityDate)}</p>
        </div>
      </div>

      <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
        <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Condições de pagamento</p>
        <div class="mt-2 grid gap-2 sm:grid-cols-2">
          {#each paymentLines(selected.payment) as item}
            <div class="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <span class="font-semibold">{item.label}:</span> {formatCurrency(item.value)}
            </div>
          {/each}
        </div>
        <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Valor total: {formatCurrency(selected.value)}
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
