<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Loader2, Trash2, Upload, Eye, X } from 'lucide-svelte';
  import AdminPasswordConfirmDialog from '$lib/components/AdminPasswordConfirmDialog.svelte';
  import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';
import { extractApiErrorMessage } from '$lib/components/create-property-helpers';
  import type { BrokerDocuments } from '$lib/types';

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
    creci_front_url?: string | null;
    creci_back_url?: string | null;
    selfie_url?: string | null;
    documents?: BrokerDocuments;
    document_status?: string | null;
  };
  type BrokerLike = {
    documents?: BrokerDocuments;
    [key: string]: unknown;
  };

  export let open = false;
  export let broker: any | null = null;
  export let showApprove = false;
  export let showReject = true;
  export let showDemote = false;

  let isProcessing = false;
  let brokerDetail: BrokerDetail | null = null;
  let isDetailLoading = false;
  let detailError: string | null = null;
  let lastBrokerId: number | null = null;
  const dispatch = createEventDispatcher();
  let wasOpen = open;
  let isEditMode = false;
  let deleteError: string | null = null;
  let isDeleteDialogOpen = false;
  let isDocumentPreviewOpen = false;
  let previewUrl = '';
  let previewTitle = '';
  let isDeletingDocument = false;
  let isUploadingDocument = false;
  let documentInputEl: HTMLInputElement;
  let resolvedCreciFrontUrl = '';
  let resolvedCreciBackUrl = '';
  let resolvedSelfieUrl = '';
  let brokerForm = {
    name: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    complement: '',
    bairro: '',
    city: '',
    state: '',
    cep: '',
    creci: '',
  };

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
    isEditMode = false;
    deleteError = null;
    isDeleteDialogOpen = false;
  }

  $: {
    const source = (brokerDetail as BrokerLike | null) ?? (broker as BrokerLike | null);
    const fromSource = (key: keyof BrokerDocuments): string | null => {
      if (source == null) return null;
      const fromDocuments = source.documents?.[key];
      if (typeof fromDocuments === 'string' && fromDocuments.trim().length > 0) {
        return fromDocuments;
      }
      const legacyValue = source[key as string];
      if (typeof legacyValue === 'string' && legacyValue.trim().length > 0) {
        return legacyValue;
      }
      return null;
    };

    const normalizeDocumentUrl = (url: string | null | undefined): string => {
      if (!url) return '';
      const trimmedUrl = url.trim();
      if (!trimmedUrl) return '';
      if (trimmedUrl.startsWith('http') || trimmedUrl.includes('cloudinary')) {
        return trimmedUrl;
      }
      if (trimmedUrl.startsWith('/uploads/') || trimmedUrl.startsWith('uploads/')) {
        return '';
      }
      return trimmedUrl;
    };

    resolvedCreciFrontUrl = normalizeDocumentUrl(fromSource('creci_front_url'));
    resolvedCreciBackUrl = normalizeDocumentUrl(fromSource('creci_back_url'));
    resolvedSelfieUrl = normalizeDocumentUrl(fromSource('selfie_url'));
  }

  $: hasRealDocuments =
    Boolean(resolvedCreciFrontUrl) ||
    Boolean(resolvedCreciBackUrl) ||
    Boolean(resolvedSelfieUrl);

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
        brokerForm = {
          name: brokerDetail.name ?? broker?.name ?? '',
          email: brokerDetail.email ?? broker?.email ?? '',
          phone: brokerDetail.phone ?? broker?.phone ?? '',
          street: brokerDetail.street ?? '',
          number: brokerDetail.number ?? '',
          complement: brokerDetail.complement ?? '',
          bairro: brokerDetail.bairro ?? '',
          city: brokerDetail.city ?? '',
          state: brokerDetail.state ?? '',
          cep: brokerDetail.cep ?? '',
          creci: brokerDetail.creci ?? broker?.creci ?? '',
        };
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

    isProcessing = true;
    try {
      const response = await api.patch<{ role?: string; status?: string; data?: { role?: string; status?: string } }>(`/admin/brokers/${broker.id}/status`, {
        status: newStatus,
      });
      const payload = response?.data && typeof response.data === 'object' ? response.data : response;
      const resolvedStatus = String(payload?.status ?? newStatus).trim() || newStatus;
      const resolvedRole =
        payload?.role ?? (resolvedStatus === 'approved' ? 'broker' : 'client');
      brokerDetail = brokerDetail
        ? {
            ...brokerDetail,
            status: resolvedStatus,
          }
        : brokerDetail;
      toast.success(
        resolvedStatus === 'approved'
          ? 'Corretor aprovado.'
          : resolvedRole === 'client'
            ? 'Corretor rebaixado para cliente.'
            : 'Status atualizado.',
      );

      dispatch('update', {
        brokerId: broker.id,
        status: resolvedStatus,
        role: resolvedRole,
      });
      close();
    } catch (error) {
      console.error('Erro ao atualizar status do corretor:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar status.');
    } finally {
      isProcessing = false;
    }
  }

  async function handleDemoteToClient() {
    if (!broker) return;

    isProcessing = true;
    try {
      const response = await api.post<{ role?: string; status?: string; data?: { role?: string; status?: string } }>(
        `/admin/clients/${broker.id}/demote-broker`,
        {}
      );
      const payload = response?.data && typeof response.data === 'object' ? response.data : response;
      const resolvedStatus = String(payload?.status ?? 'rejected').trim() || 'rejected';
      const resolvedRole = payload?.role ?? 'client';
      brokerDetail = brokerDetail
        ? {
            ...brokerDetail,
            status: resolvedStatus,
          }
        : brokerDetail;
      toast.success('Usuario voltou para cliente.');

      dispatch('update', {
        brokerId: broker.id,
        status: resolvedStatus,
        role: resolvedRole,
      });
      close();
    } catch (error) {
      console.error('Erro ao tornar usuario cliente:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao tornar usuario cliente.');
    } finally {
      isProcessing = false;
    }
  }

  function close() {
    if (isProcessing) return;
    open = false;
  }

  async function handleSave() {
    if (!broker) return;

    isProcessing = true;
    try {
      await api.put(`/admin/brokers/${broker.id}`, {
        name: brokerForm.name.trim(),
        email: brokerForm.email.trim(),
        phone: brokerForm.phone.trim(),
        street: brokerForm.street.trim(),
        number: brokerForm.number.trim(),
        complement: brokerForm.complement.trim(),
        bairro: brokerForm.bairro.trim(),
        city: brokerForm.city.trim(),
        state: brokerForm.state.trim(),
        cep: brokerForm.cep.trim(),
        creci: brokerForm.creci.trim(),
      });
      brokerDetail = {
        ...(brokerDetail ?? { id: broker.id }),
        ...brokerForm,
        status: brokerDetail?.status ?? broker.status ?? null,
        created_at: brokerDetail?.created_at ?? broker.created_at ?? null,
      };
      toast.success('Corretor atualizado.');
      isEditMode = false;
      dispatch('update');
    } catch (error) {
      console.error('Erro ao atualizar corretor:', error);
      toast.error('Falha ao atualizar corretor.');
    } finally {
      isProcessing = false;
    }
  }

  async function handleDelete(password: string) {
    if (!broker) return;

    isProcessing = true;
    deleteError = null;
    try {
      const response = await api.post<{ reauthToken: string }>('/admin/reauth', {
        password,
      });
      await api.delete(`/admin/brokers/${broker.id}`, {
        headers: {
          'X-Admin-Reauth': response.reauthToken,
        },
      });
      toast.success('Corretor excluido.');
      dispatch('update');
      close();
    } catch (error) {
      console.error('Erro ao excluir corretor:', error);
      deleteError =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Falha ao excluir corretor.';
    } finally {
      isProcessing = false;
    }
  }

  async function handleDocumentDelete(docType: string) {
    if (!brokerDetail) return;
    if (!confirm(`Tem certeza que deseja excluir o documento?`)) return;

    isDeletingDocument = true;
    try {
      await api.delete(`/admin/brokers/${brokerDetail.id}/documents/${docType}`);
      toast.success('Documento excluído.');
      await fetchBrokerDetail(brokerDetail.id);
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error('Falha ao excluir documento.');
    } finally {
      isDeletingDocument = false;
    }
  }

  let currentUploadDocType = '';
  function triggerDocumentUpload(docType: string) {
    currentUploadDocType = docType;
    documentInputEl.click();
  }

  async function handleDocumentFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !brokerDetail) return;

    const file = input.files[0];
    isUploadingDocument = true;
    let uploadSucceeded = false;

    try {
      const formData = new FormData();
      formData.append(currentUploadDocType, file);

      await api.post(`/admin/brokers/${brokerDetail.id}/documents`, formData);
      uploadSucceeded = true;
      toast.success('Documento enviado com sucesso.');
      await fetchBrokerDetail(brokerDetail.id);
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      const errorMessage = extractApiErrorMessage(
        error,
        'Falha ao enviar documento. Se persistir, tente novamente.'
      );
      toast.error(errorMessage);
    } finally {
      isUploadingDocument = false;
      if (uploadSucceeded) {
        input.value = '';
      }
    }
  }

  function openPreview(url: string, title: string) {
    previewUrl = url;
    previewTitle = title;
    isDocumentPreviewOpen = true;
  }
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content className="max-w-lg">
    {#if broker}
      <Dialog.Header>
        <Dialog.Title className="text-2xl">Revisar Corretor</Dialog.Title>
        <Dialog.Description>
          Revise, edite ou altere o status do corretor <span class="font-semibold">{broker.name}</span>
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
          {#if isEditMode}
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Nome</span>
                <input bind:value={brokerForm.name} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Email</span>
                <input bind:value={brokerForm.email} type="email" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Telefone</span>
                <input bind:value={brokerForm.phone} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CRECI</span>
                <input bind:value={brokerForm.creci} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1 sm:col-span-2">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Endereco</span>
                <input bind:value={brokerForm.street} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Numero</span>
                <input bind:value={brokerForm.number} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Complemento</span>
                <input bind:value={brokerForm.complement} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Bairro</span>
                <input bind:value={brokerForm.bairro} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CEP</span>
                <input bind:value={brokerForm.cep} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cidade</span>
                <input bind:value={brokerForm.city} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Estado</span>
                <input bind:value={brokerForm.state} maxlength="2" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm uppercase text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
              </label>
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
                  {formatPhoneDisplayBr(brokerDetail?.phone ?? broker.phone, 'N/A')}
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

            <div class="mt-6 space-y-4">
              <h4 class="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">Documentação</h4>
              {#if !hasRealDocuments}
                <p class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                  O corretor ainda não enviou documentos reais para revisão.
                </p>
              {/if}
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <!-- Frente CRECI -->
                <div class="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 transition-all hover:border-green-300 hover:bg-green-50/30 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-green-700/50">
                  <div class="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">Frente do CRECI</div>
                  {#if resolvedCreciFrontUrl}
                    <div class="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <img src={resolvedCreciFrontUrl} alt="Frente do CRECI" class="h-full w-full object-cover" />
                      <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="rounded-full bg-white p-2 text-gray-900 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                            on:click={() => openPreview(resolvedCreciFrontUrl, 'Frente do CRECI')}
                            title="Visualizar"
                          >
                            <Eye class="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            class="rounded-full bg-red-500 p-2 text-white shadow-sm hover:bg-red-600"
                            on:click={() => handleDocumentDelete('creciFront')}
                            disabled={isDeletingDocument}
                            title="Excluir"
                          >
                            {#if isDeletingDocument}
                              <Loader2 class="h-4 w-4 animate-spin" />
                            {:else}
                              <Trash2 class="h-4 w-4" />
                            {/if}
                          </button>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <button
                      type="button"
                      class="flex flex-col items-center gap-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                      on:click={() => triggerDocumentUpload('creciFront')}
                      disabled={isUploadingDocument}
                    >
                      <div class="rounded-full border border-gray-300 p-2 dark:border-gray-600">
                        <Upload class="h-5 w-5" />
                      </div>
                      <span class="text-[10px] font-medium uppercase tracking-wider">Enviar Documento</span>
                    </button>
                  {/if}
                </div>

                <!-- Verso CRECI -->
                <div class="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 transition-all hover:border-green-300 hover:bg-green-50/30 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-green-700/50">
                  <div class="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">Verso do CRECI</div>
                  {#if resolvedCreciBackUrl}
                    <div class="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <img src={resolvedCreciBackUrl} alt="Verso do CRECI" class="h-full w-full object-cover" />
                      <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="rounded-full bg-white p-2 text-gray-900 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                            on:click={() => openPreview(resolvedCreciBackUrl, 'Verso do CRECI')}
                            title="Visualizar"
                          >
                            <Eye class="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            class="rounded-full bg-red-500 p-2 text-white shadow-sm hover:bg-red-600"
                            on:click={() => handleDocumentDelete('creciBack')}
                            disabled={isDeletingDocument}
                            title="Excluir"
                          >
                            {#if isDeletingDocument}
                              <Loader2 class="h-4 w-4 animate-spin" />
                            {:else}
                              <Trash2 class="h-4 w-4" />
                            {/if}
                          </button>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <button
                      type="button"
                      class="flex flex-col items-center gap-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                      on:click={() => triggerDocumentUpload('creciBack')}
                      disabled={isUploadingDocument}
                    >
                      <div class="rounded-full border border-gray-300 p-2 dark:border-gray-600">
                        <Upload class="h-5 w-5" />
                      </div>
                      <span class="text-[10px] font-medium uppercase tracking-wider">Enviar Documento</span>
                    </button>
                  {/if}
                </div>

                <!-- Selfie -->
                <div class="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 transition-all hover:border-green-300 hover:bg-green-50/30 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-green-700/50">
                  <div class="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">Selfie com CRECI</div>
                  {#if resolvedSelfieUrl}
                    <div class="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <img src={resolvedSelfieUrl} alt="Selfie" class="h-full w-full object-cover" />
                      <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="rounded-full bg-white p-2 text-gray-900 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                            on:click={() => openPreview(resolvedSelfieUrl, 'Selfie com CRECI')}
                            title="Visualizar"
                          >
                            <Eye class="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            class="rounded-full bg-red-500 p-2 text-white shadow-sm hover:bg-red-600"
                            on:click={() => handleDocumentDelete('selfie')}
                            disabled={isDeletingDocument}
                            title="Excluir"
                          >
                            {#if isDeletingDocument}
                              <Loader2 class="h-4 w-4 animate-spin" />
                            {:else}
                              <Trash2 class="h-4 w-4" />
                            {/if}
                          </button>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <button
                      type="button"
                      class="flex flex-col items-center gap-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                      on:click={() => triggerDocumentUpload('selfie')}
                      disabled={isUploadingDocument}
                    >
                      <div class="rounded-full border border-gray-300 p-2 dark:border-gray-600">
                        <Upload class="h-5 w-5" />
                      </div>
                      <span class="text-[10px] font-medium uppercase tracking-wider">Enviar Documento</span>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <input
        type="file"
        accept="image/*"
        class="hidden"
        bind:this={documentInputEl}
        on:change={handleDocumentFileChange}
      />


      <Dialog.Footer className="flex gap-2">
        <Button variant="outline" on:click={close} disabled={isProcessing}>
          Cancelar
        </Button>
        {#if isEditMode}
          <Button variant="outline" on:click={() => (isEditMode = false)} disabled={isProcessing}>
            Voltar
          </Button>
          <Button on:click={handleSave} disabled={isProcessing}>
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Salvar alterações
          </Button>
        {:else}
          <Button variant="outline" on:click={() => (isEditMode = true)} disabled={isProcessing || !brokerDetail}>
            Editar
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
        {#if showDemote}
          <Button
            variant="destructive"
            className="bg-amber-600 text-white hover:bg-amber-700"
            on:click={handleDemoteToClient}
            disabled={isProcessing}
          >
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Tornar Usuário
          </Button>
        {/if}
        <Button className="bg-red-700 text-white hover:bg-red-800" on:click={() => (isDeleteDialogOpen = true)} disabled={isProcessing}>
          Excluir
        </Button>
        {/if}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<AdminPasswordConfirmDialog
  bind:open={isDeleteDialogOpen}
  title="Excluir corretor"
  description={broker ? `Confirme sua senha para excluir ${broker.name}.` : ''}
  confirmLabel="Excluir corretor"
  isSubmitting={isProcessing}
  error={deleteError}
  on:confirm={(event) => handleDelete(event.detail.password)}
/>

{#if isDocumentPreviewOpen}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
    role="presentation"
    on:click={() => (isDocumentPreviewOpen = false)}
  >
    <div class="relative max-h-full max-w-full overflow-hidden">
      <button
        type="button"
        class="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        on:click={() => (isDocumentPreviewOpen = false)}
      >
        <X class="h-6 w-6" />
      </button>
      <img src={previewUrl} alt={previewTitle} class="max-h-[90vh] max-w-full rounded-lg object-contain" />
      <div class="mt-4 text-center text-white font-medium">{previewTitle}</div>
    </div>
  </div>
{/if}
