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
        uptimeCurrent: 99.95,
        downtimeMinutes: 12.5,
        history: [],
    };
    $: uptimeCurrent = currentStats.uptimeCurrent;
    $: downtimeMinutes = currentStats.downtimeMinutes;
    $: historyData = currentStats.history;

    $: uptimeStatusColor =
        uptimeCurrent >= 99.9
            ? "bg-green-500"
            : uptimeCurrent >= 99.0
              ? "bg-yellow-500"
              : "bg-red-500";

    $: uptimeStatusText =
        uptimeCurrent >= 99.9
            ? "text-green-600 dark:text-green-400"
            : uptimeCurrent >= 99.0
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600 dark:text-red-400";

    let chartContainer: HTMLCanvasElement;
    let chartInstance: Chart | null = null;
    let chartId: string = `availability-chart-${Math.random().toString(36).substr(2, 9)}`;

    function updateChart() {
        if (!chartInstance && chartContainer) {
            const ctx = chartContainer.getContext("2d");
            if (ctx) {
                chartInstance = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels: historyData.map((_, i) => `${i + 1}`),
                        datasets: [
                            {
                                label: "Uptime (%)",
                                data: historyData,
                                borderColor:
                                    uptimeCurrent >= 99.9
                                        ? "#10B981"
                                        : uptimeCurrent >= 99.0
                                          ? "#F59E0B"
                                          : "#EF4444",
                                backgroundColor:
                                    uptimeCurrent >= 99.9
                                        ? "rgba(16, 185, 129, 0.1)"
                                        : uptimeCurrent >= 99.0
                                          ? "rgba(245, 158, 11, 0.1)"
                                          : "rgba(239, 68, 68, 0.1)",
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
                            tooltip: { mode: "index", intersect: false },
                        },
                        scales: {
                            x: { display: false },
                            y: { display: false, min: 98, max: 100 },
                        },
                        interaction: {
                            mode: "nearest",
                            axis: "x",
                            intersect: false,
                        },
                    },
                });
            }
        } else if (chartInstance) {
            chartInstance.data.labels = historyData.map((_, i) => `${i + 1}`);
            chartInstance.data.datasets[0].data = historyData;
            chartInstance.data.datasets[0].borderColor =
                uptimeCurrent >= 99.9
                    ? "#10B981"
                    : uptimeCurrent >= 99.0
                      ? "#F59E0B"
                      : "#EF4444";
            chartInstance.data.datasets[0].backgroundColor =
                uptimeCurrent >= 99.9
                    ? "rgba(16, 185, 129, 0.1)"
                    : uptimeCurrent >= 99.0
                      ? "rgba(245, 158, 11, 0.1)"
                      : "rgba(239, 68, 68, 0.1)";
            chartInstance.update("none");
        }
    }

    // Reactively update the chart when the data or filter changes
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
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 pb-5 flex flex-col justify-between h-full"
>
    <div>
        <div
            class="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2"
        >
            <h3
                class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
                Disponibilidade
            </h3>
            <div class="flex flex-wrap gap-1">
                {#each timeFilters as filter}
                    <button
                        class={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${activeFilter === filter ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"}`}
                        on:click={() => (activeFilter = filter)}
                    >
                        {filter}
                    </button>
                {/each}
            </div>
        </div>

        <div class="flex items-end justify-between mb-4">
            <div
                class={`text-4xl font-black tracking-tight ${uptimeStatusText}`}
            >
                {uptimeCurrent.toFixed(2)}%
            </div>
            <div class="text-right">
                <div class="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {uptimeStatusColor === "bg-green-500"
                        ? "Excelente"
                        : uptimeStatusColor === "bg-yellow-500"
                          ? "Atenção"
                          : "Crítico"}
                </div>
            </div>
        </div>
    </div>

    <!-- The interactive Sparkline Chart -->
    <div class="w-full h-16 relative mb-4">
        <canvas bind:this={chartContainer} id={chartId}></canvas>
    </div>

    <div>
        <!-- Progress bar mimicking the historical single-bar design -->
        <div
            class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2 overflow-hidden flex"
        >
            <!-- Downtime slice -->
            <div
                class="bg-red-400 dark:bg-red-500 h-2"
                style="width: {Math.min(100, (100 - uptimeCurrent) * 100)}%"
            ></div>
            <!-- Uptime slice -->
            <div
                class="{uptimeStatusColor} h-2 flex-1 transition-all duration-500"
            ></div>
        </div>

        <div
            class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2"
        >
            <span class="flex items-center gap-1">
                <span
                    class="w-2 h-2 rounded-full {downtimeMinutes > 0
                        ? 'bg-red-500'
                        : 'bg-green-500'} inline-block"
                ></span>
                Inatividade: {downtimeMinutes.toFixed(1)} min
            </span>
            <span class="opacity-80 font-medium"
                >{filterLabels[activeFilter]}</span
            >
        </div>
    </div>
</div>
