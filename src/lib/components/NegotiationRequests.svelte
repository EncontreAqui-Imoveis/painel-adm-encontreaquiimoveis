<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2, X } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';
  import ProposalDetailModal from '$lib/components/negotiations/ProposalDetailModal.svelte';
  import {
    extractSignedDocumentFileName,
    extractSignedDocumentId,
    formatCurrency,
    formatDate,
    formatCpf,
    getBrokerName,
    getStatusBadgeClass,
    getStatusLabel,
    isSignedProposal,
    isValidCpf,
    normalizeErrorMessage,
    normalizeCpfDigits,
    normalizeResponsibleOption,
    canSaveResponsiblesSelection as canSaveResponsiblesSelectionHelper,
    hasResponsiblesInconsistentState as hasResponsiblesInconsistentStateHelper,
    hasResponsibleChanges as hasResponsibleChangesHelper,
    paymentLines,
    PROPOSAL_FILTERS,
    readClientCpf,
    readClientName,
    resolveCreatedAt,
    responsibleSnapshot,
    responsiblesBlockApproval as responsiblesBlockApprovalHelper,
    selectedFilterStatus,
    type NegotiationItem,
    type PaginatedResponse,
    type ProposalFilterKey,
    type ResponsibleOption,
    type ResponsibleSelectionState,
  } from '$lib/components/negotiations/negotiationRequestsHelpers';

  type TopProposal = {
    negotiationId: string;
    value?: number | null;
    clientName?: string | null;
    createdAt?: string | null;
    created_at?: string | null;
    updatedAt?: string | null;
    updated_at?: string | null;
  };

  type NegotiationSummaryItem = {
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    propertyImageUrl?: string | null;
    proposalCount: number;
    createdAt?: string | null;
    created_at?: string | null;
    updatedAt?: string | null;
    updated_at?: string | null;
    topProposal?: TopProposal | null;
  };

  type ProposalPropertyOption = {
    id: number;
    code?: string | null;
    title?: string | null;
    propertyImageUrl?: string | null;
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    city?: string | null;
    state?: string | null;
  };

  let summaryItems: NegotiationSummaryItem[] = [];
  let summaryLoading = true;
  let hasMounted = false;
  let summaryRefreshKey = 0;
  let summaryPage = 1;
  let summaryItemsPerPage = 10;
  let summaryTotalItems = 0;
  let summaryTotalPages = 1;

  let showPropertyModal = false;
  let selectedProperty: NegotiationSummaryItem | null = null;
  let propertyRequests: NegotiationItem[] = [];
  let propertyLoading = false;
  let propertyRefreshKey = 0;
  let propertyPage = 1;
  let propertyItemsPerPage = 10;
  let propertyTotalItems = 0;
  let propertyTotalPages = 1;

  let processingAction = false;
  let selectedProposal: NegotiationItem | null = null;
  let showDetailModal = false;
  let rejectReason = '';
  let viewingPdf = false;
  let uploadingSignedPdf = false;
  let deletingSignedPdf = false;
  let savingResponsibles = false;
  let selectedSignedPdfFile: File | null = null;
  let signedPdfInputRenderKey = 0;
  let signedPdfFileInput: HTMLInputElement | null = null;
  let selectedProposalFilter: ProposalFilterKey = 'signed';
  let responsiblesLoading = false;
  let responsibleSearchQuery = '';
  let responsibleOptions: ResponsibleOption[] = [];
  let searchingResponsibles = false;
  let selectedResponsibles: ResponsibleOption[] = [];
  let responsiblesSnapshot = '';
  let responsibleError = '';
  let responsiblesLoadError = '';
  let responsiblesLoadedProposalId: string | null = null;
  let responsibleSearchDebounce: ReturnType<typeof setTimeout> | null = null;
  let responsibleDropdownOpen = false;
  let responsibleBlurTimeout: ReturnType<typeof setTimeout> | null = null;
  let isImagePreviewOpen = false;
  let previewImageUrl: string | null = null;
  let previewImageAlt = 'Pré-visualização do imóvel';
  let showGenerateProposalModal = false;
  let generateProposalWasOpen = false;
  let generateProposalMode: 'create' | 'edit' = 'create';
  let editingProposalId: string | null = null;
  let generateProposalSearch = '';
  let generateProposalSearching = false;
  let generateProposalSubmitting = false;
  let generateProposalError = '';
  let generateProposalResults: ProposalPropertyOption[] = [];
  let selectedGenerateProperty: ProposalPropertyOption | null = null;
  let proposalClientName = '';
  let proposalClientCpf = '';
  let proposalValidityDays = '10';
  let proposalTotalValue = '';
  let proposalCash = '';
  let proposalCashUnit: 'reais' | 'percent' = 'reais';
  let proposalTradeIn = '0';
  let proposalTradeInUnit: 'reais' | 'percent' = 'reais';
  let proposalFinancing = '0';
  let proposalFinancingUnit: 'reais' | 'percent' = 'reais';
  let proposalOthers = '0';
  let proposalOthersUnit: 'reais' | 'percent' = 'reais';
  let proposalSignedFile: File | null = null;
  let proposalSignedInputKey = 0;

  function requestSummaryFetch(resetPage = false) {
    if (resetPage) summaryPage = 1;
    summaryRefreshKey += 1;
  }

  function requestPropertyFetch(resetPage = false) {
    if (resetPage) propertyPage = 1;
    propertyRefreshKey += 1;
  }

  function isApproveBusy() {
    return processingAction || uploadingSignedPdf || deletingSignedPdf || savingResponsibles;
  }

  function currentResponsibleSelectionState(): ResponsibleSelectionState {
    return {
      loading: responsiblesLoading,
      loadError: responsiblesLoadError,
      loadedProposalId: responsiblesLoadedProposalId,
      snapshot: responsiblesSnapshot,
    };
  }

  function hasResponsiblesInconsistentState(proposalId?: string | null): boolean {
    return hasResponsiblesInconsistentStateHelper(proposalId, currentResponsibleSelectionState());
  }

  function responsiblesBlockApproval(proposal: NegotiationItem | null): boolean {
    return responsiblesBlockApprovalHelper(proposal, currentResponsibleSelectionState());
  }

  function hasResponsibleChanges(): boolean {
    return hasResponsibleChangesHelper(
      selectedResponsibles,
      currentResponsibleSelectionState(),
      selectedProposal?.id ?? null
    );
  }

  function requiresSignedPdf() {
    return selectedProposal?.signedDocumentId == null;
  }

  function signedPdfDisplayName(): string {
    if (selectedSignedPdfFile?.name) return selectedSignedPdfFile.name;
    const persistedName = selectedProposal?.signedDocumentFileName?.trim();
    if (persistedName) return persistedName;
    if (selectedProposal?.signedDocumentId != null) return 'proposta_assinada.pdf';
    return 'Envie sua proposta assinada';
  }

  function clearSignedPdfSelection() {
    selectedSignedPdfFile = null;
    signedPdfInputRenderKey += 1;
  }

  /** Elegível para aprovar/rejeitar: PDF assinado anexado OU status já assinado (backend às vezes mantém outro status). */
  function clearResponsibleSearchDebounce() {
    if (!responsibleSearchDebounce) return;
    clearTimeout(responsibleSearchDebounce);
    responsibleSearchDebounce = null;
  }

  function clearResponsibleBlurTimeout() {
    if (!responsibleBlurTimeout) return;
    clearTimeout(responsibleBlurTimeout);
    responsibleBlurTimeout = null;
  }

  function onResponsibleSearchInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement | null;
    responsibleSearchQuery = input?.value ?? '';
    responsibleError = '';
    responsibleDropdownOpen = true;

    clearResponsibleSearchDebounce();
    const query = responsibleSearchQuery.trim();
    if (query.length < 2) {
      searchingResponsibles = false;
      responsibleOptions = [];
      return;
    }

    responsibleSearchDebounce = setTimeout(() => {
      void searchResponsibles(query);
    }, 300);
  }

  function openResponsibleDropdown() {
    clearResponsibleBlurTimeout();
    responsibleDropdownOpen = true;
  }

  function scheduleCloseResponsibleDropdown() {
    clearResponsibleBlurTimeout();
    responsibleBlurTimeout = setTimeout(() => {
      responsibleDropdownOpen = false;
    }, 120);
  }

  function addResponsible(option: ResponsibleOption) {
    if (selectedResponsibles.some((item) => item.id === option.id)) {
      return;
    }
    if (selectedResponsibles.length >= 5) {
      responsibleError = 'Você pode selecionar no máximo 5 responsáveis.';
      toast.error('Limite máximo de 5 responsáveis.');
      return;
    }
    selectedResponsibles = [...selectedResponsibles, option];
    responsibleError = '';
    responsibleSearchQuery = '';
    responsibleOptions = [];
    responsibleDropdownOpen = false;
  }

  function removeResponsible(id: number) {
    selectedResponsibles = selectedResponsibles.filter((item) => item.id !== id);
    responsibleError = '';
  }

  async function searchResponsibles(query: string) {
    searchingResponsibles = true;
    try {
      const params = new URLSearchParams();
      params.set('search', query);
      params.set('page', '1');
      params.set('limit', '10');
      params.set('includeBrokers', 'true');
      const response = await api.get<PaginatedResponse<Record<string, unknown>>>(
        `/admin/users?${params.toString()}`
      );
      const options = Array.isArray(response?.data)
        ? response.data
            .map((item) => normalizeResponsibleOption(item))
            .filter((item): item is ResponsibleOption => item != null)
            .filter((item) => !selectedResponsibles.some((selected) => selected.id === item.id))
        : [];
      responsibleOptions = options;
    } catch (error) {
      console.error('Erro ao buscar responsáveis:', error);
      responsibleOptions = [];
      toast.error(normalizeErrorMessage(error, 'Não foi possível buscar responsáveis.'));
    } finally {
      searchingResponsibles = false;
    }
  }

  async function fetchResponsibles(proposalId: string) {
    responsiblesLoading = true;
    responsibleError = '';
    responsiblesLoadError = '';
    responsiblesLoadedProposalId = null;
    try {
      const response = await api.get<{ data?: unknown[] } | unknown[]>(
        `/admin/negotiations/${proposalId}/responsibles`
      );
      const raw = Array.isArray(response) ? response : response?.data;
      const normalized = Array.isArray(raw)
        ? raw
            .map((item) => normalizeResponsibleOption(item))
            .filter((item): item is ResponsibleOption => item != null)
        : [];
      selectedResponsibles = normalized.slice(0, 5);
      responsiblesSnapshot = responsibleSnapshot(selectedResponsibles);
      responsiblesLoadedProposalId = proposalId;
    } catch (error) {
      console.error('Erro ao carregar responsáveis:', error);
      selectedResponsibles = [];
      responsiblesSnapshot = '';
      responsiblesLoadError = normalizeErrorMessage(error, 'Não foi possível carregar os responsáveis.');
      responsibleError = responsiblesLoadError;
      toast.error(normalizeErrorMessage(error, 'Não foi possível carregar os responsáveis.'));
    } finally {
      responsiblesLoading = false;
    }
  }

  async function saveResponsiblesSelection(proposalId: string, silent = false): Promise<boolean> {
    if (
      !canSaveResponsiblesSelectionHelper(proposalId, selectedResponsibles, currentResponsibleSelectionState())
    ) {
      responsibleError = 'Recarregue os responsáveis antes de salvar.';
      return false;
    }
    if (selectedResponsibles.length > 5) {
      responsibleError = 'Você pode selecionar no máximo 5 responsáveis.';
      return false;
    }

    savingResponsibles = true;
    try {
      await api.put(`/admin/negotiations/${proposalId}/responsibles`, {
        responsibleIds: selectedResponsibles.map((item) => item.id),
      });
      responsiblesSnapshot = responsibleSnapshot(selectedResponsibles);
      responsibleError = '';
      responsiblesLoadError = '';
      responsiblesLoadedProposalId = proposalId;
      if (!silent) {
        toast.success('Responsáveis atualizados com sucesso.');
      }
      return true;
    } catch (error) {
      console.error('Erro ao salvar responsáveis:', error);
      toast.error(normalizeErrorMessage(error, 'Não foi possível salvar os responsáveis.'));
      return false;
    } finally {
      savingResponsibles = false;
    }
  }

  function resetDetailState() {
    rejectReason = '';
    clearSignedPdfSelection();
    selectedResponsibles = [];
    responsiblesSnapshot = '';
    responsibleSearchQuery = '';
    responsibleOptions = [];
    responsibleError = '';
    responsiblesLoadError = '';
    responsiblesLoadedProposalId = null;
    searchingResponsibles = false;
    clearResponsibleSearchDebounce();
    clearResponsibleBlurTimeout();
    responsibleDropdownOpen = false;
  }

  function syncProposalInState(proposalId: string, patch: Partial<NegotiationItem>) {
    propertyRequests = propertyRequests.map((item) =>
      item.id === proposalId ? { ...item, ...patch } : item
    );
    if (selectedProposal?.id === proposalId) {
      selectedProposal = { ...selectedProposal, ...patch };
    }
  }

  function clearPropertyModalState() {
    showPropertyModal = false;
    selectedProperty = null;
    propertyRequests = [];
    propertyPage = 1;
    propertyTotalItems = 0;
    propertyTotalPages = 1;
  }

  function resolveProposalPropertyValue(property: ProposalPropertyOption | null): number {
    if (!property) return 0;
    const sale = Number(property.price_sale ?? 0);
    const rent = Number(property.price_rent ?? 0);
    const fallback = Number(property.price ?? 0);
    const resolved = sale > 0 ? sale : rent > 0 ? rent : fallback;
    return Number.isFinite(resolved) && resolved > 0 ? resolved : 0;
  }

  function formatProposalMoneyInput(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }

  function calculateProposalAmount(value: string, unit: 'reais' | 'percent', totalValue: number): number {
    const parsed = parseProposalAmount(value);
    if (!Number.isFinite(parsed)) return NaN;
    if (unit === 'percent') {
      if (!Number.isFinite(totalValue) || totalValue <= 0) return NaN;
      return Number(((totalValue * parsed) / 100).toFixed(2));
    }
    return Number(parsed.toFixed(2));
  }

  function calculateValidityDaysFromProposal(proposal: NegotiationItem | null): string {
    if (!proposal?.validityDate) return '10';
    const validity = new Date(proposal.validityDate);
    if (Number.isNaN(validity.getTime())) return '10';
    const now = new Date();
    const diff = validity.getTime() - now.getTime();
    if (!Number.isFinite(diff) || diff <= 0) return '10';
    const days = Math.max(1, Math.round(diff / (24 * 60 * 60 * 1000)));
    return String(days);
  }

  function resetGenerateProposalState() {
    generateProposalMode = 'create';
    editingProposalId = null;
    generateProposalSearch = '';
    generateProposalSearching = false;
    generateProposalSubmitting = false;
    generateProposalError = '';
    generateProposalResults = [];
    selectedGenerateProperty = null;
    proposalClientName = '';
    proposalClientCpf = '';
    proposalValidityDays = '10';
    proposalTotalValue = '';
    proposalCash = '';
    proposalCashUnit = 'reais';
    proposalTradeIn = '0';
    proposalTradeInUnit = 'reais';
    proposalFinancing = '0';
    proposalFinancingUnit = 'reais';
    proposalOthers = '0';
    proposalOthersUnit = 'reais';
    proposalSignedFile = null;
    proposalSignedInputKey += 1;
  }

  function fillGenerateProposalFromProperty(property: ProposalPropertyOption, mode: 'create' | 'edit' = 'create') {
    selectedGenerateProperty = property;
    const resolvedValue = resolveProposalPropertyValue(property);
    proposalTotalValue = formatProposalMoneyInput(resolvedValue);
    proposalCash = formatProposalMoneyInput(resolvedValue);
    proposalCashUnit = 'reais';
    proposalTradeIn = '0';
    proposalTradeInUnit = 'reais';
    proposalFinancing = '0';
    proposalFinancingUnit = 'reais';
    proposalOthers = '0';
    proposalOthersUnit = 'reais';
    generateProposalMode = mode;
  }

  function openGenerateProposalModal(propertyToEdit?: NegotiationItem | null) {
    resetGenerateProposalState();
    if (propertyToEdit) {
      generateProposalMode = 'edit';
      editingProposalId = propertyToEdit.id;
      selectedGenerateProperty = {
        id: propertyToEdit.propertyId,
        code: propertyToEdit.propertyCode ?? null,
        title: propertyToEdit.propertyTitle ?? null,
        price: propertyToEdit.value ?? null,
        price_sale: propertyToEdit.value ?? null,
        price_rent: propertyToEdit.value ?? null,
      };
      proposalClientName = readClientName(propertyToEdit);
      proposalClientCpf = formatCpf(readClientCpf(propertyToEdit));
      proposalValidityDays = calculateValidityDaysFromProposal(propertyToEdit);
      proposalTotalValue = formatProposalMoneyInput(Number(propertyToEdit.value ?? 0));
      proposalCash = formatProposalMoneyInput(Number(propertyToEdit.payment?.dinheiro ?? propertyToEdit.value ?? 0));
      proposalTradeIn = formatProposalMoneyInput(Number(propertyToEdit.payment?.permuta ?? 0));
      proposalFinancing = formatProposalMoneyInput(Number(propertyToEdit.payment?.financiamento ?? 0));
      proposalOthers = formatProposalMoneyInput(Number(propertyToEdit.payment?.outros ?? 0));
    }
    showGenerateProposalModal = true;
  }

  function openEditProposalModal() {
    if (!selectedProposal) return;
    openGenerateProposalModal(selectedProposal);
  }

  function closeGenerateProposalModal() {
    if (generateProposalSubmitting) return;
    showGenerateProposalModal = false;
  }

  $: if (generateProposalWasOpen && !showGenerateProposalModal) {
    resetGenerateProposalState();
  }
  $: generateProposalWasOpen = showGenerateProposalModal;

  async function searchProposalProperties() {
    const query = generateProposalSearch.trim();
    if (query.length < 2) {
      generateProposalResults = [];
      selectedGenerateProperty = null;
      return;
    }

    generateProposalSearching = true;
    generateProposalError = '';
    try {
      const params = new URLSearchParams();
      params.set('search', query);
      params.set('page', '1');
      params.set('limit', '10');
      params.set('paginate', 'true');
      const response = await api.get<{ data?: ProposalPropertyOption[] } | ProposalPropertyOption[]>(
        `/admin/properties-with-brokers?${params.toString()}`
      );
      const raw = Array.isArray(response) ? response : response?.data;
      generateProposalResults = Array.isArray(raw) ? raw : [];
    } catch (error) {
      console.error('Erro ao buscar imóveis para proposta:', error);
      generateProposalResults = [];
      generateProposalError = normalizeErrorMessage(
        error,
        'Não foi possível buscar imóveis para gerar proposta.'
      );
      toast.error(generateProposalError);
    } finally {
      generateProposalSearching = false;
    }
  }

  function selectGenerateProperty(property: ProposalPropertyOption) {
    fillGenerateProposalFromProperty(property, generateProposalMode);
    generateProposalError = '';
  }

  function parseProposalAmount(value: string): number {
    const normalized = String(value ?? '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
  }

  async function uploadSignedProposalFromGenerateModal(negotiationId: string) {
    if (!proposalSignedFile) return false;
    const formData = new FormData();
    formData.append('file', proposalSignedFile);
    await apiClient.post(
      `/admin/negotiations/${negotiationId}/signed-proposal`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return true;
  }

  async function submitGeneratedProposal() {
    if (!selectedGenerateProperty) {
      generateProposalError = 'Selecione um imóvel primeiro.';
      return;
    }

    const clientName = proposalClientName.trim();
    const clientCpf = normalizeCpfDigits(proposalClientCpf);
    const validityDays = Number(proposalValidityDays);
    const totalValue = parseProposalAmount(proposalTotalValue);
    const cash = calculateProposalAmount(proposalCash, proposalCashUnit, totalValue);
    const tradeIn = calculateProposalAmount(proposalTradeIn, proposalTradeInUnit, totalValue);
    const financing = calculateProposalAmount(proposalFinancing, proposalFinancingUnit, totalValue);
    const others = calculateProposalAmount(proposalOthers, proposalOthersUnit, totalValue);
    const paymentTotal = [cash, tradeIn, financing, others].reduce((sum, value) => sum + value, 0);

    if (!clientName || !clientCpf) {
      generateProposalError = 'Informe nome e CPF do proponente.';
      return;
    }

    if (!isValidCpf(clientCpf)) {
      generateProposalError = 'Informe um CPF válido.';
      return;
    }

    if (!Number.isInteger(validityDays) || validityDays <= 0) {
      generateProposalError = 'Validade deve ser um inteiro maior que zero.';
      return;
    }

    if (!Number.isFinite(totalValue) || totalValue < 1 || totalValue > 999_000_000_000) {
      generateProposalError = 'Valor da proposta deve ficar entre R$ 1,00 e R$ 999.000.000.000,00.';
      return;
    }

    if (![cash, tradeIn, financing, others].every((value) => Number.isFinite(value))) {
      generateProposalError = 'Valores de pagamento invalidos.';
      return;
    }

    if (Math.round(paymentTotal * 100) !== Math.round(totalValue * 100)) {
      generateProposalError = 'A soma dos pagamentos deve bater com o valor da proposta.';
      return;
    }

    generateProposalSubmitting = true;
    generateProposalError = '';
    try {
      const payload = {
        propertyId: selectedGenerateProperty.id,
        clientName,
        clientCpf,
        validadeDias: validityDays,
        proposalValue: totalValue,
        pagamento: {
          dinheiro: cash,
          permuta: tradeIn,
          financiamento: financing,
          outros: others,
        },
        idempotencyKey: crypto.randomUUID(),
      };
      const response = editingProposalId
        ? await api.put<{
            negotiationId?: string;
            documentId?: number;
          }>(`/negotiations/${editingProposalId}/draft`, payload)
        : await api.post<{
            negotiationId?: string;
            documentId?: number;
          }>('/admin/negotiations/proposal', payload);

      const negotiationId = String(response.negotiationId ?? editingProposalId ?? '').trim();
      const documentId = Number(response.documentId ?? 0);
      if (!negotiationId || !Number.isInteger(documentId) || documentId <= 0) {
        throw new Error('Resposta da geração sem identificadores válidos.');
      }

      const pdfResponse = await apiClient.get(
        `/negotiations/${negotiationId}/documents/${documentId}/download`,
        {
          responseType: 'blob',
        }
      );
      const blob = pdfResponse.data instanceof Blob
        ? pdfResponse.data
        : new Blob([pdfResponse.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      if (proposalSignedFile) {
        await uploadSignedProposalFromGenerateModal(negotiationId);
        toast.success('Proposta gerada e PDF assinado enviado.');
      } else {
        toast.success(editingProposalId ? 'Proposta atualizada com sucesso.' : 'Proposta criada com sucesso.');
      }
      closeGenerateProposalModal();
    } catch (error) {
      console.error('Erro ao gerar proposta:', error);
      generateProposalError = normalizeErrorMessage(error, 'Não foi possível gerar a proposta.');
      toast.error(generateProposalError);
    } finally {
      generateProposalSubmitting = false;
    }
  }

  async function fetchSummary() {
    summaryLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', selectedFilterStatus(selectedProposalFilter));
      params.set('page', String(summaryPage));
      params.set('limit', String(summaryItemsPerPage));

      const response = await api.get<PaginatedResponse<NegotiationSummaryItem>>(
        `/admin/negotiations/requests/summary?${params.toString()}`
      );

      summaryItems = Array.isArray(response?.data) ? response.data : [];
      summaryTotalItems = Number(response?.total ?? summaryItems.length);
      summaryTotalPages = Math.max(1, Math.ceil(summaryTotalItems / summaryItemsPerPage));
      if (summaryPage > summaryTotalPages) {
        summaryPage = summaryTotalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar resumo de solicitações:', error);
      toast.error('Não foi possível carregar as solicitações de propostas.');
      summaryItems = [];
      summaryTotalItems = 0;
      summaryTotalPages = 1;
    } finally {
      summaryLoading = false;
    }
  }

  async function fetchPropertyRequests(propertyId: number) {
    propertyLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', selectedFilterStatus(selectedProposalFilter));
      params.set('page', String(propertyPage));
      params.set('limit', String(propertyItemsPerPage));

      const response = await api.get<PaginatedResponse<NegotiationItem>>(
        `/admin/negotiations/requests/property/${propertyId}?${params.toString()}`
      );

      propertyRequests = Array.isArray(response?.data) ? response.data : [];
      propertyTotalItems = Number(response?.total ?? propertyRequests.length);
      propertyTotalPages = Math.max(1, Math.ceil(propertyTotalItems / propertyItemsPerPage));
      if (propertyPage > propertyTotalPages) {
        propertyPage = propertyTotalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar propostas do imóvel:', error);
      toast.error('Não foi possível carregar as propostas deste imóvel.');
      propertyRequests = [];
      propertyTotalItems = 0;
      propertyTotalPages = 1;
    } finally {
      propertyLoading = false;
    }
  }

  function openPropertyRequests(item: NegotiationSummaryItem) {
    selectedProperty = item;
    showPropertyModal = true;
    propertyPage = 1;
    requestPropertyFetch(true);
  }

  async function openProposalDetail(item: NegotiationItem) {
    selectedProposal = { ...item };
    resetDetailState();
    showDetailModal = true;
    await fetchResponsibles(item.id);
  }

  function closeDetailModal(force = false) {
    if (isApproveBusy() && !force) return;
    showDetailModal = false;
    selectedProposal = null;
    resetDetailState();
  }

  function closePropertyModal() {
    if (processingAction) return;
    clearPropertyModalState();
  }

  function openImagePreview(url: string | null | undefined, alt?: string) {
    if (!url) return;
    previewImageUrl = url;
    previewImageAlt = alt ?? 'Pré-visualização do imóvel';
    isImagePreviewOpen = true;
  }

  function closeImagePreview() {
    isImagePreviewOpen = false;
    previewImageUrl = null;
  }

  function handlePreviewKeydown(event: KeyboardEvent) {
    if (!isImagePreviewOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeImagePreview();
    }
  }

  async function viewSignedPdf() {
    if (!selectedProposal?.signedDocumentId) {
      toast.error('Nenhum PDF assinado anexado para visualização.');
      return;
    }
    viewingPdf = true;
    try {
      const response = await apiClient.get(
        `/admin/negotiations/${selectedProposal.id}/signed-proposal/download`,
        {
          responseType: 'blob',
        }
      );
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error('Erro ao abrir PDF assinado:', error);
      toast.error('Não foi possível abrir o PDF assinado.');
    } finally {
      viewingPdf = false;
    }
  }

  async function handleSignedPdfChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      selectedSignedPdfFile = null;
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('Selecione um arquivo PDF válido.');
      clearSignedPdfSelection();
      return;
    }
    selectedSignedPdfFile = file;
    await uploadSignedPdf();
  }

  async function uploadSignedPdf() {
    if (!selectedProposal) return;
    if (!selectedSignedPdfFile) {
      toast.error('Selecione um PDF assinado para enviar.');
      return;
    }

    const hadSignedPdf = selectedProposal.signedDocumentId != null;
    const uploadedFileName = selectedSignedPdfFile.name;
    uploadingSignedPdf = true;
    try {
      const formData = new FormData();
      formData.append('file', selectedSignedPdfFile);
      const response = await apiClient.post(
        `/admin/negotiations/${selectedProposal.id}/signed-proposal`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      const nextSignedDocumentId = extractSignedDocumentId(response?.data);
      if (nextSignedDocumentId == null) {
        toast.error('Resposta do servidor sem identificador do documento. Tente novamente.');
        return;
      }
      const nextSignedDocumentFileName =
        extractSignedDocumentFileName(response?.data) ?? uploadedFileName;
      syncProposalInState(selectedProposal.id, {
        signedDocumentId: nextSignedDocumentId,
        signedDocumentFileName: nextSignedDocumentFileName,
      });
      clearSignedPdfSelection();
      toast.success(
        hadSignedPdf
          ? 'PDF assinado substituído com sucesso.'
          : 'PDF assinado enviado com sucesso.'
      );
    } catch (error) {
      console.error('Erro ao enviar PDF assinado:', error);
      toast.error(normalizeErrorMessage(error, 'Não foi possível enviar o PDF assinado.'));
    } finally {
      uploadingSignedPdf = false;
    }
  }

  async function deleteSignedPdf() {
    if (!selectedProposal?.signedDocumentId) {
      toast.error('Não há PDF assinado para excluir.');
      return;
    }

    const confirmed = window.confirm('Confirma excluir o PDF assinado desta proposta?');
    if (!confirmed) return;

    deletingSignedPdf = true;
    try {
      await api.delete(`/admin/negotiations/${selectedProposal.id}/signed-proposal`);
      syncProposalInState(selectedProposal.id, { signedDocumentId: null, signedDocumentFileName: null });
      clearSignedPdfSelection();
      toast.success('PDF assinado excluído com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir PDF assinado:', error);
      toast.error(normalizeErrorMessage(error, 'Não foi possível excluir o PDF assinado.'));
    } finally {
      deletingSignedPdf = false;
    }
  }

  async function approveSelected() {
    if (!selectedProposal) return;
    if (!isSignedProposal(selectedProposal)) {
      toast.error('A aprovação está disponível apenas para propostas assinadas.');
      return;
    }
    if (requiresSignedPdf()) {
      toast.error('Para aprovar, é obrigatório anexar um PDF assinado.');
      return;
    }
    const confirmed = window.confirm(
      'Confirma aprovação desta proposta? Esta ação encaminha a negociação para contratos.'
    );
    if (!confirmed) return;

    const proposalId = selectedProposal.id;
    if (responsiblesBlockApproval(selectedProposal)) {
      const message = 'Não foi possível validar os responsáveis. Recarregue e tente novamente.';
      responsibleError = message;
      toast.error(message);
      return;
    }
    if (hasResponsibleChanges()) {
      const responsiblesSaved = await saveResponsiblesSelection(proposalId, true);
      if (!responsiblesSaved) return;
    }

    processingAction = true;
    try {
      await api.put(`/admin/negotiations/${proposalId}/approve`, {});
      toast.success('Proposta aprovada com sucesso.');
      propertyRequests = propertyRequests.filter((item) => item.id !== proposalId);
      closeDetailModal(true);
      requestSummaryFetch();
      requestPropertyFetch();
    } catch (error) {
      console.error('Erro ao aprovar proposta:', error);
      const responseCode =
        error && typeof error === 'object'
          ? (
              error as {
                response?: {
                  data?: { code?: string; errorCode?: string };
                };
              }
            ).response?.data?.code ??
            (
              error as {
                response?: {
                  data?: { code?: string; errorCode?: string };
                };
              }
            ).response?.data?.errorCode
          : null;
      if (responseCode === 'SIGNED_PROPOSAL_REQUIRED') {
        toast.error('Para aprovar, é obrigatório anexar um PDF assinado.');
        return;
      }
      toast.error(normalizeErrorMessage(error, 'Falha ao aprovar proposta.'));
    } finally {
      processingAction = false;
    }
  }

  async function rejectSelected() {
    if (!selectedProposal) return;
    if (!isSignedProposal(selectedProposal)) {
      toast.error('A rejeição está disponível apenas para propostas assinadas.');
      return;
    }
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }

    const confirmed = window.confirm(
      'Confirma rejeição desta proposta? O imóvel volta para disponível quando aplicável.'
    );
    if (!confirmed) return;

    const proposalId = selectedProposal.id;
    processingAction = true;
    try {
      await api.put(`/admin/negotiations/${proposalId}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success('Proposta rejeitada e imóvel devolvido para disponível.');
      propertyRequests = propertyRequests.filter((item) => item.id !== proposalId);
      closeDetailModal(true);
      requestSummaryFetch();
      requestPropertyFetch();
    } catch (error) {
      console.error('Erro ao rejeitar proposta:', error);
      toast.error(normalizeErrorMessage(error, 'Falha ao rejeitar proposta.'));
    } finally {
      processingAction = false;
    }
  }

  onMount(() => {
    hasMounted = true;
    requestSummaryFetch();
  });

  $: if (hasMounted) {
    summaryPage;
    summaryRefreshKey;
    selectedProposalFilter;
    fetchSummary();
  }

  $: if (hasMounted && showPropertyModal && selectedProperty) {
    propertyPage;
    propertyRefreshKey;
    fetchPropertyRequests(selectedProperty.propertyId);
  }
</script>

<svelte:options runes={false} />
<svelte:window on:keydown={handlePreviewKeydown} />

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitação de Propostas</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Acompanhe propostas enviadas, assinadas e recusadas por imóvel.
      </p>
    </div>
    <Button variant="outline" on:click={() => requestSummaryFetch()} disabled={summaryLoading}>
      {#if summaryLoading}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Atualizar
    </Button>
    <Button variant="outline" on:click={() => openGenerateProposalModal()} disabled={summaryLoading}>
      Criar proposta
    </Button>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    {#each PROPOSAL_FILTERS as filter (filter.key)}
      <button
        type="button"
        class={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
          selectedProposalFilter === filter.key
            ? 'bg-emerald-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        }`}
        on:click={() => {
          selectedProposalFilter = filter.key;
          requestSummaryFetch(true);
        }}
      >
        {filter.label}
      </button>
    {/each}
  </div>

  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Foto
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Código / Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Propostas
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Melhor proposta
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Criado em
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ação
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if summaryLoading}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando imóveis...
            </td>
          </tr>
        {:else if summaryItems.length === 0}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma proposta encontrada para este filtro.
            </td>
          </tr>
        {:else}
          {#each summaryItems as item (item.propertyId)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4">
                {#if item.propertyImageUrl}
                  <button
                    type="button"
                    aria-label={`Abrir imagem de ${item.propertyTitle ?? `Imóvel #${item.propertyId}`}`}
                    on:click|stopPropagation={() =>
                      openImagePreview(
                        item.propertyImageUrl,
                        item.propertyTitle ?? `Imóvel #${item.propertyId}`
                      )}
                  >
                    <img
                      src={item.propertyImageUrl}
                      alt={item.propertyTitle ?? `Imóvel #${item.propertyId}`}
                      class="h-10 w-14 rounded-md border border-gray-200 object-cover dark:border-gray-700"
                      loading="lazy"
                    />
                  </button>
                {:else}
                  <div class="h-10 w-14 rounded-md border border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"></div>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-semibold">
                  {item.propertyCode ? `${item.propertyCode}` : `#${item.propertyId}`}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? item.propertyAddress ?? '-'}
                </div>
                {#if item.propertyAddress && item.propertyTitle}
                  <div class="text-xs text-gray-500 dark:text-gray-400">{item.propertyAddress}</div>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.proposalCount} {item.proposalCount === 1 ? 'proposta' : 'propostas'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {#if item.topProposal}
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {item.topProposal.clientName ?? '-'}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(item.topProposal.value)} - {formatDate(resolveCreatedAt(item.topProposal))}
                  </div>
                {:else}
                  -
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {resolveCreatedAt(item) ? formatDate(resolveCreatedAt(item)) : 'Sem data'}
              </td>
              <td class="px-6 py-4 text-right">
                <Button size="sm" variant="outline" on:click={() => openPropertyRequests(item)}>
                  Ver propostas
                </Button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <Pagination
      bind:currentPage={summaryPage}
      totalPages={summaryTotalPages}
      totalItems={summaryTotalItems}
      itemsPerPage={summaryItemsPerPage}
    />
  </div>
</div>

{#if showPropertyModal && selectedProperty}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closePropertyModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Propostas do imóvel</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedProperty.propertyCode ? `${selectedProperty.propertyCode}` : `#${selectedProperty.propertyId}`}
            {#if selectedProperty.propertyTitle}
              - {selectedProperty.propertyTitle}
            {:else if selectedProperty.propertyAddress}
              - {selectedProperty.propertyAddress}
            {/if}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" on:click={() => requestPropertyFetch()} disabled={propertyLoading}>
            {#if propertyLoading}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Atualizar
          </Button>
          <Button variant="outline" size="sm" title="Fechar modal" className="px-2" on:click={closePropertyModal}>
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div class="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {#if propertyLoading}
          <div class="rounded-md border border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Carregando propostas...
          </div>
        {:else if propertyRequests.length === 0}
          <div class="rounded-md border border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Nenhuma proposta encontrada para este imóvel neste filtro.
          </div>
        {:else}
          {#each propertyRequests as item (item.id)}
            <div class="rounded-md border border-gray-200 p-4 dark:border-gray-700">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div class="grid flex-1 gap-2 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <span class={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(item.status, item.internalStatus)}`}>
                      {getStatusLabel(item.status, item.internalStatus)}
                    </span>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Comprador / Proponente</p>
                    <p class="text-sm text-gray-900 dark:text-gray-100">{readClientName(item)}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{readClientCpf(item)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Captador</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{getBrokerName(item)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Valor</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                      {item.validityDate ? formatDate(item.validityDate) : 'Sem data'}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Criado em</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                      {resolveCreatedAt(item) ? formatDate(resolveCreatedAt(item)) : 'Sem data'}
                    </p>
                  </div>
                </div>
                <div class="flex items-start">
                  <Button size="sm" variant="outline" on:click={() => openProposalDetail(item)}>
                    Ver detalhes
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="mt-4">
        <Pagination
          bind:currentPage={propertyPage}
          totalPages={propertyTotalPages}
          totalItems={propertyTotalItems}
          itemsPerPage={propertyItemsPerPage}
        />
      </div>

      <div class="mt-5 flex justify-end">
        <Button variant="outline" on:click={closePropertyModal} disabled={processingAction}>
          Fechar
        </Button>
      </div>
    </div>
  </div>
{/if}

  <ProposalDetailModal
    {showDetailModal}
    {selectedProposal}
    {closeDetailModal}
    {isApproveBusy}
    {formatDate}
    {formatCurrency}
    {readClientName}
    {readClientCpf}
    {paymentLines}
    {signedPdfDisplayName}
    {requiresSignedPdf}
    {uploadingSignedPdf}
    {deletingSignedPdf}
    {viewingPdf}
    {processingAction}
    {signedPdfInputRenderKey}
    {handleSignedPdfChange}
    {deleteSignedPdf}
    {viewSignedPdf}
    {responsibleDropdownOpen}
    {responsibleSearchQuery}
    {searchingResponsibles}
    {responsibleOptions}
    {responsiblesLoading}
    {responsiblesLoadError}
    {selectedResponsibles}
    {responsibleError}
    {savingResponsibles}
    {openResponsibleDropdown}
    {scheduleCloseResponsibleDropdown}
    {onResponsibleSearchInput}
    {addResponsible}
    {fetchResponsibles}
    {removeResponsible}
    {saveResponsiblesSelection}
    {hasResponsiblesInconsistentState}
    {hasResponsibleChanges}
    {responsiblesBlockApproval}
    {openEditProposalModal}
    bind:rejectReason
    {rejectSelected}
    {approveSelected}
  />

<Dialog.Root bind:open={showGenerateProposalModal}>
  <Dialog.Content className="max-h-[90vh] max-w-3xl overflow-y-auto max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:px-4 max-sm:py-6">
    <Dialog.Header>
      <Dialog.Title>Gerar minuta</Dialog.Title>
      <Dialog.Description>
        Busque o imóvel, informe os dados e gere a minuta da proposta.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 px-1 py-4">
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
        <label for="generate-proposal-search" class="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
          Buscar imóvel por código ou nome
        </label>
        <div class="flex gap-2">
          <input
            id="generate-proposal-search"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            placeholder="Ex.: 000018 ou Letio"
            bind:value={generateProposalSearch}
            on:input={searchProposalProperties}
          />
          <Button variant="outline" on:click={searchProposalProperties} disabled={generateProposalSearching}>
            {#if generateProposalSearching}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Buscar
          </Button>
        </div>
        {#if generateProposalError}
          <p class="mt-2 text-sm text-red-600 dark:text-red-300">{generateProposalError}</p>
        {/if}
      </div>

      {#if generateProposalResults.length > 0}
        <div class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Resultados</p>
          {#each generateProposalResults as property (property.id)}
            <button
              type="button"
              class={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                selectedGenerateProperty?.id === property.id
                  ? 'border-amber-400 bg-amber-100 text-gray-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-gray-100'
                  : 'border-gray-200 text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800'
              }`}
              on:click={() => selectGenerateProperty(property)}
            >
              <div class="flex items-center gap-3">
                {#if property.propertyImageUrl}
                  <img
                    src={property.propertyImageUrl}
                    alt={property.title ?? 'Imagem do imóvel'}
                    class="h-14 w-14 rounded-md object-cover ring-1 ring-black/10"
                  />
                {/if}
                <div class="min-w-0 text-left">
                  <div class="font-semibold">
                    {property.code ? `${property.code}` : `#${property.id}`} - {property.title ?? 'Imóvel sem título'}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Valor do imóvel: {formatCurrency(resolveProposalPropertyValue(property))}
                  </div>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      {#if selectedGenerateProperty}
        <div class="space-y-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div class="flex items-start gap-3">
            {#if selectedGenerateProperty.propertyImageUrl}
              <img
                src={selectedGenerateProperty.propertyImageUrl}
                alt={selectedGenerateProperty.title ?? 'Imagem do imóvel'}
                class="h-20 w-20 rounded-lg object-cover ring-1 ring-black/10"
              />
            {/if}
            <div>
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedGenerateProperty.code ? `${selectedGenerateProperty.code}` : `#${selectedGenerateProperty.id}`}
                - {selectedGenerateProperty.title ?? 'Imóvel sem título'}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-300">
                Valor do imóvel: {formatCurrency(resolveProposalPropertyValue(selectedGenerateProperty))}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                A proposta pode ficar acima ou abaixo do valor do imóvel.
              </div>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="space-y-1">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Nome do proponente</span>
              <input
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                bind:value={proposalClientName}
                placeholder="Nome completo"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CPF</span>
              <input
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                bind:value={proposalClientCpf}
                inputmode="numeric"
                placeholder="Somente números ou com máscara"
                on:input={(event) => {
                  const input = event.currentTarget as HTMLInputElement | null;
                  proposalClientCpf = formatCpf(input?.value ?? '');
                }}
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</span>
              <input
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                bind:value={proposalValidityDays}
                type="number"
                min="1"
                step="1"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Valor da proposta</span>
              <input
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                bind:value={proposalTotalValue}
                inputmode="decimal"
                placeholder="0,00"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Dinheiro</span>
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <input
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  bind:value={proposalCash}
                  inputmode="decimal"
                  placeholder="0,00"
                />
                <select
                  bind:value={proposalCashUnit}
                  class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  <option value="reais">R$</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Permuta</span>
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <input
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  bind:value={proposalTradeIn}
                  inputmode="decimal"
                  placeholder="0,00"
                />
                <select
                  bind:value={proposalTradeInUnit}
                  class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  <option value="reais">R$</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Financiamento</span>
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <input
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  bind:value={proposalFinancing}
                  inputmode="decimal"
                  placeholder="0,00"
                />
                <select
                  bind:value={proposalFinancingUnit}
                  class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  <option value="reais">R$</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </label>
            <label class="space-y-1 md:col-span-2">
              <span class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Outros</span>
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <input
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  bind:value={proposalOthers}
                  inputmode="decimal"
                  placeholder="0,00"
                />
                <select
                  bind:value={proposalOthersUnit}
                  class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  <option value="reais">R$</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </label>
          </div>

          <div class="rounded-md border border-dashed border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/70">
            <div class="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              PDF assinado opcional
            </div>
            {#key proposalSignedInputKey}
              <input
                type="file"
                accept="application/pdf"
                class="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-900 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-100 dark:hover:file:bg-gray-700"
                on:change={(event) => {
                  const input = event.currentTarget as HTMLInputElement | null;
                  proposalSignedFile = input?.files?.[0] ?? null;
                }}
              />
            {/key}
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Se escolher um PDF assinado, ele será enviado logo após a criação da proposta.
            </p>
          </div>

          <p class="text-xs text-gray-600 dark:text-gray-300">
            A soma dos campos deve bater com o valor da proposta para a minuta ser gerada.
          </p>
        </div>
      {/if}
    </div>

    <Dialog.Footer className="flex gap-2">
      <Button variant="outline" on:click={closeGenerateProposalModal} disabled={generateProposalSubmitting}>
        Cancelar
      </Button>
      <Button
        on:click={submitGeneratedProposal}
        disabled={generateProposalSubmitting || !selectedGenerateProperty}
      >
        {#if generateProposalSubmitting}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {generateProposalMode === 'edit' ? 'Salvar minuta' : 'Criar proposta'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

{#if isImagePreviewOpen && previewImageUrl}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
    role="button"
    tabindex="0"
    aria-label="Fechar visualização da imagem"
    on:click={closeImagePreview}
    on:keydown={handlePreviewKeydown}
  >
    <div class="relative max-h-[90vh] max-w-[95vw]" role="presentation">
      <img src={previewImageUrl} alt={previewImageAlt} class="max-h-[90vh] max-w-[95vw] rounded-md object-contain" />
      <button
        type="button"
        class="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
        aria-label="Fechar"
        on:click={closeImagePreview}
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
{/if}
