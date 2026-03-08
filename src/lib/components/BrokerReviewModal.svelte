<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Loader2 } from 'lucide-svelte';

  type BrokerDetail = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    bairro?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    creci?: string | null;
    status?: string | null;
    created_at?: string | null;
  };

  export let open = false;
  export let broker: any | null = null;
  export let showApprove = false;
  export let showReject = true;

  let isProcessing = false;
  let brokerDetail: BrokerDetail | null = null;
  let isDetailLoading = false;
  let detailError: string | null = null;
  let lastBrokerId: number | null = null;
  const dispatch = createEventDispatcher();
  let wasOpen = open;

  $: if (wasOpen && !open) {
    dispatch('close');
  }
  $: wasOpen = open;

  $: if (open && broker?.id && broker.id !== lastBrokerId) {
    lastBrokerId = broker.id;
    fetchBrokerDetail(broker.id);
  }

  $: if (!open) {
    brokerDetail = null;
    detailError = null;
    isDetailLoading = false;
    lastBrokerId = null;
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  }

  async function fetchBrokerDetail(brokerId: number) {
    isDetailLoading = true;
    detailError = null;
    brokerDetail = null;
    try {
      const response = await api.get<{ data?: BrokerDetail } | BrokerDetail>(`/admin/brokers/${brokerId}`);
      const detail = (response as { data?: BrokerDetail })?.data ?? response;
      if (detail && typeof detail === 'object' && 'id' in detail) {
        brokerDetail = detail as BrokerDetail;
        detailError = null;
      } else {
        brokerDetail = null;
        detailError = 'Não foi possível carregar os dados do corretor.';
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do corretor:', error);
      brokerDetail = null;
      detailError =
        error instanceof Error ? error.message : 'Não foi possível carregar os dados do corretor.';
    } finally {
      isDetailLoading = false;
    }
  }

  async function handleStatusUpdate(newStatus: 'approved' | 'rejected') {
    if (!broker) return;
    if (newStatus === 'rejected') {
      const confirmed = window.confirm('Tem certeza que deseja rejeitar este corretor?');
      if (!confirmed) return;
    }

    isProcessing = true;
    try {
      if (newStatus === 'rejected') {
        await api.post(`/admin/brokers/${broker.id}/cleanup`, {});
        toast.success('Corretor rejeitado e removido.');
      } else {
        await api.patch(`/admin/brokers/${broker.id}/status`, { status: newStatus });
        toast.success('Corretor aprovado.');
      }

      dispatch('update');
      close();
    } catch (error) {
      console.error('Erro ao atualizar status do corretor:', error);
      toast.error('Falha ao atualizar status.');
    } finally {
      isProcessing = false;
    }
  }

  function close() {
    if (isProcessing) return;
    open = false;
  }

  async function handleDelete() {
    if (!broker) return;
    const confirmed = window.confirm('Deseja remover este corretor permanentemente?');
    if (!confirmed) return;

    isProcessing = true;
    try {
      await api.delete(`/admin/brokers/${broker.id}`);
      toast.success('Corretor excluido.');
      dispatch('update');
      close();
    } catch (error) {
      console.error('Erro ao excluir corretor:', error);
      toast.error('Falha ao excluir corretor.');
    } finally {
      isProcessing = false;
    }
  }
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content className="max-w-lg">
    {#if broker}
      <Dialog.Header>
        <Dialog.Title className="text-2xl">Revisar Corretor</Dialog.Title>
        <Dialog.Description>
          Rejeite ou exclua o corretor <span class="font-semibold">{broker.name}</span>
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4 text-sm text-gray-700 dark:text-gray-300">
        {#if isDetailLoading}
          <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 class="h-4 w-4 animate-spin" />
            Carregando detalhes...
          </div>
        {:else if detailError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {detailError}
          </div>
        {:else}
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Nome</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {brokerDetail?.name ?? broker.name}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Email</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {brokerDetail?.email ?? broker.email}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Telefone</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {brokerDetail?.phone ?? broker.phone ?? 'N/A'}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CRECI</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {brokerDetail?.creci ?? broker.creci ?? 'N/A'}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {brokerDetail?.status ?? broker.status ?? '-'}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cadastrado em</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(brokerDetail?.created_at ?? broker.created_at)}
              </div>
            </div>
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Endereco</div>
            <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {brokerDetail?.street ?? '-'}
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Numero</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {brokerDetail?.number ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Complemento</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {brokerDetail?.complement ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Bairro</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {brokerDetail?.bairro ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CEP</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {brokerDetail?.cep ?? '-'}
                </div>
              </div>
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cidade</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {brokerDetail?.city ?? '-'}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Estado</div>
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {brokerDetail?.state ?? '-'}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <Dialog.Footer className="flex gap-2">
        <Button variant="outline" on:click={close} disabled={isProcessing}>
          Cancelar
        </Button>
        {#if showApprove}
          <Button
            variant="outline"
            className="bg-green-600 text-white hover:bg-green-700"
            on:click={() => handleStatusUpdate('approved')}
            disabled={isProcessing}
          >
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Aprovar
          </Button>
        {/if}
        {#if showReject}
          <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white" on:click={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Rejeitar
          </Button>
        {/if}
        <Button className="bg-red-700 text-white hover:bg-red-800" on:click={handleDelete} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Excluir
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
