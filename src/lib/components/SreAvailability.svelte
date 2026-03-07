<script lang="ts">
    import { onMount, afterUpdate } from "svelte";
    import Chart from "chart.js/auto";

    export let data: Record<
        string,
        { uptimeCurrent: number; downtimeMinutes: number; history: number[] }
    > = {};

    const timeFilters = ["Minuto", "Hora", "Dia", "Semana", "Mês", "Ano"];
    let activeFilter = "Mês";

    $: currentStats = data[activeFilter] || {
        uptimeCurrent: 99.95,
        downtimeMinutes: 12.5,
        history: [],
    };
    $: uptimeCurrent = currentStats.uptimeCurrent;
    $: downtimeMinutes = currentStats.downtimeMinutes;
    $: historyData = currentStats.history;

    // High-fidelity Colors (matching references)
    const brandGold = "#FACC15"; // Yellow-400
    const brandGreen = "#10B981"; // Emerald-500
    const brandRed = "#EF4444"; // Red-500

    let chartContainer: HTMLCanvasElement;
    let chartInstance: Chart | null = null;
    let chartId: string = `availability-chart-${Math.random().toString(36).substr(2, 9)}`;

    function updateChart() {
        if (!chartContainer) return;

        const ctx = chartContainer.getContext("2d");
        if (!ctx) return;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 80);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

        if (!chartInstance) {
            chartInstance = new Chart(ctx, {
                type: "line",
                data: {
                    labels: historyData.map((_, i) => `${i + 1}`),
                    datasets: [
                        {
                            data: historyData,
                            borderColor: brandGreen,
                            backgroundColor: gradient,
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: true,
                            mode: "index",
                            intersect: false,
                            displayColors: false,
                            backgroundColor: "#1f2937", // Darker gray
                            titleColor: "#9ca3af",
                            bodyColor: "#fff",
                            callbacks: {
                                label: (context) =>
                                    `Uptime: ${context.parsed.y}%`,
                            },
                        },
                    },
                    scales: {
                        x: { display: false },
                        y: {
                            display: false,
                            min: Math.max(
                                90,
                                Math.min(...historyData, 99.0) - 0.5,
                            ),
                            max: 100.1,
                        },
                    },
                    interaction: {
                        mode: "nearest",
                        axis: "x",
                        intersect: false,
                    },
                },
            });
        } else {
            chartInstance.data.labels = historyData.map((_, i) => `${i + 1}`);
            chartInstance.data.datasets[0].data = historyData;
            chartInstance.data.datasets[0].backgroundColor = gradient;
            chartInstance.update("none");
        }
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

    const filterLabels: Record<string, string> = {
        Minuto: "Últimos 60s",
        Hora: "Última Hora",
        Dia: "Últimas 24h",
        Semana: "Últimos 7 dias",
        Mês: "Últimos 30 dias",
        Ano: "Último Ano",
    };
</script>

<div
    class="bg-[#1a1f2e] dark:bg-[#1a1f2e] rounded-2xl border border-gray-700/50 shadow-2xl p-7 pb-6 flex flex-col justify-between h-full relative overflow-hidden"
>
    <!-- Background subtle glow -->
    <div
        class="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"
    ></div>

    <div class="relative z-10">
        <div
            class="flex flex-col sm:flex-row justify-between items-start mb-6 gap-2"
        >
            <h3
                class="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400/80"
            >
                Disponibilidade
            </h3>
            <div
                class="flex flex-wrap gap-1 bg-gray-900/40 p-1 rounded-lg border border-gray-700/30"
            >
                {#each timeFilters as filter}
                    <button
                        class={`px-3 py-1 text-[9px] font-bold rounded-md transition-all duration-200 ${activeFilter === filter ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                        on:click={() => (activeFilter = filter)}
                    >
                        {filter}
                    </button>
                {/each}
            </div>
        </div>

        <div class="flex items-center justify-between mb-2">
            <div class="flex flex-col">
                <div
                    class="text-[44px] font-black tracking-tighter text-[#FACC15] leading-none"
                >
                    {uptimeCurrent.toFixed(2)}%
                </div>
                <div
                    class="text-[10px] font-bold text-gray-400 mt-2 flex items-center gap-1.5"
                >
                    <span
                        class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                    ></span>
                    SISTEMA OPERACIONAL
                </div>
            </div>
            <div class="text-right">
                <div
                    class={`text-[13px] font-black italic tracking-wider px-3 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 text-emerald-400`}
                >
                    EXCELENTE
                </div>
            </div>
        </div>
    </div>

    <!-- The interactive Sparkline Chart -->
    <div class="w-full h-24 relative mt-2 mb-4 -mx-2">
        <canvas bind:this={chartContainer} id={chartId}></canvas>
    </div>

    <div class="relative z-10">
        <!-- Health Bar -->
        <div
            class="w-full bg-gray-800/80 rounded-full h-[6px] mb-3 overflow-hidden flex gap-[2px]"
        >
            {#if uptimeCurrent < 100}
                <div
                    class="bg-red-500 h-full rounded-l-full"
                    style="width: {Math.max(2, (100 - uptimeCurrent) * 10)}%"
                ></div>
            {/if}
            <div
                class="bg-emerald-500 h-full flex-1 rounded-full transition-all duration-700"
            ></div>
        </div>

        <div
            class="flex justify-between items-center text-[10px] text-gray-400/80 font-bold uppercase tracking-widest"
        >
            <span class="flex items-center gap-2">
                <span
                    class={`w-1.5 h-1.5 rounded-full ${downtimeMinutes > 0 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-emerald-500"} `}
                ></span>
                Inatividade:
                <span class="text-gray-200 ml-1"
                    >{downtimeMinutes.toFixed(1)} min</span
                >
            </span>
            <span class="opacity-60">{filterLabels[activeFilter]}</span>
        </div>
    </div>
</div>

<style>
    canvas {
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
    }
</style>
