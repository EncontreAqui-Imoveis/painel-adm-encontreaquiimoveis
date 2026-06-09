<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { toast } from 'svelte-sonner';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Loader2 } from 'lucide-svelte';
  import AdminPasswordConfirmDialog from '$lib/components/AdminPasswordConfirmDialog.svelte';
import BrokerEditForm from '$lib/components/broker/BrokerEditForm.svelte';
import BrokerReviewActions from '$lib/components/broker/BrokerReviewActions.svelte';
import BrokerDocumentPreviewModal from '$lib/components/broker/BrokerDocumentPreviewModal.svelte';
import BrokerDocumentsSection from '$lib/components/broker/BrokerDocumentsSection.svelte';
import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';
import { extractApiErrorMessage, onlyDigits } from '$lib/components/create-property-helpers';
import { formatBrokerStatusLabel, getBrokerStatusBadgeClass } from '$lib/utils/brokerStatus';
  import {
    deleteBrokerDocumentById,
    demoteBrokerToClientById,
    fetchBrokerDetailById,
    lookupCepAddress,
    reauthAndDeleteBrokerById,
    saveBrokerById,
    updateBrokerStatusById,
    uploadBrokerDocumentById,
  } from '$lib/components/broker/brokerReviewService';
import {
  createBrokerFormState,
  formatBrokerReviewDate,
  formatBrokerReviewErrorMessage,
  getBrokerDocumentActionLabel,
  getBrokerDocumentLabel,
  resolveBrokerDocumentUrls,
  type BrokerDocumentLabelKey,
  type BrokerDetailLike,
  type BrokerFormState,
} from '$lib/components/broker/brokerReviewHelpers';
  import {
    createBrokerReviewClosedState,
    getBrokerIdToLoad,
    shouldDispatchClose,
  } from '$lib/components/broker/brokerReviewLifecycle';

  type BrokerDetail = BrokerDetailLike & {
    name: string;
    email: string;
    document_status?: string | null;
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
  let resolvedCreciFrontUrl = '';
  let resolvedCreciBackUrl = '';
  let resolvedSelfieUrl = '';
  let brokerForm: BrokerFormState = createBrokerFormState(null);
  let lastCepLookup = '';
  let cepLookupError: string | null = null;

  $: if (shouldDispatchClose(wasOpen, open)) {
    dispatch('close');
  }
  $: wasOpen = open;

  $: {
    const brokerIdToLoad = getBrokerIdToLoad(open, broker?.id, lastBrokerId);
    if (brokerIdToLoad !== null) {
      lastBrokerId = brokerIdToLoad;
      fetchBrokerDetail(brokerIdToLoad);
    }
  }

  $: if (!open) {
    const closed = createBrokerReviewClosedState();
    brokerDetail = closed.brokerDetail;
    detailError = closed.detailError;
    isDetailLoading = closed.isDetailLoading;
    lastBrokerId = closed.lastBrokerId;
    isEditMode = closed.isEditMode;
    deleteError = closed.deleteError;
    isDeleteDialogOpen = closed.isDeleteDialogOpen;
    lastCepLookup = closed.lastCepLookup;
    cepLookupError = closed.cepLookupError;
    brokerForm = closed.brokerForm;
  }

  $: {
    const resolved = resolveBrokerDocumentUrls((brokerDetail as BrokerDetailLike | null) ?? broker);
    resolvedCreciFrontUrl = resolved.creciFrontUrl;
    resolvedCreciBackUrl = resolved.creciBackUrl;
    resolvedSelfieUrl = resolved.selfieUrl;
  }

  $: hasRealDocuments =
    Boolean(resolvedCreciFrontUrl) ||
    Boolean(resolvedCreciBackUrl) ||
    Boolean(resolvedSelfieUrl);

  async function fetchBrokerDetail(brokerId: number) {
    isDetailLoading = true;
    detailError = null;
    brokerDetail = null;
    try {
      const detail = await fetchBrokerDetailById(brokerId);
      if (detail && typeof detail === 'object' && 'id' in detail) {
        brokerDetail = detail as BrokerDetail;
        brokerForm = createBrokerFormState(brokerDetail, {
          name: broker?.name ?? '',
          email: broker?.email ?? '',
          creci: broker?.creci ?? '',
        });
        if (Boolean(brokerDetail.sem_numero)) {
          brokerForm.number = '';
        }
        if (Boolean(brokerDetail.sem_cep)) {
          brokerForm.cep = '';
        }
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
      const { status: resolvedStatus, role: resolvedRole } = await updateBrokerStatusById(
        broker.id,
        newStatus
      );
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
      toast.error(formatBrokerReviewErrorMessage(error, 'Falha ao atualizar status.'));
    } finally {
      isProcessing = false;
    }
  }

  async function handleDemoteToClient() {
    if (!broker) return;

    isProcessing = true;
    try {
      const { status: resolvedStatus, role: resolvedRole } = await demoteBrokerToClientById(
        broker.id
      );
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
      toast.error(formatBrokerReviewErrorMessage(error, 'Falha ao tornar usuario cliente.'));
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
      const { status: resolvedStatus } = await saveBrokerById(
        broker.id,
        brokerForm,
        brokerDetail?.status ?? broker.status ?? 'pending_verification',
        'pending_verification',
      );
      const numberDigits = onlyDigits(brokerForm.number.trim());
      const resolvedCep = brokerForm.semCep ? '' : onlyDigits(brokerForm.cep);
      brokerDetail = {
        ...(brokerDetail ?? { id: broker.id }),
        ...brokerForm,
        number: brokerForm.semNumero ? null : (numberDigits || null),
        cep: resolvedCep || null,
        sem_numero: brokerForm.semNumero ? 1 : 0,
        sem_cep: brokerForm.semCep ? 1 : 0,
        status: resolvedStatus ?? brokerDetail?.status ?? broker.status ?? null,
        created_at: brokerDetail?.created_at ?? broker.created_at ?? null,
      };
      toast.success('Corretor atualizado.');
      isEditMode = false;
      dispatch('update', {
        brokerId: broker.id,
        status: resolvedStatus,
      });
      close();
    } catch (error) {
      console.error('Erro ao atualizar corretor:', error);
      toast.error(formatBrokerReviewErrorMessage(error, 'Falha ao atualizar corretor.'));
    } finally {
      isProcessing = false;
    }
  }

  async function lookupCep(value: string) {
    if (brokerForm.semCep) return;
    const digits = onlyDigits(value);
    if (digits.length !== 8 || digits === lastCepLookup) return;
    lastCepLookup = digits;
    cepLookupError = null;
    try {
      const { street, bairro, city, state, errorMessage } = await lookupCepAddress(digits);
      if (errorMessage) {
        cepLookupError = errorMessage;
        return;
      }
      brokerForm = {
        ...brokerForm,
        street: street ?? brokerForm.street,
        bairro: bairro ?? brokerForm.bairro,
        city: city ?? brokerForm.city,
        state: state ?? brokerForm.state,
      };
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      cepLookupError = 'CEP não encontrado.';
    }
  }

  async function handleDelete(password: string) {
    if (!broker) return;

    isProcessing = true;
    deleteError = null;
    try {
      await reauthAndDeleteBrokerById(broker.id, password);
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

  async function handleDocumentDelete(docType: BrokerDocumentLabelKey) {
    if (!brokerDetail) return;
    if (!confirm(`Tem certeza que deseja excluir o documento?`)) return;

    isDeletingDocument = true;
    try {
      await deleteBrokerDocumentById(brokerDetail.id, docType);
      toast.success('Documento excluído.');
      await fetchBrokerDetail(brokerDetail.id);
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error('Falha ao excluir documento.');
    } finally {
      isDeletingDocument = false;
    }
  }

  async function uploadDocument(docType: BrokerDocumentLabelKey, file: File) {
    if (!brokerDetail) return;

    isUploadingDocument = true;
    try {
      await uploadBrokerDocumentById(brokerDetail.id, docType, file);
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
            <BrokerEditForm bind:brokerForm {lookupCep} {cepLookupError} />
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
                <div class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBrokerStatusBadgeClass(brokerDetail?.status ?? broker.status ?? null)}`}>
                  {formatBrokerStatusLabel(brokerDetail?.status ?? broker.status ?? null)}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cadastrado em</div>
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {formatBrokerReviewDate(brokerDetail?.created_at ?? broker.created_at)}
                </div>
              </div>
            </div>

            <BrokerDocumentsSection
              hasRealDocuments={hasRealDocuments}
              resolvedCreciFrontUrl={resolvedCreciFrontUrl}
              resolvedCreciBackUrl={resolvedCreciBackUrl}
              resolvedSelfieUrl={resolvedSelfieUrl}
              isDeletingDocument={isDeletingDocument}
              isUploadingDocument={isUploadingDocument}
              getDocumentLabel={getBrokerDocumentLabel}
              getDocumentActionLabel={getBrokerDocumentActionLabel}
              openPreview={openPreview}
              deleteDocument={handleDocumentDelete}
              uploadDocument={uploadDocument}
            />
          {/if}
        {/if}
      </div>


      <BrokerReviewActions
        {isEditMode}
        {isProcessing}
        {showApprove}
        {showReject}
        {showDemote}
        hasBrokerDetail={Boolean(brokerDetail)}
        onClose={close}
        onToggleEdit={(value) => (isEditMode = value)}
        onSave={handleSave}
        onApprove={() => handleStatusUpdate('approved')}
        onReject={() => handleStatusUpdate('rejected')}
        onDemote={handleDemoteToClient}
        onOpenDeleteDialog={() => (isDeleteDialogOpen = true)}
      />
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

<BrokerDocumentPreviewModal
  open={isDocumentPreviewOpen}
  url={previewUrl}
  title={previewTitle}
  close={() => (isDocumentPreviewOpen = false)}
/>
