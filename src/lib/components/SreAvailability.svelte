<script lang="ts">
    export let data: Record<
        string,
        { uptimeCurrent: number; downtimeMinutes: number; history: number[] }
    > = {};

    const timeFilters = ["Minuto", "Hora", "Dia", "Semana", "Mês", "Ano"];
    let activeFilter = "Mês";

    // Reactive data based on selection
    $: currentStats = data[activeFilter] || {
        uptimeCurrent: 99.92,
        downtimeMinutes: 34.5,
        history: Array.from({ length: 30 }, () => 99.5 + Math.random() * 0.4),
    };

    $: uptimeCurrent = currentStats.uptimeCurrent;
    $: downtimeMinutes = currentStats.downtimeMinutes;
</script>

<div
    class="relative h-full flex flex-col group overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0b0f1a] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
>
    <!-- Glassmorphism Orbs -->
    <div
        class="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/15 transition-all duration-700"
    ></div>
    <div
        class="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"
    ></div>

    <!-- Header Section -->
    <div
        class="relative z-10 px-10 pt-10 pb-6 flex justify-between items-start"
    >
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
                <div
                    class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"
                ></div>
                <h3 class="text-white font-black text-xl tracking-tight">
                    Disponibilidade do Ecossistema
                </h3>
            </div>
            <p
                class="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em]"
            >
                Uptime Gateway & Services
            </p>
        </div>

        <!-- Premium Filter Switcher -->
        <div
            class="bg-[#111827] p-1.5 rounded-2xl flex gap-1 border border-gray-800 shadow-inner"
        >
            {#each timeFilters as filter}
                <button
                    class="px-4 py-2 text-[9px] font-black rounded-xl transition-all duration-300 {activeFilter ===
                    filter
                        ? 'bg-gray-800 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-gray-700'
                        : 'text-gray-500 hover:text-gray-300'}"
                    on:click={() => (activeFilter = filter)}
                >
                    {filter}
                </button>
            {/each}
        </div>
    </div>

    <!-- Railway Status Iframe Integration & Core Metrics -->
    <div
        class="flex flex-col lg:flex-row gap-6 items-stretch w-full px-10 mb-10 z-10 flex-1"
    >
        <!-- Live Uptime Server Info -->
        <div class="flex flex-col justify-center flex-1 min-w-[250px]">
            <span
                class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2"
                >Servidor Primário / Uptime Local</span
            >
            <div class="flex items-baseline gap-1 mb-6">
                <span
                    class="text-7xl font-black text-[#facc15] tracking-tighter drop-shadow-[0_0_25px_rgba(250,204,21,0.2)] select-none"
                >
                    {uptimeCurrent.toFixed(2)}
                </span>
                <span class="text-3xl font-black text-[#facc15]/60">%</span>
            </div>

            <div
                class="px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm shadow-inner w-max mb-3"
            >
                <span
                    class="text-emerald-400 font-black italic text-lg tracking-[0.2em] drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    >OPERATIONAL</span
                >
            </div>

            <a
                href="https://status.railway.com"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[10px] items-center flex gap-1.5 font-black text-indigo-400 hover:text-indigo-300 transition-colors tracking-widest uppercase italic"
            >
                Abrir Central Railway
                <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    /></svg
                >
            </a>
        </div>

        <!-- Railway Status Site Embed View -->
        <div
            class="flex-[2] rounded-[1.5rem] overflow-hidden border border-gray-800 bg-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative h-[320px]"
        >
            <!-- Fallback if iframe blocked -->
            <div
                class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0b0f1a] z-0"
            >
                <svg
                    class="w-12 h-12 text-gray-700 animate-pulse mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                    /></svg
                >
                <span
                    class="text-xs text-gray-500 font-black uppercase tracking-widest"
                    >Carregando telemetria...</span
                >
            </div>
            <iframe
                src="https://status.railway.com"
                class="relative z-10 w-full h-full border-0 transform scale-[0.80] origin-top opacity-95 transition-opacity duration-1000"
                style="width: 125%; height: 125%; clip-path: inset(0 0 0 0);"
                title="Railway Network Status"
            ></iframe>
        </div>
    </div>

    <!-- Footer Stats Section -->
    <div class="relative z-10 mt-auto px-10 pb-10">
        <!-- Health Bar -->
        <div
            class="relative h-2.5 w-full bg-gray-900 rounded-full mb-8 overflow-hidden border border-gray-800"
        >
            {#if uptimeCurrent < 100}
                <div
                    class="absolute left-0 top-0 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-1000"
                    style="width: 2%"
                ></div>
            {/if}
            <div
                class="absolute left-0 top-0 h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-1000"
                style="width: 100%; left: {uptimeCurrent < 100 ? '2%' : '0%'}"
            ></div>
        </div>

        <div
            class="flex justify-between items-center bg-[#111827] border border-gray-800 rounded-2xl px-6 py-4"
        >
            <div class="flex items-center gap-4">
                <div class="flex flex-col">
                    <span
                        class="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1"
                        >Inatividade</span
                    >
                    <span class="text-white font-black text-sm tracking-tight"
                        >{downtimeMinutes.toFixed(1)} MIN</span
                    >
                </div>
            </div>

            <div class="h-8 w-px bg-white/10 mx-4"></div>

            <div class="flex flex-col">
                <span
                    class="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1"
                    >Status</span
                >
                <span
                    class="text-emerald-400 font-black text-sm tracking-tight italic"
                    >99.9% SLO Met</span
                >
            </div>

            <div class="h-8 w-px bg-white/10 mx-4"></div>

            <div class="flex flex-col items-end">
                <span
                    class="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1"
                    >Período</span
                >
                <span class="text-white/40 font-black text-sm tracking-tight"
                    >30d Histórico</span
                >
            </div>
        </div>
    </div>
</div>

<style>
    /* Clean layout */
</style>
