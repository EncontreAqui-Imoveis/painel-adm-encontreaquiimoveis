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
        operational:
            "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20",
        degraded:
            "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20",
        outage: "text-red-500 bg-red-500/10 border border-red-500/20",
    };

    const dotColors = {
        operational: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
        degraded:
            "bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]",
        outage: "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]",
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
    class="bg-white dark:bg-[#0b0f1a] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full relative"
>
    <!-- Subtle glassmorphism glow -->
    <div
        class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"
    ></div>

    <div
        class="px-6 py-5 border-b border-gray-200 dark:border-gray-800/60 bg-white/50 dark:bg-[#05070a]/50 flex justify-between items-center relative z-10"
    >
        <div>
            <h3
                class="font-black text-gray-900 dark:text-white flex items-center gap-3 text-lg tracking-tight"
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
            <p
                class="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-2"
            >
                Status de serviços críticos de terceiros (Clique no preço para
                editar)
            </p>
        </div>
    </div>

    <div class="p-6 flex-1 overflow-y-auto relative z-10">
        <ul class="space-y-4">
            {#each services as service}
                <li
                    class="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#111827]/40 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-[#1f2937]/40 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 group"
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
                                class="text-sm font-black text-gray-900 dark:text-gray-200 leading-tight mb-1"
                            >
                                {service.name}
                            </p>
                            <p
                                class="text-[10px] text-gray-400 font-bold uppercase tracking-widest"
                            >
                                {service.provider}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p
                            class="text-[10px] font-black uppercase tracking-[0.2em] {service.status ===
                            'operational'
                                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                : service.status === 'degraded'
                                  ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                  : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'}"
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
                                        class="font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                        >R$ {(service.cost || 0)
                                            .toFixed(2)
                                            .replace(".", ",")}</span
                                    >
                                    <svg
                                        class="w-3 h-3 text-indigo-400 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300"
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
            <div
                class="text-center text-xs text-gray-500 py-8 font-bold uppercase tracking-widest"
            >
                Nenhum serviço externo configurado.
            </div>
        {/if}
        {#if services.length > 0}
            <div
                class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-sm"
            >
                <span
                    class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
                    >Custo Mensal (SaaS/PaaS)</span
                >
                <span
                    class="font-black text-gray-900 dark:text-white text-lg tracking-tight"
                    >R$ {totalCost.toFixed(2).replace(".", ",")}</span
                >
            </div>
        {/if}
    </div>
</div>
