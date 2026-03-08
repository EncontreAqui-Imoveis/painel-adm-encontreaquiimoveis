<script lang="ts">
    import { onMount } from "svelte";
    import Chart from "chart.js/auto";

    export let title: string;
    export let labels: string[] = [];
    export let data: number[] = [];
    export let borderColor: string = "#3B82F6";
    export let backgroundColor: string = "rgba(59, 130, 246, 0.1)";
    export let chartId: string = `chart-${Math.random().toString(36).substr(2, 9)}`;

    const timeFilters = ["Minuto", "Hora", "Dia", "Mês", "Ano", "Total"];
    let activeFilter = "Hora";

    let chartContainer: HTMLCanvasElement;
    let chartInstance: Chart | null = null;

    // Simulate different ranges by slicing the mock data
    $: filteredData = getFilteredData(data, activeFilter);
    $: filteredLabels = getFilteredLabels(labels, activeFilter);

    function getFilteredData(baseData: number[], filter: string) {
        if (!baseData || baseData.length === 0) return [];
        // In a real app, this would trigger an API call.
        // Here we just mock zooming in by taking slices of the array.
        const ratios: Record<string, number> = {
            Minuto: 0.1,
            Hora: 0.3,
            Dia: 0.5,
            Mês: 0.7,
            Ano: 0.9,
            Total: 1.0,
        };
        const sliceIndex = Math.floor(baseData.length * (1 - ratios[filter]));
        return baseData.slice(sliceIndex);
    }

    function getFilteredLabels(baseLabels: string[], filter: string) {
        if (!baseLabels || baseLabels.length === 0) return [];
        const ratios: Record<string, number> = {
            Minuto: 0.1,
            Hora: 0.3,
            Dia: 0.5,
            Mês: 0.7,
            Ano: 0.9,
            Total: 1.0,
        };
        const sliceIndex = Math.floor(baseLabels.length * (1 - ratios[filter]));
        return baseLabels.slice(sliceIndex);
    }

    $: if (chartInstance && filteredData.length > 0) {
        chartInstance.data.labels = filteredLabels;
        chartInstance.data.datasets[0].data = filteredData;
        chartInstance.update("none"); // Update without full animation
    }

    onMount(() => {
        const ctx = chartContainer.getContext("2d");
        if (ctx) {
            chartInstance = new Chart(ctx, {
                type: "line",
                data: {
                    labels: filteredLabels,
                    datasets: [
                        {
                            label: title,
                            data: filteredData,
                            borderColor: borderColor,
                            backgroundColor: backgroundColor,
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0, // Hide points for sparkline effect
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
                            mode: "index",
                            intersect: false,
                        },
                    },
                    scales: {
                        x: { display: false }, // Hide axes for cleaner look
                        y: {
                            display: true,
                            position: "right",
                            border: { display: false },
                            grid: { color: "rgba(156, 163, 175, 0.1)" },
                        },
                    },
                    interaction: {
                        mode: "nearest",
                        axis: "x",
                        intersect: false,
                    },
                },
            });
        }

        return () => {
            if (chartInstance) chartInstance.destroy();
        };
    });
</script>

<div class="flex flex-col h-full w-full">
    <div class="flex flex-wrap gap-1 mb-4 z-20">
        {#each timeFilters as filter}
            <button
                class={`px-3 py-1 text-[10px] font-black rounded-lg transition-all duration-300 ${activeFilter === filter ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                on:click={() => (activeFilter = filter)}
            >
                {filter}
            </button>
        {/each}
    </div>
    <div class="w-full h-48 relative">
        <canvas bind:this={chartContainer} id={chartId}></canvas>
    </div>
</div>
