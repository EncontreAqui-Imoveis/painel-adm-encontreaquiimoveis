<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileText,
    Loader2,
    Maximize2,
    RefreshCcw,
    Trash2,
    X,
    ZoomIn,
    ZoomOut,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { adminSession } from '$lib/sessionState';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import type { InputProps } from '$lib/components/ui/input/input-props';
  import type { Component } from 'svelte';
  import Pagination from '$lib/Pagination.svelte';
  import ContractDocumentPreview from '$lib/components/contracts/ContractDocumentPreview.svelte';
  import ContractDocumentMatrix from '$lib/components/contracts/ContractDocumentMatrix.svelte';
  import ContractApprovalActions from '$lib/components/contracts/ContractApprovalActions.svelte';
  import ContractDraftUploadPanel from '$lib/components/contracts/ContractDraftUploadPanel.svelte';
  import ContractActorsGrid from '$lib/components/contracts/ContractActorsGrid.svelte';
  import ContractFinalizedEditorPanel from '$lib/components/contracts/ContractFinalizedEditorPanel.svelte';
  import {
    type ContractStatus,
    getContractDetails,
    listContractDocumentRejections,
    listContracts,
    saveContractPartyInfo,
  } from '$lib/components/contracts/contractsApi';
  import {
    deleteContractDocument,
    deleteFinalizedContractDocument,
    deleteFinalizedContractById,
    downloadContractDocumentByUrl,
    downloadContractDocumentsZip,
    evaluateContractSide as evaluateContractSideRequest,
    finalizeContract,
    reviewContractDocument,
    submitContractDraft,
    transitionContractById,
    uploadFinalizedContractDocument,
    uploadMatrixDocument,
    uploadSignedDocument,
  } from '$lib/components/contracts/contractsActions';
  import {
    loadContractDocumentPreview,
    resolveContractPreviewErrorMessage,
  } from '$lib/components/contracts/contractsPreviewService';
  import {
    approvalAllowsProgress,
    approvalBadgeClass,
    approvalLabel,
    canApproveSide,
    canRejectSide,
    canRestartSide,
    contractSideDataLabel,
    contractSideDocumentDescription,
    contractSideLabel,
    documentFileName,
    documentLabel,
    documentSideLabel,
    documentStatusClass,
    documentStatusLabel,
    formatDate,
    getApprovalNextStepLabel,
    getApprovalProgressLabel,
    getApprovalProgressToneClass,
    getSideApprovalUiState,
    hasDocumentReviewStatus,
    isRejectedContract,
    previousStageLabel,
    normalizeDocumentStatus,
    statusLabel,
    tableActionLabel,
    tabs,
  } from '$lib/components/contracts/contractsDisplayHelpers';
  import {
    buildBuyerInfoPayload,
    buildSellerInfoPayload,
    hasExactSaleSplit,
    formatManualDecimalDisplay,
    resolveApiErrorMessage,
    resolveFinalizeCommissionAmounts,
    requiresSpouseFields,
    sanitizeManualDecimalInput,
    type FinalizeCommissionField,
    type FinalizeFieldMode,
  } from '$lib/components/contracts/contractsFormHelpers';
  import {
    type MatrixRequirement,
    type MatrixRow,
    type MatrixSide,
    buyerRentalRequiredInfoFields,
    contractScopedDocumentTypes,
    documentTypeLabels,
    formatDocumentPreviewName,
    getBuyerDisplayName,
    getOwnerDisplayName,
    getRecordValueRaw,
    hasRecordValue,
    maritalStatusOptions,
    matrixDocumentSortOrder,
    normalizePossiblyMojibakeText,
    outroMatrixSlotTypes,
    signedReviewDocTypes,
  } from '$lib/components/contracts/contractsDataHelpers';
  import {
    canAddAnotherMatrixDocument,
    computeApprovalLockReasons,
    draftSubmitLabel,
    draftUploadInputLabel,
    getAllContractDocuments,
    getCurrentDraftDocument,
    getDocumentForMatrixCell,
    getDocumentsForMatrixCell,
    getMatrixRows,
    hasCurrentDraftDocument,
    isDoubleEndedDeal,
    isOutroMatrixDocumentType,
    listBlockingDocumentStatuses,
    listMissingBuyerInfo,
    listMissingRequiredDocuments,
    listMissingSellerInfo,
    resolveMatrixUploadCategory,
    resolveOutroMatrixDocumentType,
    resolveOutroMatrixDocumentTypes,
  } from '$lib/components/contracts/contractsMatrixHelpers';
  import type {
    ContractApprovalStatus,
    ContractDocument,
    ContractItem,
  } from '$lib/components/contracts/types';
  import type { ContractDocumentRejection } from '$lib/components/contracts/contractsApi';

  /** TS do IDE: tipo inferido do `Input` costuma omitir `id`/handlers; aqui usamos o contrato explícito. */
  const LabeledTextInput = Input as unknown as Component<InputProps, {}, 'value'>;

  type ModalMode = 'review_docs' | 'upload_draft' | 'finalize' | 'edit_finalized';

  type ContractDetailResponse = {
    contract?: ContractItem;
    documents?: ContractDocument[];
  };

  let activeTab: ContractStatus = 'AWAITING_DOCS';
  let items: ContractItem[] = [];
  let selected: ContractItem | null = null;
  let showModal = false;
  let modalMode: ModalMode = 'review_docs';
  let isMobileLayout = false;
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let contractSearchDebounce: ReturnType<typeof setTimeout> | null = null;
  let downloadingDocumentId: number | null = null;
  let selectedDraftFile: File | null = null;
  let draftUploadInputEl: HTMLInputElement | null = null;
  let uploadingDraft = false;
  let evaluatingSide: 'seller' | 'buyer' | null = null;
  let uploadingSignedDoc = false;
  let signedDocType = 'contrato_assinado';
  let selectedSignedFile: File | null = null;
  let selectedSignedDocSide: 'seller' | 'buyer' = 'seller';
  let signedUploadInputEl: HTMLInputElement | null = null;
  let pendingReplacementDocumentId: number | null = null;
  let documentRejections: ContractDocumentRejection[] = [];
  let loadingDocumentRejections = false;
  let matrixUploadInputEl: HTMLInputElement | null = null;
  let matrixUploadContext:
    | { documentType: string; side: 'seller' | 'buyer'; existingDocumentType?: string | null }
    | null = null;
  let matrixUploadingCounts: Record<string, number> = {};
  let matrixDeletingDocumentId: number | null = null;
  let reviewingDocumentId: number | null = null;
  let documentPreviewOpen = false;
  let documentPreviewLoading = false;
  let documentPreviewError = '';
  let documentPreviewTitle = '';
  let documentPreviewFileName = '';
  let documentPreviewSourceUrl = '';
  let documentPreviewObjectUrl: string | null = null;
  let documentPreviewOwnsObjectUrl = false;
  let documentPreviewKind: 'image' | 'pdf' = 'image';
  let documentPreviewZoom = 1;
  let documentPreviewContract: ContractItem | null = null;
  let documentPreviewDoc: ContractDocument | null = null;
  let documentPreviewIsFullscreen = false;
  type DocumentPreviewPdfPage = {
    pageNumber: number;
    dataUrl: string;
  };
  let documentPreviewPdfPages: DocumentPreviewPdfPage[] = [];
  let documentPreviewPdfText = '';
  let documentPreviewRenderToken = 0;
  let documentPreviewAbortController: AbortController | null = null;
  let documentPreviewFullscreenTargetEl: HTMLDivElement | null = null;
  let previousBodyOverflow = '';
  let previousViewportOverscrollBehavior = '';
  let viewportScrollLockCount = 0;
  let previousModalBodyOverflow = '';
  let finalizingContract = false;
  let reopeningContract = false;
  let deletingContract = false;
  let deletingDraftDocumentId: number | null = null;
  let deletingFinalizedDocumentId: number | null = null;
  let downloadingAllDocuments = false;
  let movingToPreviousStage = false;
  let approvalLockReasons: string[] = [];
  let isReadyToApprove = false;
  let sellerApprovalDisabled = false;
  let finalizeFieldModes: Record<FinalizeCommissionField, FinalizeFieldMode> = {
    comissaoCaptador: 'amount',
    comissaoVendedor: 'amount',
    taxaPlataforma: 'amount',
  };
  let finalizeForm = {
    valorBaseComissao: '',
    comissaoCaptador: '',
    comissaoVendedor: '',
    taxaPlataforma: '',
  };
  let finalizeCommissionPreview: ReturnType<typeof resolveFinalizeCommissionAmounts> = null;
  let finalizeCommissionRemaining: number | null = null;
  let isEditingCommissions = false;
  let commissionEditionSaved = false;
  // Sessões anteriores ao DTO de capabilities não recebem ações destrutivas.
  // Um novo login reidrata as permissões reais do administrador titular.
  $: canCurrentAdminDelete = $adminSession?.capabilities?.canDeleteDocuments ?? false;
  $: canCurrentAdminReplace = $adminSession?.capabilities?.canReplaceDocuments ?? false;
  $: canCurrentAdminCreateDocuments = $adminSession?.capabilities?.canCreateDocuments ?? false;

  let savingPartyData = false;
  let isEditingData = false;
  let isDataSectionExpanded = false;
  let ownerInfoForm = {
    nome: '',
    cpf: '',
    estadoCivil: '',
    profissao: '',
    email: '',
    telefone: '',
    dadosBancarios: '',
    conjugeNome: '',
    conjugeCpf: '',
    conjugeProfissao: '',
  };
  let inheritedSellerIdentity = {
    nome: false,
    cpf: false,
  };
  let inheritedBuyerIdentity = {
    nome: false,
    cpf: false,
  };
  let buyerInfoForm = {
    nome: '',
    cpf: '',
    estadoCivil: '',
    profissao: '',
    email: '',
    telefone: '',
    garantiaLocacao: '',
    conjugeNome: '',
    conjugeCpf: '',
    conjugeProfissao: '',
  };

  let contractSearchQuery = '';

  $: signedProposalDoc = selected != null && Array.isArray(selected.documents)
    ? selected.documents.find(
        (doc) =>
          String(doc.documentType ?? '').trim().toLowerCase() === 'contrato_assinado' &&
          !doc.metadata?.contractId
      ) ?? null
    : null;
  $: selectedSellerLabel = contractSideLabel(selected, 'seller');
  $: selectedBuyerLabel = contractSideLabel(selected, 'buyer');

  function lockViewportGestureScroll() {
    if (typeof document === 'undefined') return;
    if (viewportScrollLockCount === 0) {
      previousViewportOverscrollBehavior = document.documentElement.style.overscrollBehavior;
      document.documentElement.style.overscrollBehavior = 'none';
    }
    viewportScrollLockCount += 1;
  }

  function unlockViewportGestureScroll() {
    if (typeof document === 'undefined' || viewportScrollLockCount === 0) return;
    viewportScrollLockCount -= 1;
    if (viewportScrollLockCount === 0) {
      document.documentElement.style.overscrollBehavior = previousViewportOverscrollBehavior;
    }
  }

  function closeDocumentPreview() {
    documentPreviewAbortController?.abort();
    documentPreviewAbortController = null;
    if (documentPreviewOwnsObjectUrl && documentPreviewObjectUrl) {
      URL.revokeObjectURL(documentPreviewObjectUrl);
    }
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    if (typeof document !== 'undefined') {
      document.body.style.overflow = previousBodyOverflow;
    }
    documentPreviewOpen = false;
    documentPreviewLoading = false;
    documentPreviewError = '';
    documentPreviewTitle = '';
    documentPreviewFileName = '';
    documentPreviewSourceUrl = '';
    documentPreviewObjectUrl = null;
    documentPreviewOwnsObjectUrl = false;
    documentPreviewKind = 'image';
    documentPreviewZoom = 1;
    documentPreviewContract = null;
    documentPreviewDoc = null;
    documentPreviewIsFullscreen = false;
    documentPreviewPdfPages = [];
    documentPreviewPdfText = '';
    documentPreviewRenderToken += 1;
    unlockViewportGestureScroll();
  }

  async function toggleDocumentPreviewFullscreen() {
    if (typeof document === 'undefined' || !documentPreviewFullscreenTargetEl) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        documentPreviewIsFullscreen = false;
      } else {
        await documentPreviewFullscreenTargetEl.requestFullscreen();
        documentPreviewIsFullscreen = true;
      }
    } catch (error) {
      console.error('Falha ao alternar tela cheia:', error);
      toast.error('Não foi possível entrar em tela cheia.');
    }
  }

  function prepareDocumentPreview(
    title: string,
    sourceUrl: string,
    kind: 'image' | 'pdf',
    options: {
      fileName?: string;
      ownsObjectUrl?: boolean;
      contract?: ContractItem | null;
      doc?: ContractDocument | null;
    } = {}
  ) {
    if (typeof document !== 'undefined' && !documentPreviewOpen) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      lockViewportGestureScroll();
    }
    documentPreviewTitle = title;
    documentPreviewSourceUrl = sourceUrl;
    documentPreviewKind = kind;
    documentPreviewFileName = options.fileName ?? title;
    documentPreviewObjectUrl = sourceUrl;
    documentPreviewOwnsObjectUrl = options.ownsObjectUrl ?? false;
    documentPreviewContract = options.contract ?? null;
    documentPreviewDoc = options.doc ?? null;
    documentPreviewZoom = 1;
    documentPreviewIsFullscreen = false;
    documentPreviewOpen = true;
  }

  async function openPropertyImagePreview(url: string, title: string) {
    if (!url) return;
    closeDocumentPreview();
    prepareDocumentPreview(title, url, 'image');
  }

  async function openDocumentPreview(doc: ContractDocument, contract: ContractItem) {
    if (!doc.downloadUrl) {
      toast.error('Documento sem URL de visualização.');
      return;
    }

    closeDocumentPreview();
    documentPreviewLoading = true;
    documentPreviewError = '';
    const renderToken = ++documentPreviewRenderToken;
    const abortController = new AbortController();
    documentPreviewAbortController = abortController;
    prepareDocumentPreview(formatDocumentPreviewName(doc), doc.downloadUrl, 'pdf', {
      contract,
      doc,
    });

    try {
      const resolvedName = formatDocumentPreviewName(doc);
      const preview = await loadContractDocumentPreview(doc.downloadUrl, resolvedName, {
        signal: abortController.signal,
        onPdfPage: (pages, text) => {
          if (renderToken !== documentPreviewRenderToken) return;
          documentPreviewPdfPages = pages;
          if (text) documentPreviewPdfText = text;
        },
      });
      if (renderToken !== documentPreviewRenderToken) {
        return;
      }
      const objectUrl = URL.createObjectURL(preview.blob);
      documentPreviewObjectUrl = objectUrl;
      documentPreviewOwnsObjectUrl = true;
      documentPreviewKind = preview.kind;
      documentPreviewSourceUrl = objectUrl;
      documentPreviewFileName = resolvedName;

      if (documentPreviewKind === 'pdf') {
        documentPreviewPdfPages = preview.pdfPages;
        documentPreviewPdfText = preview.pdfText;
      } else {
        documentPreviewPdfPages = [];
        documentPreviewPdfText = '';
      }
    } catch (error) {
      if (abortController.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        return;
      }
      console.error('Erro ao carregar visualização do documento:', error);
      documentPreviewError = await resolveContractPreviewErrorMessage(error);
    } finally {
      if (renderToken === documentPreviewRenderToken) {
        documentPreviewLoading = false;
        documentPreviewAbortController = null;
      }
    }
  }

  async function downloadSignedProposalPdf(doc: ContractDocument) {
    if (!doc.downloadUrl) {
      toast.error('URL de download não disponível.');
      return;
    }

    try {
      const response = await downloadContractDocumentByUrl(doc.downloadUrl);
      const fallbackName =
        normalizePossiblyMojibakeText(doc.originalFileName ?? '') || 'proposta_assinada.pdf';
      const downloadName = normalizePossiblyMojibakeText(response.downloadName || fallbackName);
      const objectUrl = URL.createObjectURL(response.blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = downloadName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
    } catch (error) {
      console.error('Erro ao baixar proposta assinada:', error);
      toast.error('Não foi possível baixar a proposta assinada.');
    }
  }

  function downloadPreviewDocument() {
    const downloadSource = documentPreviewObjectUrl || documentPreviewSourceUrl;
    if (!downloadSource) return;
    const anchor = document.createElement('a');
    anchor.href = downloadSource;
    anchor.download = normalizePossiblyMojibakeText(documentPreviewFileName || 'documento');
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function replacePreviewDocument() {
    if (!documentPreviewDoc || !documentPreviewContract) return;
    const documentType = String(documentPreviewDoc.documentType ?? documentPreviewDoc.type ?? '').trim();
    const side = documentPreviewDoc.side ?? null;
    const previewDoc = documentPreviewDoc;
    const normalizedType = documentType.toLowerCase();
    if (signedReviewDocTypes.has(normalizedType)) {
      const contract = documentPreviewContract;
      closeDocumentPreview();
      prepareSignedDocumentReplacement(previewDoc);
      selected = contract;
      return;
    }
    if (!documentType || !side) {
      toast.error('Este documento não pode ser substituído por este fluxo.');
      return;
    }
    const contract = documentPreviewContract;
    closeDocumentPreview();
    triggerMatrixUpload(documentType, side);
    selected = contract;
  }

  async function deletePreviewDocument() {
    if (!documentPreviewDoc || !documentPreviewContract) return;
    const contract = documentPreviewContract;
    const doc = documentPreviewDoc;
    const normalizedType = String(doc.documentType ?? doc.type ?? '').trim().toLowerCase();
    if (signedReviewDocTypes.has(normalizedType)) {
      closeDocumentPreview();
      await deleteSignedOrFinalizedDocument(doc);
      selected = contract;
      return;
    }
    closeDocumentPreview();
    await deleteMatrixDocument(doc);
    selected = contract;
  }

  function getPropertyImageUrl(contract: ContractItem): string {
    return String(contract.propertyImageUrl ?? '').trim();
  }

  function getPropertyImageAlt(contract: ContractItem): string {
    const title = String(contract.propertyTitle ?? '').trim();
    if (title.length > 0) {
      return `Foto do imóvel ${title}`;
    }
    return 'Foto do imóvel';
  }

  function syncIsMobileLayout() {
    if (typeof window === 'undefined') return;
    isMobileLayout = window.innerWidth < 768;
  }

  function shouldHydrateContractDetails(contract: ContractItem): boolean {
    return contract.status === 'AWAITING_DOCS' && getBuyerDisplayName(contract) === '-';
  }

  function readWorkflowText(
    contract: ContractItem | null,
    key: string
  ): string {
    const metadata = contract?.workflowMetadata ?? null;
    if (!metadata || typeof metadata !== 'object') {
      return '';
    }
    const value = metadata[key];
    return value == null ? '' : String(value).trim();
  }

  function readResponsibleUserIds(contract: ContractItem | null | undefined): number[] {
    if (!contract || !Array.isArray(contract.responsibleUserIds)) {
      return [];
    }
    return contract.responsibleUserIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  function formatResponsibleUserSummary(contract: ContractItem | null | undefined): string {
    const ids = readResponsibleUserIds(contract);
    if (ids.length === 0) {
      return '';
    }
    return `${ids.length} ${ids.length === 1 ? 'responsável designado' : 'responsáveis designados'}`;
  }

  function hasInPersonSignatureChoice(contract: ContractItem | null): boolean {
    return readWorkflowText(contract, 'signatureMethod').toLowerCase() === 'in_person';
  }

  function hasAgencySignedReceipt(contract: ContractItem | null): boolean {
    return readWorkflowText(contract, 'agencySignedContractReceivedAt').length > 0;
  }

  function resolveAgencyAddress(contract: ContractItem | null): string {
    const agencyName = String(contract?.agencyName ?? '').trim();
    const agencyAddress = String(contract?.agencyAddress ?? '').trim();
    if (agencyName && agencyAddress) {
      return `${agencyName} - ${agencyAddress}`;
    }
    if (agencyAddress) {
      return agencyAddress;
    }
    if (agencyName) {
      return `${agencyName} (endereço não informado)`;
    }
    return 'Endereço da imobiliária não informado pela administração.';
  }

  function readReasonText(reasonPayload?: Record<string, unknown> | null): string {
    if (!reasonPayload) return '';
    const reason = reasonPayload.reason;
    return reason == null ? '' : String(reason).trim();
  }

  function getApprovalSummaries(contract: ContractItem | null | undefined): Array<{
    key: string;
    label: string;
    status: ContractApprovalStatus | null | undefined;
    reason: string;
  }> {
    if (!contract) return [];

    if (isDoubleEndedDeal(contract)) {
      return [
        {
          key: 'seller',
          label: contractSideLabel(contract, 'seller'),
          status: contract.sellerApprovalStatus,
          reason: readReasonText(contract.sellerApprovalReason),
        },
      ];
    }

    return [
      {
        key: 'seller',
        label: contractSideLabel(contract, 'seller'),
        status: contract.sellerApprovalStatus,
        reason: readReasonText(contract.sellerApprovalReason),
      },
      {
        key: 'buyer',
        label: contractSideLabel(contract, 'buyer'),
        status: contract.buyerApprovalStatus,
        reason: readReasonText(contract.buyerApprovalReason),
      },
    ];
  }

  function getApprovalRemarkSummaries(
    contract: ContractItem | null | undefined
  ): Array<{
    key: string;
    label: string;
    status: ContractApprovalStatus | null | undefined;
    reason: string;
  }> {
    return getApprovalSummaries(contract).filter(
      (item) => String(item.status ?? '').toUpperCase() === 'APPROVED_WITH_RES'
    );
  }

  function readCommissionValue(
    source: Record<string, unknown> | null | undefined,
    key: string
  ): string {
    if (!source) return '';
    const value = source[key];
    if (value == null) return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '';
    return formatManualDecimalDisplay(parsed);
  }

  function formatFinalizeMoneyInput(raw: string): string {
    return sanitizeManualDecimalInput(raw, {
      maxFractionDigits: 2,
      maxIntegerDigits: 12,
    });
  }

  function hydrateFinalizeForm(contract: ContractItem | null): void {
    const data = contract?.commissionData ?? null;
    const savedCommissionValues = [
      readCommissionValue(data, 'comissaoCaptador'),
      readCommissionValue(data, 'comissaoVendedor'),
      readCommissionValue(data, 'taxaPlataforma'),
    ];
    const hasSavedCommissionValues = savedCommissionValues.some((value) => value.length > 0);
    finalizeFieldModes = {
      comissaoCaptador: hasSavedCommissionValues ? 'amount' : 'percentage',
      comissaoVendedor: hasSavedCommissionValues ? 'amount' : 'percentage',
      taxaPlataforma: hasSavedCommissionValues ? 'amount' : 'percentage',
    };
    finalizeForm = {
      valorBaseComissao:
        readCommissionValue(data, 'valorBaseComissao') || readCommissionValue(data, 'valorVenda'),
      comissaoCaptador: hasSavedCommissionValues ? savedCommissionValues[0] : '10,00',
      comissaoVendedor: hasSavedCommissionValues ? savedCommissionValues[1] : '50,00',
      taxaPlataforma: hasSavedCommissionValues ? savedCommissionValues[2] : '40,00',
    };
    isEditingCommissions = false;
    commissionEditionSaved = false;
  }

  function parseMoney(value: string): number | null {
    const normalized = sanitizeManualDecimalInput(value, {
      maxFractionDigits: 2,
      maxIntegerDigits: 12,
    });
    if (!normalized) return null;
    const parsed = Number(normalized.replace(',', '.').replace(/,$/, ''));
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Number(parsed.toFixed(2));
  }

  function sanitizePercentageInput(raw: string): string {
    return sanitizeManualDecimalInput(raw, {
      maxFractionDigits: 2,
      maxIntegerDigits: 3,
      maxValue: 100,
    });
  }

  function parsePercentage(value: string): number | null {
    const normalized = sanitizeManualDecimalInput(value, {
      maxFractionDigits: 2,
      maxIntegerDigits: 3,
      maxValue: 100,
    });
    if (!normalized) return null;
    const parsed = Number(normalized.replace(',', '.').replace(/,$/, ''));
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Number(Math.min(100, parsed).toFixed(2));
  }

  function formatPercentageValue(value: number): string {
    return Number(value).toFixed(2).replace('.', ',');
  }

  function convertAmountFieldToPercentage(
    rawAmount: string,
    saleValue: number | null
  ): string {
    if (saleValue == null || saleValue <= 0) return '';
    const amount = parseMoney(rawAmount);
    if (amount == null) return '';
    const percentage = Number(((amount / saleValue) * 100).toFixed(2));
    return formatPercentageValue(percentage);
  }

  function convertPercentageFieldToAmount(
    rawPercentage: string,
    saleValue: number | null
  ): string {
    if (saleValue == null || saleValue <= 0) return '';
    const percentage = parsePercentage(rawPercentage);
    if (percentage == null) return '';
    const amount = Number(((saleValue * percentage) / 100).toFixed(2));
    return formatManualDecimalDisplay(amount);
  }

  function handleFinalizeMoneyInput(
    field: keyof typeof finalizeForm,
    event: Event
  ): void {
    const target = event.currentTarget as HTMLInputElement;
    const nextValue = formatFinalizeMoneyInput(target.value);
    finalizeForm = {
      ...finalizeForm,
      [field]: nextValue,
    };

  }

  function handleFinalizePercentageInput(
    field: keyof typeof finalizeForm,
    event: Event
  ): void {
    const target = event.currentTarget as HTMLInputElement;
    finalizeForm = {
      ...finalizeForm,
      [field]: sanitizePercentageInput(target.value),
    };
  }

  function getFinalizeFieldMode(field: FinalizeCommissionField): FinalizeFieldMode {
    return finalizeFieldModes[field] ?? 'amount';
  }

  function setFinalizeFieldMode(field: FinalizeCommissionField, mode: FinalizeFieldMode): void {
    const currentMode = getFinalizeFieldMode(field);
    if (currentMode === mode) return;

    const base = parseMoney(finalizeForm.valorBaseComissao);
    // Without a base there is no safe conversion. Preserve the typed value and
    // let the unit mask change; the remaining amount will be calculated once
    // the commission base is entered.
    const convertedValue =
      base == null || base <= 0
        ? finalizeForm[field]
        : currentMode === 'amount'
          ? convertAmountFieldToPercentage(finalizeForm[field], base)
          : convertPercentageFieldToAmount(finalizeForm[field], base);

    finalizeFieldModes = {
      ...finalizeFieldModes,
      [field]: mode,
    };
    finalizeForm = { ...finalizeForm, [field]: convertedValue };
  }

  function finalizeFieldEquivalent(field: FinalizeCommissionField): string | null {
    const base = parseMoney(finalizeForm.valorBaseComissao);
    const rawValue = finalizeForm[field].trim();
    if (base == null || base <= 0 || !rawValue) return null;

    if (getFinalizeFieldMode(field) === 'amount') {
      const amount = parseMoney(rawValue);
      if (amount == null) return null;
      return `${formatPercentageValue((amount / base) * 100)}% da base`;
    }

    const percentage = parsePercentage(rawValue);
    if (percentage == null) return null;
    return `Equivale a R$ ${formatManualDecimalDisplay((base * percentage) / 100)}`;
  }

  function fillFinalizeRemaining(field: FinalizeCommissionField): void {
    const remaining = calculateFinalizeCommissionRemaining(field);
    const base = parseMoney(finalizeForm.valorBaseComissao);
    if (remaining == null || remaining < 0 || base == null || base <= 0) return;

    const displayValue =
      getFinalizeFieldMode(field) === 'percentage'
        ? formatPercentageValue((remaining / base) * 100)
        : formatManualDecimalDisplay(remaining);
    finalizeForm = { ...finalizeForm, [field]: displayValue };
  }

  function resolveFinalizeFieldAmount(
    field: FinalizeCommissionField,
    emptyValue: number | null = null,
  ): number | null {
    const rawValue = finalizeForm[field].trim();
    if (!rawValue) return emptyValue;

    const base = parseMoney(finalizeForm.valorBaseComissao);
    if (base == null || base <= 0) return null;
    if (getFinalizeFieldMode(field) === 'amount') return parseMoney(rawValue);

    const percentage = parsePercentage(rawValue);
    return percentage == null ? null : Number(((base * percentage) / 100).toFixed(2));
  }

  // Empty allocations count as zero in the preview, so the remaining value can
  // be assigned before all three commission fields have been filled.
  function calculateFinalizeCommissionRemaining(
    ignoredField: FinalizeCommissionField | null = null,
  ): number | null {
    const base = parseMoney(finalizeForm.valorBaseComissao);
    if (base == null || base <= 0) return null;

    const fields: FinalizeCommissionField[] = [
      'comissaoCaptador',
      'comissaoVendedor',
      'taxaPlataforma',
    ];
    const allocatedCents = fields.reduce((sum, field) => {
      if (field === ignoredField) return sum;
      const amount = resolveFinalizeFieldAmount(field, 0);
      return amount == null ? Number.NaN : sum + Math.round(amount * 100);
    }, 0);
    if (!Number.isFinite(allocatedCents)) return null;
    return (Math.round(base * 100) - allocatedCents) / 100;
  }

  // Keep dependencies explicit. Svelte cannot infer values read inside helper functions.
  $: {
    finalizeCommissionPreview = resolveFinalizeCommissionAmounts(
      finalizeForm,
      finalizeFieldModes,
    );
    finalizeCommissionRemaining = calculateFinalizeCommissionRemaining();
  }

  function getDocumentsForFinalize(contract: ContractItem): ContractDocument[] {
    return getAllContractDocuments(contract).filter((doc) =>
      signedReviewDocTypes.has((doc.documentType ?? '').trim().toLowerCase())
    );
  }

  function hasPaymentProofForFinalize(contract: ContractItem | null | undefined): boolean {
    if (!contract) return false;
    return getDocumentsForFinalize(contract).some(
      (doc) => String(doc.documentType ?? '').trim().toLowerCase() === 'comprovante_pagamento'
    );
  }

  function finalizedDocumentRequiresSide(documentType: string): boolean {
    const normalized = documentType.trim().toLowerCase();
    return (
      normalized !== 'contrato_minuta' &&
      normalized !== 'contrato_assinado' &&
      normalized !== 'comprovante_pagamento' &&
      normalized !== 'boleto_vistoria' &&
      normalized !== 'outro'
    );
  }

  let contractMatrixRows: Array<{
    documentType: string;
    sellerRequired: boolean;
    buyerRequired: boolean;
    sellerDocs: ContractDocument[];
    buyerDocs: ContractDocument[];
  }> = [];

  $: contractMatrixRows =
    selected != null
      ? getMatrixRows(selected).map((row) => ({
          ...row,
          sellerDocs: getDocumentsForMatrixCell(selected, row.documentType, 'seller'),
          buyerDocs: getDocumentsForMatrixCell(selected, row.documentType, 'buyer'),
        }))
      : [];

  function isMatrixUploading(key: string): boolean {
    return Number(matrixUploadingCounts[key] ?? 0) > 0;
  }

  function bumpMatrixUploading(key: string, delta: 1 | -1): void {
    const nextCount = Math.max(0, Number(matrixUploadingCounts[key] ?? 0) + delta);
    if (nextCount === 0) {
      const { [key]: _, ...rest } = matrixUploadingCounts;
      matrixUploadingCounts = rest;
      return;
    }
    matrixUploadingCounts = {
      ...matrixUploadingCounts,
      [key]: nextCount,
    };
  }

  async function fetchContracts() {
    isLoading = true;
    try {
      const response = await listContracts<ContractItem>(
        activeTab,
        currentPage,
        itemsPerPage,
        contractSearchQuery,
      );
      items = response.items.filter((item) => !isRejectedContract(item));
      totalItems = response.total;
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast.error('Não foi possível carregar os contratos.');
      items = [];
      totalItems = 0;
      totalPages = 1;
    } finally {
      isLoading = false;
    }
  }

  function refresh(resetPage = false) {
    if (resetPage) currentPage = 1;
    refreshKey += 1;
  }

  function scheduleContractSearch(): void {
    if (contractSearchDebounce) {
      clearTimeout(contractSearchDebounce);
    }
    contractSearchDebounce = setTimeout(() => {
      contractSearchDebounce = null;
      refresh(true);
    }, 300);
  }

  function clearContractSearch(): void {
    contractSearchQuery = '';
    scheduleContractSearch();
  }

  async function reloadSelectedContract(contractId: string): Promise<void> {
    const [payload, rejections] = await Promise.all([
      getContractDetails<ContractItem>(contractId),
      listContractDocumentRejections(contractId).catch((error) => {
        console.error('Falha ao carregar histórico de rejeições:', error);
        return [] as ContractDocumentRejection[];
      }),
    ]);
    if (!payload?.contract || !selected || selected.id !== contractId) {
      return;
    }

    documentRejections = rejections;

    selected = {
      ...selected,
      ...payload.contract,
      documents: Array.isArray(payload.documents)
        ? (payload.documents as ContractDocument[])
        : selected.documents ?? [],
    };
    if (showModal) {
      hydratePartyInfoFormsFromSelected();
    }
  }

  function syncSelectedContractInList(contract: ContractItem): void {
    items = items.map((item) => (item.id === contract.id ? { ...item, ...contract } : item));
  }

  function hydratePartyInfoFormsFromSelected() {
    if (!selected) return;
    const ownerInfo = selected.ownerInfo ?? selected.sellerInfo;
    const sellerName = getRecordValueRaw(ownerInfo, ['nome', 'name', 'fullName', 'full_name']);
    const sellerCpf = getRecordValueRaw(ownerInfo, ['cpf']);
    inheritedSellerIdentity = {
      nome: selected.identityCapabilities?.seller?.canEditName === false,
      cpf: selected.identityCapabilities?.seller?.canEditCpf === false,
    };
    ownerInfoForm = {
      nome: sellerName,
      cpf: sellerCpf,
      estadoCivil: getRecordValueRaw(ownerInfo, ['estado_civil', 'estadoCivil']),
      profissao: getRecordValueRaw(ownerInfo, ['profissao']),
      email: getRecordValueRaw(ownerInfo, ['email']),
      telefone: getRecordValueRaw(ownerInfo, ['telefone', 'phone']),
      dadosBancarios: getRecordValueRaw(ownerInfo, ['dados_bancarios', 'dadosBancarios']),
      conjugeNome: getRecordValueRaw(ownerInfo, ['conjuge_nome', 'conjugeNome', 'spouse_name', 'spouseName']),
      conjugeCpf: getRecordValueRaw(ownerInfo, ['conjuge_cpf', 'conjugeCpf', 'spouse_cpf', 'spouseCpf']),
      conjugeProfissao: getRecordValueRaw(ownerInfo, ['conjuge_profissao', 'conjugeProfissao', 'spouse_profession', 'spouseProfession']),
    };
    buyerInfoForm = {
      nome: getRecordValueRaw(selected.buyerInfo, ['nome', 'clientName', 'name', 'fullName', 'full_name']),
      cpf: getRecordValueRaw(selected.buyerInfo, ['cpf', 'clientCpf']),
      estadoCivil: getRecordValueRaw(selected.buyerInfo, ['estado_civil', 'estadoCivil']),
      profissao: getRecordValueRaw(selected.buyerInfo, ['profissao']),
      email: getRecordValueRaw(selected.buyerInfo, ['email']),
      telefone: getRecordValueRaw(selected.buyerInfo, ['telefone', 'phone']),
      garantiaLocacao: getRecordValueRaw(selected.buyerInfo, ['garantia_locacao', 'garantiaLocacao']),
      conjugeNome: getRecordValueRaw(selected.buyerInfo, ['conjuge_nome', 'conjugeNome', 'spouse_name', 'spouseName']),
      conjugeCpf: getRecordValueRaw(selected.buyerInfo, ['conjuge_cpf', 'conjugeCpf', 'spouse_cpf', 'spouseCpf']),
      conjugeProfissao: getRecordValueRaw(selected.buyerInfo, ['conjuge_profissao', 'conjugeProfissao', 'spouse_profession', 'spouseProfession']),
    };
    inheritedBuyerIdentity = {
      nome: selected.identityCapabilities?.buyer?.canEditName === false,
      cpf: selected.identityCapabilities?.buyer?.canEditCpf === false,
    };
  }

  function contractActorName(
    contract: ContractItem,
    role: 'proposer' | 'buyer' | 'advertiser' | 'seller'
  ): string {
    const nameFromInfo = (info: Record<string, unknown> | null | undefined) =>
      getRecordValueRaw(info, ['nome', 'name', 'fullName', 'full_name']);
    const value = role === 'proposer'
      ? contract.proposerName ?? contract.clientName ?? contract.buyerClientName
      : role === 'buyer'
      ? nameFromInfo(contract.buyerInfo) || contract.buyerClientName
      : role === 'advertiser'
      ? contract.advertiserName ?? contract.ownerName ?? contract.propertyOwnerName
      : nameFromInfo(contract.sellerInfo ?? contract.ownerInfo) || contract.sellerClientName || contract.ownerName;
    return String(value ?? '').trim() || '(A definir)';
  }

  async function saveContractPartyData() {
    if (!selected) return;
    savingPartyData = true;
    try {
      await saveContractPartyInfo(selected.id, {
        side: 'seller',
        sellerInfo: buildSellerInfoPayload(selected.ownerInfo ?? selected.sellerInfo, ownerInfoForm),
      });
      await saveContractPartyInfo(selected.id, {
        side: 'buyer',
        buyerInfo: buildBuyerInfoPayload(selected.buyerInfo, buyerInfoForm),
      });
      toast.success('Dados do vendedor e do comprador salvos.');
      await reloadSelectedContract(selected.id);
      isEditingData = false;
      isDataSectionExpanded = false;
    } catch (error) {
      console.error('Erro ao salvar dados do contrato:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível salvar os dados.'));
    } finally {
      savingPartyData = false;
    }
  }

  function cancelPartyDataEdit() {
    hydratePartyInfoFormsFromSelected();
    isEditingData = false;
    isDataSectionExpanded = false;
  }

  function changeTab(status: ContractStatus) {
    if (activeTab === status) return;
    activeTab = status;
    closeModal(true);
    refresh(true);
  }

  function resolveModalMode(item: ContractItem): ModalMode {
    if (item.status === 'AWAITING_DOCS') return 'review_docs';
    if (item.status === 'IN_DRAFT') return 'upload_draft';
    if (item.status === 'AWAITING_SIGNATURES') return 'finalize';
    return 'edit_finalized';
  }

  function openModal(item: ContractItem) {
    if (typeof document !== 'undefined' && !showModal) {
      previousModalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      lockViewportGestureScroll();
    }
    selected = item;
    modalMode = resolveModalMode(item);
    showModal = true;
    selectedDraftFile = null;
    selectedSignedFile = null;
    signedDocType = 'contrato_assinado';
    selectedSignedDocSide = 'seller';
    documentRejections = [];
    loadingDocumentRejections = true;
    uploadingDraft = false;
    uploadingSignedDoc = false;
    reopeningContract = false;
    deletingContract = false;
    deletingFinalizedDocumentId = null;
    downloadingAllDocuments = false;
    evaluatingSide = null;
    finalizingContract = false;
    savingPartyData = false;
    isEditingData = false;
    isDataSectionExpanded = false;
    hydrateFinalizeForm(item);
    hydratePartyInfoFormsFromSelected();
    void reloadSelectedContract(item.id)
      .then(() => {
        if (selected) {
          syncSelectedContractInList(selected);
        }
      })
      .catch((error) => {
        console.error('Falha ao carregar detalhes completos do contrato:', error);
      })
      .finally(() => {
        loadingDocumentRejections = false;
      });
  }

  function closeModal(force = false) {
    if (
      !force &&
      (uploadingDraft ||
        uploadingSignedDoc ||
        reopeningContract ||
        deletingContract ||
        finalizingContract ||
        evaluatingSide !== null ||
        savingPartyData)
    ) {
      return;
    }
    showModal = false;
    selected = null;
    selectedDraftFile = null;
    selectedSignedFile = null;
    selectedSignedDocSide = 'seller';
    isEditingData = false;
    isDataSectionExpanded = false;
    pendingReplacementDocumentId = null;
    documentRejections = [];
    loadingDocumentRejections = false;
    modalMode = 'review_docs';
    if (typeof document !== 'undefined') {
      document.body.style.overflow = previousModalBodyOverflow;
    }
    unlockViewportGestureScroll();
  }

  async function evaluateContractSide(
    side: 'seller' | 'buyer',
    status: ContractApprovalStatus
  ) {
    if (!selected) return;

    let reason = '';
    if (status === 'APPROVED_WITH_RES' || status === 'REJECTED') {
      const promptMessage =
        status === 'REJECTED'
          ? 'Informe o motivo da rejeição:'
          : 'Informe a ressalva da aprovação:';
      const value = window.prompt(promptMessage, '');
      if (value == null) {
        return;
      }
      reason = value.trim();
      if (reason.length < 3) {
        toast.error('Motivo deve ter ao menos 3 caracteres.');
        return;
      }
    }

    evaluatingSide = side;
    try {
      const response = await evaluateContractSideRequest(
        selected.id,
        side,
        status,
        reason || undefined
      );
      toast.success('Avaliação registrada com sucesso.');
      if (response?.movedToDraft === true) {
        closeModal(true);
        refresh();
        return;
      }
      await reloadSelectedContract(selected.id);
      if (selected) {
        syncSelectedContractInList(selected);
      }
    } catch (error) {
      console.error('Erro ao avaliar documentação por lado:', error);
      toast.error('Não foi possível registrar a avaliação.');
    } finally {
      evaluatingSide = null;
    }
  }

  async function reviewMatrixDocument(doc: ContractDocument, status: 'APPROVED' | 'REJECTED') {
    if (!selected) return;

    let reason = '';
    if (status === 'REJECTED') {
      const value = window.prompt('Informe o motivo da rejeição:', '');
      if (value == null) {
        return;
      }
      reason = value.trim();
      if (reason.length < 3) {
        toast.error('Motivo deve ter ao menos 3 caracteres.');
        return;
      }
    }

    reviewingDocumentId = doc.id;
    try {
      await reviewContractDocument(selected.id, doc.id, status, reason || undefined);
      toast.success(
        status === 'REJECTED'
          ? 'Documento rejeitado com sucesso.'
          : 'Documento aprovado com sucesso.'
      );
      await reloadSelectedContract(selected.id);
      if (selected) {
        syncSelectedContractInList(selected);
      }
    } catch (error) {
      console.error('Erro ao revisar documento individual:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível revisar o documento.'));
    } finally {
      reviewingDocumentId = null;
    }
  }

  function handleDraftFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;
    selectedDraftFile = file;
  }

  function triggerDraftPicker() {
    if (draftUploadInputEl) {
      draftUploadInputEl.value = '';
      draftUploadInputEl.click();
    }
  }

  function triggerSignedPicker() {
    if (signedUploadInputEl) {
      signedUploadInputEl.value = '';
      signedUploadInputEl.click();
    }
  }

  function handleSignedFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedSignedFile = target.files?.[0] ?? null;
  }

  function triggerMatrixUpload(
    documentType: string,
    side: 'seller' | 'buyer',
    existingDocumentType: string | null = null
  ) {
    matrixUploadContext = { documentType, side, existingDocumentType };
    if (matrixUploadInputEl) {
      matrixUploadInputEl.multiple =
        isOutroMatrixDocumentType(documentType) && !existingDocumentType;
      matrixUploadInputEl.value = '';
      matrixUploadInputEl.click();
    }
  }

  async function uploadMatrixDocumentFile(
    file: File,
    context: { documentType: string; side: 'seller' | 'buyer'; existingDocumentType?: string | null }
  ): Promise<boolean> {
    if (!selected || !file) {
      return false;
    }

    const normalizedType = String(context.documentType ?? '').trim().toLowerCase();
    const storageDocumentType =
      context.existingDocumentType?.trim() ||
      (normalizedType === 'outro'
        ? resolveOutroMatrixDocumentType(selected, context.side)
        : context.documentType);
    if (!storageDocumentType) {
      toast.error('Limite de documentos outros atingido para este lado.');
      return false;
    }

    await uploadMatrixDocument(
      selected.id,
      file,
      {
        documentType: storageDocumentType,
        side: context.side,
        existingDocumentType: context.existingDocumentType,
      },
      resolveMatrixUploadCategory(storageDocumentType, context.side)
    );
    return true;
  }

  async function handleMatrixFileSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!selected || files.length === 0 || !matrixUploadContext) {
      if (input) input.value = '';
      return;
    }

    const uploadKey = `${matrixUploadContext.side}:${matrixUploadContext.documentType}`;
    bumpMatrixUploading(uploadKey, 1);
    try {
      const currentUploadContext = matrixUploadContext;
      if (!currentUploadContext) {
        return;
      }
      const batchUpload =
        isOutroMatrixDocumentType(currentUploadContext.documentType) &&
        !currentUploadContext.existingDocumentType &&
        files.length > 1;

      if (batchUpload) {
        const nextOutroTypes = resolveOutroMatrixDocumentTypes(
          selected,
          currentUploadContext.side,
          files.length
        );
        if (nextOutroTypes.length === 0) {
          toast.error('Limite de documentos outros atingido para este lado.');
          return;
        }

        const filesToUpload = files.slice(0, nextOutroTypes.length);
        if (filesToUpload.length < files.length) {
          toast.error(
            `Limite de documentos outros atingido para este lado. Serão enviados apenas ${filesToUpload.length}.`
          );
        }
        const results = await Promise.allSettled(
          filesToUpload.map((file, index) =>
            uploadMatrixDocumentFile(file, {
              documentType: currentUploadContext.documentType,
              side: currentUploadContext.side,
              existingDocumentType: nextOutroTypes[index],
            })
          )
        );

        const uploadedCount = results.filter((result) => result.status === 'fulfilled' && result.value).length;
        const failedCount = results.length - uploadedCount;
        if (uploadedCount > 0) {
          toast.success(
            `${uploadedCount} documento${uploadedCount > 1 ? 's' : ''} enviado${uploadedCount > 1 ? 's' : ''} com sucesso.`
          );
        }
        if (failedCount > 0) {
          toast.error('Alguns documentos não puderam ser enviados.');
        }
        await reloadSelectedContract(selected.id);
      } else {
        await uploadMatrixDocumentFile(files[0], matrixUploadContext);
        toast.success('Documento enviado com sucesso.');
        await reloadSelectedContract(selected.id);
      }
    } catch (error) {
      console.error('Erro ao enviar documento na matriz:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível enviar o documento.'));
    } finally {
      bumpMatrixUploading(uploadKey, -1);
      matrixUploadContext = null;
      if (input) input.value = '';
    }
  }

  async function deleteMatrixDocument(doc: ContractDocument) {
    if (!selected || !doc?.id) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o documento "${documentLabel(doc.documentType)}"?`
    );
    if (!confirmed) return;

    matrixDeletingDocumentId = doc.id;
    try {
      await deleteContractDocument(selected.id, doc.id);
      toast.success('Documento removido com sucesso.');
      await reloadSelectedContract(selected.id);
    } catch (error) {
      console.error('Erro ao excluir documento da matriz:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível excluir o documento.'));
    } finally {
      matrixDeletingDocumentId = null;
    }
  }

  async function deleteDraftDocument(doc: ContractDocument) {
    if (!selected || !doc?.id) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a minuta "${documentFileName(doc)}"?`
    );
    if (!confirmed) return;

    deletingDraftDocumentId = doc.id;
    try {
      await deleteContractDocument(selected.id, doc.id);
      toast.success('Minuta removida com sucesso.');
      await reloadSelectedContract(selected.id);
    } catch (error) {
      console.error('Erro ao excluir minuta:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível excluir a minuta.'));
    } finally {
      deletingDraftDocumentId = null;
    }
  }

  async function deleteContractDocumentById(doc: ContractDocument, successMessage: string) {
    if (!selected || !doc?.id) return;
    matrixDeletingDocumentId = doc.id;
    try {
      await deleteContractDocument(selected.id, doc.id);
      toast.success(successMessage);
      await reloadSelectedContract(selected.id);
    } catch (error) {
      console.error('Erro ao excluir documento do contrato:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível excluir o documento.'));
    } finally {
      matrixDeletingDocumentId = null;
    }
  }

  function prepareSignedDocumentReplacement(doc: ContractDocument) {
    const documentType = String(doc.documentType ?? doc.type ?? '').trim().toLowerCase();
    if (!documentType) {
      toast.error('Este documento não pode ser substituído agora.');
      return;
    }

    signedDocType = documentType;
    if (finalizedDocumentRequiresSide(documentType)) {
      selectedSignedDocSide = doc.side ?? selectedSignedDocSide;
    }
    pendingReplacementDocumentId = doc.id;
    selectedSignedFile = null;
    if (typeof document !== 'undefined') {
      document.getElementById('finalized-document-upload')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
    signedUploadInputEl?.click();
  }

  function cancelSignedDocumentReplacement() {
    pendingReplacementDocumentId = null;
    selectedSignedFile = null;
  }

  async function deleteSignedOrFinalizedDocument(doc: ContractDocument) {
    if (!selected || !doc?.id) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o documento "${documentFileName(doc)}"?`
    );
    if (!confirmed) return;

    const isFinalized = String(selected.status ?? '').trim().toUpperCase() === 'FINALIZED';
    if (isFinalized) deletingFinalizedDocumentId = doc.id;
    else matrixDeletingDocumentId = doc.id;
    try {
      // Documents attached while awaiting physical signatures still belong to
      // the regular contract area. The finalized-only endpoint rejects them.
      if (isFinalized) {
        await deleteFinalizedContractDocument(selected.id, doc.id);
      } else {
        await deleteContractDocument(selected.id, doc.id);
      }
      toast.success('Documento removido com sucesso.');
      await reloadSelectedContract(selected.id);
      if (selected) {
        syncSelectedContractInList(selected);
      }
    } catch (error) {
      console.error('Erro ao excluir documento do contrato:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível excluir o documento.'));
    } finally {
      deletingFinalizedDocumentId = null;
      matrixDeletingDocumentId = null;
    }
  }

  async function uploadSignedDocsByAdmin() {
    if (!selected) return;
    if (!selectedSignedFile) {
      toast.error('Selecione um arquivo para enviar.');
      return;
    }

    uploadingSignedDoc = true;
    try {
      await uploadSignedDocument(
        selected.id,
        signedDocType,
        selectedSignedFile,
        pendingReplacementDocumentId ?? undefined
      );
      toast.success('Documento físico anexado com sucesso.');
      pendingReplacementDocumentId = null;
      await reloadSelectedContract(selected.id);
      if (selected) {
        syncSelectedContractInList(selected);
      }
      // Mantém o operador na mesma etapa após o upload físico.
    } catch (error) {
      console.error('Erro ao anexar documento físico:', error);
      toast.error('Não foi possível anexar o documento físico.');
    } finally {
      uploadingSignedDoc = false;
    }
  }

  async function uploadFinalizedDocument() {
    if (!selected) return;
    if (!selectedSignedFile) {
      toast.error('Selecione um arquivo para enviar.');
      return;
    }

    if (
      finalizedDocumentRequiresSide(signedDocType) &&
      !selectedSignedDocSide
    ) {
      toast.error(`Selecione se o documento pertence ao ${selectedSellerLabel} ou ao ${selectedBuyerLabel}.`);
      return;
    }

    uploadingSignedDoc = true;
    try {
      await uploadFinalizedContractDocument(
        selected.id,
        signedDocType,
        selectedSignedFile,
        finalizedDocumentRequiresSide(signedDocType) ? selectedSignedDocSide : undefined,
        pendingReplacementDocumentId ?? undefined
      );
      toast.success('Documento anexado ao contrato finalizado.');
      selectedSignedFile = null;
      pendingReplacementDocumentId = null;
      await reloadSelectedContract(selected.id);
      if (selected) {
        syncSelectedContractInList(selected);
      }
    } catch (error) {
      console.error('Erro ao anexar documento ao contrato finalizado:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível anexar o documento.'));
    } finally {
      pendingReplacementDocumentId = null;
      uploadingSignedDoc = false;
    }
  }

  async function submitDraft(options: { reuseCurrentDraft?: boolean } = {}) {
    if (!selected) return;
    const reuseCurrentDraft = options.reuseCurrentDraft === true;

    if (!reuseCurrentDraft && !selectedDraftFile) {
      toast.error('Selecione um PDF da minuta para continuar.');
      return;
    }

    if (reuseCurrentDraft && !hasCurrentDraftDocument(selected)) {
      toast.error('Não há minuta atual para prosseguir.');
      return;
    }

    uploadingDraft = true;
    try {
      await submitContractDraft(selected.id, selectedDraftFile, reuseCurrentDraft);
      toast.success(
        reuseCurrentDraft
          ? 'Minuta atual mantida e contrato avançado para assinaturas.'
          : hasCurrentDraftDocument(selected)
            ? 'Minuta substituída e contrato avançado para assinaturas.'
            : 'Minuta anexada e contrato avançado para assinaturas.'
      );
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao anexar minuta:', error);
      toast.error('Não foi possível anexar a minuta.');
    } finally {
      uploadingDraft = false;
    }
  }

  async function submitFinalize() {
    if (!selected) return;
    if (!commissionEditionSaved) {
      toast.error('Edite e salve as comissões antes de finalizar o contrato.');
      return;
    }

    const resolvedCommissionAmounts = resolveFinalizeCommissionAmounts(
      finalizeForm,
      finalizeFieldModes
    );

    if (resolvedCommissionAmounts == null) {
      toast.error('Preencha todos os campos de comissão com valores válidos.');
      return;
    }

    const { valorBaseComissao, comissaoCaptador, comissaoVendedor, taxaPlataforma } =
      resolvedCommissionAmounts;

    if (!hasExactSaleSplit(resolvedCommissionAmounts)) {
      toast.error(
        'A soma das comissões e da taxa Encontre Aqui precisa fechar exatamente 100% do valor base.'
      );
      return;
    }

    finalizingContract = true;
    try {
      await finalizeContract(selected.id, {
        valorBaseComissao,
        comissaoCaptador,
        comissaoVendedor,
        taxaPlataforma,
      });
      toast.success('Contrato finalizado com sucesso.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao finalizar contrato:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível finalizar o contrato.'));
    } finally {
      finalizingContract = false;
    }
  }

  function saveCommissionEdition(): void {
    const resolvedCommissionAmounts = resolveFinalizeCommissionAmounts(
      finalizeForm,
      finalizeFieldModes
    );

    if (resolvedCommissionAmounts == null) {
      toast.error('Preencha todos os campos de comissão com valores válidos.');
      return;
    }

    if (!hasExactSaleSplit(resolvedCommissionAmounts)) {
      toast.error(
        'A soma das comissões e da taxa Encontre Aqui precisa fechar exatamente 100% do valor base.'
      );
      return;
    }

    isEditingCommissions = false;
    commissionEditionSaved = true;
    toast.success('Edição salva. Os valores serão registrados ao finalizar o contrato.');
  }

  async function deleteFinalizedDocument(doc: ContractDocument) {
    if (!selected) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o documento "${documentLabel(doc.documentType)}"?`
    );
    if (!confirmed) return;

    deletingFinalizedDocumentId = doc.id;
    try {
      await deleteFinalizedContractDocument(selected.id, doc.id);
      toast.success('Documento removido com sucesso.');
      await reloadSelectedContract(selected.id);
      await fetchContracts();
    } catch (error) {
      console.error('Erro ao remover documento do contrato finalizado:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível remover o documento.'));
    } finally {
      deletingFinalizedDocumentId = null;
    }
  }

  async function releaseFinalizedContract() {
    if (!selected) return;
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este contrato e liberar o imóvel imediatamente?'
    );
    if (!confirmed) return;

    reopeningContract = true;
    try {
      await deleteFinalizedContractById(selected.id);
      toast.success('Contrato excluído e imóvel liberado.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao excluir contrato e liberar imóvel:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível liberar o imóvel.'));
    } finally {
      reopeningContract = false;
    }
  }

  async function deleteFinalizedContract(contract: ContractItem) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o contrato finalizado do imóvel ${contract.propertyCode ?? 'Código indisponível'}?`
    );
    if (!confirmed) return;

    deletingContract = true;
    try {
      await deleteFinalizedContractById(contract.id);
      toast.success('Contrato finalizado excluído com sucesso.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao excluir contrato finalizado:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível excluir o contrato.'));
    } finally {
      deletingContract = false;
    }
  }

  async function downloadAllDocuments(contract: ContractItem) {
    downloadingAllDocuments = true;
    try {
      const blob = await downloadContractDocumentsZip(contract.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${contract.propertyCode ?? 'imovel'}_documentos.zip`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
    } catch (error) {
      console.error('Erro ao baixar ZIP do contrato:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível gerar o ZIP dos documentos.'));
    } finally {
      downloadingAllDocuments = false;
    }
  }

  async function moveContractToPreviousStage() {
    if (!selected) return;
    const destinationLabel = previousStageLabel(selected.status);

    movingToPreviousStage = true;
    try {
      await transitionContractById(selected.id, 'previous');
      toast.success(`Contrato voltou para ${destinationLabel}.`);
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao voltar contrato para a etapa anterior:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível voltar o contrato.'));
    } finally {
      movingToPreviousStage = false;
    }
  }

  async function viewDocument(doc: ContractDocument, contract: ContractItem) {
    if (!doc.downloadUrl) {
      toast.error('Documento sem URL de download.');
      return;
    }

    downloadingDocumentId = doc.id;
    try {
      const response = await downloadContractDocumentByUrl(doc.downloadUrl);
      const fallbackName =
        normalizePossiblyMojibakeText(doc.originalFileName ?? '') ||
        `${String(doc.documentType ?? 'documento').trim() || 'documento'}.pdf`;
      const downloadName = normalizePossiblyMojibakeText(response.downloadName || fallbackName);

      const objectUrl = URL.createObjectURL(response.blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = downloadName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
    } catch (error) {
      console.error('Erro ao baixar documento do contrato:', error);
      toast.error(
        `Não foi possível abrir o documento do contrato ${contract.propertyCode ?? 'selecionado'}.`
      );
    } finally {
      downloadingDocumentId = null;
    }
  }

  onMount(() => {
    syncIsMobileLayout();
    hasMounted = true;
    refresh(true);

    const handleFullscreenChange = () => {
      documentPreviewIsFullscreen = Boolean(document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });

  onDestroy(() => {
    if (contractSearchDebounce) {
      clearTimeout(contractSearchDebounce);
    }
    if (documentPreviewOwnsObjectUrl && documentPreviewObjectUrl) {
      URL.revokeObjectURL(documentPreviewObjectUrl);
    }
    if (typeof document !== 'undefined') {
      document.body.style.overflow = previousBodyOverflow;
    }
  });

  $: if (hasMounted) {
    activeTab;
    currentPage;
    itemsPerPage;
    refreshKey;
    fetchContracts();
  }

  $: approvalLockReasons = computeApprovalLockReasons(selected, modalMode);
  $: isReadyToApprove = approvalLockReasons.length === 0;
  $: sellerApprovalDisabled = evaluatingSide === 'seller' || !isReadyToApprove;
</script>

<svelte:window on:resize={syncIsMobileLayout} />

<div class="space-y-4">
  <div>
    <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Contratos</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Gerencie o pipeline completo de contratos.
    </p>
  </div>

  <div class="flex flex-wrap gap-2">
    {#each tabs as tab}
      <button
        type="button"
        on:click={() => changeTab(tab.key)}
        class={`rounded-full px-4 py-2 text-sm font-medium transition ${
          activeTab === tab.key
            ? 'bg-emerald-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        }`}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-wrap items-center gap-3">
      <div class="text-sm text-gray-600 dark:text-gray-300">
        {tabs.find((tab) => tab.key === activeTab)?.label}
      </div>
      <div class="relative">
        <input
          type="text"
          bind:value={contractSearchQuery}
          on:input={scheduleContractSearch}
          placeholder="Buscar por código, imóvel ou parte..."
          class="w-56 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        {#if contractSearchQuery}
          <button
            type="button"
            on:click={clearContractSearch}
            class="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="contracts-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="contracts-items-per-page"
        bind:value={itemsPerPage}
        on:change={() => refresh(true)}
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      <span>entradas</span>
    </div>
    <Button variant="outline" on:click={() => refresh()} disabled={isLoading}>
      {#if isLoading}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Atualizar
    </Button>
  </div>

  {#if isMobileLayout}
  <div class="space-y-3">
    {#if isLoading}
      <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Carregando contratos...
      </div>
    {:else if items.length === 0}
      <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Nenhum contrato encontrado nesta etapa.
      </div>
    {:else}
      {#each items as item (item.id)}
        <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              {#if getPropertyImageUrl(item)}
                <button
                  type="button"
                  class="shrink-0 overflow-hidden rounded-lg ring-1 ring-gray-200 transition hover:scale-[1.01] hover:ring-emerald-400 dark:ring-gray-700"
                  on:click={() => openPropertyImagePreview(getPropertyImageUrl(item), getPropertyImageAlt(item))}
                  title="Abrir imagem"
                >
                  <img
                    src={getPropertyImageUrl(item)}
                    alt={getPropertyImageAlt(item)}
                    class="h-14 w-14 object-cover"
                    loading="lazy"
                  />
                </button>
              {/if}
              <div class="min-w-0">
                <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {#if item.propertyCode}Cód. {item.propertyCode}{:else}{item.propertyTitle ?? '-'}{/if}
                </p>
                {#if item.propertyCode}
                  <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.propertyTitle ?? '-'}</p>
                {/if}
              </div>
            </div>
            <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {statusLabel(item.status)}
            </span>
          </div>
          <dl class="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <div class="flex items-center justify-between gap-3">
              <dt>{contractSideLabel(item, 'seller')}</dt>
              <dd class="text-right">{getOwnerDisplayName(item)}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>{contractSideLabel(item, 'buyer')}</dt>
              <dd class="text-right">{getBuyerDisplayName(item)}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Data</dt>
              <dd class="text-right">{formatDate(item.updatedAt ?? item.createdAt)}</dd>
            </div>
          </dl>
          {#if getApprovalRemarkSummaries(item).length > 0}
            <div class="mt-3 flex flex-wrap gap-2">
              {#each getApprovalRemarkSummaries(item) as summary (summary.key)}
                <span class="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {summary.label} com ressalvas
                </span>
              {/each}
            </div>
          {/if}
          <div class="mt-4 flex flex-col gap-2">
            <Button variant="outline" on:click={() => openModal(item)}>
              {tableActionLabel(item.status)}
            </Button>
            {#if item.status === 'FINALIZED' && canCurrentAdminDelete}
              <Button variant="destructive" on:click={() => deleteFinalizedContract(item)}>
                Excluir
              </Button>
            {/if}
          </div>
        </article>
      {/each}
    {/if}
  </div>

  {:else}
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Código do imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Parte vendedora/locadora
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Parte compradora/locatária
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ação
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if isLoading}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando contratos...
            </td>
          </tr>
        {:else if items.length === 0}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum contrato encontrado nesta etapa.
            </td>
          </tr>
        {:else}
          {#each items as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="flex items-start gap-3">
                  {#if getPropertyImageUrl(item)}
                    <button
                      type="button"
                      class="shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200 transition hover:scale-[1.01] hover:ring-emerald-400 dark:ring-gray-700"
                      on:click={() => openPropertyImagePreview(getPropertyImageUrl(item), getPropertyImageAlt(item))}
                      title="Abrir imagem"
                    >
                      <img
                        src={getPropertyImageUrl(item)}
                        alt={getPropertyImageAlt(item)}
                        class="h-12 w-12 object-cover"
                        loading="lazy"
                      />
                    </button>
                  {/if}
                  <div class="min-w-0">
                    <div class="font-semibold">
                      {#if item.propertyCode}Cód. {item.propertyCode}{:else}Código indisponível{/if}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {item.propertyTitle ?? '-'}
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                      <span class="text-gray-500 dark:text-gray-400">Situação final:</span>
                      <span class={`rounded-full px-2 py-1 ${getApprovalProgressToneClass(item)}`}>
                        {getApprovalProgressLabel(item)}
                      </span>
                    </div>
                  </div>
                </div>
                {#if getApprovalRemarkSummaries(item).length > 0}
                  <div class="mt-2 flex flex-wrap gap-2">
                    {#each getApprovalRemarkSummaries(item) as summary (summary.key)}
                      <span class="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {summary.label} com ressalvas
                      </span>
                    {/each}
                  </div>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {getOwnerDisplayName(item)}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {getBuyerDisplayName(item)}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.updatedAt ?? item.createdAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" on:click={() => openModal(item)}>
                    {tableActionLabel(item.status)}
                  </Button>
                  {#if item.status === 'FINALIZED' && canCurrentAdminDelete}
                    <Button
                      size="sm"
                      variant="destructive"
                      on:click={() => deleteFinalizedContract(item)}
                    >
                      Excluir
                    </Button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
  {/if}

  <div class="mt-4">
    <Pagination bind:currentPage {totalPages} {totalItems} {itemsPerPage} />
  </div>
</div>

{#if showModal && selected}
  <div
    class="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none bg-black/50 p-0 sm:items-start sm:p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div
      class="flex w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:my-8 sm:max-h-[80vh] sm:rounded-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-modal-title"
      aria-describedby="contract-modal-description"
    >
      <div class="shrink-0 border-b border-gray-200 p-6 dark:border-gray-800">
        <div class="flex items-start justify-between gap-3">
        <div>
          <h3 id="contract-modal-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {modalMode === 'review_docs'
              ? 'Análise de Documentação'
              : modalMode === 'upload_draft'
              ? 'Anexar Minuta'
              : modalMode === 'finalize'
              ? 'Finalizar Venda/Locação'
              : 'Editar Contrato Finalizado'}
          </h3>
          <p id="contract-modal-description" class="text-sm text-gray-500 dark:text-gray-400">
            {#if selected.propertyCode}Cód. {selected.propertyCode}{:else}Código indisponível{/if}
            {#if selected.propertyTitle}
              {' — '}{selected.propertyTitle}
            {/if}
          </p>
          {#if formatResponsibleUserSummary(selected)}
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formatResponsibleUserSummary(selected)}
            </p>
          {/if}
        </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            on:click={() => closeModal()}
            aria-label="Fechar modal"
          >
            ×
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
        {#if signedProposalDoc}
          <div class="mb-4 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-2">
                <FileText class="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Proposta Assinada (PDF)
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 break-all">
                    {signedProposalDoc.originalFileName || 'proposta_assinada.pdf'}
                  </p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => selected && signedProposalDoc && openDocumentPreview(signedProposalDoc, selected)}
                >
                  <Eye class="mr-2 h-4 w-4" />
                  Visualizar na Web
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => downloadSignedProposalPdf(signedProposalDoc)}
                >
                  <Download class="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          </div>
        {/if}

        {#if modalMode === 'review_docs'}
          <div class="mb-4">
            <ContractActorsGrid
              proposerName={contractActorName(selected, 'proposer')}
              buyerName={contractActorName(selected, 'buyer')}
              advertiserName={contractActorName(selected, 'advertiser')}
              sellerName={contractActorName(selected, 'seller')}
              buyerLabel={selectedBuyerLabel}
              sellerLabel={selectedSellerLabel}
              buyerDescription={contractSideDocumentDescription(selected, 'buyer')}
              sellerDescription={contractSideDocumentDescription(selected, 'seller')}
            />
          </div>
        {/if}

        {#if modalMode !== 'review_docs' && getApprovalRemarkSummaries(selected).length > 0}
          <div class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
          <p class="text-xs font-semibold uppercase text-amber-800 dark:text-amber-300">
            Aprovação com ressalvas
          </p>
          <div class="mt-2 space-y-2">
            {#each getApprovalRemarkSummaries(selected) as summary (summary.key)}
              <div class="rounded-md border border-amber-200/80 bg-white/70 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-gray-900/30">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-gray-900 dark:text-gray-100">{summary.label}</span>
                  <span class={`rounded-full px-2 py-1 text-xs font-semibold ${approvalBadgeClass(summary.status)}`}>
                    {approvalLabel(summary.status)}
                  </span>
                </div>
                {#if summary.reason}
                  <p class="mt-1 text-sm text-amber-900 dark:text-amber-200">
                    {summary.reason}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
          </div>
        {/if}

        {#if modalMode === 'review_docs'}
        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Dados das partes</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Recolhidos por padrão para manter a análise documental em foco.</p>
            </div>
            <Button
              type="button"
              variant={isEditingData ? 'outline' : 'default'}
              className={isEditingData
                ? 'border-amber-400 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/30'
                : 'bg-amber-500 text-black hover:bg-amber-400'}
              disabled={savingPartyData}
              on:click={() => {
                if (isEditingData) cancelPartyDataEdit();
                else {
                  isDataSectionExpanded = true;
                  isEditingData = true;
                }
              }}
            >
              {isEditingData ? 'Cancelar edição' : 'Editar Dados'}
            </Button>
          </div>
          <details class="rounded-md border border-gray-200 dark:border-gray-700" bind:open={isDataSectionExpanded}>
            <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700 marker:text-gray-400 dark:text-gray-200">
              {isDataSectionExpanded ? 'Ocultar dados cadastrais' : 'Ver dados cadastrais'}
            </summary>
            <div class="grid gap-4 border-t border-gray-200 p-3 md:grid-cols-2 dark:border-gray-700">
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{contractSideDataLabel(selected, 'seller')}</p>
                <span class={`rounded-full px-2 py-1 text-xs font-semibold ${approvalBadgeClass(selected.sellerApprovalStatus)}`}>
                  {approvalLabel(selected.sellerApprovalStatus)}
                </span>
              </div>
              {#if readReasonText(selected.sellerApprovalReason).length > 0}
                <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">Motivo: {readReasonText(selected.sellerApprovalReason)}</p>
              {/if}
              <div class="mt-3 space-y-3 text-sm">
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="owner-nome">{inheritedSellerIdentity.nome ? 'Nome (herdado do perfil)' : 'Nome'}</label><LabeledTextInput id="owner-nome" bind:value={ownerInfoForm.nome} disabled={savingPartyData || !isEditingData || inheritedSellerIdentity.nome} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="owner-cpf">{inheritedSellerIdentity.cpf ? 'CPF (herdado do perfil)' : 'CPF'}</label><LabeledTextInput id="owner-cpf" bind:value={ownerInfoForm.cpf} disabled={savingPartyData || !isEditingData || inheritedSellerIdentity.cpf} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="owner-profissao">Profissão</label><LabeledTextInput id="owner-profissao" bind:value={ownerInfoForm.profissao} disabled={savingPartyData || !isEditingData} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="owner-email">Email</label><LabeledTextInput id="owner-email" bind:value={ownerInfoForm.email} disabled={savingPartyData || !isEditingData} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="owner-telefone">Telefone</label><LabeledTextInput id="owner-telefone" bind:value={ownerInfoForm.telefone} disabled={savingPartyData || !isEditingData} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="owner-banco">Dados bancários</label><textarea id="owner-banco" bind:value={ownerInfoForm.dadosBancarios} disabled={savingPartyData || !isEditingData} rows="3" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"></textarea></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="owner-estado-civil">Estado civil</label><select id="owner-estado-civil" bind:value={ownerInfoForm.estadoCivil} disabled={savingPartyData || !isEditingData} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800">{#each maritalStatusOptions as option}<option value={option}>{option || 'Selecione'}</option>{/each}</select></div>
                {#if requiresSpouseFields(ownerInfoForm.estadoCivil)}
                  <div class="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"><p class="mb-2 text-xs font-semibold uppercase text-amber-800 dark:text-amber-200">Dados do Cônjuge</p><div class="space-y-2"><LabeledTextInput id="owner-conjuge-nome" placeholder="Nome do cônjuge" bind:value={ownerInfoForm.conjugeNome} disabled={savingPartyData || !isEditingData} /><LabeledTextInput id="owner-conjuge-cpf" placeholder="CPF do cônjuge" bind:value={ownerInfoForm.conjugeCpf} disabled={savingPartyData || !isEditingData} /><LabeledTextInput id="owner-conjuge-profissao" placeholder="Profissão do cônjuge" bind:value={ownerInfoForm.conjugeProfissao} disabled={savingPartyData || !isEditingData} /></div></div>
                {/if}
              </div>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{contractSideDataLabel(selected, 'buyer')}</p>
                <span class={`rounded-full px-2 py-1 text-xs font-semibold ${approvalBadgeClass(selected.buyerApprovalStatus)}`}>
                  {approvalLabel(selected.buyerApprovalStatus)}
                </span>
              </div>
              {#if readReasonText(selected.buyerApprovalReason).length > 0}
                <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">Motivo: {readReasonText(selected.buyerApprovalReason)}</p>
              {/if}
              <div class="mt-3 space-y-3 text-sm">
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-nome">{inheritedBuyerIdentity.nome ? 'Nome (herdado do perfil)' : 'Nome'}</label><LabeledTextInput id="buyer-nome" bind:value={buyerInfoForm.nome} disabled={savingPartyData || !isEditingData || inheritedBuyerIdentity.nome} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-cpf">{inheritedBuyerIdentity.cpf ? 'CPF (herdado do perfil)' : 'CPF'}</label><LabeledTextInput id="buyer-cpf" bind:value={buyerInfoForm.cpf} disabled={savingPartyData || !isEditingData || inheritedBuyerIdentity.cpf} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-profissao">Profissão</label><LabeledTextInput id="buyer-profissao" bind:value={buyerInfoForm.profissao} disabled={savingPartyData || !isEditingData} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-email">Email</label><LabeledTextInput id="buyer-email" bind:value={buyerInfoForm.email} disabled={savingPartyData || !isEditingData} /></div>
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-telefone">Telefone</label><LabeledTextInput id="buyer-telefone" bind:value={buyerInfoForm.telefone} disabled={savingPartyData || !isEditingData} /></div>
                {#if selected.dealType === 'rent'}
                  <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-garantia-locacao">Garantia de locação</label><select id="buyer-garantia-locacao" bind:value={buyerInfoForm.garantiaLocacao} disabled={savingPartyData || !isEditingData} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"><option value="">Selecione</option><option value="Fiador">Fiador</option><option value="Seguro Fiança">Seguro Fiança</option><option value="Caução">Caução</option></select></div>
                {/if}
                <div><label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-estado-civil">Estado civil</label><select id="buyer-estado-civil" bind:value={buyerInfoForm.estadoCivil} disabled={savingPartyData || !isEditingData} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800">{#each maritalStatusOptions as option}<option value={option}>{option || 'Selecione'}</option>{/each}</select></div>
                {#if requiresSpouseFields(buyerInfoForm.estadoCivil)}
                  <div class="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"><p class="mb-2 text-xs font-semibold uppercase text-amber-800 dark:text-amber-200">Dados do Cônjuge</p><div class="space-y-2"><LabeledTextInput id="buyer-conjuge-nome" placeholder="Nome do cônjuge" bind:value={buyerInfoForm.conjugeNome} disabled={savingPartyData || !isEditingData} /><LabeledTextInput id="buyer-conjuge-cpf" placeholder="CPF do cônjuge" bind:value={buyerInfoForm.conjugeCpf} disabled={savingPartyData || !isEditingData} /><LabeledTextInput id="buyer-conjuge-profissao" placeholder="Profissão do cônjuge" bind:value={buyerInfoForm.conjugeProfissao} disabled={savingPartyData || !isEditingData} /></div></div>
                {/if}
              </div>
            </div>
            </div>
          {#if isEditingData}
            <div class="flex flex-wrap gap-2 border-t border-gray-200 px-3 py-3 dark:border-gray-700">
              <Button
                type="button"
                disabled={savingPartyData}
                on:click={() => {
                  void saveContractPartyData();
                }}
              >
                {#if savingPartyData}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Salvar dados vendedor e comprador
              </Button>
            </div>
          {/if}
          </details>

          <ContractDocumentMatrix
            contract={selected}
            rows={contractMatrixRows}
            sellerLabel={selectedSellerLabel}
            buyerLabel={selectedBuyerLabel}
            documentLabel={documentLabel}
            documentFileName={documentFileName}
            documentStatusLabel={documentStatusLabel}
            documentStatusClass={documentStatusClass}
            isMatrixUploading={isMatrixUploading}
            canAddAnotherMatrixDocument={canAddAnotherMatrixDocument}
            downloadingDocumentId={downloadingDocumentId}
            matrixDeletingDocumentId={matrixDeletingDocumentId}
            canDeleteDocuments={canCurrentAdminDelete}
            reviewDocumentId={reviewingDocumentId}
            onOpenPreview={(doc) => selected && openDocumentPreview(doc, selected)}
            onDownload={(doc) => selected && viewDocument(doc, selected)}
            onReplace={(documentType, side, existingDocumentType) => {
              triggerMatrixUpload(documentType, side, existingDocumentType ?? null);
            }}
            onDelete={deleteMatrixDocument}
            onUpload={triggerMatrixUpload}
            onReview={(doc, status) => reviewMatrixDocument(doc, status)}
          />

          <footer class="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Decisão da análise</p>
            <ContractApprovalActions
              contract={selected}
              approvalLockReasons={approvalLockReasons}
              isReadyToApprove={isReadyToApprove}
              evaluatingSide={evaluatingSide}
              sellerApprovalDisabled={sellerApprovalDisabled}
              isDoubleEndedDeal={isDoubleEndedDeal}
              getSideApprovalUiState={getSideApprovalUiState}
              evaluateContractSide={evaluateContractSide}
            />

            <div class="flex justify-end">
              <Button variant="outline" on:click={() => closeModal()}>Fechar</Button>
            </div>
          </footer>
          <input
            class="hidden"
            type="file"
            accept=".pdf,application/pdf"
            aria-hidden="true"
            tabindex="-1"
            bind:this={matrixUploadInputEl}
            on:change={handleMatrixFileSelection}
          />
        </div>
        {:else if modalMode === 'upload_draft'}
          <ContractDraftUploadPanel
            contract={selected}
            sellerLabel={selectedSellerLabel}
            buyerLabel={selectedBuyerLabel}
            proposerName={contractActorName(selected, 'proposer')}
            buyerName={contractActorName(selected, 'buyer')}
            advertiserName={contractActorName(selected, 'advertiser')}
            sellerName={contractActorName(selected, 'seller')}
            buyerDescription={contractSideDocumentDescription(selected, 'buyer')}
            sellerDescription={contractSideDocumentDescription(selected, 'seller')}
          currentDraftDocument={getCurrentDraftDocument(selected)}
          documents={selected ? getAllContractDocuments(selected) : []}
          selectedDraftFile={selectedDraftFile}
          uploadingDraft={uploadingDraft}
          movingToPreviousStage={movingToPreviousStage}
          deletingDraftDocumentId={deletingDraftDocumentId}
          canDeleteDocuments={canCurrentAdminDelete}
          downloadingDocumentId={downloadingDocumentId}
          documentFileName={documentFileName}
          documentLabel={documentLabel}
          documentSideLabel={(doc) => documentSideLabel(doc, selected)}
          formatDate={formatDate}
          hasCurrentDraftDocument={hasCurrentDraftDocument}
          draftUploadInputLabel={draftUploadInputLabel}
          draftSubmitLabel={draftSubmitLabel}
          triggerDraftPicker={triggerDraftPicker}
          submitDraft={submitDraft}
          moveContractToPreviousStage={moveContractToPreviousStage}
          closeModal={closeModal}
          openDocumentPreview={(doc, contract) => openDocumentPreview(doc, contract)}
          viewDocument={(doc, contract) => viewDocument(doc, contract)}
          deleteDraftDocument={(doc) => deleteDraftDocument(doc)}
          handleDraftFileChange={handleDraftFileChange}
          bind:draftUploadInputEl={draftUploadInputEl}
        />
        {:else if modalMode === 'finalize'}
        <div class="space-y-4">
          <ContractActorsGrid
            proposerName={contractActorName(selected, 'proposer')}
            buyerName={contractActorName(selected, 'buyer')}
            advertiserName={contractActorName(selected, 'advertiser')}
            sellerName={contractActorName(selected, 'seller')}
            buyerLabel={selectedBuyerLabel}
            sellerLabel={selectedSellerLabel}
            buyerDescription={contractSideDocumentDescription(selected, 'buyer')}
            sellerDescription={contractSideDocumentDescription(selected, 'seller')}
          />
          {#if canCurrentAdminCreateDocuments || pendingReplacementDocumentId}
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Formulário de Comissões
                </p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Sugestão inicial: 10% captador, 50% vendedor e 40% Encontre Aqui. Você pode ajustar a divisão.
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                {#if isEditingCommissions}
                  <Button
                    type="button"
                    variant="outline"
                    className="border-amber-400 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/30"
                    on:click={() => hydrateFinalizeForm(selected)}
                  >
                    Cancelar edição
                  </Button>
                  <Button
                    type="button"
                    className="!bg-emerald-600 !text-white hover:!bg-emerald-700"
                    on:click={saveCommissionEdition}
                  >
                    Salvar edição
                  </Button>
                {:else}
                  <Button
                    type="button"
                    className="bg-amber-500 text-black hover:bg-amber-400"
                    on:click={() => {
                      isEditingCommissions = true;
                      commissionEditionSaved = false;
                    }}
                  >
                    Editar comissões
                  </Button>
                {/if}
              </div>
            </div>
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <label class="text-sm text-gray-700 dark:text-gray-200">
                {selected?.dealType === 'rent'
                  ? 'Aluguel mensal (base da comissão) (R$)'
                  : 'Valor de venda (base da comissão) (R$)'}
                <input
                  type="text"
                  inputmode="decimal"
                  value={finalizeForm.valorBaseComissao}
                  on:input={(event) => handleFinalizeMoneyInput('valorBaseComissao', event)}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-right text-sm tabular-nums dark:border-gray-700 dark:bg-gray-900"
                  readonly={!isEditingCommissions}
                />
              </label>
              <div class="text-sm text-gray-700 dark:text-gray-200">
                <div class="flex items-center justify-between gap-3">
                  <label for="finalize-comissao-captador" class="font-medium">
                    Comissão Captador
                  </label>
                  <div class="inline-flex overflow-hidden rounded-full border border-emerald-600 text-xs font-semibold shadow-sm">
                    <button
                      type="button"
                      class={`min-w-10 px-3 py-1 transition ${
                        finalizeFieldModes.comissaoCaptador === 'amount'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      }`}
                      aria-label="Usar reais na comissão captador"
                      aria-pressed={finalizeFieldModes.comissaoCaptador === 'amount'}
                      disabled={!isEditingCommissions}
                      on:click={() => setFinalizeFieldMode('comissaoCaptador', 'amount')}
                    >R$</button>
                    <button
                      type="button"
                      class={`min-w-10 border-l border-emerald-600 px-3 py-1 transition ${
                        finalizeFieldModes.comissaoCaptador === 'percentage'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      }`}
                      aria-label="Usar porcentagem na comissão captador"
                      aria-pressed={finalizeFieldModes.comissaoCaptador === 'percentage'}
                      disabled={!isEditingCommissions}
                      on:click={() => setFinalizeFieldMode('comissaoCaptador', 'percentage')}
                    >%</button>
                  </div>
                </div>
                <div class="relative mt-1">
                  {#if finalizeFieldModes.comissaoCaptador === 'amount'}
                    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">R$</span>
                  {/if}
                  <input
                    id="finalize-comissao-captador"
                    type="text"
                    inputmode="decimal"
                    maxlength={finalizeFieldModes.comissaoCaptador === 'percentage' ? 6 : 18}
                    placeholder="0,00"
                    value={finalizeForm.comissaoCaptador}
                    on:input={(event) =>
                      finalizeFieldModes.comissaoCaptador === 'amount'
                        ? handleFinalizeMoneyInput('comissaoCaptador', event)
                        : handleFinalizePercentageInput('comissaoCaptador', event)}
                    class={`w-full rounded border border-gray-300 bg-white py-2 text-right text-sm tabular-nums tracking-tight dark:border-gray-700 dark:bg-gray-900 ${
                      finalizeFieldModes.comissaoCaptador === 'amount' ? 'px-3 pl-9' : 'px-8'
                    }`}
                    readonly={!isEditingCommissions}
                  />
                  {#if finalizeFieldModes.comissaoCaptador === 'percentage'}
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">%</span>
                  {/if}
                </div>
                {#if finalizeFieldEquivalent('comissaoCaptador')}
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {finalizeFieldEquivalent('comissaoCaptador')}
                  </p>
                {/if}
              </div>
              <div class="text-sm text-gray-700 dark:text-gray-200">
                <div class="flex items-center justify-between gap-3">
                  <label for="finalize-comissao-vendedor" class="font-medium">
                    Comissão do vendedor
                  </label>
                  <div class="inline-flex overflow-hidden rounded-full border border-emerald-600 text-xs font-semibold shadow-sm">
                    <button
                      type="button"
                      class={`min-w-10 px-3 py-1 transition ${
                        finalizeFieldModes.comissaoVendedor === 'amount'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      }`}
                      aria-label="Usar reais na comissão do vendedor"
                      aria-pressed={finalizeFieldModes.comissaoVendedor === 'amount'}
                      disabled={!isEditingCommissions}
                      on:click={() => setFinalizeFieldMode('comissaoVendedor', 'amount')}
                    >R$</button>
                    <button
                      type="button"
                      class={`min-w-10 border-l border-emerald-600 px-3 py-1 transition ${
                        finalizeFieldModes.comissaoVendedor === 'percentage'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      }`}
                      aria-label="Usar porcentagem na comissão do vendedor"
                      aria-pressed={finalizeFieldModes.comissaoVendedor === 'percentage'}
                      disabled={!isEditingCommissions}
                      on:click={() => setFinalizeFieldMode('comissaoVendedor', 'percentage')}
                    >%</button>
                  </div>
                </div>
                <div class="relative mt-1">
                  {#if finalizeFieldModes.comissaoVendedor === 'amount'}
                    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">R$</span>
                  {/if}
                  <input
                    id="finalize-comissao-vendedor"
                    type="text"
                    inputmode="decimal"
                    maxlength={finalizeFieldModes.comissaoVendedor === 'percentage' ? 6 : 18}
                    placeholder="0,00"
                    value={finalizeForm.comissaoVendedor}
                    on:input={(event) =>
                      finalizeFieldModes.comissaoVendedor === 'amount'
                        ? handleFinalizeMoneyInput('comissaoVendedor', event)
                        : handleFinalizePercentageInput('comissaoVendedor', event)}
                    class={`w-full rounded border border-gray-300 bg-white py-2 text-right text-sm tabular-nums tracking-tight dark:border-gray-700 dark:bg-gray-900 ${
                      finalizeFieldModes.comissaoVendedor === 'amount' ? 'px-3 pl-9' : 'px-8'
                    }`}
                    readonly={!isEditingCommissions}
                  />
                  {#if finalizeFieldModes.comissaoVendedor === 'percentage'}
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">%</span>
                  {/if}
                </div>
                {#if finalizeFieldEquivalent('comissaoVendedor')}
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {finalizeFieldEquivalent('comissaoVendedor')}
                  </p>
                {/if}
              </div>
              <div class="text-sm text-gray-700 dark:text-gray-200">
                <div class="flex items-center justify-between gap-3">
                  <label for="finalize-taxa-plataforma" class="font-medium">
                    Taxa Encontre Aqui
                  </label>
                  <div class="inline-flex overflow-hidden rounded-full border border-emerald-600 text-xs font-semibold shadow-sm">
                    <button
                      type="button"
                      class={`min-w-10 px-3 py-1 transition ${
                        finalizeFieldModes.taxaPlataforma === 'amount'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      }`}
                      aria-label="Usar reais na taxa Encontre Aqui"
                      aria-pressed={finalizeFieldModes.taxaPlataforma === 'amount'}
                      disabled={!isEditingCommissions}
                      on:click={() => setFinalizeFieldMode('taxaPlataforma', 'amount')}
                    >R$</button>
                    <button
                      type="button"
                      class={`min-w-10 border-l border-emerald-600 px-3 py-1 transition ${
                        finalizeFieldModes.taxaPlataforma === 'percentage'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      }`}
                      aria-label="Usar porcentagem na taxa Encontre Aqui"
                      aria-pressed={finalizeFieldModes.taxaPlataforma === 'percentage'}
                      disabled={!isEditingCommissions}
                      on:click={() => setFinalizeFieldMode('taxaPlataforma', 'percentage')}
                    >%</button>
                  </div>
                </div>
                <div class="relative mt-1">
                  {#if finalizeFieldModes.taxaPlataforma === 'amount'}
                    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">R$</span>
                  {/if}
                  <input
                    id="finalize-taxa-plataforma"
                    type="text"
                    inputmode="decimal"
                    maxlength={finalizeFieldModes.taxaPlataforma === 'percentage' ? 6 : 18}
                    placeholder="0,00"
                    value={finalizeForm.taxaPlataforma}
                    on:input={(event) =>
                      finalizeFieldModes.taxaPlataforma === 'amount'
                        ? handleFinalizeMoneyInput('taxaPlataforma', event)
                        : handleFinalizePercentageInput('taxaPlataforma', event)}
                    class={`w-full rounded border border-gray-300 bg-white py-2 text-right text-sm tabular-nums tracking-tight dark:border-gray-700 dark:bg-gray-900 ${
                      finalizeFieldModes.taxaPlataforma === 'amount' ? 'px-3 pl-9' : 'px-8'
                    }`}
                    readonly={!isEditingCommissions}
                  />
                  {#if finalizeFieldModes.taxaPlataforma === 'percentage'}
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">%</span>
                  {/if}
                </div>
                {#if finalizeFieldEquivalent('taxaPlataforma')}
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {finalizeFieldEquivalent('taxaPlataforma')}
                  </p>
                {/if}
              </div>
            </div>
            <div class={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
              finalizeCommissionRemaining != null && finalizeCommissionRemaining < 0
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
            }`}>
              {#if finalizeCommissionRemaining == null}
                <span class="text-gray-600 dark:text-gray-300">
                  Digite o valor de venda para calcularmos o restante.
                </span>
              {:else}
                <span>
                  Restante: <strong>R$ {formatManualDecimalDisplay(finalizeCommissionRemaining)}</strong>
                </span>
              {/if}
              <Button
                size="sm"
                variant="outline"
                disabled={!isEditingCommissions || finalizeCommissionRemaining == null || finalizeCommissionRemaining < 0}
                on:click={() => fillFinalizeRemaining('taxaPlataforma')}
              >
                Preencher restante na taxa Encontre Aqui
              </Button>
            </div>
          </div>
          {/if}

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Contrato físico / comprovantes
                </p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Anexe o documento assinado ou comprovantes físicos sem sair desta etapa.
                </p>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                Upload administrativo em Aguardando Assinaturas
              </span>
            </div>
            <div class="mt-3 grid gap-3 md:grid-cols-3">
              <label class="text-sm text-gray-700 dark:text-gray-200 md:col-span-1">
                Tipo do Documento
                <select
                  bind:value={signedDocType}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="contrato_assinado">Contrato Assinado</option>
                  <option value="comprovante_pagamento">Comprovante de Pagamento</option>
                  <option value="boleto_vistoria">Boleto/Vistoria</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
              <div class="text-sm text-gray-700 dark:text-gray-200 md:col-span-1">
                <p class="mb-1">Arquivo</p>
                <input
                  bind:this={signedUploadInputEl}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  on:change={handleSignedFileChange}
                  class="sr-only"
                  aria-hidden="true"
                  tabindex="-1"
                />
                <button
                  type="button"
                  class="flex min-h-[42px] w-full items-center justify-between gap-3 rounded border border-dashed border-slate-300 bg-slate-50 px-3 text-left text-sm transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                  on:click={triggerSignedPicker}
                >
                  <span class="truncate font-medium text-slate-800 dark:text-slate-100">
                    {selectedSignedFile ? selectedSignedFile.name : 'Escolher arquivo'}
                  </span>
                  <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {selectedSignedFile ? `${Math.ceil(selectedSignedFile.size / 1024)} KB` : 'PDF ou imagem'}
                  </span>
                </button>
              </div>
              {#if finalizedDocumentRequiresSide(signedDocType)}
                <label class="text-sm text-gray-700 dark:text-gray-200 md:col-span-1">
                  Lado
                  <select
                    bind:value={selectedSignedDocSide}
                    class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="seller">{selectedSellerLabel}</option>
                    <option value="buyer">{selectedBuyerLabel}</option>
                  </select>
                </label>
              {/if}
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-3">
              {#if pendingReplacementDocumentId}
                <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  Substituição em andamento
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  on:click={cancelSignedDocumentReplacement}
                >
                  Cancelar substituição
                </Button>
              {/if}
              {#if selectedSignedFile}
              <div class="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  on:click={uploadSignedDocsByAdmin}
                  disabled={uploadingSignedDoc}
                >
                  {#if uploadingSignedDoc}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Anexar documento físico
                </Button>
              </div>
              {/if}
            </div>
            {#if !hasPaymentProofForFinalize(selected)}
              <p class="mt-2 text-xs text-amber-500 dark:text-amber-300">
                Para liberar o VGV, anexe ao menos um comprovante de pagamento. O contrato assinado não substitui esse documento.
              </p>
            {/if}
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Documentos para conferência
            </p>
            {#if getDocumentsForFinalize(selected).length === 0}
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Nenhum contrato assinado/comprovante anexado.
              </p>
            {:else}
              <div class="mt-2 space-y-2">
                {#each getDocumentsForFinalize(selected) as doc (doc.id)}
                  <div class="flex flex-col gap-2 rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <button
                        type="button"
                        class="text-left font-medium text-gray-900 hover:underline dark:text-gray-100"
                        on:click={() => selected && openDocumentPreview(doc, selected)}
                      >
                        {documentLabel(doc.documentType)}
                      </button>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{formatDate(doc.createdAt)}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        on:click={() => selected && openDocumentPreview(doc, selected)}
                      >
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        on:click={() => selected && viewDocument(doc, selected)}
                        disabled={downloadingDocumentId === doc.id}
                      >
                        {#if downloadingDocumentId === doc.id}
                          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        Baixar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        on:click={() => prepareSignedDocumentReplacement(doc)}
                      >
                        Substituir
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        on:click={() => deleteSignedOrFinalizedDocument(doc)}
                        disabled={matrixDeletingDocumentId === doc.id || deletingFinalizedDocumentId === doc.id}
                      >
                        {#if matrixDeletingDocumentId === doc.id || deletingFinalizedDocumentId === doc.id}
                          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        Excluir
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Todos os documentos do contrato
            </p>
            {#if getAllContractDocuments(selected).length === 0}
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Nenhum documento do contrato anexado até o momento.
              </p>
            {:else}
              <div class="mt-2 space-y-2">
                {#each getAllContractDocuments(selected) as doc (doc.id)}
                  <div class="flex flex-col gap-2 rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="font-medium text-gray-900 dark:text-gray-100">
                          {documentLabel(doc.documentType)}
                        </p>
                        {#if documentSideLabel(doc)}
                          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                            {documentSideLabel(doc)}
                          </span>
                        {/if}
                      </div>
                      <button
                        type="button"
                        class="mt-1 block text-left text-xs text-gray-500 hover:underline dark:text-gray-400 break-words whitespace-normal"
                        on:click={() => selected && openDocumentPreview(doc, selected)}
                      >
                        {documentFileName(doc)}
                      </button>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Enviado em {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      on:click={() => selected && openDocumentPreview(doc, selected)}
                    >
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      on:click={() => selected && viewDocument(doc, selected)}
                      disabled={downloadingDocumentId === doc.id}
                    >
                      {#if downloadingDocumentId === doc.id}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      Baixar
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="rounded-md border border-rose-200 bg-rose-50/40 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase text-rose-700 dark:text-rose-300">
                Histórico de rejeições
              </p>
              {#if loadingDocumentRejections}
                <Loader2 class="h-4 w-4 animate-spin text-rose-600" />
              {/if}
            </div>
            {#if !loadingDocumentRejections && documentRejections.length === 0}
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Nenhum documento rejeitado neste contrato.
              </p>
            {:else if documentRejections.length > 0}
              <div class="mt-2 space-y-2">
                {#each documentRejections as rejection (rejection.id)}
                  <div class="rounded-md border border-rose-100 bg-white px-3 py-2 text-sm dark:border-rose-900/50 dark:bg-slate-900">
                    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p class="font-medium text-slate-900 dark:text-slate-100">
                        {rejection.documentLabel || documentLabel(rejection.documentType || '')}
                      </p>
                      <span class="text-xs text-slate-500 dark:text-slate-400">
                        {rejection.rejectedAt ? formatDate(rejection.rejectedAt) : 'Data não disponível'}
                      </span>
                    </div>
                    {#if rejection.originalFileName}
                      <p class="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
                        Arquivo removido: {rejection.originalFileName}
                      </p>
                    {/if}
                    <p class="mt-1 text-sm text-rose-800 dark:text-rose-200">
                      Motivo: {rejection.reason}
                    </p>
                    {#if rejection.rejectedByAdminName}
                      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Rejeitado por: {rejection.rejectedByAdminName}
                      </p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              on:click={moveContractToPreviousStage}
              disabled={finalizingContract || uploadingSignedDoc || movingToPreviousStage}
            >
              {#if movingToPreviousStage}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Voltar para a etapa anterior
            </Button>
            <Button
              variant="outline"
              on:click={() => closeModal()}
              disabled={finalizingContract || uploadingSignedDoc || movingToPreviousStage}
            >
              Fechar
            </Button>
            <Button
              className="!bg-emerald-600 !text-white hover:!bg-emerald-700"
              on:click={submitFinalize}
              disabled={!commissionEditionSaved || finalizingContract || uploadingSignedDoc || movingToPreviousStage}
            >
              {#if finalizingContract}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Finalizar Venda/Locação
            </Button>
          </div>
        </div>
        {:else if modalMode === 'edit_finalized'}
        <ContractFinalizedEditorPanel
          contract={selected}
          documents={selected ? getAllContractDocuments(selected) : []}
          downloadingAllDocuments={downloadingAllDocuments}
          deletingFinalizedDocumentId={deletingFinalizedDocumentId}
          canDeleteDocuments={canCurrentAdminDelete}
          canReplaceDocuments={canCurrentAdminReplace}
          canCreateDocuments={canCurrentAdminCreateDocuments}
          deletingContract={deletingContract}
          reopeningContract={reopeningContract}
          uploadingSignedDoc={uploadingSignedDoc}
          selectedSignedFile={selectedSignedFile}
          pendingReplacementDocumentId={pendingReplacementDocumentId}
          signedUploadInputEl={signedUploadInputEl}
          signedDocType={signedDocType}
          selectedSignedDocSide={selectedSignedDocSide}
          documentTypeLabels={documentTypeLabels}
          documentLabel={documentLabel}
          documentSideLabel={(doc) => documentSideLabel(doc, selected)}
          documentFileName={documentFileName}
          formatDate={formatDate}
          statusLabel={statusLabel}
          readCommissionValue={readCommissionValue}
          finalizedDocumentRequiresSide={finalizedDocumentRequiresSide}
          prepareSignedDocumentReplacement={prepareSignedDocumentReplacement}
          deleteFinalizedDocument={deleteFinalizedDocument}
          downloadAllDocuments={downloadAllDocuments}
          uploadFinalizedDocument={uploadFinalizedDocument}
          triggerSignedFilePicker={triggerSignedPicker}
          handleSignedFileChange={handleSignedFileChange}
          cancelSignedDocumentReplacement={cancelSignedDocumentReplacement}
          closeModal={closeModal}
          releaseFinalizedContract={releaseFinalizedContract}
          openDocumentPreview={(doc, contract) => openDocumentPreview(doc, contract)}
          viewDocument={(doc, contract) => viewDocument(doc, contract)}
        />
        {/if}
      </div>
    </div>
  </div>
{/if}

<ContractDocumentPreview
  open={documentPreviewOpen}
  isFullscreen={documentPreviewIsFullscreen}
  bind:fullscreenTargetEl={documentPreviewFullscreenTargetEl}
  loading={documentPreviewLoading}
  error={documentPreviewError}
  title={documentPreviewTitle}
  fileName={documentPreviewFileName}
  kind={documentPreviewKind}
  sourceUrl={documentPreviewSourceUrl}
  zoom={documentPreviewZoom}
  pdfPages={documentPreviewPdfPages}
  pdfText={documentPreviewPdfText}
  doc={documentPreviewDoc}
  canDeleteDocuments={canCurrentAdminDelete}
  onClose={closeDocumentPreview}
  onToggleFullscreen={toggleDocumentPreviewFullscreen}
  onZoomOut={() => (documentPreviewZoom = Math.max(0.25, Number((documentPreviewZoom - 0.25).toFixed(2))))}
  onZoomIn={() => (documentPreviewZoom = Math.min(3, Number((documentPreviewZoom + 0.25).toFixed(2))))}
  onResetZoom={() => (documentPreviewZoom = 1)}
  onDownload={downloadPreviewDocument}
  onReplace={replacePreviewDocument}
  onDelete={deletePreviewDocument}
/>
