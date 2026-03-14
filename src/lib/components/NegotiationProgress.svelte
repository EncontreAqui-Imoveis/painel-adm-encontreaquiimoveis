<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';

  type NegotiationItem = {
    id: string;
    status: string;
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    brokerName?: string | null;
    clientName?: string | null;
    clientCpf?: string | null;
    value?: number | null;
    approvedAt?: string | null;
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

  function closeCancelModal(force = false) {
    if (processing && !force) return;
    showConfirm = false;
    selected = null;
    cancelReason = '';
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
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando negociações em andamento...
            </td>
          </tr>
        {:else if negotiations.length === 0}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma negociação em andamento.
            </td>
          </tr>
        {:else}
          {#each negotiations as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
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
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-red-600 text-white hover:bg-red-700"
                  on:click={() => openCancelModal(item)}
                >
                  Voltar para Disponível
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
          placeholder="Digite o motivo do cancelamento (Ex: Cliente não obteve financiamento)..."
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
