<script lang="ts">
    import { onMount } from "svelte";
    import {
        requestAdminDashboardStats,
        requestAdminSreStats,
    } from "./adminSessionService";
    import { clearSessionToken, readSessionToken } from "./sessionState";
    import KpiCard from "./KpiCard.svelte";
    import SreSignalCard from "./components/SreSignalCard.svelte";
    import SreTimeSeriesChart from "./components/charts/SreTimeSeriesChart.svelte";

    interface BusinessStats {
        totalProperties: number;
        totalBrokers: number;
        totalUsers: number;
    }

    interface SignalData {
        value: number | string;
        unit: string;
        status: "healthy" | "warning" | "critical";
        trend: "up" | "down" | "neutral";
        trendValue: string;
        history: number[];
    }

    interface SreStats {
        latency: SignalData & { p99: number };
        traffic: SignalData & { rps: number };
        errors: SignalData & { rate: number };
        saturation: SignalData & { cpu: number };
    }

    let businessStats: BusinessStats | null = null;
    let sreStats: SreStats | null = null;
    let isLoading = true;

    $: totalClients = businessStats
        ? Math.max(0, businessStats.totalUsers - businessStats.totalBrokers)
        : 0;

    // Labels mockadas para o gráfico (ex: últimas 12 horas)
    const timeLabels = Array.from(
        { length: 12 },
        (_, i) => `${i * 2}h atrás`,
    ).reverse();

    onMount(async () => {
        const token = readSessionToken();
        if (!token) {
            clearSessionToken();
            return;
        }
        try {
            // Buscando métricas em paralelo
            const [bizResponse, sreResponse] = await Promise.all([
                requestAdminDashboardStats(token),
                requestAdminSreStats(token),
            ]);

            if (!bizResponse.ok)
                throw new Error("Falha ao buscar estatísticas de negócios");
            if (!sreResponse.ok)
                throw new Error("Falha ao buscar estatísticas SRE");

            businessStats = await bizResponse.json();
            sreStats = await sreResponse.json();
        } catch (error) {
            console.error(error);
            clearSessionToken();
        } finally {
            isLoading = false;
        }
    });
</script>

<div class="space-y-8">
    {#if isLoading}
        <div class="flex items-center justify-center p-12">
            <p
                class="text-center text-gray-500 dark:text-gray-400 flex items-center gap-2"
            >
                <svg
                    class="animate-spin h-5 w-5 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                    ></circle>
                    <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
                Carregando métricas de operabilidade...
            </p>
        </div>
    {:else if sreStats}
        <!-- Golden Signals Section -->
        <section>
            <div class="mb-4">
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Quatro Sinais de Ouro (SRE)
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    Monitoramento da saúde e estabilidade da plataforma.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SreSignalCard
                    title="Latência (p99)"
                    value={sreStats.latency.p99}
                    unit={sreStats.latency.unit}
                    status={sreStats.latency.status}
                    trendDirection={sreStats.latency.trend}
                    trendValue={sreStats.latency.trendValue}
                />

                <SreSignalCard
                    title="Tráfego"
                    value={sreStats.traffic.rps}
                    unit={sreStats.traffic.unit}
                    status={sreStats.traffic.status}
                    trendDirection={sreStats.traffic.trend}
                    trendValue={sreStats.traffic.trendValue}
                />

                <SreSignalCard
                    title="Erros"
                    value={sreStats.errors.rate}
                    unit={sreStats.errors.unit}
                    status={sreStats.errors.status}
                    trendDirection={sreStats.errors.trend}
                    trendValue={sreStats.errors.trendValue}
                />

                <SreSignalCard
                    title="Saturação (CPU)"
                    value={sreStats.saturation.cpu}
                    unit={sreStats.saturation.unit}
                    status={sreStats.saturation.status}
                    trendDirection={sreStats.saturation.trend}
                    trendValue={sreStats.saturation.trendValue}
                />
            </div>
        </section>

        <!-- Charts Section -->
        <section
            class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 border-b border-gray-200 dark:border-gray-800"
        >
            <div
                class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
            >
                <h3
                    class="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4 opacity-80"
                >
                    Latência Histórica (p99)
                </h3>
                <SreTimeSeriesChart
                    title="Latência (ms)"
                    labels={timeLabels}
                    data={sreStats.latency.history}
                    borderColor="#3B82F6"
                    backgroundColor="rgba(59, 130, 246, 0.1)"
                />
            </div>
            <div
                class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
            >
                <h3
                    class="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4 opacity-80"
                >
                    Taxa de Erros Histórica (%)
                </h3>
                <SreTimeSeriesChart
                    title="Erros (%)"
                    labels={timeLabels}
                    data={sreStats.errors.history}
                    borderColor="#EF4444"
                    backgroundColor="rgba(239, 68, 68, 0.1)"
                />
            </div>
        </section>

        <!-- Legacy Business Metrics Section (Smaller context) -->
        {#if businessStats}
            <section class="opacity-80">
                <div class="mb-4">
                    <h2
                        class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                        KPIs de Negócio (Visão Geral)
                    </h2>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard
                        title="Imóveis"
                        value={businessStats.totalProperties}
                        color="blue"
                    />
                    <KpiCard
                        title="Corretores"
                        value={businessStats.totalBrokers}
                        color="green"
                    />
                    <KpiCard
                        title="Usuários"
                        value={businessStats.totalUsers}
                        color="yellow"
                    />
                    <KpiCard
                        title="Clientes"
                        value={totalClients}
                        color="blue"
                    />
                </div>
            </section>
        {/if}
    {/if}
</div>
