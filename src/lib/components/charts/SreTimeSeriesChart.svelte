<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';

    export let title: string;
    export let labels: string[] = [];
    export let data: number[] = [];
    export let borderColor: string = '#3B82F6';
    export let backgroundColor: string = 'rgba(59, 130, 246, 0.1)';
    export let chartId: string = `chart-${Math.random().toString(36).substr(2, 9)}`;

    let chartContainer: HTMLCanvasElement;
    let chartInstance: Chart | null = null;

    $: if (chartInstance && data.length > 0) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update('none'); // Update without full animation
    }

    onMount(() => {
        const ctx = chartContainer.getContext('2d');
        if (ctx) {
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: title,
                        data: data,
                        borderColor: borderColor,
                        backgroundColor: backgroundColor,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0, // Hide points for sparkline effect
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        x: { display: false }, // Hide axes for cleaner look
                        y: { 
                            display: true, 
                            position: 'right',
                            border: { display: false },
                            grid: { color: 'rgba(156, 163, 175, 0.1)' }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }

        return () => {
            if (chartInstance) chartInstance.destroy();
        };
    });
</script>

<div class="w-full h-40">
    <canvas bind:this={chartContainer} id={chartId}></canvas>
</div>
