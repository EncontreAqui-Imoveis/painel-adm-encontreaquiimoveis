<script lang="ts">
    import Table from './Table.svelte';
    import Pagination from './Pagination.svelte';
    import FilterControls from './FilterControls.svelte';
    import Modal from './Modal.svelte';
    import { fetchPlatformResponse } from './adminFetchService';
    import { readErrorContext } from './httpError';
    import { reportObservedError } from './observability';
    import { clearSessionToken, hasSessionToken } from './sessionState';
    import { onMount } from 'svelte';
    import type { Property, Broker, User, View } from './types';

    export let view: 'properties' | 'brokers' | 'users';

    type DataItem = Property | Broker | User;
    
    let paginatedData: DataItem[] = [];
    let headers: string[] = [];
    let isLoading: boolean = true;
    let showModal = false;
    let itemToDelete: { id: number; type: string } | null = null;

    let searchTerm = '';
    let searchColumn = 'all';
    let itemsPerPage = 10;
    let currentPage = 1;
    let totalItems = 0;
    let normalizedView: View = 'properties';

    const viewConfig = {
        properties: { 
            endpoint: '/properties', 
            headers: ['ID', 'Título', 'Tipo', 'Status', 'Preço', 'Cidade', 'Corretor ID'],
            filterOptions: [
                { value: 'id', label: 'ID do Imóvel' },
                { value: 'title', label: 'Título' },
                { value: 'type', label: 'Tipo' },
                { value: 'city', label: 'Cidade' },
                { value: 'price_gt', label: 'Preço >' },
                { value: 'price_lt', label: 'Preço <' },
                { value: 'broker_id', label: 'ID do Corretor' },
            ]
        },
        brokers: { 
            endpoint: '/admin/brokers', 
            headers: ['ID', 'Nome', 'Email', 'CRECI', 'Criado em'],
            filterOptions: [
                { value: 'name', label: 'Nome' },
                { value: 'email', label: 'Email' },
                { value: 'creci', label: 'CRECI' },
            ]
        },
        users: { 
            endpoint: '/admin/users', 
            headers: ['ID', 'Nome', 'Email', 'Telefone', 'Criado em'],
            filterOptions: [
                { value: 'name', label: 'Nome' },
                { value: 'email', label: 'Email' },
                { value: 'phone', label: 'Telefone' },
                { value: 'created_at', label: 'Data de Criação' },
            ]
        }
    };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    type DeleteEventDetail = { id: number; type: string };

    function handleDeleteRequest(event: CustomEvent<DeleteEventDetail>) {
        showModal = true;
        itemToDelete = event.detail;
    }
    async function fetchData() {
        isLoading = true;
        if (!hasSessionToken()) {
            clearSessionToken();
            isLoading = false;
            return;
        }
        
        const config = viewConfig[view];
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(itemsPerPage),
            search: searchTerm,
            searchColumn: searchColumn,
        });

        try {
            const response = await fetchPlatformResponse(`${config.endpoint}?${params.toString()}`);
            if (!response) {
                isLoading = false;
                return;
            }
            if (!response.ok) {
                const errorContext = await readErrorContext(response);
                console.error(`Erro ao buscar dados de ${view}:`, errorContext);
                reportObservedError(new Error(errorContext.message || 'Falha na autenticação'), {
                    module: 'table-view',
                    status: errorContext.status,
                    requestId: errorContext.requestId,
                    url: config.endpoint,
                    message: errorContext.message || 'Falha na autenticação',
                });
                throw new Error('Falha na autenticação');
            }
            
            const { data, total } = await response.json();
            paginatedData = data;
            totalItems = total;
            headers = config.headers;
        } catch (error) {
            console.error(`Erro ao buscar dados de ${view}:`, error);
            clearSessionToken();
        } finally {
            isLoading = false;
        }
    }

    async function handleDeleteConfirm() {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;
        const endpoint = type === 'property' ? `/admin/properties/${id}` : `/admin/${type}s/${id}`;
        try {
            const response = await fetchPlatformResponse(endpoint, {
                method: 'DELETE',
            });
            if (!response) {
                return;
            }
            if (!response.ok) {
                const errorContext = await readErrorContext(response);
                console.error('Erro ao deletar item:', errorContext);
                reportObservedError(new Error(errorContext.message || 'Falha ao excluir item'), {
                    module: 'table-view',
                    status: errorContext.status,
                    requestId: errorContext.requestId,
                    url: endpoint,
                    message: errorContext.message || 'Falha ao excluir item',
                });
                throw new Error('Falha ao excluir item');
            }
            fetchData();
        } catch (error) {
            console.error(`Erro ao deletar item:`, error);
        } finally {
            showModal = false;
            itemToDelete = null;
        }
    }

    onMount(() => {
        fetchData();
    });

    let initialLoad = true;
    $: {
        currentPage, itemsPerPage, searchTerm, searchColumn;
        if (initialLoad) {
            initialLoad = false;
        } else {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                if (searchTerm || itemsPerPage || searchColumn) {
                    currentPage = 1;
                }
                fetchData();
            }, 300);
        }
    }
    
    $: totalPages = Math.ceil(totalItems / itemsPerPage);
    $: normalizedView = (view === 'users' ? 'clients' : view) as View;
</script>

<div>
    <FilterControls 
        bind:itemsPerPage
        bind:searchTerm
        bind:searchColumn
        filterOptions={viewConfig[view].filterOptions}
    />

    {#if isLoading}
        <div class="flex justify-center items-center h-64"><p class="text-gray-500 dark:text-gray-400">A carregar dados...</p></div>
    {:else}
        <Table 
            {headers} 
            data={paginatedData} 
            view={normalizedView}
            on:delete={handleDeleteRequest} 
        />

        <Pagination 
            bind:currentPage
            totalPages={Math.ceil(totalItems / itemsPerPage)} 
            {totalItems}
            {itemsPerPage}
        />
    {/if}
</div>

{#if showModal}
    <Modal onConfirm={handleDeleteConfirm} onCancel={() => showModal = false}>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-5">Confirmar Exclusão</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 px-4 py-3">
            Você tem certeza que deseja excluir o {itemToDelete?.type} de ID {itemToDelete?.id}?
        </p>
    </Modal>
{/if}
