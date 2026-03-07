<script lang="ts">
    export let title: string;
    export let value: string | number;
    export let unit: string = "";
    export let status: "healthy" | "warning" | "critical" = "healthy";
    export let trendValue: string = "";
    export let trendDirection: "up" | "down" | "neutral" = "neutral";

    const statusColors = {
        healthy:
            "bg-white dark:bg-[#111827] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        warning:
            "bg-yellow-50 dark:bg-yellow-900/10 text-yellow-900 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700/50 shadow-[0_4px_20px_rgba(234,179,8,0.1)]",
        critical:
            "bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100 border-red-300 dark:border-red-700/50 shadow-[0_4px_20px_rgba(239,68,68,0.1)]",
    };

    const statusIndicatorColors = {
        healthy: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        warning: "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]",
        critical: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    };

    $: currentStatusClasses = statusColors[status];
    $: currentIndicatorClass = statusIndicatorColors[status];
</script>

<div
    class={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group active:scale-[0.98] ${currentStatusClasses}`}
>
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
            <div class="relative">
                <span
                    class={`w-2 h-2 rounded-full block ${currentIndicatorClass}`}
                ></span>
                <span
                    class={`absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-40 ${currentIndicatorClass}`}
                ></span>
            </div>
            <h3
                class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 group-hover:text-gray-300 transition-colors"
            >
                {title}
            </h3>
        </div>

        {#if trendValue}
            <div
                class={`text-[10px] font-black flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/50 ${
                    trendDirection === "down" && status === "healthy"
                        ? "text-emerald-500"
                        : trendDirection === "up" && status === "critical"
                          ? "text-red-500"
                          : "text-gray-400"
                }`}
            >
                {#if trendDirection === "up"}
                    <svg
                        class="w-2.5 h-2.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="3"
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                        ></path>
                    </svg>
                {:else if trendDirection === "down"}
                    <svg
                        class="w-2.5 h-2.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="3"
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        ></path>
                    </svg>
                {/if}
                {trendValue}
            </div>
        {/if}
    </div>

    <div class="flex items-baseline gap-1.5 mt-2">
        <span
            class="text-4xl font-black tracking-tighter dark:text-white group-hover:text-indigo-400 transition-colors"
        >
            {value}
        </span>
        {#if unit}
            <span
                class="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60"
            >
                {unit}
            </span>
        {/if}
    </div>
</div>
