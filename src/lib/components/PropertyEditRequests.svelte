<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';
  import { api } from '$lib/apiClient';

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
    tipoLote: 'Tipo de lote',
    city: 'Cidade',
    state: 'Estado',
    cep: 'CEP',
    bedrooms: 'Quartos',
    bathrooms: 'Banheiros',
    areaConstruida: 'Área construída',
    areaTerreno: 'Área do terreno',
    garageSpots: 'Garagens',
    hasWifi: 'Wi-Fi',
    temPiscina: 'Piscina',
    temEnergiaSolar: 'Energia solar',
    temAutomacao: 'Automação',
    temArCondicionado: 'Ar-condicionado',
    ehMobiliada: 'Mobiliada',
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
    'hasWifi',
    'temPiscina',
    'temEnergiaSolar',
    'temAutomacao',
    'temArCondicionado',
    'ehMobiliada',
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
  let rejectionReason = '';

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
    rejectionReason = '';
    isDetailLoading = true;

    try {
      selected = await api.get<PropertyEditRequest>(`/admin/property-edit-requests/${item.id}`);
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
    rejectionReason = '';
  }

  async function approveSelected() {
    if (!selected || isSubmitting) return;

    isSubmitting = true;
    try {
      await api.post(`/admin/property-edit-requests/${selected.id}/approve`, {});
      toast.success('Solicitação aprovada com sucesso.');
      closeModal();
      refreshKey += 1;
    } catch (submitError) {
      console.error('Erro ao aprovar solicitação de edição:', submitError);
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível aprovar a solicitação.'
      );
    } finally {
      isSubmitting = false;
    }
  }

  async function rejectSelected() {
    if (!selected || isSubmitting) return;
    if (rejectionReason.trim().length === 0) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }

    isSubmitting = true;
    try {
      await api.post(`/admin/property-edit-requests/${selected.id}/reject`, {
        reason: rejectionReason.trim(),
      });
      toast.success('Solicitação rejeitada com sucesso.');
      closeModal();
      refreshKey += 1;
    } catch (submitError) {
      console.error('Erro ao rejeitar solicitação de edição:', submitError);
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível rejeitar a solicitação.'
      );
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

        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead class="bg-gray-50 dark:bg-gray-900/70">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Campo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Antes</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Depois</th>
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
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="space-y-2">
          <label for="edit-request-reason" class="text-sm font-medium text-gray-700 dark:text-gray-200">
            Motivo da rejeição
          </label>
          <textarea
            id="edit-request-reason"
            bind:value={rejectionReason}
            rows={4}
            placeholder="Preencha apenas se for rejeitar."
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          ></textarea>
        </div>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" on:click={closeModal} disabled={isSubmitting}>
            Fechar
          </Button>
          <Button
            variant="destructive"
            on:click={rejectSelected}
            disabled={isSubmitting}
          >
            Rejeitar
          </Button>
          <Button on:click={approveSelected} disabled={isSubmitting}>
            Aprovar
          </Button>
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
