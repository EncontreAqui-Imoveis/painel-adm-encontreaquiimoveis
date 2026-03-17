<script lang="ts">
  import PropertyManagement from '../PropertyManagement.svelte';
  import PropertyEditRequests from './PropertyEditRequests.svelte';

  type RequestTab = 'creation' | 'edit';

  const tabs: Array<{ key: RequestTab; label: string }> = [
    { key: 'creation', label: 'Criação' },
    { key: 'edit', label: 'Edição' },
  ];

  let activeTab: RequestTab = 'creation';
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
        on:click={() => (activeTab = tab.key)}
        class={`rounded-full px-4 py-2 text-sm font-medium transition ${
          activeTab === tab.key
            ? 'bg-emerald-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        }`}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'creation'}
    <PropertyManagement initialStatus="pending_approval" allowApproval={true} />
  {:else}
    <PropertyEditRequests />
  {/if}
</div>
