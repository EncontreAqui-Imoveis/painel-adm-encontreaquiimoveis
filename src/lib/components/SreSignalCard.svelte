<script lang="ts">
    export let title: string;
    export let value: string | number;
    export let unit: string = "";
    export let status: "healthy" | "warning" | "critical" = "healthy";
    export let trendValue: string = "";
    export let trendDirection: "up" | "down" | "neutral" = "neutral";

    const statusColors = {
        healthy:
            "bg-[#0b0f1a] text-gray-100 border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.05)]",
        warning:
            "bg-yellow-900/10 text-yellow-100 border-yellow-500/30 shadow-[0_4px_20px_rgba(234,179,8,0.1)]",
        critical:
            "bg-red-900/10 text-red-100 border-red-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
    };

    const statusIndicatorColors = {
        healthy: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]",
        warning: "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]",
        critical: "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]",
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
                class={`text-[10px] font-black flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-900/50 border border-white/5 backdrop-blur-sm ${
                    trendDirection === "down" && status === "healthy"
                        ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : trendDirection === "up" && status === "critical"
                          ? "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]"
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
            class="text-4xl font-black tracking-tighter text-white group-hover:text-emerald-400 transition-colors drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]"
        >
            {value}
        </span>
        {#if unit}
            <span
                class="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 opacity-80"
            >
                {unit}
            </span>
        {/if}
    </div>
</div>
