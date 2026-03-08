<script lang="ts">
    import { onMount } from "svelte";
    import Chart from "chart.js/auto";

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
    $: historyData = currentStats.history;

    let chartContainer: HTMLCanvasElement;
    let chartInstance: Chart | null = null;

    function updateChart() {
        if (!chartContainer) return;

        const ctx = chartContainer.getContext("2d");
        if (!ctx) return;

        if (chartInstance) {
            chartInstance.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.25)");
        gradient.addColorStop(0.6, "rgba(16, 185, 129, 0.05)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

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
                        tension: 0.45,
                        pointRadius: 0,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: "#10B981",
                        pointHoverBorderColor: "#fff",
                        pointHoverBorderWidth: 3,
                        shadowColor: "rgba(16, 185, 129, 0.5)",
                        shadowBlur: 15,
                    } as any,
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 20, bottom: 20, left: 10, right: 10 },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: "rgba(17, 24, 39, 0.95)",
                        titleColor: "#9ca3af",
                        bodyColor: "#fff",
                        padding: 16,
                        cornerRadius: 12,
                        displayColors: false,
                        borderColor: "rgba(255,255,255,0.1)",
                        borderWidth: 1,
                        callbacks: {
                            label: (context) =>
                                `Uptime: ${(context.parsed.y ?? 0).toFixed(3)}%`,
                        },
                    },
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        suggestedMin: Math.min(...historyData, 97) - 0.5,
                        suggestedMax: 100.5, // Safe margin to avoid clipping
                    },
                },
                interaction: { mode: "index", intersect: false },
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
                Métrica Real do Servidor Railway
            </p>
        </div>

        <!-- Premium Filter Switcher -->
        <div
            class="bg-black/40 backdrop-blur-md p-1.5 rounded-2xl flex gap-1 border border-white/5 shadow-inner"
        >
            {#each timeFilters as filter}
                <button
                    class="px-4 py-2 text-[9px] font-black rounded-xl transition-all duration-500 {activeFilter ===
                    filter
                        ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                        : 'text-gray-500 hover:text-gray-300'}"
                    on:click={() => (activeFilter = filter)}
                >
                    {filter}
                </button>
            {/each}
        </div>
    </div>

    <!-- Main Metric Section -->
    <div class="relative z-10 px-10 flex justify-between items-center mb-4">
        <div class="flex flex-col">
            <div class="flex items-baseline gap-1">
                <span
                    class="text-7xl font-black text-[#facc15] tracking-tighter drop-shadow-[0_0_25px_rgba(250,204,21,0.2)] select-none"
                >
                    {uptimeCurrent.toFixed(2)}
                </span>
                <span class="text-3xl font-black text-[#facc15]/60">%</span>
            </div>
        </div>

        <div class="flex flex-col items-end gap-2">
            <div
                class="px-6 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm"
            >
                <span
                    class="text-emerald-400 font-black italic text-xl tracking-[0.2em] shadow-emerald-500/50"
                    >OPERACIONAL</span
                >
            </div>
        </div>
    </div>

    <!-- Hyper-Premium Graph Area -->
    <div class="flex-1 w-full relative h-[300px] mt-2 mb-10 px-4">
        <div
            class="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none opacity-30"
        ></div>
        <canvas bind:this={chartContainer}></canvas>
    </div>

    <!-- Footer Stats Section -->
    <div class="relative z-10 mt-auto px-10 pb-10">
        <!-- Health Bar -->
        <div
            class="relative h-2.5 w-full bg-gray-900/50 rounded-full mb-8 overflow-hidden border border-white/5"
        >
            {#if uptimeCurrent < 100}
                <div
                    class="absolute left-0 top-0 h-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-1000"
                    style="width: 2%"
                ></div>
            {/if}
            <div
                class="absolute left-0 top-0 h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-1000"
                style="width: 100%; left: {uptimeCurrent < 100 ? '2%' : '0%'}"
            ></div>
        </div>

        <div
            class="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 backdrop-blur-sm"
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
                    >99.9%</span
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
    canvas {
        filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.1));
    }
</style>
