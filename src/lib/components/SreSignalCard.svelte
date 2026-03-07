<script lang="ts">
    export let title: string;
    export let value: string | number;
    export let unit: string = "";
    export let status: "healthy" | "warning" | "critical" = "healthy";
    export let trendValue: string = "";
    export let trendDirection: "up" | "down" | "neutral" = "neutral";

    const statusColors = {
        healthy:
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700",
        warning:
            "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700",
        critical:
            "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-red-300 dark:border-red-700",
    };

    const statusIndicatorColors = {
        healthy: "bg-green-500",
        warning: "bg-yellow-500",
        critical: "bg-red-500",
    };

    $: currentStatusClasses = statusColors[status];
    $: currentIndicatorClass = statusIndicatorColors[status];
</script>

<div
    class={`p-5 rounded-xl border flex flex-col justify-between shadow-sm transition-all duration-200 ${currentStatusClasses}`}
>
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
            <span
                class={`w-2.5 h-2.5 rounded-full ${currentIndicatorClass} animate-pulse`}
            ></span>
            <h3 class="text-xs font-bold uppercase tracking-wider opacity-80">
                {title}
            </h3>
        </div>
        {#if trendValue}
            <div
                class={`text-xs font-medium flex items-center gap-1 opacity-80 ${trendDirection === "down" && status === "healthy" ? "text-green-600 dark:text-green-400" : ""}`}
            >
                {#if trendDirection === "up"}
                    <svg
                        class="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                        ></path></svg
                    >
                {:else if trendDirection === "down"}
                    <svg
                        class="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        ></path></svg
                    >
                {/if}
                {trendValue}
            </div>
        {/if}
    </div>

    <div class="flex items-baseline gap-1 mt-1">
        <span class="text-3xl font-black tracking-tight">{value}</span>
        {#if unit}
            <span class="text-sm font-semibold opacity-70 mb-1">{unit}</span>
        {/if}
    </div>
</div>
