<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import BrokerReviewModal from './components/BrokerReviewModal.svelte';
    import type { Broker, BrokerDocuments } from './types';

    export let pendingBrokers: Broker[] = [];
    export let pendingDocumentBrokers: Broker[] = [];
    const dispatch = createEventDispatcher();
    let isModalOpen = false;
    let selectedBroker: Broker | null = null;
    let isMobileLayout =
        typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    let analysisBrokers: Broker[] = [];
    let pendingDocumentBrokersForDisplay: Broker[] = [];

    // Função para obter texto do status
    function getStatusText(status: string) {
        const statusMap: Record<string, string> = {
            'pending_verification': 'Pendente',
            'approved': 'Aprovado', 
            'rejected': 'Rejeitado',
            'pending': 'Pendente'
        };
        return statusMap[status] || status;
    }

    function getStatusClasses(status: string) {
        const statusMap: Record<string, string> = {
            'approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            'pending_verification': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }

    // ✅ CORREÇÃO: Função simplificada para URLs
    function getDocumentUrl(url: string | null | undefined): string {
        if (!url) return '';
        
        // Se a URL já é completa (http/https) ou é do Cloudinary, retorna como está
        if (url.startsWith('http') || url.includes('cloudinary')) {
            return url;
        }
        
        // Se for um caminho local (uploads/docs), não tente acessar - retorna vazio
        // pois no Railway esses arquivos não existem
        if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
            console.warn('URL local encontrada (não acessível em produção):', url);
            return '';
        }
        
        return url;
    }

    // ✅ Nova função para verificar se a URL é válida e acessível
    function isUrlAccessible(url: string | null | undefined): boolean {
        if (!url) return false;
        return url.startsWith('http') || url.includes('cloudinary');
    }

    function resolveDocumentField(broker: Broker, field: keyof BrokerDocuments): string | null {
        const fromDocuments = broker.documents?.[field];
        if (typeof fromDocuments === 'string' && fromDocuments.trim().length > 0) {
            return fromDocuments;
        }

        const legacySource = broker as unknown as Record<string, unknown>;
        const legacyValue = legacySource[field as string];
        if (typeof legacyValue === 'string' && legacyValue.trim().length > 0) {
            return legacyValue;
        }

        return null;
    }

    function hasRealDocuments(broker: Broker): boolean {
        return (
            Boolean(getDocumentUrl(resolveDocumentField(broker, 'creci_front_url'))) ||
            Boolean(getDocumentUrl(resolveDocumentField(broker, 'creci_back_url'))) ||
            Boolean(getDocumentUrl(resolveDocumentField(broker, 'selfie_url')))
        );
    }

    $: analysisBrokers = pendingBrokers.filter((broker) => hasRealDocuments(broker));
    $: pendingDocumentBrokersForDisplay =
        pendingDocumentBrokers.length > 0
            ? pendingDocumentBrokers
            : pendingBrokers.filter((broker) => !hasRealDocuments(broker));

    function reviewBroker(broker: Broker) {
        selectedBroker = broker;
        isModalOpen = true;
    }

    function handleModalUpdate(event: CustomEvent<{ brokerId: number; status: string; role?: string }>) {
        dispatch('refresh', event.detail);
    }

    function syncIsMobileLayout() {
        if (typeof window === 'undefined') return;
        isMobileLayout = window.innerWidth < 768;
    }
</script>

<svelte:window on:resize={syncIsMobileLayout} />

{#if isMobileLayout}
<div class="space-y-3">
    {#if analysisBrokers.length === 0 && pendingDocumentBrokersForDisplay.length === 0}
        <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Nenhuma solicitação pendente.
        </div>
    {:else if analysisBrokers.length === 0}
        <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Nenhuma solicitação em análise com documentos enviados.
        </div>
    {:else}
        {#each analysisBrokers as broker}
            <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-base font-semibold text-gray-900 dark:text-white">{broker.name}</p>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{broker.email}</p>
                        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">CRECI: {broker.creci}</p>
                    </div>
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getStatusClasses(broker.status)}">
                        {getStatusText(broker.status)}
                    </span>
                </div>
                <div class="mt-3 space-y-2 text-sm text-gray-500 italic">
                    Veja documentos no botão Revisar
                </div>
                <div class="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" on:click={() => reviewBroker(broker)}>
                        Revisar
                    </Button>
                </div>
            </article>
        {/each}
    {/if}

    {#if pendingDocumentBrokersForDisplay.length > 0}
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
            <h3 class="mb-2 font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                Documentos pendentes ({pendingDocumentBrokersForDisplay.length})
            </h3>
            <p class="text-xs text-amber-700 dark:text-amber-200">
                Há corretores com solicitação pendente, porém ainda sem documentos reais enviados para revisão.
            </p>
            <ul class="mt-3 space-y-2">
                {#each pendingDocumentBrokersForDisplay as broker}
                    <li class="flex items-center justify-between gap-3 rounded-md bg-amber-100/80 px-3 py-2 dark:bg-amber-900/40">
                        <span class="text-sm font-medium">{broker.name}</span>
                        <span class="text-xs text-amber-700 dark:text-amber-200">{broker.email}</span>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
</div>

{:else}
<div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CRECI</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Documentos</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {#if analysisBrokers.length === 0}
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Nenhuma solicitação pendente</h3>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Todas as verificações estão em dia.</p>
                    </td>
                </tr>
            {:else}
                {#each analysisBrokers as broker}
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {broker.id}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900 dark:text-white">{broker.name}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">{broker.email}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {broker.creci}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusClasses(broker.status)}">
                                {getStatusText(broker.status)}
                            </span>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex flex-col space-y-2 min-w-[200px] text-xs text-gray-400 italic">
                                Documentação disponível no modal de revisão
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div class="flex justify-end">
                                <Button variant="outline" size="sm" on:click={() => reviewBroker(broker)}>
                                    Revisar
                                </Button>
                            </div>
                        </td>
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>

    {#if pendingDocumentBrokersForDisplay.length > 0}
        <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
            <h3 class="mb-2 font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                Documentos pendentes ({pendingDocumentBrokersForDisplay.length})
            </h3>
            <p class="text-xs text-amber-700 dark:text-amber-200">
                Há corretores com solicitação pendente, porém ainda sem documentos reais enviados para revisão.
            </p>
            <ul class="mt-3 space-y-2">
                {#each pendingDocumentBrokersForDisplay as broker}
                    <li class="flex items-center justify-between gap-3 rounded-md bg-amber-100/80 px-3 py-2 dark:bg-amber-900/40">
                        <span class="text-sm font-medium">{broker.name}</span>
                        <span class="text-xs text-amber-700 dark:text-amber-200">{broker.email}</span>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
</div>
{/if}

<BrokerReviewModal
    bind:open={isModalOpen}
    broker={selectedBroker}
    showApprove={true}
    on:update={handleModalUpdate}
    on:close={() => (selectedBroker = null)}
/>
