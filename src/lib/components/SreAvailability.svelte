<script lang="ts">
    import { onMount } from "svelte";
    import Chart from "chart.js/auto";

    export let data: Record<
        string,
        { uptimeCurrent: number; downtimeMinutes: number; history: number[] }
    > = {};

    const timeFilters = ["Minuto", "Hora", "Dia", "Semana", "Mês", "Ano"];
    let activeFilter = "Mês";

    $: currentStats = data[activeFilter] || {
        uptimeCurrent: 99.92,
        downtimeMinutes: 34.5,
        history: Array.from({ length: 30 }, () => 99 + Math.random()),
    };
    $: uptimeCurrent = currentStats.uptimeCurrent;
    $: downtimeMinutes = currentStats.downtimeMinutes;
    $: historyData = currentStats.history;

    let chartContainer: HTMLCanvasElement;
    let chartInstance: Chart | null = null;

    function updateChart() {
        if (!chartContainer) return;

        const ctx = chartContainer.getContext("2d");
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.5)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: historyData.map((_, i) => i),
                datasets: [
                    {
                        data: historyData,
                        borderColor: "#10B981",
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        min: Math.min(...historyData) - 0.1,
                        max: 100.1,
                    },
                },
            },
        });
    }

    $: if (historyData && chartContainer) {
        updateChart();
    }

    onMount(() => {
        updateChart();
    });
</script>

<div
    class="bg-[#1e2533] rounded-3xl p-8 flex flex-col h-full border border-gray-800 shadow-2xl"
>
    <div class="flex justify-between items-start mb-8">
        <h3 class="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">
            Disponibilidade
        </h3>

        <div
            class="bg-[#161b26] p-1.5 rounded-xl flex gap-1 border border-gray-800"
        >
            {#each timeFilters as filter}
                <button
                    class="px-4 py-2 text-[11px] font-bold rounded-lg transition-all {activeFilter ===
                    filter
                        ? 'bg-[#5850ec] text-white shadow-lg'
                        : 'text-gray-500 hover:text-gray-300'}"
                    on:click={() => (activeFilter = filter)}
                >
                    {filter}
                </button>
            {/each}
        </div>
    </div>

    <div class="flex justify-between items-end mb-6">
        <div>
            <div
                class="text-[64px] font-black text-[#facc15] leading-none mb-4 tracking-tighter"
            >
                {uptimeCurrent.toFixed(2)}%
            </div>
            <div
                class="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider"
            >
                <span
                    class="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                ></span>
                Sistema Operacional
            </div>
        </div>

        <div
            class="bg-[#10b9811a] border border-[#10b98133] rounded-xl px-4 py-2"
        >
            <span
                class="text-[#10b981] font-black italic text-lg tracking-widest"
                >EXCELENTE</span
            >
        </div>
    </div>

    <!-- Graph - Height increased for visibility -->
    <div class="flex-1 min-h-[180px] w-full relative -mx-2 mb-6">
        <canvas bind:this={chartContainer}></canvas>
    </div>

    <div>
        <div
            class="w-full bg-gray-800 rounded-full h-2 mb-6 overflow-hidden flex"
        >
            <div class="bg-red-500 h-full" style="width: 2%"></div>
            <div class="bg-[#10b981] h-full flex-1"></div>
        </div>

        <div
            class="flex justify-between items-center text-xs font-bold uppercase tracking-[0.15em]"
        >
            <div class="flex items-center gap-3 text-gray-400">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span
                    >Inatividade: <span class="text-white ml-2"
                        >{downtimeMinutes} MIN</span
                    ></span
                >
            </div>
            <div class="text-gray-500 opacity-60">Últimos 30 dias</div>
        </div>
    </div>
</div>

<style>
    canvas {
        filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2));
    }
</style>
