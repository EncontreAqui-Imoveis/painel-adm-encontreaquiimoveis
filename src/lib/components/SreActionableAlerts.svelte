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
            "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300",
        high: "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-300",
        warning:
            "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300",
        info: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300",
        success:
            "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300",
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
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full"
>
    <div
        class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50"
    >
        <div>
            <h3
                class="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
                <svg
                    class="w-5 h-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                Alertas Acionáveis
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Incidentes e notificações requerendo atenção
            </p>
        </div>
        {#if criticalCount > 0}
            <span
                class="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
            >
                {criticalCount} Críticos
            </span>
        {:else if alerts.length > 0}
            <span
                class="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
                {alerts.length} Notificações
            </span>
        {/if}
    </div>

    <div class="p-5 flex-1 overflow-auto">
        {#if alerts.length === 0}
            <div
                class="flex flex-col items-center justify-center h-full text-center py-8"
            >
                <div
                    class="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-3"
                >
                    <svg
                        class="w-8 h-8 text-green-600 dark:text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <p class="font-medium text-gray-900 dark:text-gray-100">
                    Nenhum evento crítico
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Sistemas operando normalmente sem requerer intervenção.
                </p>
            </div>
        {:else}
            <div class="space-y-3">
                {#each alerts as alert}
                    <div
                        class={`border-l-4 rounded-r-lg p-3 ${severityColors[alert.severity]}`}
                    >
                        <div class="flex items-start gap-3">
                            <div class="mt-0.5">
                                {@html severityIcons[alert.severity]}
                            </div>
                            <div class="flex-1">
                                <div class="flex justify-between items-start">
                                    <h4 class="text-sm font-bold">
                                        {alert.service}
                                    </h4>
                                    <span
                                        class="text-xs font-semibold opacity-70"
                                        >{alert.time}</span
                                    >
                                </div>
                                <p class="text-sm mt-1">{alert.message}</p>
                                <div
                                    class="flex items-center gap-4 mt-2 text-xs font-medium opacity-80"
                                >
                                    <span class="flex items-center gap-1">
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
                                        class="hover:underline flex items-center gap-1"
                                    >
                                        Reconhecer (ACK)
                                        <svg
                                            class="w-3 h-3"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
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
