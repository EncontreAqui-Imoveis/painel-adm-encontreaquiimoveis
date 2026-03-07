<script lang="ts">
    export let uptimeCurrent: number = 99.95;

    // Total downtime in minutes for a rolling 30-day window
    export let downtimeMinutes: number = 12.5;

    // Status logic based on availability
    $: uptimeStatusColor =
        uptimeCurrent >= 99.9
            ? "bg-green-500"
            : uptimeCurrent >= 99.0
              ? "bg-yellow-500"
              : "bg-red-500";

    $: uptimeStatusText =
        uptimeCurrent >= 99.9
            ? "text-green-600 dark:text-green-400"
            : uptimeCurrent >= 99.0
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600 dark:text-red-400";
</script>

<div
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 pb-5 flex flex-col justify-between h-full"
>
    <div class="mb-4">
        <div class="flex justify-between items-center mb-1">
            <h3
                class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
                Disponibilidade do Servidor
            </h3>
            <span
                class="text-xs font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300"
                >Mensal (30d)</span
            >
        </div>
        <div class={`text-4xl font-black tracking-tight ${uptimeStatusText}`}>
            {uptimeCurrent.toFixed(2)}%
        </div>
    </div>

    <div>
        <div class="flex justify-between text-sm font-medium mb-2">
            <span class="text-gray-700 dark:text-gray-300"
                >Tempo de Atividade</span
            >
            <span class="text-gray-900 dark:text-gray-100"
                >{uptimeStatusColor === "bg-green-500"
                    ? "Excelente"
                    : uptimeStatusColor === "bg-yellow-500"
                      ? "Alerta"
                      : "Crítico"}</span
            >
        </div>

        <div
            class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden flex"
        >
            <!-- Downtime (approx max 1% for visual scale) -->
            <div
                class="bg-red-400 dark:bg-red-500 h-3"
                style="width: {Math.min(100, (100 - uptimeCurrent) * 100)}%"
            ></div>
            <!-- Uptime -->
            <div
                class="{uptimeStatusColor} h-3 flex-1 transition-all duration-500"
            ></div>
        </div>

        <div
            class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2"
        >
            <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-500 inline-block"
                ></span>
                Inatividade: {downtimeMinutes.toFixed(1)} min
            </span>
            <span class="opacity-80">Últimos 30 dias</span>
        </div>
    </div>
</div>
