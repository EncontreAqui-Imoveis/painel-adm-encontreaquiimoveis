<script lang="ts">
    export let releases: {
        version: string;
        date: string;
        time: string;
        status: "success" | "rollback" | "stable";
        impact: string;
    }[] = [];

    const statusColors = {
        success:
            "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
        stable: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
        rollback:
            "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    };

    const statusIcons = {
        success:
            '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>',
        stable: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        rollback:
            '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>',
    };

    let showAll = false;
    $: visibleReleases = showAll ? releases : releases.slice(0, 10);
    $: hasMore = releases.length > 10;
</script>

<div
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full"
>
    <div
        class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center"
    >
        <div>
            <h3
                class="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
                <svg
                    class="w-5 h-5 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                    />
                </svg>
                Saúde de Lançamentos
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Histórico de deploys e impacto na estabilidade
            </p>
        </div>
    </div>

    <div class="p-5 flex-1 overflow-y-auto">
        <div
            class="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6"
        >
            {#each visibleReleases as release, i}
                <div class="relative pl-6">
                    <div
                        class="absolute w-3 h-3 bg-white dark:bg-gray-800 border-2 {release.status ===
                        'rollback'
                            ? 'border-red-500'
                            : 'border-indigo-500'} rounded-full -left-[6.5px] top-1.5"
                    ></div>
                    <div
                        class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2"
                    >
                        <div>
                            <span
                                class="font-bold text-sm text-gray-900 dark:text-gray-100"
                                >v{release.version}</span
                            >
                            <span
                                class={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${statusColors[release.status]}`}
                            >
                                {@html statusIcons[release.status]}
                                {release.status === "success"
                                    ? "Recente"
                                    : release.status === "stable"
                                      ? "Estável"
                                      : "Rollback"}
                            </span>
                        </div>
                        <div
                            class="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap"
                        >
                            {release.date} &bull; {release.time}
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Impacto: <span class="font-semibold"
                            >{release.impact}</span
                        >
                    </p>
                </div>
            {/each}
        </div>
        {#if releases.length === 0}
            <div class="text-center text-sm text-gray-500 py-4">
                Nenhum deploy recente.
            </div>
        {/if}
        {#if hasMore && !showAll}
            <div class="mt-6 text-center">
                <button
                    on:click={() => (showAll = true)}
                    class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full"
                >
                    Mostrar Mais Histórico ({releases.length - 10})
                </button>
            </div>
        {/if}
        {#if hasMore && showAll}
            <div class="mt-6 text-center">
                <button
                    on:click={() => (showAll = false)}
                    class="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full"
                >
                    Mostrar Menos
                </button>
            </div>
        {/if}
    </div>
</div>
