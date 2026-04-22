<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import BrokerReviewModal from '$lib/components/BrokerReviewModal.svelte';
  import Pagination from '$lib/Pagination.svelte';
  import type { Broker } from '$lib/types';

  let requests: Broker[] = [];
  let isLoading = true;
  let isModalOpen = false;
  let selectedBroker: Broker | null = null;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let fetchKey = 0;
  let hasMounted = false;

  function requestFetch(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }
    fetchKey += 1;
  }

  async function fetchRequests() {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      params.append('status', 'pending_verification');
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));
      const response = await api.get<{ data?: Broker[]; total?: number } | Broker[]>(
        `/admin/brokers?${params.toString()}`
      );
      const list = Array.isArray(response) ? response : response?.data;
      requests = Array.isArray(list) ? list : [];
      totalItems = Number((response as { total?: number })?.total ?? requests.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao buscar solicitações de corretores:', error);
      toast.error('Erro ao carregar solicitações.');
      requests = [];
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    hasMounted = true;
    requestFetch();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    fetchKey;
    fetchRequests();
  }

  function reviewBroker(broker: Broker) {
    selectedBroker = broker;
    isModalOpen = true;
  }

  function handleBrokerReviewUpdate(event: CustomEvent<{ brokerId: number; status: string }>) {
    const brokerId = Number(event.detail?.brokerId);
    const nextStatus = String(event.detail?.status ?? '').trim();
    if (Number.isFinite(brokerId) && brokerId > 0) {
      requests = requests.filter((broker) =>
        broker.id !== brokerId || nextStatus === 'pending_verification'
      );
      totalItems = Math.max(0, totalItems - (nextStatus === 'pending_verification' ? 0 : 1));
      totalPages = Math.max(1, Math.ceil(Math.max(totalItems, requests.length) / itemsPerPage));
    }
    requestFetch();
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitações de Corretores</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Aprove ou rejeite corretores pendentes diretamente nesta caixa de entrada.
      </p>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="broker-requests-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="broker-requests-items-per-page"
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
            Corretor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Email
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Criado em
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ações
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if isLoading}
          <tr>
            <td colspan="4" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando solicitações...
            </td>
          </tr>
        {:else if requests.length === 0}
          <tr>
            <td colspan="4" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma solicitação pendente.
            </td>
          </tr>
        {:else}
          {#each requests as broker (broker.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                {broker.name}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{broker.email}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {new Date(broker.created_at).toLocaleDateString('pt-BR')}
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-2">
                  <Button variant="outline" size="sm" on:click={() => reviewBroker(broker)}>
                    Revisar
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

<BrokerReviewModal
  bind:open={isModalOpen}
  broker={selectedBroker}
  showApprove={true}
  on:update={handleBrokerReviewUpdate}
  on:close={() => (selectedBroker = null)}
/>
