<script lang="ts">
    import { onMount } from 'svelte';
    import { requestAdminDashboardStats } from './adminSessionService';
    import { clearSessionToken, readSessionToken } from './sessionState';
    import KpiCard from './KpiCard.svelte';

    interface Stats {
        totalProperties: number;
        totalBrokers: number;
        totalUsers: number;
    }

    let stats: Stats | null = null;
    let isLoading = true;
    $: totalClients = stats ? Math.max(0, stats.totalUsers - stats.totalBrokers) : 0;

    onMount(async () => {
        const token = readSessionToken();
        if (!token) {
            clearSessionToken();
            return;
        }
        try {
            const response = await requestAdminDashboardStats(token);
            if (!response.ok) throw new Error('Falha ao buscar estatísticas');
            stats = await response.json();
        } catch (error) {
            console.error(error);
            clearSessionToken();
        } finally {
            isLoading = false;
        }
    });
</script>

<div>
    {#if isLoading}
        <p class="text-center text-gray-500 dark:text-gray-400">A carregar estatísticas...</p>
    {:else if stats}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KpiCard title="Total de Imóveis" value={stats.totalProperties} color="blue" />
            <KpiCard title="Total de Corretores" value={stats.totalBrokers} color="green" />
            <KpiCard title="Total de Usuários" value={stats.totalUsers} color="yellow" />
            <KpiCard title="Total de Clientes" value={totalClients} color="blue" />
        </div>
    {/if}
</div>

