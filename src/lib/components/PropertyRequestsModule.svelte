<script lang="ts">
  import { onMount } from 'svelte';
  import PropertyManagement from '../PropertyManagement.svelte';
  import PropertyEditRequests from './PropertyEditRequests.svelte';
  import { api } from '$lib/apiClient';

  type RequestTab = 'creation' | 'edit';

  const tabs: Array<{ key: RequestTab; label: string }> = [
    { key: 'creation', label: 'Criação' },
    { key: 'edit', label: 'Edição' },
  ];

  let activeTab: RequestTab = 'creation';
  let creationCount = 0;
  let editCount = 0;

  function formatBadgeCount(value: number): string {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return normalized > 99 ? '99+' : String(normalized);
  }

  function resolveTotal(response: unknown): number {
    const total = Number((response as { total?: number })?.total);
    if (Number.isFinite(total) && total >= 0) return total;
    const data = (response as { data?: unknown })?.data;
    return Array.isArray(data) ? data.length : 0;
  }

  async function refreshTabCounts() {
    try {
      const [creationResponse, editResponse] = await Promise.all([
        api.get<{ data?: Array<Record<string, unknown>>; total?: number }>(
          '/admin/properties-with-brokers?status=pending_approval&requestType=creation&page=1&limit=1'
        ),
        api.get<{ data?: Array<Record<string, unknown>>; total?: number }>(
          '/admin/property-edit-requests?status=PENDING&page=1&limit=1'
        ),
      ]);
      creationCount = resolveTotal(creationResponse);
      editCount = resolveTotal(editResponse);
    } catch {
      creationCount = 0;
      editCount = 0;
    }
  }

  onMount(() => {
    refreshTabCounts();
    const interval = setInterval(() => {
      refreshTabCounts();
    }, 20_000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<div class="space-y-4">
  <div>
    <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitações de Imóveis</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Revise novas criações e pedidos de edição em filas separadas.
    </p>
  </div>

  <div class="flex flex-wrap gap-2">
    {#each tabs as tab}
      <button
        type="button"
        on:click={() => {
          activeTab = tab.key;
          refreshTabCounts();
        }}
        class={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
          activeTab === tab.key
            ? 'bg-emerald-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        }`}
      >
        {tab.label}
        <span
          class={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeTab === tab.key
              ? 'bg-white/20 text-white'
              : 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950'
          }`}
        >
          {tab.key === 'creation' ? formatBadgeCount(creationCount) : formatBadgeCount(editCount)}
        </span>
      </button>
    {/each}
  </div>

  {#if activeTab === 'creation'}
    <PropertyManagement
      initialStatus="pending_approval"
      allowApproval={true}
      initialReviewRequestType="creation"
    />
  {:else}
    <PropertyEditRequests />
  {/if}
</div>
