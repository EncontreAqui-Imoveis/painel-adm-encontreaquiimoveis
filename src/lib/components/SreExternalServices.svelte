<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    export let services: {
        name: string;
        provider: string;
        status: "operational" | "degraded" | "outage";
        latency?: string;
        cost?: number;
    }[] = [];

    let editingName: string | null = null;
    let editValue: string = "";

    $: totalCost = services.reduce(
        (sum, service) => sum + (service.cost || 0),
        0,
    );

    const statusColors = {
        operational: "text-green-500 bg-green-100 dark:bg-green-900/30",
        degraded: "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30",
        outage: "text-red-500 bg-red-100 dark:bg-red-900/30",
    };

    const dotColors = {
        operational: "bg-green-500",
        degraded: "bg-yellow-500 animate-pulse",
        outage: "bg-red-500 animate-pulse",
    };

    function startEdit(service: any) {
        editingName = service.name;
        editValue = (service.cost || 0).toString();
    }

    function cancelEdit() {
        editingName = null;
    }

    function saveEdit() {
        if (editingName) {
            dispatch("updatePrice", {
                name: editingName,
                cost: parseFloat(editValue) || 0,
            });
            editingName = null;
        }
    }
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
                    class="w-5 h-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                </svg>
                Dependências Externas (SaaS/PaaS)
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Status de serviços críticos de terceiros (Clique no preço para
                editar)
            </p>
        </div>
    </div>

    <div class="p-5 flex-1 overflow-y-auto">
        <ul class="space-y-3">
            {#each services as service}
                <li
                    class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class={`w-10 h-10 rounded-full flex items-center justify-center ${statusColors[service.status]}`}
                        >
                            <span
                                class={`w-3 h-3 rounded-full ${dotColors[service.status]}`}
                            ></span>
                        </div>
                        <div>
                            <p
                                class="text-sm font-bold text-gray-900 dark:text-white leading-tight"
                            >
                                {service.name}
                            </p>
                            <p
                                class="text-xs text-gray-500 dark:text-gray-400 font-medium"
                            >
                                {service.provider}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p
                            class="text-xs font-bold uppercase tracking-wider {service.status ===
                            'operational'
                                ? 'text-green-600 dark:text-green-400'
                                : service.status === 'degraded'
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-red-600 dark:text-red-400'}"
                        >
                            {service.status === "operational"
                                ? "Operacional"
                                : service.status === "degraded"
                                  ? "Instável"
                                  : "Indisponível"}
                        </p>

                        <div class="mt-1 flex items-center justify-end gap-2">
                            {#if editingName === service.name}
                                <input
                                    type="number"
                                    step="0.01"
                                    bind:value={editValue}
                                    class="w-20 text-[10px] bg-white dark:bg-gray-900 border border-indigo-500 rounded px-1 py-0.5 text-right focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                    on:click={saveEdit}
                                    class="text-green-500 hover:text-green-600"
                                    aria-label="Salvar preço"
                                >
                                    <svg
                                        class="w-3 h-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        ><path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M5 13l4 4L19 7"
                                        /></svg
                                    >
                                </button>
                                <button
                                    on:click={cancelEdit}
                                    class="text-red-500 hover:text-red-600"
                                    aria-label="Cancelar edição"
                                >
                                    <svg
                                        class="w-3 h-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        ><path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        /></svg
                                    >
                                </button>
                            {:else}
                                <button
                                    class="text-[10px] text-gray-400 dark:text-gray-500 cursor-pointer hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 group bg-transparent border-none p-0"
                                    on:click={() => startEdit(service)}
                                    aria-label={`Editar preço de ${service.name}`}
                                >
                                    {#if service.latency && service.status === "operational"}
                                        <span>{service.latency} &bull;</span>
                                    {/if}
                                    <span
                                        class="font-bold text-gray-600 dark:text-gray-300"
                                        >R$ {(service.cost || 0)
                                            .toFixed(2)
                                            .replace(".", ",")}</span
                                    >
                                    <svg
                                        class="w-2 h-2 opacity-50 group-hover:opacity-100"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                        ><path
                                            d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                                        /></svg
                                    >
                                </button>
                            {/if}
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
        {#if services.length === 0}
            <div class="text-center text-sm text-gray-500 py-4">
                Nenhum serviço externo configurado.
            </div>
        {/if}
        {#if services.length > 0}
            <div
                class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm"
            >
                <span class="font-medium text-gray-600 dark:text-gray-400"
                    >Custo Total Mensal das Dependências Estimado:</span
                >
                <span class="font-bold text-gray-900 dark:text-white text-base"
                    >R$ {totalCost.toFixed(2).replace(".", ",")}</span
                >
            </div>
        {/if}
    </div>
</div>
