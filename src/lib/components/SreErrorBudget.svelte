<script lang="ts">
    export let sloTarget: number = 99.9;
    export let sloCurrent: number = 99.95;

    // In minutes for a rolling 30-day window (43.2 minutes total allowed budget for 99.9%)
    export let budgetTotalRaw: number = 43.2;
    export let budgetSpentRaw: number = 12.5;

    $: budgetRemainingPercent = Math.max(
        0,
        100 - (budgetSpentRaw / budgetTotalRaw) * 100,
    );
    $: budgetStatusColor =
        budgetRemainingPercent > 50
            ? "bg-green-500"
            : budgetRemainingPercent > 20
              ? "bg-yellow-500"
              : "bg-red-500";

    $: sloStatusText =
        sloCurrent >= sloTarget
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400";
</script>

<div
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 pb-5 flex flex-col justify-between"
>
    <div class="mb-4">
        <div class="flex justify-between items-center mb-1">
            <h3
                class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
                Objetivo de Disponibilidade (SLO)
            </h3>
            <span
                class="text-xs font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300"
                >Alvo: {sloTarget}%</span
            >
        </div>
        <div class={`text-4xl font-black tracking-tight ${sloStatusText}`}>
            {sloCurrent.toFixed(2)}%
        </div>
    </div>

    <div>
        <div class="flex justify-between text-sm font-medium mb-2">
            <span class="text-gray-700 dark:text-gray-300"
                >Orçamento de Erro (30d)</span
            >
            <span class="text-gray-900 dark:text-gray-100"
                >{budgetRemainingPercent.toFixed(1)}% Restante</span
            >
        </div>

        <div
            class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden flex"
        >
            <!-- Spent Budget -->
            <div
                class="bg-gray-400 dark:bg-gray-500 h-3"
                style="width: {(budgetSpentRaw / budgetTotalRaw) * 100}%"
            ></div>
            <!-- Remaining Budget -->
            <div
                class="{budgetStatusColor} h-3 flex-1 transition-all duration-500 rounded-r-full"
            ></div>
        </div>

        <div
            class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400"
        >
            <span>Consumido: {budgetSpentRaw.toFixed(1)} min</span>
            <span>Total: {budgetTotalRaw.toFixed(1)} min permitidos</span>
        </div>
    </div>
</div>
