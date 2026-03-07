<script lang="ts">
    import { onMount } from "svelte";
    import Chart from "chart.js/auto";

    export let automatedCount: number = 85;
    export let manualCount: number = 15;

    let canvas: HTMLCanvasElement;
    let chartInstance: any;

    onMount(() => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const isDarkMode = document.documentElement.classList.contains("dark");
        const textColor = isDarkMode ? "#e5e7eb" : "#374151";

        chartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["100% Automatizado", "Intervenção Manual (Toil)"],
                datasets: [
                    {
                        data: [automatedCount, manualCount],
                        backgroundColor: [
                            "#10B981", // green-500
                            "#F59E0B", // amber-500
                        ],
                        borderWidth: 0,
                        hoverOffset: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "75%",
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ` ${context.label}: ${context.raw}%`;
                            },
                        },
                    },
                },
            },
        });

        return () => {
            if (chartInstance) chartInstance.destroy();
        };
    });
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
                    class="w-5 h-5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
                Trabalho Automático vs Manual
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Redução de TOIL na máquina de estados de contratos
            </p>
        </div>
    </div>

    <div class="p-5 flex-1 flex flex-col justify-center items-center">
        <div class="relative w-full h-36 flex justify-center">
            <canvas bind:this={canvas}></canvas>
            <div
                class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            >
                <span class="text-2xl font-black text-gray-900 dark:text-white"
                    >{automatedCount}%</span
                >
                <span
                    class="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400"
                    >Automatizado</span
                >
            </div>
        </div>

        <div class="flex justify-center gap-6 mt-6 w-full px-2">
            <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-500 block"></span>
                <span
                    class="text-xs font-medium text-gray-600 dark:text-gray-300"
                    >Automação PLena</span
                >
            </div>
            <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-amber-500 block"></span>
                <span
                    class="text-xs font-medium text-gray-600 dark:text-gray-300"
                    >Admin Toil</span
                >
            </div>
        </div>
    </div>
</div>
