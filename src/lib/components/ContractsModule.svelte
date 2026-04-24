<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import type { InputProps } from '$lib/components/ui/input/input-props';
  import type { Component } from 'svelte';
  import { formatCurrencyInput, parseCurrency } from '$lib/components/create-property-helpers';
  import Pagination from '$lib/Pagination.svelte';

  /** TS do IDE: tipo inferido do `Input` costuma omitir `id`/handlers; aqui usamos o contrato explícito. */
  const LabeledTextInput = Input as unknown as Component<InputProps, {}, 'value'>;

  type FinalizeSplitMode = 'amount' | 'percentage';

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
    documentRequirements?: unknown;
    documentProgress?: unknown;
    agencyName?: string | null;
    agencyAddress?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };

  type RequiredFieldDescriptor = {
    keys: string[];
    label: string;
  };
  type MatrixSide = 'seller' | 'buyer';
  type MatrixRequirement = {
    documentType: string;
    side: MatrixSide;
  };
  type MatrixRow = {
    documentType: string;
    sellerRequired: boolean;
    buyerRequired: boolean;
  };

  type ModalMode = 'review_docs' | 'upload_draft' | 'finalize' | 'edit_finalized';

  type ContractDetailResponse = {
    contract?: ContractItem;
    documents?: ContractDocument[];
  };

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
    outro: 'Outro',
    cliente_cnh: 'CNH do Cliente',
    cliente_identidade: 'Identidade (RG) do Cliente',
    cliente_cpf: 'CPF do Cliente',
  };

  const signedReviewDocTypes = new Set([
    'contrato_assinado',
    'comprovante_pagamento',
    'boleto_vistoria',
  ]);
  const contractScopedDocumentTypes = new Set([
    'contrato_minuta',
    'contrato_assinado',
    'comprovante_pagamento',
    'boleto_vistoria',
    'outro',
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
  let isMobileLayout = false;
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
  let selectedSignedDocSide: 'seller' | 'buyer' = 'seller';
  let matrixUploadInputEl: HTMLInputElement | null = null;
  let matrixUploadContext:
    | { documentType: string; side: 'seller' | 'buyer' }
    | null = null;
  let matrixUploadingKey: string | null = null;
  let matrixDeletingDocumentId: number | null = null;
  let finalizingContract = false;
  let reopeningContract = false;
  let deletingContract = false;
  let deletingFinalizedDocumentId: number | null = null;
  let downloadingAllDocuments = false;
  let movingToPreviousStage = false;
  let approvalLockReasons: string[] = [];
  let isReadyToApprove = false;
  let sellerApprovalDisabled = false;
  let finalizeSplitMode: FinalizeSplitMode = 'amount';
  let finalizeForm = {
    valorVenda: '',
    comissaoCaptador: '',
    comissaoVendedor: '',
    taxaPlataforma: '',
  };

  let savingPartyData = false;
  let sellerInfoForm = {
    estadoCivil: '',
    profissao: '',
    email: '',
    telefone: '',
    dadosBancarios: '',
  };
  let buyerInfoForm = {
    estadoCivil: '',
    profissao: '',
    email: '',
    telefone: '',
    garantiaLocacao: '',
  };

  function getRecordValueRaw(
    source: Record<string, unknown> | null | undefined,
    keys: string[]
  ): string {
    if (!source) return '';
    for (const key of keys) {
      const value = source[key];
      if (value != null && String(value).trim().length > 0) {
        return String(value).trim();
      }
    }
    return '';
  }

  function getRecordValue(
    source: Record<string, unknown> | null | undefined,
    keys: string[]
  ): string {
    const raw = getRecordValueRaw(source, keys);
    return raw.length ? raw : '-';
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

  function getBuyerDisplayName(contract: ContractItem): string {
    const buyerInfo = contract.buyerInfo ?? null;
    const fromInfo = getRecordValueRaw(buyerInfo, [
      'nome',
      'name',
      'nome_completo',
      'fullName',
      'clientName',
      'client_name',
    ]);
    return fromInfo || '-';
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
    if (side === 'buyer') return 'Comprador';
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
    return 'Editar';
  }

  function statusLabel(status: ContractStatus): string {
    return tabs.find((tab) => tab.key === status)?.label ?? status;
  }

  function syncIsMobileLayout() {
    if (typeof window === 'undefined') return;
    isMobileLayout = window.innerWidth < 768;
  }

  function previousStageLabel(currentStatus: ContractStatus): string {
    if (currentStatus === 'IN_DRAFT') {
      return 'a aba de documentos pendentes';
    }
    if (currentStatus === 'AWAITING_SIGNATURES') {
      return 'a aba de confecção da minuta';
    }
    return 'a etapa anterior';
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
          label: 'Captador',
          status: contract.sellerApprovalStatus,
          reason: readReasonText(contract.sellerApprovalReason),
        },
      ];
    }

    return [
      {
        key: 'seller',
        label: 'Captador',
        status: contract.sellerApprovalStatus,
        reason: readReasonText(contract.sellerApprovalReason),
      },
      {
        key: 'buyer',
        label: 'Comprador',
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
    return formatCurrencyInput(String(Math.round(parsed * 100)));
  }

  function hydrateFinalizeForm(contract: ContractItem | null): void {
    const data = contract?.commissionData ?? null;
    finalizeSplitMode = 'amount';
    finalizeForm = {
      valorVenda: readCommissionValue(data, 'valorVenda'),
      comissaoCaptador: readCommissionValue(data, 'comissaoCaptador'),
      comissaoVendedor: readCommissionValue(data, 'comissaoVendedor'),
      taxaPlataforma: readCommissionValue(data, 'taxaPlataforma'),
    };
  }

  function parseMoney(value: string): number | null {
    const parsed = parseCurrency(value);
    if (parsed == null || !Number.isFinite(parsed)) return null;
    return Number(parsed.toFixed(2));
  }

  function sanitizePercentageInput(raw: string): string {
    const normalized = String(raw ?? '').replace(/[^\d.,]/g, '').replace(/\./g, ',');
    const [integerPart, ...rest] = normalized.split(',');
    const integer = integerPart.replace(/^0+(?=\d)/, '');
    const decimal = rest.join('').slice(0, 2);
    if (!integer && !decimal) {
      return '';
    }
    const composed = decimal ? `${integer || '0'},${decimal}` : integer || '0';
    const parsed = Number(composed.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      return '';
    }
    const bounded = Math.min(100, Math.max(0, parsed));
    return formatPercentageValue(bounded);
  }

  function parsePercentage(value: string): number | null {
    const normalized = String(value ?? '').replace('%', '').replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
    return Number(parsed.toFixed(2));
  }

  function formatPercentageValue(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
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
    return formatCurrencyInput(String(Math.round(amount * 100)));
  }

  function handleFinalizeMoneyInput(
    field: keyof typeof finalizeForm,
    event: Event
  ): void {
    const target = event.currentTarget as HTMLInputElement;
    finalizeForm = {
      ...finalizeForm,
      [field]: formatCurrencyInput(target.value),
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

  function switchFinalizeSplitMode(mode: FinalizeSplitMode): void {
    if (mode === finalizeSplitMode) return;

    const saleValue = parseMoney(finalizeForm.valorVenda);
    if (mode === 'percentage') {
      finalizeForm = {
        ...finalizeForm,
        comissaoCaptador: convertAmountFieldToPercentage(finalizeForm.comissaoCaptador, saleValue),
        comissaoVendedor: convertAmountFieldToPercentage(finalizeForm.comissaoVendedor, saleValue),
        taxaPlataforma: convertAmountFieldToPercentage(finalizeForm.taxaPlataforma, saleValue),
      };
    } else {
      finalizeForm = {
        ...finalizeForm,
        comissaoCaptador: convertPercentageFieldToAmount(finalizeForm.comissaoCaptador, saleValue),
        comissaoVendedor: convertPercentageFieldToAmount(finalizeForm.comissaoVendedor, saleValue),
        taxaPlataforma: convertPercentageFieldToAmount(finalizeForm.taxaPlataforma, saleValue),
      };
    }

    finalizeSplitMode = mode;
  }

  function resolveFinalizeCommissionAmounts() {
    const valorVenda = parseMoney(finalizeForm.valorVenda);
    if (valorVenda == null) return null;

    if (finalizeSplitMode === 'amount') {
      const comissaoCaptador = parseMoney(finalizeForm.comissaoCaptador);
      const comissaoVendedor = parseMoney(finalizeForm.comissaoVendedor);
      const taxaPlataforma = parseMoney(finalizeForm.taxaPlataforma);
      if (
        comissaoCaptador == null ||
        comissaoVendedor == null ||
        taxaPlataforma == null
      ) {
        return null;
      }
      return {
        valorVenda,
        comissaoCaptador,
        comissaoVendedor,
        taxaPlataforma,
      };
    }

    const percentualCaptador = parsePercentage(finalizeForm.comissaoCaptador);
    const percentualVendedor = parsePercentage(finalizeForm.comissaoVendedor);
    const percentualPlataforma = parsePercentage(finalizeForm.taxaPlataforma);
    if (
      percentualCaptador == null ||
      percentualVendedor == null ||
      percentualPlataforma == null
    ) {
      return null;
    }

    return {
      valorVenda,
      comissaoCaptador: Number(((valorVenda * percentualCaptador) / 100).toFixed(2)),
      comissaoVendedor: Number(((valorVenda * percentualVendedor) / 100).toFixed(2)),
      taxaPlataforma: Number(((valorVenda * percentualPlataforma) / 100).toFixed(2)),
    };
  }

  function hasExactSaleSplit(
    values: NonNullable<ReturnType<typeof resolveFinalizeCommissionAmounts>>
  ): boolean {
    const total = Number(
      (
        values.comissaoCaptador +
        values.comissaoVendedor +
        values.taxaPlataforma
      ).toFixed(2)
    );
    return Math.abs(total - values.valorVenda) <= 0.01;
  }

  function getDocumentsForFinalize(contract: ContractItem): ContractDocument[] {
    return getAllContractDocuments(contract).filter((doc) =>
      signedReviewDocTypes.has((doc.documentType ?? '').trim().toLowerCase())
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

  function requiresExactSaleSplit(contract: ContractItem | null): boolean {
    const purpose = String(contract?.propertyPurpose ?? '').trim().toLowerCase();
    const isRentalOnly = purpose.includes('alug') && !purpose.includes('venda');
    return !isRentalOnly;
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

  function normalizeMatrixSide(value: unknown): MatrixSide | null {
    const side = String(value ?? '').trim().toLowerCase();
    if (side === 'seller') return 'seller';
    if (side === 'buyer') return 'buyer';
    if (side === 'captador' || side === 'capturing') return 'seller';
    if (side === 'vendedor' || side === 'selling') return 'buyer';
    return null;
  }

  function normalizeMatrixDocumentType(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  function readRawMatrixRequirements(contract: ContractItem): MatrixRequirement[] {
    const raw = contract.documentRequirements;
    const entries: MatrixRequirement[] = [];

    const categoryToDocumentTypes = (category: string): string[] => {
      switch (category.trim().toLowerCase()) {
        case 'identidade':
          return ['doc_identidade'];
        case 'comprovante_endereco':
          return ['comprovante_endereco'];
        case 'estado_civil':
          return ['certidao_casamento_nascimento'];
        case 'conjuge_documentos':
          return ['outro'];
        case 'comprovante_renda':
          return ['comprovante_renda'];
        case 'dados_bancarios':
          return ['outro'];
        case 'docs_imovel':
          return ['certidao_inteiro_teor', 'certidao_onus_acoes'];
        default:
          return [];
      }
    };

    const pushFromSideRows = (side: MatrixSide, rows: unknown) => {
      if (!Array.isArray(rows)) return;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const source = row as Record<string, unknown>;
        const applicability = String(source.applicability ?? '').trim().toLowerCase();
        if (applicability === 'not_applicable') continue;
        const category = String(source.category ?? '').trim();
        if (!category) continue;
        const docTypes = categoryToDocumentTypes(category);
        for (const documentType of docTypes) {
          entries.push({ documentType, side });
        }
      }
    };

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const source = raw as Record<string, unknown>;
      pushFromSideRows('seller', source.seller);
      pushFromSideRows('buyer', source.buyer);
      return entries;
    }

    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const source = entry as Record<string, unknown>;
        const documentType = normalizeMatrixDocumentType(
          source.documentType ?? source.type ?? source.document ?? source.key
        );
        const side = normalizeMatrixSide(source.side ?? source.party ?? source.role);
        if (!documentType || !side) continue;
        entries.push({ documentType, side });
      }
    }

    return entries;
  }

  function getMatrixRows(contract: ContractItem): MatrixRow[] {
    const requirements = readRawMatrixRequirements(contract);
    if (requirements.length === 0) {
      const fallbackTypes = getRequiredDocTypes(contract);
      if (isDoubleEndedDeal(contract)) {
        return fallbackTypes.map((documentType) => ({
          documentType,
          sellerRequired: true,
          buyerRequired: false,
        }));
      }
      return fallbackTypes.map((documentType) => ({
        documentType,
        sellerRequired: true,
        buyerRequired: true,
      }));
    }

    const rows = new Map<string, MatrixRow>();
    for (const requirement of requirements) {
      const current = rows.get(requirement.documentType) ?? {
        documentType: requirement.documentType,
        sellerRequired: false,
        buyerRequired: false,
      };
      if (requirement.side === 'seller') current.sellerRequired = true;
      if (requirement.side === 'buyer') current.buyerRequired = true;
      rows.set(requirement.documentType, current);
    }

    return Array.from(rows.values());
  }

  function readProgressStatus(
    contract: ContractItem,
    documentType: string,
    side: MatrixSide
  ): string {
    const raw = contract.documentProgress;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const source = raw as Record<string, unknown>;
      const sideNode = source[side];
      if (sideNode && typeof sideNode === 'object') {
        const categories = (sideNode as Record<string, unknown>).categories;
        if (Array.isArray(categories)) {
          const normalizedType = normalizeMatrixDocumentType(documentType);
          const typeToCategory = (type: string, matrixSide: MatrixSide): string => {
            if (type === 'comprovante_endereco') return 'comprovante_endereco';
            if (type === 'certidao_casamento_nascimento') return 'estado_civil';
            if (type === 'comprovante_renda') return 'comprovante_renda';
            if (type === 'certidao_inteiro_teor' || type === 'certidao_onus_acoes') return 'docs_imovel';
            if (type === 'outro') {
              return matrixSide === 'buyer' ? 'conjuge_documentos' : 'dados_bancarios';
            }
            return 'identidade';
          };
          const targetCategory = typeToCategory(normalizedType, side);
          const categoryRow = categories.find((item) => {
            if (!item || typeof item !== 'object') return false;
            const row = item as Record<string, unknown>;
            return String(row.category ?? '').trim().toLowerCase() === targetCategory;
          }) as Record<string, unknown> | undefined;
          if (categoryRow) {
            return String(categoryRow.status ?? '').trim().toUpperCase();
          }
        }
      }
      return '';
    }
    if (!Array.isArray(raw)) return '';
    const normalizedType = normalizeMatrixDocumentType(documentType);
    const match = raw.find((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const source = entry as Record<string, unknown>;
      const entryType = normalizeMatrixDocumentType(
        source.documentType ?? source.type ?? source.document ?? source.key
      );
      const entrySide = normalizeMatrixSide(source.side ?? source.party ?? source.role);
      return entryType === normalizedType && entrySide === side;
    });
    if (!match || typeof match !== 'object') return '';
    const source = match as Record<string, unknown>;
    return String(source.status ?? source.state ?? source.progress ?? '').trim().toUpperCase();
  }

  function matrixCellStatus(
    contract: ContractItem,
    documentType: string,
    side: MatrixSide
  ): string {
    const doc = getDocumentForMatrixCell(contract, documentType, side);
    const docStatus = normalizeDocumentStatus(doc);
    if (docStatus) return docStatus;
    return readProgressStatus(contract, documentType, side);
  }

  function matrixCellStatusLabel(status: string): string {
    const value = String(status).trim().toUpperCase();
    if (value === 'APPROVED') return 'Aprovado';
    if (value === 'REJECTED') return 'Rejeitado';
    if (value === 'PENDING') return 'Pendente';
    if (value === 'SENT' || value === 'UPLOADED' || value === 'SUBMITTED') return 'Enviado';
    if (!value) return 'Pendente';
    return value;
  }

  function matrixCellStatusClass(status: string): string {
    const value = String(status).trim().toUpperCase();
    if (value === 'APPROVED') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    }
    if (value === 'REJECTED') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    }
    if (value === 'PENDING' || value === 'MISSING' || !value) {
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }

  function getNonProposalDocuments(contract: ContractItem): ContractDocument[] {
    return (contract.documents ?? []).filter((doc) => {
      const documentType = String(doc.documentType ?? '').trim().toLowerCase();
      return documentType !== 'proposal';
    });
  }

  function documentMatchesCurrentContract(
    contract: ContractItem,
    doc: ContractDocument
  ): boolean {
    const documentType = String(doc.documentType ?? '').trim().toLowerCase();
    if (!contractScopedDocumentTypes.has(documentType)) {
      return true;
    }

    const metadataContractId = String(doc.metadata?.contractId ?? '').trim();
    if (!metadataContractId) {
      return false;
    }

    return metadataContractId === contract.id;
  }

  function getAllContractDocuments(contract: ContractItem): ContractDocument[] {
    return getNonProposalDocuments(contract)
      .filter((doc) => documentMatchesCurrentContract(contract, doc))
      .sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      if (leftDate !== rightDate) {
        return rightDate - leftDate;
      }
      return Number(right.id ?? 0) - Number(left.id ?? 0);
    });
  }

  function getCurrentDraftDocument(contract: ContractItem | null): ContractDocument | null {
    if (!contract) return null;
    return (
      getAllContractDocuments(contract).find(
        (doc) => String(doc.documentType ?? '').trim().toLowerCase() === 'contrato_minuta'
      ) ?? null
    );
  }

  function hasCurrentDraftDocument(contract: ContractItem | null): boolean {
    return getCurrentDraftDocument(contract) != null;
  }

  function draftUploadInputLabel(contract: ContractItem | null): string {
    return hasCurrentDraftDocument(contract)
      ? 'Novo PDF da minuta (opcional)'
      : 'PDF da minuta';
  }

  function draftSubmitLabel(contract: ContractItem | null): string {
    return hasCurrentDraftDocument(contract) ? 'Atualizar minuta' : 'Anexar Minuta';
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
    const rows = getMatrixRows(contract);
    const missing: string[] = [];

    if (isDoubleEndedDeal(contract)) {
      for (const row of rows) {
        if (!row.sellerRequired) continue;
        if (getDocumentForMatrixCell(contract, row.documentType, 'seller') == null) {
          missing.push(documentLabel(row.documentType));
        }
      }
      return missing;
    }

    for (const row of rows) {
      const sellerDoc = getDocumentForMatrixCell(contract, row.documentType, 'seller');
      const buyerDoc = getDocumentForMatrixCell(contract, row.documentType, 'buyer');
      if (row.documentType !== 'outro' && row.sellerRequired && sellerDoc == null) {
        missing.push(`${documentLabel(row.documentType)} (Captador)`);
      }
      if (row.documentType !== 'outro' && row.buyerRequired && buyerDoc == null) {
        missing.push(`${documentLabel(row.documentType)} (Comprador)`);
      }
    }

    return missing;
  }

  function listBlockingDocumentStatuses(contract: ContractItem): string[] {
    return getNonProposalDocuments(contract)
      .map((doc) => {
      const status = String(doc.status ?? '').trim().toUpperCase();
      if (String(doc.documentType ?? '').trim().toLowerCase() === 'outro') {
        return null;
      }
      if (!status) {
        return null;
      }
      if (status !== 'REJECTED' && status !== 'PENDING') {
        return null;
      }

      const side = getDocumentSide(doc);
      const sideLabel = side === 'seller' ? ' (Captador)' : side === 'buyer' ? ' (Comprador)' : '';
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
      reasons.push(`Comprador sem: ${missingBuyerInfo.join(', ')}`);
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

  function resolveApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const source = error as {
      requestId?: unknown;
      response?: {
        headers?: Record<string, unknown>;
        data?: Record<string, unknown>;
      };
    };
    const data = source.response?.data ?? {};
    const backendMessage =
      typeof data.error === 'string'
        ? data.error.trim()
        : typeof data.message === 'string'
          ? data.message.trim()
          : '';
    const requestId =
      typeof source.requestId === 'string'
        ? source.requestId.trim()
        : typeof data.requestId === 'string'
          ? data.requestId.trim()
          : typeof data.request_id === 'string'
            ? data.request_id.trim()
            : '';

    if (!backendMessage) {
      return fallback;
    }

    return requestId ? `${backendMessage} (Req: ${requestId})` : backendMessage;
  }

  async function reloadSelectedContract(contractId: string): Promise<void> {
    const payload = await api.get<ContractDetailResponse>(`/contracts/${contractId}`);
    if (!payload?.contract || !selected || selected.id !== contractId) {
      return;
    }

    selected = {
      ...selected,
      ...payload.contract,
      documents: Array.isArray(payload.documents)
        ? payload.documents
        : selected.documents ?? [],
    };
    if (showModal) {
      hydratePartyInfoFormsFromSelected();
    }
  }

  function hydratePartyInfoFormsFromSelected() {
    if (!selected) return;
    sellerInfoForm = {
      estadoCivil: getRecordValueRaw(selected.sellerInfo, ['estado_civil', 'estadoCivil']),
      profissao: getRecordValueRaw(selected.sellerInfo, ['profissao']),
      email: getRecordValueRaw(selected.sellerInfo, ['email']),
      telefone: getRecordValueRaw(selected.sellerInfo, ['telefone', 'phone']),
      dadosBancarios: getRecordValueRaw(selected.sellerInfo, ['dados_bancarios', 'dadosBancarios']),
    };
    buyerInfoForm = {
      estadoCivil: getRecordValueRaw(selected.buyerInfo, ['estado_civil', 'estadoCivil']),
      profissao: getRecordValueRaw(selected.buyerInfo, ['profissao']),
      email: getRecordValueRaw(selected.buyerInfo, ['email']),
      telefone: getRecordValueRaw(selected.buyerInfo, ['telefone', 'phone']),
      garantiaLocacao: getRecordValueRaw(selected.buyerInfo, ['garantia_locacao', 'garantiaLocacao']),
    };
  }

  function trimInfoValue(raw: string): string | null {
    const t = raw.trim();
    return t.length ? t : null;
  }

  function buildSellerInfoPayload(): Record<string, unknown> {
    if (!selected) return {};
    const prev =
      selected.sellerInfo && typeof selected.sellerInfo === 'object'
        ? { ...(selected.sellerInfo as Record<string, unknown>) }
        : {};
    return {
      ...prev,
      estado_civil: trimInfoValue(sellerInfoForm.estadoCivil),
      profissao: trimInfoValue(sellerInfoForm.profissao),
      email: trimInfoValue(sellerInfoForm.email),
      telefone: trimInfoValue(sellerInfoForm.telefone),
      dados_bancarios: trimInfoValue(sellerInfoForm.dadosBancarios),
    };
  }

  function buildBuyerInfoPayload(): Record<string, unknown> {
    if (!selected) return {};
    const prev =
      selected.buyerInfo && typeof selected.buyerInfo === 'object'
        ? { ...(selected.buyerInfo as Record<string, unknown>) }
        : {};
    return {
      ...prev,
      estado_civil: trimInfoValue(buyerInfoForm.estadoCivil),
      profissao: trimInfoValue(buyerInfoForm.profissao),
      email: trimInfoValue(buyerInfoForm.email),
      telefone: trimInfoValue(buyerInfoForm.telefone),
      garantia_locacao: trimInfoValue(buyerInfoForm.garantiaLocacao),
    };
  }

  async function saveContractPartyData() {
    if (!selected) return;
    savingPartyData = true;
    try {
      await api.put(`/admin/contracts/${selected.id}/data`, {
        sellerInfo: buildSellerInfoPayload(),
        buyerInfo: buildBuyerInfoPayload(),
      });
      toast.success('Dados do captador e do comprador salvos.');
      await reloadSelectedContract(selected.id);
    } catch (error) {
      console.error('Erro ao salvar dados do contrato:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível salvar os dados.'));
    } finally {
      savingPartyData = false;
    }
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
    selected = item;
    modalMode = resolveModalMode(item);
    showModal = true;
    selectedDraftFile = null;
    selectedSignedFile = null;
    signedDocType = 'contrato_assinado';
    selectedSignedDocSide = 'seller';
    uploadingDraft = false;
    uploadingSignedDoc = false;
    reopeningContract = false;
    deletingContract = false;
    deletingFinalizedDocumentId = null;
    downloadingAllDocuments = false;
    evaluatingSide = null;
    finalizingContract = false;
    savingPartyData = false;
    hydrateFinalizeForm(item);
    hydratePartyInfoFormsFromSelected();
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

  function triggerMatrixUpload(documentType: string, side: 'seller' | 'buyer') {
    matrixUploadContext = { documentType, side };
    matrixUploadInputEl?.click();
  }

  async function handleMatrixFileSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!selected || !file || !matrixUploadContext) {
      if (input) input.value = '';
      return;
    }

    const uploadKey = `${matrixUploadContext.side}:${matrixUploadContext.documentType}`;
    matrixUploadingKey = uploadKey;
    try {
      const form = new FormData();
      form.append('documentType', matrixUploadContext.documentType);
      form.append('side', matrixUploadContext.side);
      form.append('file', file);
      await apiClient.post(`/contracts/${selected.id}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Documento enviado com sucesso.');
      await reloadSelectedContract(selected.id);
      await fetchContracts();
    } catch (error) {
      console.error('Erro ao enviar documento na matriz:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível enviar o documento.'));
    } finally {
      matrixUploadingKey = null;
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
      await api.delete(`/contracts/${selected.id}/documents/${doc.id}`);
      toast.success('Documento removido com sucesso.');
      await reloadSelectedContract(selected.id);
      await fetchContracts();
    } catch (error) {
      console.error('Erro ao excluir documento da matriz:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível excluir o documento.'));
    } finally {
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
      toast.error('Selecione se o documento pertence ao Captador ou ao Comprador.');
      return;
    }

    uploadingSignedDoc = true;
    try {
      const form = new FormData();
      form.append('documentType', signedDocType);
      if (finalizedDocumentRequiresSide(signedDocType)) {
        form.append('side', selectedSignedDocSide);
      }
      form.append('file', selectedSignedFile);

      await apiClient.post(`/admin/contracts/${selected.id}/finalized-docs`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Documento anexado ao contrato finalizado.');
      selectedSignedFile = null;
      await reloadSelectedContract(selected.id);
      await fetchContracts();
    } catch (error) {
      console.error('Erro ao anexar documento ao contrato finalizado:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível anexar o documento.'));
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

    const resolvedCommissionAmounts = resolveFinalizeCommissionAmounts();

    if (resolvedCommissionAmounts == null) {
      toast.error('Preencha todos os campos de comissão com valores válidos.');
      return;
    }

    const { valorVenda, comissaoCaptador, comissaoVendedor, taxaPlataforma } =
      resolvedCommissionAmounts;

    if (
      requiresExactSaleSplit(selected) &&
      !hasExactSaleSplit(resolvedCommissionAmounts)
    ) {
      toast.error(
        finalizeSplitMode === 'percentage'
          ? 'Na venda, a soma dos percentuais precisa fechar exatamente 100% do valor.'
          : 'Na venda, a soma dos valores precisa fechar exatamente 100% do valor.'
      );
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
      toast.error(resolveApiErrorMessage(error, 'Não foi possível finalizar o contrato.'));
    } finally {
      finalizingContract = false;
    }
  }

  async function deleteFinalizedDocument(doc: ContractDocument) {
    if (!selected) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o documento "${documentLabel(doc.documentType)}"?`
    );
    if (!confirmed) return;

    deletingFinalizedDocumentId = doc.id;
    try {
      await api.delete(`/admin/contracts/${selected.id}/finalized-docs/${doc.id}`);
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

  async function reopenFinalizedContract() {
    if (!selected) return;
    const confirmed = window.confirm(
      'Tem certeza que deseja reiniciar este contrato? Ele voltará para a aba de documentos pendentes e removerá todos os documentos vinculados.'
    );
    if (!confirmed) return;

    reopeningContract = true;
    try {
      const response = (await api.put(`/admin/contracts/${selected.id}/reopen`, {})) as {
        message?: string;
        data?: { message?: string };
      };
      toast.success(
        String(response?.message ?? response?.data?.message ?? '').trim() ||
          'Contrato reiniciado com sucesso.'
      );
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao reiniciar contrato finalizado:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível reiniciar o contrato.'));
    } finally {
      reopeningContract = false;
    }
  }

  async function deleteFinalizedContract(contract: ContractItem) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o contrato finalizado do imóvel ${contract.propertyCode ?? contract.propertyId}?`
    );
    if (!confirmed) return;

    deletingContract = true;
    try {
      await api.delete(`/admin/contracts/${contract.id}`);
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
      const response = await apiClient.get(`/admin/contracts/${contract.id}/documents.zip`, {
        responseType: 'blob',
      });
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/zip' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${contract.propertyCode ?? contract.propertyId}_documentos.zip`;
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
      await api.put(`/admin/contracts/${selected.id}/transition`, {
        direction: 'previous',
      });
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
    syncIsMobileLayout();
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
            <div class="min-w-0">
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
                ID {item.propertyId}{#if item.propertyCode}{' · '}{item.propertyCode}{/if}
              </p>
              <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.propertyTitle ?? '-'}</p>
            </div>
            <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {statusLabel(item.status)}
            </span>
          </div>
          <dl class="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <div class="flex items-center justify-between gap-3">
              <dt>Captador</dt>
              <dd class="text-right">{item.capturingBrokerName ?? '-'}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Comprador</dt>
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
            {#if item.status === 'FINALIZED'}
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
            Imóvel (ID / código)
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Captador
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Comprador
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
                  ID {item.propertyId}{#if item.propertyCode}{' · '}{item.propertyCode}{/if}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? '-'}
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
                {item.capturingBrokerName ?? '-'}
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
                  {#if item.status === 'FINALIZED'}
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
    class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-0 sm:items-start sm:p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div
      class="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:my-8 sm:max-h-[80vh] sm:rounded-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-modal-title"
      aria-describedby="contract-modal-description"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
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
            ID {selected.propertyId}{#if selected.propertyCode}{' · Código '}{selected.propertyCode}{/if}
            {#if selected.propertyTitle}
              {' — '}{selected.propertyTitle}
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Etapa: {statusLabel(selected.status)}
          </p>
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
          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div class="flex items-center justify-between gap-2">
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
              {#if readReasonText(selected.sellerApprovalReason).length > 0}
                <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Motivo: {readReasonText(selected.sellerApprovalReason)}
                </p>
              {/if}
              <div class="mt-3 space-y-3 text-sm">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="seller-estado-civil"
                    >Estado civil</label
                  >
                  <LabeledTextInput id="seller-estado-civil" bind:value={sellerInfoForm.estadoCivil} disabled={savingPartyData} />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="seller-profissao"
                    >Profissão</label
                  >
                  <LabeledTextInput id="seller-profissao" bind:value={sellerInfoForm.profissao} disabled={savingPartyData} />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="seller-email"
                    >E-mail</label
                  >
                  <LabeledTextInput
                    id="seller-email"
                    type="text"
                    bind:value={sellerInfoForm.email}
                    disabled={savingPartyData}
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="seller-telefone"
                    >Telefone</label
                  >
                  <LabeledTextInput id="seller-telefone" bind:value={sellerInfoForm.telefone} disabled={savingPartyData} />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="seller-banco"
                    >Dados bancários</label
                  >
                  <LabeledTextInput id="seller-banco" bind:value={sellerInfoForm.dadosBancarios} disabled={savingPartyData} />
                </div>
              </div>
            </div>
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Dados Comprador
                </p>
                <span
                  class={`rounded-full px-2 py-1 text-xs font-semibold ${approvalBadgeClass(
                    selected.buyerApprovalStatus
                  )}`}
                >
                  {approvalLabel(selected.buyerApprovalStatus)}
                </span>
              </div>
              {#if readReasonText(selected.buyerApprovalReason).length > 0}
                <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Motivo: {readReasonText(selected.buyerApprovalReason)}
                </p>
              {/if}
              <div class="mt-3 space-y-3 text-sm">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-estado-civil"
                    >Estado civil</label
                  >
                  <LabeledTextInput id="buyer-estado-civil" bind:value={buyerInfoForm.estadoCivil} disabled={savingPartyData} />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-profissao"
                    >Profissão</label
                  >
                  <LabeledTextInput id="buyer-profissao" bind:value={buyerInfoForm.profissao} disabled={savingPartyData} />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-email"
                    >E-mail</label
                  >
                  <LabeledTextInput id="buyer-email" bind:value={buyerInfoForm.email} disabled={savingPartyData} />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400" for="buyer-telefone"
                    >Telefone</label
                  >
                  <LabeledTextInput id="buyer-telefone" bind:value={buyerInfoForm.telefone} disabled={savingPartyData} />
                </div>
                <div>
                  <label
                    class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
                    for="buyer-garantia"
                    >Garantia (locação, se aplicável)</label
                  >
                  <LabeledTextInput id="buyer-garantia" bind:value={buyerInfoForm.garantiaLocacao} disabled={savingPartyData} />
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
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
              Salvar dados captador e comprador
            </Button>
          </div>

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
                        Captador
                      </th>
                    {:else}
                      <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                        Captador
                      </th>
                      <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                        Comprador
                      </th>
                    {/if}
                  </tr>
                </thead>
                <tbody>
                  {#if isDoubleEndedDeal(selected)}
                    {#each getMatrixRows(selected) as row}
                      {#if row.sellerRequired}
                        {@const documentType = row.documentType}
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
                              <Button
                                size="sm"
                                variant="outline"
                                on:click={() => triggerMatrixUpload(documentType, 'seller')}
                                disabled={matrixUploadingKey === `seller:${documentType}`}
                              >
                                {#if matrixUploadingKey === `seller:${documentType}`}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Substituir
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                on:click={() => deleteMatrixDocument(brokerDoc)}
                                disabled={matrixDeletingDocumentId === brokerDoc.id}
                              >
                                {#if matrixDeletingDocumentId === brokerDoc.id}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Excluir
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
                            <div class="flex flex-wrap items-center gap-2">
                              <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Pendente
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                on:click={() => triggerMatrixUpload(documentType, 'seller')}
                                disabled={matrixUploadingKey === `seller:${documentType}`}
                              >
                                {#if matrixUploadingKey === `seller:${documentType}`}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Enviar
                              </Button>
                            </div>
                          {/if}
                        </td>
                      </tr>
                      {/if}
                    {/each}
                  {:else}
                    {#each getMatrixRows(selected) as row}
                      {@const documentType = row.documentType}
                      {@const sellerDoc = getDocumentForMatrixCell(selected, documentType, 'seller')}
                      {@const buyerDoc = getDocumentForMatrixCell(selected, documentType, 'buyer')}
                      {@const buyerStatus = matrixCellStatus(selected, documentType, 'buyer')}
                      <tr class="border-b border-gray-100 dark:border-gray-800">
                        <td class="px-3 py-3 text-gray-700 dark:text-gray-200">
                          {documentLabel(documentType)}
                        </td>
                        <td class="px-3 py-3">
                          {#if row.sellerRequired && sellerDoc}
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
                              <Button
                                size="sm"
                                variant="outline"
                                on:click={() => triggerMatrixUpload(documentType, 'seller')}
                                disabled={matrixUploadingKey === `seller:${documentType}`}
                              >
                                {#if matrixUploadingKey === `seller:${documentType}`}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Substituir
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                on:click={() => deleteMatrixDocument(sellerDoc)}
                                disabled={matrixDeletingDocumentId === sellerDoc.id}
                              >
                                {#if matrixDeletingDocumentId === sellerDoc.id}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Excluir
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
                          {:else if row.sellerRequired}
                            <div class="flex flex-wrap items-center gap-2">
                              <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Pendente
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                on:click={() => triggerMatrixUpload(documentType, 'seller')}
                                disabled={matrixUploadingKey === `seller:${documentType}`}
                              >
                                {#if matrixUploadingKey === `seller:${documentType}`}
                                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                {/if}
                                Enviar
                              </Button>
                            </div>
                          {:else}
                            <span class="text-xs text-gray-500 dark:text-gray-400">N/A</span>
                          {/if}
                        </td>
                        <td class="px-3 py-3">
                          {#if row.buyerRequired}
                            <span
                              class={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${matrixCellStatusClass(
                                buyerStatus
                              )}`}
                            >
                              {matrixCellStatusLabel(buyerStatus)}
                            </span>
                          {:else}
                            <span class="text-xs text-gray-500 dark:text-gray-400">N/A</span>
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
                  Avaliação Comprador
                </p>
                <div class="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 disabled:hover:bg-gray-400"
                    on:click={() => evaluateContractSide('buyer', 'APPROVED')}
                    disabled={evaluatingSide === 'buyer' || !isReadyToApprove}
                    title={!isReadyToApprove ? approvalLockReasons.join(' | ') : undefined}
                  >
                    Aprovar<span class="sr-only"> comprador</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    on:click={() => evaluateContractSide('buyer', 'APPROVED_WITH_RES')}
                  >
                    Aprovar c/ ressalvas<span class="sr-only"> comprador</span>
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
          <input
            class="hidden"
            type="file"
            accept=".pdf,application/pdf"
            bind:this={matrixUploadInputEl}
            on:change={handleMatrixFileSelection}
          />
        </div>
      {:else if modalMode === 'upload_draft'}
        <div class="space-y-4">
          <div
            class={`rounded-md border p-4 ${
              hasCurrentDraftDocument(selected)
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                : 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20'
            }`}
            role="status"
            aria-live="polite"
          >
            <p class="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
              Situação da minuta
            </p>
            {#if hasCurrentDraftDocument(selected)}
              <p class="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Já existe uma minuta anexada para este contrato.
              </p>
              <p class="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                Envie um novo PDF apenas se quiser substituir a versão atual antes de seguir para assinaturas.
              </p>
            {:else}
              <p class="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                Ainda não existe minuta anexada para este contrato.
              </p>
              <p class="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Para avançar para a etapa de assinaturas, anexe o PDF da minuta.
              </p>
            {/if}
          </div>

          {#if getCurrentDraftDocument(selected)}
            <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Minuta atual
              </p>
              <div class="mt-2 flex flex-col gap-3 rounded bg-gray-50 px-3 py-3 text-sm dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <p class="font-medium text-gray-900 dark:text-gray-100">
                    {documentFileName(getCurrentDraftDocument(selected))}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Enviado em {formatDate(getCurrentDraftDocument(selected)?.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => {
                    const draftDoc = getCurrentDraftDocument(selected);
                    if (selected && draftDoc) {
                      viewDocument(draftDoc, selected);
                    }
                  }}
                  disabled={downloadingDocumentId === getCurrentDraftDocument(selected)?.id}
                >
                  {#if downloadingDocumentId === getCurrentDraftDocument(selected)?.id}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Baixar/Visualizar
                </Button>
              </div>
            </div>
          {/if}

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
              {draftUploadInputLabel(selected)}
            </label>
            <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {#if hasCurrentDraftDocument(selected)}
                Selecione um novo PDF apenas se quiser substituir a minuta atual.
              {:else}
                Selecione o PDF que será usado como minuta oficial deste contrato.
              {/if}
            </p>
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
            <Button
              variant="outline"
              on:click={moveContractToPreviousStage}
              disabled={uploadingDraft || movingToPreviousStage}
            >
              {#if movingToPreviousStage}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Voltar
            </Button>
            <Button
              variant="outline"
              on:click={() => closeModal()}
              disabled={uploadingDraft || movingToPreviousStage}
            >
              Fechar
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              on:click={submitDraft}
              disabled={uploadingDraft || movingToPreviousStage || !selectedDraftFile}
            >
              {#if uploadingDraft}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              {draftSubmitLabel(selected)}
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
                  <option value="outro">Outro</option>
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
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
                Comissões em:
              </span>
              <button
                type="button"
                class={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  finalizeSplitMode === 'amount'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
                on:click={() => switchFinalizeSplitMode('amount')}
              >
                Valor real (R$)
              </button>
              <button
                type="button"
                class={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  finalizeSplitMode === 'percentage'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
                on:click={() => switchFinalizeSplitMode('percentage')}
              >
                Percentual (%)
              </button>
            </div>
            {#if finalizeSplitMode === 'percentage'}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Os percentuais abaixo serão calculados sobre o valor de venda/locação.
              </p>
            {/if}
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Valor de Venda/Locação (R$)
                <input
                  type="text"
                  inputmode="decimal"
                  value={finalizeForm.valorVenda}
                  on:input={(event) => handleFinalizeMoneyInput('valorVenda', event)}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Comissão Captador {finalizeSplitMode === 'amount' ? '(R$)' : '(%)'}
                <input
                  type="text"
                  inputmode="decimal"
                  value={finalizeForm.comissaoCaptador}
                  on:input={(event) =>
                    finalizeSplitMode === 'amount'
                      ? handleFinalizeMoneyInput('comissaoCaptador', event)
                      : handleFinalizePercentageInput('comissaoCaptador', event)}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Comissão Vendedor {finalizeSplitMode === 'amount' ? '(R$)' : '(%)'}
                <input
                  type="text"
                  inputmode="decimal"
                  value={finalizeForm.comissaoVendedor}
                  on:input={(event) =>
                    finalizeSplitMode === 'amount'
                      ? handleFinalizeMoneyInput('comissaoVendedor', event)
                      : handleFinalizePercentageInput('comissaoVendedor', event)}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Taxa Encontre Aqui {finalizeSplitMode === 'amount' ? '(R$)' : '(%)'}
                <input
                  type="text"
                  inputmode="decimal"
                  value={finalizeForm.taxaPlataforma}
                  on:input={(event) =>
                    finalizeSplitMode === 'amount'
                      ? handleFinalizeMoneyInput('taxaPlataforma', event)
                      : handleFinalizePercentageInput('taxaPlataforma', event)}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
            </div>
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
              Voltar
            </Button>
            <Button
              variant="outline"
              on:click={() => closeModal()}
              disabled={finalizingContract || uploadingSignedDoc || movingToPreviousStage}
            >
              Fechar
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              on:click={submitFinalize}
              disabled={finalizingContract || uploadingSignedDoc || movingToPreviousStage}
            >
              {#if finalizingContract}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Finalizar Venda/Locação
            </Button>
          </div>
        </div>
      {:else if modalMode === 'edit_finalized'}
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Gerencie os documentos e o ciclo final deste contrato.
          </p>

          <div class="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
            <p><span class="font-semibold">Status:</span> {statusLabel(selected.status)}</p>
            <p><span class="font-semibold">Atualizado em:</span> {formatDate(selected.updatedAt ?? selected.createdAt)}</p>
            <p><span class="font-semibold">Valor:</span> {readCommissionValue(selected.commissionData ?? null, 'valorVenda') || '-'}</p>
          </div>

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Documentos do contrato finalizado
              </p>
              <Button
                size="sm"
                variant="outline"
                on:click={() => selected && downloadAllDocuments(selected)}
                disabled={downloadingAllDocuments || getAllContractDocuments(selected).length === 0}
              >
                {#if downloadingAllDocuments}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Baixar tudo (.zip)
              </Button>
            </div>
            {#if getAllContractDocuments(selected).length === 0}
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Nenhum documento vinculado a este contrato.
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
                    <div class="flex items-center gap-2">
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
                        variant="destructive"
                        on:click={() => deleteFinalizedDocument(doc)}
                        disabled={deletingFinalizedDocumentId === doc.id}
                      >
                        {#if deletingFinalizedDocumentId === doc.id}
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
              Adicionar documento
            </p>
            <div class="mt-3 grid gap-3 md:grid-cols-3">
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Tipo do Documento
                <select
                  bind:value={signedDocType}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {#each Object.entries(documentTypeLabels) as [value, label]}
                    <option value={value}>{label}</option>
                  {/each}
                </select>
              </label>
              {#if finalizedDocumentRequiresSide(signedDocType)}
                <label class="text-sm text-gray-700 dark:text-gray-200">
                  Lado
                  <select
                    bind:value={selectedSignedDocSide}
                    class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="seller">Captador</option>
                    <option value="buyer">Comprador</option>
                  </select>
                </label>
              {/if}
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
                on:click={uploadFinalizedDocument}
                disabled={uploadingSignedDoc || !selectedSignedFile}
              >
                {#if uploadingSignedDoc}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Adicionar documento
              </Button>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              on:click={() => closeModal()}
              disabled={reopeningContract || deletingContract || uploadingSignedDoc}
            >
              Fechar
            </Button>
            <Button
              variant="outline"
              on:click={reopenFinalizedContract}
              disabled={reopeningContract || deletingContract || uploadingSignedDoc}
            >
              {#if reopeningContract}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Reiniciar Contrato
            </Button>
              <Button
                variant="destructive"
                on:click={() => selected && deleteFinalizedContract(selected)}
                disabled={reopeningContract || deletingContract || uploadingSignedDoc}
              >
              {#if deletingContract}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Excluir
            </Button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
