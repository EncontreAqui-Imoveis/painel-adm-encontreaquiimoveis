<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import BrokerReviewModal from '$lib/components/BrokerReviewModal.svelte';
    import type { Broker, BrokerDocuments } from './types';

    export let pendingBrokers: Broker[] = [];
    const dispatch = createEventDispatcher();
    let isModalOpen = false;
    let selectedBroker: Broker | null = null;

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

    function reviewBroker(broker: Broker) {
        selectedBroker = broker;
        isModalOpen = true;
    }

    function handleModalUpdate() {
        dispatch('refresh');
    }
</script>

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
            {#if pendingBrokers.length === 0}
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
                {#each pendingBrokers as broker}
                    {@const creciFrontUrl = resolveDocumentField(broker, 'creci_front_url')}
                    {@const creciBackUrl = resolveDocumentField(broker, 'creci_back_url')}
                    {@const selfieUrl = resolveDocumentField(broker, 'selfie_url')}
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
                            <div class="flex flex-col space-y-2 min-w-[200px]">
                                {#if creciFrontUrl && isUrlAccessible(creciFrontUrl)}
                                    <a href={getDocumentUrl(creciFrontUrl)} target="_blank"
                                       class="inline-flex items-center text-sm text-green-600 hover:text-green-900 dark:text-green-400 transition-colors">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Frente do CRECI
                                    </a>
                                {:else}
                                    <span class="text-xs text-gray-400 italic">
                                        {creciFrontUrl ? 'URL não acessível' : 'Frente do CRECI não enviada'}
                                    </span>
                                {/if}

                                {#if creciBackUrl && isUrlAccessible(creciBackUrl)}
                                    <a href={getDocumentUrl(creciBackUrl)} target="_blank"
                                       class="inline-flex items-center text-sm text-green-600 hover:text-green-900 dark:text-green-400 transition-colors">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Verso do CRECI
                                    </a>
                                {:else}
                                    <span class="text-xs text-gray-400 italic">
                                        {creciBackUrl ? 'URL não acessível' : 'Verso do CRECI não enviado'}
                                    </span>
                                {/if}

                                {#if selfieUrl && isUrlAccessible(selfieUrl)}
                                    <a href={getDocumentUrl(selfieUrl)} target="_blank"
                                       class="inline-flex items-center text-sm text-green-600 hover:text-green-900 dark:text-green-400 transition-colors">
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Selfie
                                    </a>
                                {:else}
                                    <span class="text-xs text-gray-400 italic">
                                        {selfieUrl ? 'URL não acessível' : 'Selfie não enviada'}
                                    </span>
                                {/if}
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
</div>

<BrokerReviewModal
    bind:open={isModalOpen}
    broker={selectedBroker}
    showApprove={true}
    on:update={handleModalUpdate}
    on:close={() => (selectedBroker = null)}
/>
