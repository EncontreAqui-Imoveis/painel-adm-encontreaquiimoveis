<script lang="ts">
  import type { View } from '$lib/types';

  export let pendingCounts: {
    propertyRequests?: number | null;
    brokerRequests?: number | null;
  } = {};
  export let sreStats: any = null;
  export let chartData: any = null;
  export let NewPropertiesLineChartComponent: any = null;
  export let externalDashboardShortcuts: ReadonlyArray<{
    name: string;
    url: string;
    description: string;
    badgeClass: string;
  }> = [];
  export let changeView: (view: View) => void;
</script>

<div class="space-y-6">
  <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
      <p class="text-sm font-semibold text-amber-900 dark:text-amber-200">Pendências urgentes</p>
      <p class="mt-2 text-3xl font-black text-amber-700 dark:text-amber-300">
        {(pendingCounts.propertyRequests ?? 0) + (pendingCounts.brokerRequests ?? 0)}
      </p>
      <p class="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
        Aprovações de imóveis e solicitações de corretores aguardando ação.
      </p>
      <button
        class="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        on:click={() => changeView('property_requests')}
      >
        Ir para pendências
      </button>
    </div>

    <div class="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
      <p class="text-sm font-semibold text-blue-900 dark:text-blue-200">Novas propostas do dia</p>
      <p class="mt-2 text-3xl font-black text-blue-700 dark:text-blue-300">
        {Number(sreStats?.business?.newProposalsToday ?? sreStats?.newProposalsToday ?? 0)}
      </p>
      <p class="mt-1 text-xs text-blue-800 dark:text-blue-200/90">
        Volume diário para triagem rápida de negociação.
      </p>
      <button
        class="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        on:click={() => changeView('negotiation_requests')}
      >
        Abrir propostas
      </button>
    </div>
  </section>

  <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Visitas e leads</h2>
    <p class="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
      Tendência recente para leitura rápida de operação.
    </p>
    {#if NewPropertiesLineChartComponent && chartData}
      <div class="h-72">
        <svelte:component this={NewPropertiesLineChartComponent} data={chartData.newPropertiesOverTime} />
      </div>
    {:else}
      <div class="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Sem dados de gráfico no momento.
      </div>
    {/if}
  </section>

  <div class="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#0b0f1a]">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 class="text-sm font-black uppercase tracking-[0.18em] text-gray-900 dark:text-white">
          Atalhos Operacionais
        </h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Acessos rápidos para monitoramento, deploy e canais oficiais.
        </p>
      </div>
    </div>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#each externalDashboardShortcuts as shortcut}
        <a
          href={shortcut.url}
          target="_blank"
          rel="noopener noreferrer"
          class="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-indigo-500/40"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{shortcut.name}</p>
            <span class={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${shortcut.badgeClass}`}>
              Link
            </span>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {shortcut.description}
          </p>
        </a>
      {/each}
    </div>
  </div>
</div>
