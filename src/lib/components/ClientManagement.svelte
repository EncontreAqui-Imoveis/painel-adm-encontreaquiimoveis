<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { api } from '$lib/apiClient';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import Pagination from '$lib/Pagination.svelte';
  import type { PropertyStatus } from '$lib/types';

  type Client = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    created_at?: string;
  };

  type ClientDetail = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    bairro?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    created_at?: string;
  };

  type ClientProperty = {
    id: number;
    title: string;
    status: PropertyStatus;
    created_at?: string | null;
  };

  type SortConfig = {
    key: string;
    order: 'asc' | 'desc';
  };

  type ClientFilters = {
    search: string;
  };

  let clients: Client[] = [];
  let isLoading = true;
  let error = '';
  let filters: ClientFilters = { search: '' };
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let fetchKey = 0;
  let hasMounted = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let sortConfig: SortConfig = { key: 'created_at', order: 'desc' };
  let isModalOpen = false;
  let selectedClient: Client | null = null;
  let clientDetail: ClientDetail | null = null;
  let isClientDetailLoading = false;
  let clientDetailError: string | null = null;
  let isPropertiesModalOpen = false;
  let selectedClientForProperties: Client | null = null;
  let clientProperties: ClientProperty[] = [];
  let isPropertiesLoading = false;
  let propertiesError: string | null = null;
  let isProcessing = false;

  function requestFetch(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }
    fetchKey += 1;
  }

  async function fetchClients() {
    isLoading = true;
    error = '';

    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }
      params.append('sortBy', sortConfig.key);
      params.append('sortOrder', sortConfig.order);

      const response = await api.get<{ data?: Client[]; total?: number } | Client[]>(
        `/admin/users?${params.toString()}`
      );
      const list = Array.isArray(response) ? response : response?.data;
      clients = Array.isArray(list) ? list : [];
      totalItems = Number((response as { total?: number })?.total ?? clients.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      error = err instanceof Error ? err.message : 'Não foi possível carregar os clientes.';
      clients = [];
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
    fetchClients();
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

  function formatDate(value?: string) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function handleExport() {
    if (!clients.length) return;

    const dataToExport = clients.map((client) => ({
      id: client.id,
      nome: client.name,
      email: client.email,
      telefone: client.phone ?? 'N/A',
      data_cadastro: client.created_at ?? '',
    }));

    exportToCsv(dataToExport, `clientes_${new Date().toISOString().split('T')[0]}.csv`);
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

  function handleSort(newKey: string) {
    if (sortConfig.key === newKey) {
      sortConfig = {
        ...sortConfig,
        order: sortConfig.order === 'asc' ? 'desc' : 'asc',
      };
    } else {
      sortConfig = { key: newKey, order: 'desc' };
    }
    requestFetch(true);
  }

  function getSortIndicator(column: string) {
    if (sortConfig.key !== column) {
      return '';
    }
    return sortConfig.order === 'asc' ? '▲' : '▼';
  }

  function openClientModal(client: Client) {
    selectedClient = client;
    isModalOpen = true;
    clientDetail = null;
    clientDetailError = null;
    isClientDetailLoading = true;
    fetchClientDetail(client.id);
  }

  async function fetchClientDetail(clientId: number) {
    try {
      const response = await api.get<{ data?: ClientDetail } | ClientDetail>(`/admin/clients/${clientId}`);
      const detail = (response as { data?: ClientDetail })?.data ?? response;
      if (detail && typeof detail === 'object' && 'id' in detail) {
        clientDetail = detail as ClientDetail;
        clientDetailError = null;
      } else {
        clientDetail = null;
        clientDetailError = 'Não foi possível carregar os dados do cliente.';
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes do cliente:', err);
      clientDetail = null;
      clientDetailError =
        err instanceof Error ? err.message : 'Não foi possível carregar os dados do cliente.';
    } finally {
      isClientDetailLoading = false;
    }
  }

  async function openClientProperties(client: Client) {
    selectedClientForProperties = client;
    isPropertiesModalOpen = true;
    isPropertiesLoading = true;
    propertiesError = null;
    clientProperties = [];

    try {
      const response = await api.get<{ data?: ClientProperty[] } | ClientProperty[]>(
        `/admin/clients/${client.id}/properties`
      );
      const list = Array.isArray(response) ? response : response?.data;
      clientProperties = Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Erro ao buscar imoveis do cliente:', err);
      propertiesError =
        err instanceof Error ? err.message : 'Não foi possível carregar os imóveis do cliente.';
      clientProperties = [];
    } finally {
      isPropertiesLoading = false;
    }
  }

  function closeModal() {
    if (isProcessing) return;
    isModalOpen = false;
    selectedClient = null;
    clientDetail = null;
    clientDetailError = null;
    isClientDetailLoading = false;
  }

  function closePropertiesModal() {
    if (isPropertiesLoading) return;
    isPropertiesModalOpen = false;
    selectedClientForProperties = null;
    clientProperties = [];
    propertiesError = null;
  }

  async function deleteClient() {
    if (!selectedClient) return;
    const confirmed = window.confirm(`Excluir o cliente ${selectedClient.name}?`);
    if (!confirmed) return;

    isProcessing = true;
    try {
      await api.delete(`/admin/clients/${selectedClient.id}`);
      toast.success('Cliente excluido.');
      clients = clients.filter((c) => c.id !== selectedClient?.id);
      closeModal();
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      toast.error('Falha ao excluir cliente.');
    } finally {
      isProcessing = false;
    }
  }
</script>

<section class="space-y-4">
  <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestão de Clientes</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Consulte, filtre e exporte os clientes cadastrados na plataforma.
      </p>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        className="w-full sm:w-64"
        type="search"
        placeholder="Buscar por nome ou email..."
        bind:value={filters.search}
        on:input={onSearchInput}
        on:keydown={handleKeydown}
        on:keyup={handleKeyup}
      />
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <label for="clients-items-per-page" class="font-medium">Mostrar</label>
        <select
          id="clients-items-per-page"
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
      <Button variant="outline" on:click={handleRefresh} disabled={isLoading}>
        Recarregar
      </Button>
      <Button variant="outline" on:click={() => handleSort('name')} disabled={isLoading}>
        Ordenar A-Z
      </Button>
      <Button variant="outline" on:click={handleExport} disabled={clients.length === 0 || isLoading}>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exportar Clientes (CSV)
      </Button>
    </div>
  </header>

  {#if isLoading}
    <div class="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        Carregando clientes...
      </div>
    </div>
  {:else if error}
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {error}
    </div>
  {:else if clients.length === 0}
    <div class="rounded-md border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <p class="text-sm text-gray-600 dark:text-gray-300">Nenhum cliente encontrado.</p>
    </div>
  {:else}
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-900/70">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('name')}>
                Cliente
                <span aria-hidden="true">{getSortIndicator('name')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('email')}>
                Email
                <span aria-hidden="true">{getSortIndicator('email')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Telefone
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('created_at')}>
                Cadastrado em
                <span aria-hidden="true">{getSortIndicator('created_at')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ações
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          {#each clients as client (client.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{client.name}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{client.email}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{client.phone ?? 'N/A'}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(client.created_at)}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" on:click={() => openClientProperties(client)}>
                    Ver Imóveis
                  </Button>
                  <Button size="sm" variant="outline" on:click={() => openClientModal(client)}>
                    Revisar
                  </Button>
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

<Dialog.Root bind:open={isModalOpen}>
  <Dialog.Content className="max-w-lg">
    {#if selectedClient}
      <Dialog.Header>
        <Dialog.Title>Revisar Cliente</Dialog.Title>
        <Dialog.Description>
          Consulte os dados do cliente e exclua se necessario.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4 text-sm text-gray-700 dark:text-gray-300">
        {#if isClientDetailLoading}
          <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 class="h-4 w-4 animate-spin" />
            Carregando detalhes...
          </div>
        {:else if clientDetailError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {clientDetailError}
          </div>
        {:else}
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Nome</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {clientDetail?.name ?? selectedClient.name}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Email</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {clientDetail?.email ?? selectedClient.email}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Telefone</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {clientDetail?.phone ?? selectedClient.phone ?? 'N/A'}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cadastrado em</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(clientDetail?.created_at ?? selectedClient.created_at)}
              </div>
            </div>
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Endereco</div>
            <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {clientDetail?.street ?? '-'}
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Numero</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {clientDetail?.number ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Complemento</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {clientDetail?.complement ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Bairro</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {clientDetail?.bairro ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CEP</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {clientDetail?.cep ?? '-'}
                </div>
              </div>
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cidade</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {clientDetail?.city ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Estado</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {clientDetail?.state ?? '-'}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <Dialog.Footer className="flex gap-2">
        <Button variant="outline" on:click={closeModal} disabled={isProcessing}>Cancelar</Button>
        <Button variant="destructive" on:click={deleteClient} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Excluir cliente
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isPropertiesModalOpen}>
  <Dialog.Content className="max-w-lg">
    {#if selectedClientForProperties}
      <Dialog.Header>
        <Dialog.Title>Imóveis do cliente</Dialog.Title>
        <Dialog.Description>
          {selectedClientForProperties.name} · {selectedClientForProperties.email}
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-3 py-4 text-sm text-gray-700 dark:text-gray-300">
        {#if isPropertiesLoading}
          <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 class="h-4 w-4 animate-spin" />
            Carregando imoveis...
          </div>
        {:else if propertiesError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {propertiesError}
          </div>
        {:else if clientProperties.length === 0}
          <div class="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Nenhum imovel cadastrado por este cliente.
          </div>
        {:else}
          <ul class="space-y-2">
            {#each clientProperties as property (property.id)}
              <li class="flex items-start justify-between gap-4 rounded-md border border-gray-200 px-3 py-2 dark:border-gray-700">
                <div>
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {property.title}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    ID: {property.id} · {formatDate(property.created_at ?? undefined)}
                  </div>
                </div>
                <span class="mt-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {property.status}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="outline" on:click={closePropertiesModal} disabled={isPropertiesLoading}>
          Fechar
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
