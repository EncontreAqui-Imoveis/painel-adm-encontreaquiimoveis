<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/apiClient';
  import Pagination from '$lib/Pagination.svelte';
  import type { Notification } from '$lib/types';

  const PAGE_SIZES = [10, 20, 50, 100];
  const TYPE_FILTERS: Array<{ value: 'all' | Notification['related_entity_type']; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'property', label: 'Imóveis' },
    { value: 'announcement', label: 'Aviso' },
    { value: 'broker', label: 'Corretor' },
    { value: 'user', label: 'Cliente' }
  ];

  let notifications: Notification[] = [];
  let total = 0;
  let currentPage = 1;
  let itemsPerPage = 20;
  let isLoading = false;
  let error: string | null = null;
  let hasMounted = false;
  let typeFilter: 'all' | Notification['related_entity_type'] = 'all';

  $: totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  $: if (hasMounted) {
    const page = currentPage;
    const size = itemsPerPage;
    const filter = typeFilter;
    page;
    size;
    filter;
    fetchNotifications();
  }

  onMount(() => {
    hasMounted = true;
  });

  function parseDate(value: string): Date | null {
    if (!value) return null;
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function formatDate(value: string): string {
    const parsed = parseDate(value);
    if (!parsed) return value;
    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function badgeLabel(type: Notification['related_entity_type']): string {
    if (type == 'property') return 'Imóveis';
    if (type == 'broker') return 'Corretor';
    if (type == 'user') return 'Cliente';
    return 'Aviso';
  }

  function parseMetadata(value: Notification['metadata_json']) {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
    if (typeof value === 'object') return value as Record<string, unknown>;
    return null;
  }

  async function fetchNotifications() {
    isLoading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        page: String(currentPage)
      });
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      const payload = await api.get<{ data?: Notification[]; total?: number }>(
        `/admin/notifications?${params.toString()}`
      );
      notifications = payload?.data ?? [];
      total = Number(payload?.total ?? notifications.length);
      const nextTotalPages = Math.max(1, Math.ceil(total / itemsPerPage));
      if (currentPage > nextTotalPages) {
        currentPage = nextTotalPages;
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
      error =
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar as notificações.';
      notifications = [];
      total = 0;
    } finally {
      isLoading = false;
    }
  }

  async function handleDelete(notificationId: number) {
    if (isLoading) return;
    try {
      await api.delete(`/admin/notifications/${notificationId}`);
      notifications = notifications.filter((item) => item.id !== notificationId);
      total = Math.max(0, total - 1);
      if (notifications.length === 0 && currentPage > 1) {
        currentPage -= 1;
        await fetchNotifications();
      }
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
    }
  }

  async function handleClearAll() {
    if (isLoading || total === 0) return;
    if (!confirm('Deseja limpar todas as notificações?')) return;
    try {
      await api.delete('/admin/notifications');
      notifications = [];
      total = 0;
      currentPage = 1;
    } catch (err) {
      console.error('Erro ao limpar notificações:', err);
    }
  }
</script>

<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-3">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Centro de Notificações
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Visualize alertas internos do painel e acompanhe as últimas ações.
        </p>
      </div>
      <button
        class="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
        on:click={handleClearAll}
        disabled={isLoading || total === 0}
      >
        Limpar tudo
      </button>
    </div>
    <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
      <span>Total: <strong>{total}</strong></span>
      <div class="flex items-center gap-2">
        <label for="notifications-page-size" class="text-sm font-medium">
          Mostrar
        </label>
        <select
          id="notifications-page-size"
          bind:value={itemsPerPage}
          class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          {#each PAGE_SIZES as size}
            <option value={size}>{size}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label for="notifications-type-filter" class="text-sm font-medium">
          Tipo
        </label>
        <select
          id="notifications-type-filter"
          bind:value={typeFilter}
          class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          {#each TYPE_FILTERS as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <div class="p-6">
    {#if isLoading}
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Carregando notificações...
      </div>
    {:else if error}
      <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
        {error}
      </div>
    {:else if notifications.length === 0}
      <div class="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
        <span>Nenhuma notificação no momento.</span>
      </div>
    {:else}
      <div class="space-y-3">
        {#each notifications as item}
          <div class="relative rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <button
              class="absolute left-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Excluir notificação"
              on:click={() => handleDelete(item.id)}
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div class="flex items-center justify-between gap-3 pl-8">
              <span class="rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/40 dark:text-green-300">
                {badgeLabel(item.related_entity_type)}
              </span>
              <span class="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(item.created_at)}
              </span>
            </div>
            <p class="mt-3 text-sm text-gray-700 dark:text-gray-100 pl-8">
              {item.message}
            </p>
            {#if parseMetadata(item.metadata_json)?.clientPhone}
              <p class="mt-1 pl-8 text-xs text-gray-500 dark:text-gray-400">
                Telefone do cliente: {String(parseMetadata(item.metadata_json)?.clientPhone)}
              </p>
            {/if}
            {#if parseMetadata(item.metadata_json)?.clientPhoneRaw && parseMetadata(item.metadata_json)?.clientPhoneRaw !== parseMetadata(item.metadata_json)?.clientPhone}
              <p class="mt-1 pl-8 text-xs text-gray-500 dark:text-gray-400">
                Telefone informado: {String(parseMetadata(item.metadata_json)?.clientPhoneRaw)}
              </p>
            {/if}
            {#if parseMetadata(item.metadata_json)?.clientEmail}
              <p class="mt-1 pl-8 text-xs text-gray-500 dark:text-gray-400">
                E-mail do cliente: {String(parseMetadata(item.metadata_json)?.clientEmail)}
              </p>
            {/if}
            {#if parseMetadata(item.metadata_json)?.whatsappUrl}
              <a
                class="mt-1 inline-block pl-8 text-xs text-green-600 hover:underline dark:text-green-400"
                href={String(parseMetadata(item.metadata_json)?.whatsappUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Abrir conversa no WhatsApp
              </a>
            {/if}
            {#if item.related_entity_id}
              <span class="mt-2 inline-block pl-8 text-[11px] text-gray-400 dark:text-gray-500">
                ID relacionado: {item.related_entity_id}
              </span>
            {/if}
          </div>
        {/each}
      </div>
      <div class="mt-4">
        <Pagination bind:currentPage {totalPages} totalItems={total} {itemsPerPage} />
      </div>
    {/if}
  </div>
</div>
