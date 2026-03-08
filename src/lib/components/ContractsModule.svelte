<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';

  type ContractStatus =
    | 'AWAITING_DOCS'
    | 'IN_DRAFT'
    | 'AWAITING_SIGNATURES'
    | 'FINALIZED';

  type ContractApprovalStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'APPROVED_WITH_RES'
    | 'REJECTED';

  type ContractDocument = {
    id: number;
    type?: string | null;
    documentType?: string | null;
    status?: ContractApprovalStatus | null;
    metadata?: Record<string, unknown> | null;
    side?: 'seller' | 'buyer' | null;
    originalFileName?: string | null;
    downloadUrl?: string | null;
    createdAt?: string | null;
  };

  type ContractItem = {
    id: string;
    status: ContractStatus;
    negotiationId: string;
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyPurpose?: string | null;
    capturingBrokerId?: number | null;
    sellingBrokerId?: number | null;
    capturingBrokerName?: string | null;
    sellingBrokerName?: string | null;
    sellerInfo?: Record<string, unknown> | null;
    buyerInfo?: Record<string, unknown> | null;
    sellerApprovalStatus?: ContractApprovalStatus | null;
    buyerApprovalStatus?: ContractApprovalStatus | null;
    sellerApprovalReason?: Record<string, unknown> | null;
    buyerApprovalReason?: Record<string, unknown> | null;
    commissionData?: Record<string, unknown> | null;
    workflowMetadata?: Record<string, unknown> | null;
    documents?: ContractDocument[];
    agencyName?: string | null;
    agencyAddress?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };

  type RequiredFieldDescriptor = {
    keys: string[];
    label: string;
  };

  type ModalMode = 'review_docs' | 'upload_draft' | 'finalize' | 'view';

  const tabs: { key: ContractStatus; label: string }[] = [
    { key: 'AWAITING_DOCS', label: 'Aguardando Documentação' },
    { key: 'IN_DRAFT', label: 'Em Confecção' },
    { key: 'AWAITING_SIGNATURES', label: 'Aguardando Assinaturas' },
    { key: 'FINALIZED', label: 'Finalizados' },
  ];

  const documentTypeLabels: Record<string, string> = {
    doc_identidade: 'Documento de Identidade',
    comprovante_endereco: 'Comprovante de Endereço',
    certidao_casamento_nascimento: 'Certidão de Casamento/Nascimento',
    certidao_inteiro_teor: 'Certidão de Inteiro Teor',
    certidao_onus_acoes: 'Certidão de Ônus/Ações',
    comprovante_renda: 'Comprovante de Renda',
    contrato_minuta: 'Contrato (Minuta)',
    contrato_assinado: 'Contrato Assinado',
    comprovante_pagamento: 'Comprovante de Pagamento',
    boleto_vistoria: 'Boleto de Vistoria',
  };

  const signedReviewDocTypes = new Set([
    'contrato_assinado',
    'comprovante_pagamento',
    'boleto_vistoria',
  ]);
  const saleRequiredDocTypes = [
    'doc_identidade',
    'comprovante_endereco',
    'certidao_casamento_nascimento',
    'certidao_inteiro_teor',
    'certidao_onus_acoes',
  ];
  const rentRequiredDocTypes = [
    'doc_identidade',
    'comprovante_endereco',
    'certidao_casamento_nascimento',
    'comprovante_renda',
  ];
  const sellerRequiredInfoFields: RequiredFieldDescriptor[] = [
    { keys: ['estado_civil', 'estadoCivil'], label: 'Estado Civil' },
    { keys: ['profissao'], label: 'Profissão' },
    { keys: ['email'], label: 'E-mail' },
    { keys: ['telefone', 'phone'], label: 'Telefone' },
    { keys: ['dados_bancarios', 'dadosBancarios'], label: 'Dados Bancários' },
  ];
  const buyerRequiredInfoFields: RequiredFieldDescriptor[] = [
    { keys: ['estado_civil', 'estadoCivil'], label: 'Estado Civil' },
    { keys: ['profissao'], label: 'Profissão' },
    { keys: ['email'], label: 'E-mail' },
    { keys: ['telefone', 'phone'], label: 'Telefone' },
  ];
  const buyerRentalRequiredInfoFields: RequiredFieldDescriptor[] = [
    { keys: ['garantia_locacao', 'garantiaLocacao'], label: 'Garantia de Locação' },
  ];

  let activeTab: ContractStatus = 'AWAITING_DOCS';
  let items: ContractItem[] = [];
  let selected: ContractItem | null = null;
  let showModal = false;
  let modalMode: ModalMode = 'review_docs';
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let downloadingDocumentId: number | null = null;
  let selectedDraftFile: File | null = null;
  let uploadingDraft = false;
  let evaluatingSide: 'seller' | 'buyer' | null = null;
  let uploadingSignedDoc = false;
  let signedDocType = 'contrato_assinado';
  let selectedSignedFile: File | null = null;
  let finalizingContract = false;
  let approvalLockReasons: string[] = [];
  let isReadyToApprove = false;
  let sellerApprovalDisabled = false;
  let finalizeForm = {
    valorVenda: '',
    comissaoCaptador: '',
    comissaoVendedor: '',
    taxaPlataforma: '',
  };

  function getRecordValue(
    source: Record<string, unknown> | null | undefined,
    keys: string[]
  ): string {
    if (!source) return '-';
    for (const key of keys) {
      const value = source[key];
      if (value != null && String(value).trim().length > 0) {
        return String(value).trim();
      }
    }
    return '-';
  }

  function hasRecordValue(
    source: Record<string, unknown> | null | undefined,
    keys: string[]
  ): boolean {
    if (!source) return false;
    return keys.some((key) => {
      const value = source[key];
      return value != null && String(value).trim().length > 0;
    });
  }

  function formatDate(value?: string | null): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  }

  function documentLabel(type?: string | null): string {
    if (!type) return 'Documento';
    return documentTypeLabels[type] ?? type;
  }

  function normalizeDocumentStatus(doc?: ContractDocument | null): string {
    const direct = String(doc?.status ?? '').trim().toUpperCase();
    if (direct.length > 0) {
      return direct;
    }

    const metadata = doc?.metadata ?? null;
    return String(
      metadata?.status ?? metadata?.reviewStatus ?? metadata?.validationStatus ?? ''
    )
      .trim()
      .toUpperCase();
  }

  function hasDocumentReviewStatus(doc?: ContractDocument | null): boolean {
    const status = normalizeDocumentStatus(doc);
    return status === 'APPROVED' || status === 'REJECTED' || status === 'PENDING';
  }

  function documentStatusLabel(doc?: ContractDocument | null): string {
    const status = normalizeDocumentStatus(doc);
    if (status === 'APPROVED') return 'Aprovado';
    if (status === 'REJECTED') return 'Rejeitado';
    if (status === 'PENDING') return 'Pendente';
    return '';
  }

  function documentStatusClass(doc?: ContractDocument | null): string {
    const status = normalizeDocumentStatus(doc);
    if (status === 'APPROVED') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    }
    if (status === 'REJECTED') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    }
    if (status === 'PENDING') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }

  function documentSideLabel(doc?: ContractDocument | null): string {
    const side = doc ? getDocumentSide(doc) : null;
    if (side === 'seller') return 'Captador';
    if (side === 'buyer') return 'Vendedor';
    return '';
  }

  function documentFileName(doc?: ContractDocument | null): string {
    const original = String(doc?.originalFileName ?? '').trim();
    if (original.length > 0) {
      return original;
    }
    const type = String(doc?.documentType ?? '').trim();
    if (type.length > 0) {
      return `${type}.pdf`;
    }
    return 'documento.pdf';
  }

  function tableActionLabel(status: ContractStatus): string {
    if (status === 'AWAITING_DOCS') return 'Analisar Documentação';
    if (status === 'IN_DRAFT') return 'Anexar Minuta';
    if (status === 'AWAITING_SIGNATURES') return 'Finalizar Venda/Locação';
    return 'Visualizar';
  }

  function statusLabel(status: ContractStatus): string {
    return tabs.find((tab) => tab.key === status)?.label ?? status;
  }

  function approvalLabel(status?: ContractApprovalStatus | null): string {
    switch (String(status ?? '').toUpperCase()) {
      case 'APPROVED':
        return 'Aprovado';
      case 'APPROVED_WITH_RES':
        return 'Aprovado com ressalvas';
      case 'REJECTED':
        return 'Rejeitado';
      default:
        return 'Pendente';
    }
  }

  function approvalBadgeClass(status?: ContractApprovalStatus | null): string {
    switch (String(status ?? '').toUpperCase()) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'APPROVED_WITH_RES':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
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

  function hasInPersonSignatureChoice(contract: ContractItem | null): boolean {
    return readWorkflowText(contract, 'signatureMethod').toLowerCase() === 'in_person';
  }

  function hasAgencySignedReceipt(contract: ContractItem | null): boolean {
    return readWorkflowText(contract, 'agencySignedContractReceivedAt').length > 0;
  }

  function adminOverrideButtonLabel(): string {
    return signedDocType === 'contrato_assinado'
      ? 'Anexar Documento Físico Assinado (Admin Override)'
      : 'Anexar Documento (Admin Override)';
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

  function readCommissionValue(
    source: Record<string, unknown> | null | undefined,
    key: string
  ): string {
    if (!source) return '';
    const value = source[key];
    if (value == null) return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '';
    return parsed.toFixed(2);
  }

  function hydrateFinalizeForm(contract: ContractItem | null): void {
    const data = contract?.commissionData ?? null;
    finalizeForm = {
      valorVenda: readCommissionValue(data, 'valorVenda'),
      comissaoCaptador: readCommissionValue(data, 'comissaoCaptador'),
      comissaoVendedor: readCommissionValue(data, 'comissaoVendedor'),
      taxaPlataforma: readCommissionValue(data, 'taxaPlataforma'),
    };
  }

  function parseMoney(value: string): number | null {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Number(parsed.toFixed(2));
  }

  function getDocumentsForFinalize(contract: ContractItem): ContractDocument[] {
    return (contract.documents ?? []).filter((doc) =>
      signedReviewDocTypes.has((doc.documentType ?? '').trim().toLowerCase())
    );
  }

  function getDocumentSide(doc: ContractDocument): 'seller' | 'buyer' | null {
    const side = String(doc.side ?? '').trim().toLowerCase();
    if (side === 'seller' || side === 'buyer') {
      return side;
    }
    return null;
  }

  function isDoubleEndedDeal(contract: ContractItem): boolean {
    const capturing = Number(contract.capturingBrokerId ?? 0);
    const selling = Number(contract.sellingBrokerId ?? 0);
    return capturing > 0 && selling > 0 && capturing === selling;
  }

  function getRequiredDocTypes(contract: ContractItem): string[] {
    const purpose = String(contract.propertyPurpose ?? '').trim().toLowerCase();
    const isSale = purpose.includes('venda') || purpose.includes('sale');
    const isRent = purpose.includes('alug') || purpose.includes('rent');

    if (isSale && isRent) {
      return Array.from(new Set([...saleRequiredDocTypes, ...rentRequiredDocTypes]));
    }
    if (isRent) {
      return [...rentRequiredDocTypes];
    }
    return [...saleRequiredDocTypes];
  }

  function getNonProposalDocuments(contract: ContractItem): ContractDocument[] {
    return (contract.documents ?? []).filter((doc) => {
      const documentType = String(doc.documentType ?? '').trim().toLowerCase();
      return documentType !== 'proposal';
    });
  }

  function getAllContractDocuments(contract: ContractItem): ContractDocument[] {
    return [...getNonProposalDocuments(contract)].sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      if (leftDate !== rightDate) {
        return rightDate - leftDate;
      }
      return Number(right.id ?? 0) - Number(left.id ?? 0);
    });
  }

  function listMissingRecordFields(
    source: Record<string, unknown> | null | undefined,
    fields: RequiredFieldDescriptor[]
  ): string[] {
    return fields
      .filter((field) => !hasRecordValue(source, field.keys))
      .map((field) => field.label);
  }

  function listMissingSellerInfo(contract: ContractItem): string[] {
    return listMissingRecordFields(contract.sellerInfo ?? null, sellerRequiredInfoFields);
  }

  function listMissingBuyerInfo(contract: ContractItem): string[] {
    const normalizedPurpose = String(contract.propertyPurpose ?? '').toLowerCase();
    const requiresRentalGuarantee =
      normalizedPurpose.includes('alug') || normalizedPurpose.includes('rent');
    const requiredFields = requiresRentalGuarantee
      ? [...buyerRequiredInfoFields, ...buyerRentalRequiredInfoFields]
      : buyerRequiredInfoFields;

    return listMissingRecordFields(contract.buyerInfo ?? null, requiredFields);
  }

  function listMissingRequiredDocuments(contract: ContractItem): string[] {
    const requiredDocTypes = getRequiredDocTypes(contract);
    const missing: string[] = [];

    if (isDoubleEndedDeal(contract)) {
      for (const documentType of requiredDocTypes) {
        if (getDocumentForMatrixCell(contract, documentType, 'seller') == null) {
          missing.push(documentLabel(documentType));
        }
      }
      return missing;
    }

    for (const documentType of requiredDocTypes) {
      const sellerDoc = getDocumentForMatrixCell(contract, documentType, 'seller');
      const buyerDoc = getDocumentForMatrixCell(contract, documentType, 'buyer');
      if (sellerDoc == null) {
        missing.push(`${documentLabel(documentType)} (Captador)`);
      }
      if (buyerDoc == null) {
        missing.push(`${documentLabel(documentType)} (Vendedor)`);
      }
    }

    return missing;
  }

  function listBlockingDocumentStatuses(contract: ContractItem): string[] {
    return getNonProposalDocuments(contract)
      .map((doc) => {
      const status = String(doc.status ?? '').trim().toUpperCase();
      if (!status) {
        return null;
      }
      if (status !== 'REJECTED' && status !== 'PENDING') {
        return null;
      }

      const side = getDocumentSide(doc);
      const sideLabel = side === 'seller' ? ' (Captador)' : side === 'buyer' ? ' (Vendedor)' : '';
      const label = documentLabel(doc.documentType) + sideLabel;
      return `${label}: ${status === 'REJECTED' ? 'rejeitado' : 'pendente'}`;
    })
      .filter((item): item is string => item != null);
  }

  function computeApprovalLockReasons(contract: ContractItem | null): string[] {
    if (!contract || modalMode !== 'review_docs') {
      return [];
    }

    const reasons: string[] = [];
    const missingSellerInfo = listMissingSellerInfo(contract);
    const missingBuyerInfo = listMissingBuyerInfo(contract);
    const missingDocuments = listMissingRequiredDocuments(contract);
    const blockingDocuments = listBlockingDocumentStatuses(contract);

    if (missingSellerInfo.length > 0) {
      reasons.push(`Captador sem: ${missingSellerInfo.join(', ')}`);
    }

    if (missingBuyerInfo.length > 0) {
      reasons.push(`Vendedor sem: ${missingBuyerInfo.join(', ')}`);
    }

    if (missingDocuments.length > 0) {
      reasons.push(`Documentos faltando: ${missingDocuments.join(', ')}`);
    }

    if (blockingDocuments.length > 0) {
      reasons.push(`Documentos bloqueados: ${blockingDocuments.join(', ')}`);
    }

    return reasons;
  }

  function getDocumentForMatrixCell(
    contract: ContractItem,
    documentType: string,
    side: 'seller' | 'buyer'
  ): ContractDocument | null {
    const normalizedType = documentType.trim().toLowerCase();
    const docs = getNonProposalDocuments(contract).filter(
      (doc) => String(doc.documentType ?? '').trim().toLowerCase() === normalizedType
    );
    if (docs.length === 0) {
      return null;
    }

    const direct = docs.find((doc) => getDocumentSide(doc) === side);
    if (direct) {
      return direct;
    }

    const neutral = docs.find((doc) => getDocumentSide(doc) == null);
    if (neutral) {
      return neutral;
    }

    if (isDoubleEndedDeal(contract)) {
      return docs[0] ?? null;
    }

    return null;
  }

  async function fetchContracts() {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        status: activeTab,
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      const response = await api.get<{ data?: ContractItem[]; total?: number }>(
        `/admin/contracts?${params.toString()}`
      );

      const data = Array.isArray(response?.data) ? response.data : [];
      items = data;
      totalItems = Number(response?.total ?? data.length);
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
    return 'view';
  }

  function openModal(item: ContractItem) {
    selected = item;
    modalMode = resolveModalMode(item);
    showModal = true;
    selectedDraftFile = null;
    selectedSignedFile = null;
    signedDocType = 'contrato_assinado';
    uploadingDraft = false;
    uploadingSignedDoc = false;
    evaluatingSide = null;
    finalizingContract = false;
    hydrateFinalizeForm(item);
  }

  function closeModal(force = false) {
    if (
      !force &&
      (uploadingDraft ||
        uploadingSignedDoc ||
        finalizingContract ||
        evaluatingSide !== null)
    ) {
      return;
    }
    showModal = false;
    selected = null;
    selectedDraftFile = null;
    selectedSignedFile = null;
    modalMode = 'review_docs';
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
      await api.put(`/admin/contracts/${selected.id}/evaluate-side`, {
        side,
        status,
        reason: reason || undefined,
      });
      toast.success('Avaliação registrada com sucesso.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao avaliar documentação por lado:', error);
      toast.error('Não foi possível registrar a avaliação.');
    } finally {
      evaluatingSide = null;
    }
  }

  function handleDraftFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;
    selectedDraftFile = file;
  }

  function handleSignedFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedSignedFile = target.files?.[0] ?? null;
  }

  async function uploadSignedDocsByAdmin() {
    if (!selected) return;
    if (!selectedSignedFile) {
      toast.error('Selecione um arquivo para enviar.');
      return;
    }

    uploadingSignedDoc = true;
    try {
      const form = new FormData();
      form.append('documentType', signedDocType);
      form.append('file', selectedSignedFile);
      await apiClient.post(`/admin/contracts/${selected.id}/signed-docs`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Documento físico anexado com sucesso.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao anexar documento físico:', error);
      toast.error('Não foi possível anexar o documento físico.');
    } finally {
      uploadingSignedDoc = false;
    }
  }

  async function submitDraft() {
    if (!selected) return;
    if (!selectedDraftFile) {
      toast.error('Selecione um PDF da minuta para continuar.');
      return;
    }

    uploadingDraft = true;
    try {
      const form = new FormData();
      form.append('file', selectedDraftFile);
      await apiClient.post(`/admin/contracts/${selected.id}/draft`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Minuta anexada e contrato avançado para assinaturas.');
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

    const valorVenda = parseMoney(finalizeForm.valorVenda);
    const comissaoCaptador = parseMoney(finalizeForm.comissaoCaptador);
    const comissaoVendedor = parseMoney(finalizeForm.comissaoVendedor);
    const taxaPlataforma = parseMoney(finalizeForm.taxaPlataforma);

    if (
      valorVenda == null ||
      comissaoCaptador == null ||
      comissaoVendedor == null ||
      taxaPlataforma == null
    ) {
      toast.error('Preencha todos os campos de comissão com valores válidos.');
      return;
    }

    finalizingContract = true;
    try {
      await api.post(`/admin/contracts/${selected.id}/finalize`, {
        commission_data: {
          valorVenda,
          comissaoCaptador,
          comissaoVendedor,
          taxaPlataforma,
        },
      });
      toast.success('Contrato finalizado com sucesso.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao finalizar contrato:', error);
      toast.error('Não foi possível finalizar o contrato.');
    } finally {
      finalizingContract = false;
    }
  }

  async function viewDocument(doc: ContractDocument, contract: ContractItem) {
    if (!doc.downloadUrl) {
      toast.error('Documento sem URL de download.');
      return;
    }

    downloadingDocumentId = doc.id;
    try {
      const response = await apiClient.get(doc.downloadUrl, {
        responseType: 'blob',
      });
      const dispositionHeader = String(
        response.headers?.['content-disposition'] ??
          response.headers?.['Content-Disposition'] ??
          ''
      );
      const utfMatch = dispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
      const basicMatch = dispositionHeader.match(/filename=\"?([^\";]+)\"?/i);
      const resolvedFromHeader = utfMatch?.[1]
        ? decodeURIComponent(utfMatch[1])
        : basicMatch?.[1];
      const fallbackName =
        doc.originalFileName ??
        `${String(doc.documentType ?? 'documento').trim() || 'documento'}.pdf`;
      const downloadName = (resolvedFromHeader || fallbackName).trim();

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(blob);
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
        `Não foi possível abrir o documento do contrato ${contract.propertyCode ?? contract.propertyId}.`
      );
    } finally {
      downloadingDocumentId = null;
    }
  }

  onMount(() => {
    hasMounted = true;
    refresh(true);
  });

  $: if (hasMounted) {
    activeTab;
    currentPage;
    itemsPerPage;
    refreshKey;
    fetchContracts();
  }

  $: approvalLockReasons = computeApprovalLockReasons(selected);
  $: isReadyToApprove = approvalLockReasons.length === 0;
  $: sellerApprovalDisabled = evaluatingSide === 'seller' || !isReadyToApprove;
</script>

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
    <div class="text-sm text-gray-600 dark:text-gray-300">
      {tabs.find((tab) => tab.key === activeTab)?.label}
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

  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Código Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Captador
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Vendedor
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
                <div class="font-semibold">
                  {item.propertyCode ? item.propertyCode : `#${item.propertyId}`}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? '-'}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.capturingBrokerName ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.sellingBrokerName ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.updatedAt ?? item.createdAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button size="sm" variant="outline" on:click={() => openModal(item)}>
                  {tableActionLabel(item.status)}
                </Button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <Pagination bind:currentPage {totalPages} {totalItems} {itemsPerPage} />
  </div>
</div>

{#if showModal && selected}
  <div
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div
      class="my-8 w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-modal-title"
      aria-describedby="contract-modal-description"
    >
      <div class="mb-4">
        <h3 id="contract-modal-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {modalMode === 'review_docs'
            ? 'Análise de Documentação'
            : modalMode === 'upload_draft'
            ? 'Anexar Minuta'
            : modalMode === 'finalize'
            ? 'Finalizar Venda/Locação'
            : 'Contrato Finalizado'}
        </h3>
        <p id="contract-modal-description" class="text-sm text-gray-500 dark:text-gray-400">
          {selected.propertyCode ? selected.propertyCode : `#${selected.propertyId}`}
          {#if selected.propertyTitle}
            {' - '}{selected.propertyTitle}
          {/if}
        </p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Etapa: {statusLabel(selected.status)}
        </p>
      </div>

      {#if modalMode === 'review_docs'}
        <div class="space-y-4">
          {#if isDoubleEndedDeal(selected)}
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Dados do Corretor
                </p>
                <span
                  class={`rounded-full px-2 py-1 text-xs font-semibold ${approvalBadgeClass(
                    selected.sellerApprovalStatus
                  )}`}
                >
                  {approvalLabel(selected.sellerApprovalStatus)}
                </span>
              </div>
              <div class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                <p><span class="font-semibold">Estado Civil:</span> {getRecordValue(selected.sellerInfo ?? selected.buyerInfo, ['estado_civil', 'estadoCivil'])}</p>
                <p><span class="font-semibold">Profissão:</span> {getRecordValue(selected.sellerInfo ?? selected.buyerInfo, ['profissao'])}</p>
                <p><span class="font-semibold">E-mail:</span> {getRecordValue(selected.sellerInfo ?? selected.buyerInfo, ['email'])}</p>
                <p><span class="font-semibold">Telefone:</span> {getRecordValue(selected.sellerInfo ?? selected.buyerInfo, ['telefone', 'phone'])}</p>
                <p><span class="font-semibold">Banco:</span> {getRecordValue(selected.sellerInfo ?? selected.buyerInfo, ['dados_bancarios', 'dadosBancarios'])}</p>
                {#if readReasonText(selected.sellerApprovalReason).length > 0}
                  <p class="text-xs text-amber-700 dark:text-amber-300">
                    Motivo: {readReasonText(selected.sellerApprovalReason)}
                  </p>
                {/if}
              </div>
            </div>
          {:else}
            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Dados Captador
                  </p>
                  <span
                    class={`rounded-full px-2 py-1 text-xs font-semibold ${approvalBadgeClass(
                      selected.sellerApprovalStatus
                    )}`}
                  >
                    {approvalLabel(selected.sellerApprovalStatus)}
                  </span>
                </div>
                <div class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                  <p><span class="font-semibold">Estado Civil:</span> {getRecordValue(selected.sellerInfo, ['estado_civil', 'estadoCivil'])}</p>
                  <p><span class="font-semibold">Profissão:</span> {getRecordValue(selected.sellerInfo, ['profissao'])}</p>
                  <p><span class="font-semibold">E-mail:</span> {getRecordValue(selected.sellerInfo, ['email'])}</p>
                  <p><span class="font-semibold">Telefone:</span> {getRecordValue(selected.sellerInfo, ['telefone', 'phone'])}</p>
                  <p><span class="font-semibold">Banco:</span> {getRecordValue(selected.sellerInfo, ['dados_bancarios', 'dadosBancarios'])}</p>
                  {#if readReasonText(selected.sellerApprovalReason).length > 0}
                    <p class="text-xs text-amber-700 dark:text-amber-300">
                      Motivo: {readReasonText(selected.sellerApprovalReason)}
                    </p>
                  {/if}
                </div>
              </div>
              <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Dados Vendedor
                  </p>
                  <span
                    class={`rounded-full px-2 py-1 text-xs font-semibold ${approvalBadgeClass(
                      selected.buyerApprovalStatus
                    )}`}
                  >
                    {approvalLabel(selected.buyerApprovalStatus)}
                  </span>
                </div>
                <div class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                  <p><span class="font-semibold">Estado Civil:</span> {getRecordValue(selected.buyerInfo, ['estado_civil', 'estadoCivil'])}</p>
                  <p><span class="font-semibold">Profissão:</span> {getRecordValue(selected.buyerInfo, ['profissao'])}</p>
                  <p><span class="font-semibold">E-mail:</span> {getRecordValue(selected.buyerInfo, ['email'])}</p>
                  <p><span class="font-semibold">Telefone:</span> {getRecordValue(selected.buyerInfo, ['telefone', 'phone'])}</p>
                  <p><span class="font-semibold">Garantia:</span> {getRecordValue(selected.buyerInfo, ['garantia_locacao', 'garantiaLocacao'])}</p>
                  {#if readReasonText(selected.buyerApprovalReason).length > 0}
                    <p class="text-xs text-amber-700 dark:text-amber-300">
                      Motivo: {readReasonText(selected.buyerApprovalReason)}
                    </p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p
              id="contract-doc-matrix-help"
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
            >
              Matriz de Documentos
            </p>
            <div class="mt-2 overflow-x-auto">
              <table class="w-full min-w-[620px] text-sm" aria-describedby="contract-doc-matrix-help">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                      Documento
                    </th>
                    {#if isDoubleEndedDeal(selected)}
                      <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                        Corretor
                      </th>
                    {:else}
                      <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                        Captador
                      </th>
                      <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                        Vendedor
                      </th>
                    {/if}
                  </tr>
                </thead>
                <tbody>
                  {#if isDoubleEndedDeal(selected)}
                    {#each getRequiredDocTypes(selected) as documentType}
                      {@const brokerDoc = getDocumentForMatrixCell(selected, documentType, 'seller')}
                      <tr class="border-b border-gray-100 dark:border-gray-800">
                        <td class="px-3 py-3 text-gray-700 dark:text-gray-200">
                          {documentLabel(documentType)}
                        </td>
                        <td class="px-3 py-3">
                          {#if brokerDoc}
                            <div class="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                on:click={() => selected && viewDocument(brokerDoc, selected)}
                                disabled={downloadingDocumentId === brokerDoc.id}
                              >
                                {#if downloadingDocumentId === brokerDoc.id}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Baixar
                              </Button>
                              {#if hasDocumentReviewStatus(brokerDoc)}
                                <span
                                  class={`rounded-full px-2 py-1 text-xs font-semibold ${documentStatusClass(
                                    brokerDoc
                                  )}`}
                                >
                                  {documentStatusLabel(brokerDoc)}
                                </span>
                              {/if}
                            </div>
                          {:else}
                            <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Pendente
                            </span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  {:else}
                    {#each getRequiredDocTypes(selected) as documentType}
                      {@const sellerDoc = getDocumentForMatrixCell(selected, documentType, 'seller')}
                      {@const buyerDoc = getDocumentForMatrixCell(selected, documentType, 'buyer')}
                      <tr class="border-b border-gray-100 dark:border-gray-800">
                        <td class="px-3 py-3 text-gray-700 dark:text-gray-200">
                          {documentLabel(documentType)}
                        </td>
                        <td class="px-3 py-3">
                          {#if sellerDoc}
                            <div class="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                on:click={() => selected && viewDocument(sellerDoc, selected)}
                                disabled={downloadingDocumentId === sellerDoc.id}
                              >
                                {#if downloadingDocumentId === sellerDoc.id}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Baixar
                              </Button>
                              {#if hasDocumentReviewStatus(sellerDoc)}
                                <span
                                  class={`rounded-full px-2 py-1 text-xs font-semibold ${documentStatusClass(
                                    sellerDoc
                                  )}`}
                                >
                                  {documentStatusLabel(sellerDoc)}
                                </span>
                              {/if}
                            </div>
                          {:else}
                            <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Pendente
                            </span>
                          {/if}
                        </td>
                        <td class="px-3 py-3">
                          {#if buyerDoc}
                            <div class="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                on:click={() => selected && viewDocument(buyerDoc, selected)}
                                disabled={downloadingDocumentId === buyerDoc.id}
                              >
                                {#if downloadingDocumentId === buyerDoc.id}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Baixar
                              </Button>
                              {#if hasDocumentReviewStatus(buyerDoc)}
                                <span
                                  class={`rounded-full px-2 py-1 text-xs font-semibold ${documentStatusClass(
                                    buyerDoc
                                  )}`}
                                >
                                  {documentStatusLabel(buyerDoc)}
                                </span>
                              {/if}
                            </div>
                          {:else}
                            <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Pendente
                            </span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  {/if}
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
            {#if !isReadyToApprove}
              <div
                class="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <p class="text-sm font-medium text-red-700 dark:text-red-300">
                  Aprovação bloqueada.
                </p>
                <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600 dark:text-red-300">
                  {#each approvalLockReasons as reason}
                    <li>{reason}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            <div>
              <p class="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Avaliação Captador
              </p>
              <div class="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 disabled:hover:bg-gray-400"
                  on:click={() => evaluateContractSide('seller', 'APPROVED')}
                  disabled={sellerApprovalDisabled}
                  title={!isReadyToApprove ? approvalLockReasons.join(' | ') : undefined}
                >
                  Aprovar<span class="sr-only"> captador</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  on:click={() => evaluateContractSide('seller', 'APPROVED_WITH_RES')}
                >
                  Aprovar c/ ressalvas<span class="sr-only"> captador</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  on:click={() => evaluateContractSide('seller', 'REJECTED')}
                  disabled={evaluatingSide === 'seller'}
                >
                  Rejeitar
                </Button>
              </div>
            </div>
            {#if !isDoubleEndedDeal(selected)}
              <div>
                <p class="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Avaliação Vendedor
                </p>
                <div class="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 disabled:hover:bg-gray-400"
                    on:click={() => evaluateContractSide('buyer', 'APPROVED')}
                    disabled={evaluatingSide === 'buyer' || !isReadyToApprove}
                    title={!isReadyToApprove ? approvalLockReasons.join(' | ') : undefined}
                  >
                    Aprovar<span class="sr-only"> vendedor</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    on:click={() => evaluateContractSide('buyer', 'APPROVED_WITH_RES')}
                  >
                    Aprovar c/ ressalvas<span class="sr-only"> vendedor</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    on:click={() => evaluateContractSide('buyer', 'REJECTED')}
                    disabled={evaluatingSide === 'buyer'}
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            {/if}
          </div>

          <div class="mt-1 flex justify-end">
            <Button variant="outline" on:click={() => closeModal()}>Fechar</Button>
          </div>
        </div>
      {:else if modalMode === 'upload_draft'}
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Faça o upload do PDF da minuta (<code>contrato_minuta</code>). Ao enviar, o contrato será movido automaticamente para
            <span class="font-semibold"> Aguardando Assinaturas</span>.
          </p>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Documentos do contrato
            </p>
            {#if getAllContractDocuments(selected).length === 0}
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Nenhum documento do contrato anexado até o momento.
              </p>
            {:else}
              <div class="mt-2 space-y-2">
                {#each getAllContractDocuments(selected) as doc (doc.id)}
                  <div class="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
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
                        {#if hasDocumentReviewStatus(doc)}
                          <span
                            class={`rounded-full px-2 py-1 text-xs font-semibold ${documentStatusClass(
                              doc
                            )}`}
                          >
                            {documentStatusLabel(doc)}
                          </span>
                        {/if}
                      </div>
                      <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                        {documentFileName(doc)}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Enviado em {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      on:click={() => selected && viewDocument(doc, selected)}
                      disabled={downloadingDocumentId === doc.id}
                    >
                      {#if downloadingDocumentId === doc.id}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      Baixar/Visualizar
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="rounded-md border border-dashed border-gray-300 p-4 dark:border-gray-700">
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" for="draft-pdf">
              PDF da minuta
            </label>
            <input
              id="draft-pdf"
              type="file"
              accept="application/pdf,.pdf"
              on:change={handleDraftFileChange}
              class="block w-full text-sm text-gray-700 dark:text-gray-200"
            />
            {#if selectedDraftFile}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Selecionado: {selectedDraftFile.name}
              </p>
            {/if}
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" on:click={() => closeModal()} disabled={uploadingDraft}>
              Fechar
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              on:click={submitDraft}
              disabled={uploadingDraft || !selectedDraftFile}
            >
              {#if uploadingDraft}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Anexar Minuta
            </Button>
          </div>
        </div>
      {:else if modalMode === 'finalize'}
        <div class="space-y-4">
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
                  <div class="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-gray-100">{documentLabel(doc.documentType)}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{formatDate(doc.createdAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      on:click={() => selected && viewDocument(doc, selected)}
                      disabled={downloadingDocumentId === doc.id}
                    >
                      {#if downloadingDocumentId === doc.id}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      Baixar/Visualizar
                    </Button>
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
                  <div class="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
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
                        {#if hasDocumentReviewStatus(doc)}
                          <span
                            class={`rounded-full px-2 py-1 text-xs font-semibold ${documentStatusClass(
                              doc
                            )}`}
                          >
                            {documentStatusLabel(doc)}
                          </span>
                        {/if}
                      </div>
                      <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                        {documentFileName(doc)}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Enviado em {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      on:click={() => selected && viewDocument(doc, selected)}
                      disabled={downloadingDocumentId === doc.id}
                    >
                      {#if downloadingDocumentId === doc.id}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      Baixar/Visualizar
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            {#if hasInPersonSignatureChoice(selected) || hasAgencySignedReceipt(selected)}
              <div class="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-950/30">
                <p class="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {#if hasAgencySignedReceipt(selected)}
                    A imobiliária já registrou o recebimento do contrato físico assinado.
                  {:else}
                    O corretor informou que a assinatura será entregue presencialmente.
                  {/if}
                </p>
                <p class="mt-2 text-sm text-blue-700 dark:text-blue-200">
                  Endereço de referência: {resolveAgencyAddress(selected)}
                </p>
              </div>
            {/if}
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Admin Override: Contrato Físico/Comprovantes
            </p>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Use esta área para anexar documentos físicos assinados diretamente pelo painel administrativo, mesmo quando o corretor optar por entrega presencial.
            </p>
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Tipo do Documento
                <select
                  bind:value={signedDocType}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="contrato_assinado">Contrato Assinado</option>
                  <option value="comprovante_pagamento">Comprovante de Pagamento</option>
                  <option value="boleto_vistoria">Boleto/Vistoria</option>
                </select>
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Arquivo
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  on:change={handleSignedFileChange}
                  class="mt-1 block w-full text-sm text-gray-700 dark:text-gray-200"
                />
              </label>
            </div>
            {#if selectedSignedFile}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Selecionado: {selectedSignedFile.name}
              </p>
            {/if}
            <div class="mt-3 flex justify-end">
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                on:click={uploadSignedDocsByAdmin}
                disabled={uploadingSignedDoc || !selectedSignedFile}
              >
                {#if uploadingSignedDoc}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {adminOverrideButtonLabel()}
              </Button>
            </div>
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Formulário de Comissões
            </p>
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Valor de Venda/Locação (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.valorVenda}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Comissão Captador (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.comissaoCaptador}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Comissão Vendedor (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.comissaoVendedor}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Taxa Encontre Aqui (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.taxaPlataforma}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              on:click={() => closeModal()}
              disabled={finalizingContract || uploadingSignedDoc}
            >
              Fechar
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              on:click={submitFinalize}
              disabled={finalizingContract || uploadingSignedDoc}
            >
              {#if finalizingContract}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Finalizar Venda/Locação
            </Button>
          </div>
        </div>
      {:else}
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Este contrato já está finalizado e está disponível apenas para consulta.
          </p>

          <div class="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
            <p><span class="font-semibold">Status:</span> {statusLabel(selected.status)}</p>
            <p><span class="font-semibold">Atualizado em:</span> {formatDate(selected.updatedAt ?? selected.createdAt)}</p>
            <p><span class="font-semibold">Valor:</span> {readCommissionValue(selected.commissionData ?? null, 'valorVenda') || '-'}</p>
          </div>

          <div class="flex justify-end">
            <Button variant="outline" on:click={() => closeModal()}>Fechar</Button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
