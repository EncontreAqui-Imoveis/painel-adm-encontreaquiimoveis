<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';
  import { extractApiErrorMessage } from '$lib/components/create-property-helpers';

  type PropertyRequest = {
    id: number;
    title: string;
    broker_name?: string | null;
    broker_phone?: string | null;
    broker_id?: number | null;
    broker_status?: string | null;
    city?: string | null;
    bairro?: string | null;
    state?: string | null;
    created_at?: string;
  };

  let requests: PropertyRequest[] = [];
  let isLoading = true;
  let processing: Record<number, boolean> = {};
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let fetchKey = 0;
  let hasMounted = false;
  let rejectDialogOpen = false;
  let rejectObservation = '';
  let rejectObservationError: string | null = null;
  let selectedRejectId: number | null = null;

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
      params.append('status', 'pending_approval');
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));
      const response = await api.get<{ data?: PropertyRequest[]; total?: number } | PropertyRequest[]>(
        `/admin/properties-with-brokers?${params.toString()}`
      );
      const list = Array.isArray(response) ? response : response?.data;
      requests = Array.isArray(list) ? list : [];
      totalItems = Number((response as { total?: number })?.total ?? requests.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações de imóveis:', error);
      toast.error('Erro ao carregar solicitações de imóveis.');
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

  async function handleStatusUpdate(propertyId: number, newStatus: 'approved' | 'rejected') {
    if (newStatus === 'rejected') {
      selectedRejectId = propertyId;
      rejectObservation = '';
      rejectObservationError = null;
      rejectDialogOpen = true;
      return;
    }
    processing = { ...processing, [propertyId]: true };
    try {
      await api.patch(`/admin/properties/${propertyId}/approve`, {});
      toast.success('Imóvel aprovado.');
      requests = requests.filter((property) => property.id !== propertyId);
    } catch (error) {
      console.error('Erro ao atualizar status do imóvel:', error);
      toast.error(extractApiErrorMessage(error, 'Falha ao atualizar o status.'));
    } finally {
      processing = { ...processing, [propertyId]: false };
    }
  }

  async function confirmReject() {
    const propertyId = selectedRejectId;
    if (propertyId == null) {
      rejectDialogOpen = false;
      return;
    }

    const reason = rejectObservation.trim();
    if (!reason) {
      rejectObservationError = 'Informe a observação da rejeição.';
      return;
    }

    processing = { ...processing, [propertyId]: true };
    rejectObservationError = null;
    try {
      await api.patch(`/admin/properties/${propertyId}/reject`, { reason });
      toast.success('Imóvel rejeitado e removido.');
      requests = requests.filter((property) => property.id !== propertyId);
      rejectDialogOpen = false;
      selectedRejectId = null;
      rejectObservation = '';
    } catch (error) {
      console.error('Erro ao rejeitar o imóvel:', error);
      toast.error(extractApiErrorMessage(error, 'Falha ao rejeitar o imóvel.'));
    } finally {
      processing = { ...processing, [propertyId]: false };
    }
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitações de Imóveis</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Aprove ou rejeite imóveis pendentes diretamente nesta caixa de entrada.
      </p>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="property-requests-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="property-requests-items-per-page"
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
            Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Anunciante
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Telefone
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Bairro / Cidade
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ações
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if isLoading}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando solicitações...
            </td>
          </tr>
        {:else if requests.length === 0}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma solicitação pendente.
            </td>
          </tr>
        {:else}
          {#each requests as property (property.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                {property.title}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                <div class="flex flex-col gap-1">
                  <span>{property.broker_name ?? 'Desconhecido'}</span>
                  <span class="w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {property.broker_id ? 'Corretor' : 'Cliente'}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {property.broker_phone ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {property.bairro ?? '-'}
                {#if property.city}
                  {' - '}{property.city}
                {/if}
                {#if property.state}
                  / {property.state}
                {/if}
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    on:click={() => handleStatusUpdate(property.id, 'rejected')}
                    disabled={processing[property.id]}
                  >
                    {#if processing[property.id]}
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {/if}
                    Rejeitar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    on:click={() => handleStatusUpdate(property.id, 'approved')}
                    disabled={processing[property.id]}
                  >
                    {#if processing[property.id]}
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {/if}
                    Aprovar
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

{#if rejectDialogOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Rejeitar imóvel</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Informe uma observação para justificar a rejeição.
        </p>
      </div>
      <label class="mt-4 block">
        <span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Observação</span>
        <textarea
          rows="4"
          maxlength="500"
          bind:value={rejectObservation}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Explique o motivo da rejeição"
        ></textarea>
      </label>
      {#if rejectObservationError}
        <p class="mt-2 text-sm text-red-600 dark:text-red-300">{rejectObservationError}</p>
      {/if}
      <div class="mt-6 flex justify-end gap-2">
        <Button
          variant="outline"
          on:click={() => {
            rejectDialogOpen = false;
            selectedRejectId = null;
            rejectObservation = '';
            rejectObservationError = null;
          }}
        >
          Cancelar
        </Button>
        <Button variant="destructive" on:click={confirmReject}>
          Rejeitar
        </Button>
      </div>
    </div>
  </div>
{/if}
