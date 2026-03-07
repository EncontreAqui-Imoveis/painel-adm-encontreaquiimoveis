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
        history: Array.from({ length: 30 }, () => 99.5 + Math.random() * 0.4),
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

        // Clean up previous instance
        if (chartInstance) {
            chartInstance.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
        gradient.addColorStop(0.8, "rgba(16, 185, 129, 0.0)");

        chartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: historyData.map((_, i) => i),
                datasets: [
                    {
                        data: historyData,
                        borderColor: "#10B981",
                        backgroundColor: gradient,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: "#10B981",
                        pointHoverBorderColor: "#fff",
                        pointHoverBorderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10, // Avoid clipping at top
                        bottom: 10,
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: "#111827",
                        titleColor: "#9ca3af",
                        bodyColor: "#fff",
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (context) =>
                                `Uptime: ${context.parsed.y.toFixed(3)}%`,
                        },
                    },
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        // Fix framing/clipping: set bounds that give the line space
                        min: Math.min(...historyData, 98) - 0.2,
                        max: 100.2,
                    },
                },
                interaction: {
                    mode: "index",
                    intersect: false,
                },
            },
        });
    }

    $: if (historyData && chartContainer) {
        updateChart();
    }

    onMount(() => {
        updateChart();
        return () => {
            if (chartInstance) chartInstance.destroy();
        };
    });
</script>

<div
    class="bg-[#111827] rounded-3xl p-8 flex flex-col h-full border border-gray-800 shadow-2xl relative overflow-hidden group"
>
    <!-- Subtle overlay for better framing -->
    <div
        class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 pointer-events-none"
    ></div>

    <div class="relative z-10 flex justify-between items-start mb-8">
        <div class="flex flex-col gap-1">
            <h3
                class="text-gray-500 font-bold uppercase tracking-[0.25em] text-[10px]"
            >
                Monitoramento SRE
            </h3>
            <span class="text-white font-black text-lg tracking-tight"
                >Disponibilidade</span
            >
        </div>

        <div
            class="bg-[#0b0f1a] p-1.5 rounded-xl flex gap-1 border border-gray-800/80"
        >
            {#each timeFilters as filter}
                <button
                    class="px-3 py-1.5 text-[10px] font-black rounded-lg transition-all {activeFilter ===
                    filter
                        ? 'bg-[#4f46e5] text-white shadow-lg'
                        : 'text-gray-500 hover:text-gray-300'}"
                    on:click={() => (activeFilter = filter)}
                >
                    {filter}
                </button>
            {/each}
        </div>
    </div>

    <div class="relative z-10 flex justify-between items-end mb-8">
        <div class="flex flex-col gap-2">
            <div
                class="text-6xl font-black text-[#facc15] leading-none tracking-tighter drop-shadow-sm"
            >
                {uptimeCurrent.toFixed(2)}%
            </div>
            <div
                class="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-[0.15em]"
            >
                <div class="relative">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#10b981] block"
                    ></span>
                    <span
                        class="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping opacity-25"
                    ></span>
                </div>
                Sistema Operacional (Real)
            </div>
        </div>

        <div
            class="bg-[#10b98115] border border-[#10b98130] rounded-xl px-4 py-2 flex items-center gap-2"
        >
            <span
                class="text-[#10b981] font-black italic text-lg tracking-widest"
                >EXCELENTE</span
            >
        </div>
    </div>

    <!-- Graph Container - Optimized Height and Framing -->
    <div
        class="flex-1 w-full min-h-[220px] relative mt-2 mb-8 -mx-2 bg-[#0b0f1a]/30 rounded-2xl border border-gray-800/20"
    >
        <canvas bind:this={chartContainer}></canvas>
    </div>

    <div class="relative z-10 mt-auto">
        <div
            class="w-full bg-gray-900 rounded-full h-2.5 mb-6 overflow-hidden flex ring-1 ring-white/5"
        >
            {#if uptimeCurrent < 100}
                <div
                    class="bg-red-500 h-full rounded-l-full"
                    style="width: 3%"
                ></div>
            {/if}
            <div class="bg-emerald-500 h-full flex-1 rounded-r-full"></div>
        </div>

        <div
            class="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]"
        >
            <div class="flex items-center gap-3 text-gray-500">
                <span
                    class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                ></span>
                <span
                    >Inatividade: <span class="text-gray-100 ml-1"
                        >{downtimeMinutes.toFixed(1)} MIN</span
                    ></span
                >
            </div>
            <div class="text-gray-600 bg-gray-900/50 px-2.5 py-1 rounded-md">
                Últimos 30 dias
            </div>
        </div>
    </div>
</div>

<style>
    canvas {
        transition: opacity 0.3s ease;
    }
</style>
