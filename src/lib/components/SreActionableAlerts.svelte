<script lang="ts">
    export let alerts: {
        id: string;
        severity: "critical" | "high" | "warning" | "info" | "success";
        message: string;
        service: string;
        duration: string;
        time: string;
    }[] = [];

    const severityColors = {
        critical:
            "border-red-500/50 bg-red-900/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
        high: "border-orange-500/50 bg-orange-900/20 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.15)]",
        warning:
            "border-yellow-500/50 bg-yellow-900/20 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.15)]",
        info: "border-blue-500/50 bg-blue-900/20 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
        success:
            "border-green-500/50 bg-green-900/20 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.15)]",
    };

    const severityIcons = {
        critical:
            '<svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
        high: '<svg class="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        warning:
            '<svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        info: '<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        success:
            '<svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>',
    };

    $: criticalCount = alerts.filter(
        (a) => a.severity === "critical" || a.severity === "high",
    ).length;
</script>

<div
    class="bg-[#0b0f1a] rounded-[2.5rem] border border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full relative"
>
    <!-- Background element -->
    <div
        class="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none"
    ></div>

    <div
        class="px-8 pt-8 pb-6 border-b border-gray-800/50 flex justify-between items-start z-10"
    >
        <div class="flex flex-col gap-2">
            <h3
                class="font-black text-white text-xl flex items-center gap-3 tracking-tight"
            >
                <div
                    class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
                ></div>
                Incidentes
            </h3>
            <p
                class="text-[10px] text-gray-500 font-bold tracking-[0.3em] uppercase"
            >
                Ações Imediatas & Alertas
            </p>
        </div>
        {#if criticalCount > 0}
            <span
                class="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black px-3 py-1.5 rounded-xl animate-pulse tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
                {criticalCount} Críticos
            </span>
        {:else if alerts.length > 0}
            <span
                class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black px-3 py-1.5 rounded-xl tracking-widest uppercase"
            >
                {alerts.length} Ativos
            </span>
        {/if}
    </div>

    <div class="p-8 flex-1 overflow-y-auto custom-scrollbar z-10">
        {#if alerts.length === 0}
            <div
                class="flex flex-col items-center justify-center h-full text-center py-8 opacity-40"
            >
                <div
                    class="bg-emerald-500/10 p-4 rounded-3xl mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                >
                    <svg
                        class="w-10 h-10 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <p class="font-black text-white text-lg tracking-tight">
                    Tudo Operacional
                </p>
                <p
                    class="text-xs text-gray-500 font-bold mt-2 uppercase tracking-widest"
                >
                    Zero Incidentes Ativos
                </p>
            </div>
        {:else}
            <div class="space-y-4">
                {#each alerts as alert}
                    <div
                        class={`border-l-4 rounded-xl p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${severityColors[alert.severity]}`}
                    >
                        <div class="flex items-start gap-4">
                            <div class="mt-1 opacity-80">
                                {@html severityIcons[alert.severity]}
                            </div>
                            <div class="flex-1">
                                <div
                                    class="flex justify-between items-start mb-1"
                                >
                                    <h4
                                        class="text-[13px] font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                    >
                                        {alert.service}
                                    </h4>
                                    <span
                                        class="text-[10px] font-black tracking-widest opacity-60 bg-black/20 px-2 py-0.5 rounded-md"
                                        >{alert.time}</span
                                    >
                                </div>
                                <p
                                    class="text-sm mt-1.5 opacity-90 font-medium leading-relaxed"
                                >
                                    {alert.message}
                                </p>
                                <div
                                    class="flex items-center gap-4 mt-4 text-[10px] font-black tracking-widest uppercase opacity-70"
                                >
                                    <span
                                        class="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg"
                                    >
                                        <svg
                                            class="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            /></svg
                                        >
                                        Duração: {alert.duration}
                                    </span>
                                    <button
                                        class="hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-lg transition-all duration-300 flex items-center gap-1.5"
                                    >
                                        ACK (PULL)
                                        <svg
                                            class="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2.5"
                                                d="M9 5l7 7-7 7"
                                            /></svg
                                        >
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #1f2937;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #374151;
    }
</style>
