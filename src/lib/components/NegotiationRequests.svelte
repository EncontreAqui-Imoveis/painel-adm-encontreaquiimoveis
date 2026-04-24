<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2, X } from 'lucide-svelte';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';

  type PaymentBreakdown = {
    dinheiro: number;
    permuta: number;
    financiamento: number;
    outros: number;
  };

  type NegotiationItem = {
    id: string;
    status: string;
    internalStatus: string;
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    brokerName?: string | null;
    capturingBrokerName?: string | null;
    sellingBrokerName?: string | null;
    clientName?: string | null;
    clientCpf?: string | null;
    value?: number | null;
    validityDate?: string | null;
    payment?: PaymentBreakdown | null;
    updatedAt?: string | null;
    signedDocumentId?: number | null;
    signedDocumentFileName?: string | null;
    capturingBrokerId?: string | number | null;
    sellingBrokerId?: string | number | null;
  };

  type ApprovedBrokerOption = {
    id: string | number;
    name: string;
    creci?: string | null;
  };

  type ResponsibleOption = {
    id: number;
    name: string;
    email?: string | null;
  };

  type ProposalFilterKey = 'sent' | 'signed' | 'refused';

  const PROPOSAL_FILTERS: Array<{ key: ProposalFilterKey; label: string; status: string }> = [
    { key: 'sent', label: 'Propostas Enviadas', status: 'PROPOSAL_UNSIGNED' },
    { key: 'signed', label: 'Propostas Assinadas', status: 'PROPOSAL_SIGNED' },
    { key: 'refused', label: 'Propostas Recusadas', status: 'REFUSED' },
  ];

  type TopProposal = {
    negotiationId: string;
    value?: number | null;
    clientName?: string | null;
    createdAt?: string | null;
  };

  type NegotiationSummaryItem = {
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    propertyImageUrl?: string | null;
    proposalCount: number;
    updatedAt?: string | null;
    topProposal?: TopProposal | null;
  };

  type PaginatedResponse<T> = {
    data?: T[];
    page?: number;
    limit?: number;
    total?: number;
    propertyId?: number;
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
  let savingSellerBroker = false;
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
  let sameAsCapturing = true;
  let sellerBrokerSearchQuery = '';
  let sellerBrokerOptions: ApprovedBrokerOption[] = [];
  let searchingSellerBrokers = false;
  let selectedSellerBrokerId: string | number | null = null;
  let selectedSellerBrokerName = '';
  let sellerBrokerError = '';
  let sellerSearchDebounce: ReturnType<typeof setTimeout> | null = null;
  let sellerBrokerDropdownOpen = false;
  let sellerBrokerBlurTimeout: ReturnType<typeof setTimeout> | null = null;
  let isImagePreviewOpen = false;
  let previewImageUrl: string | null = null;
  let previewImageAlt = 'Pré-visualização do imóvel';

  function normalizeClient(item: NegotiationItem | null): { name: string; cpf: string } {
    if (!item) return { name: '-', cpf: '-' };
    const raw =
      item.clientName ??
      (item as unknown as Record<string, unknown>).client_name ??
      (item as unknown as Record<string, unknown>).client;

    let name = '-';
    let cpf = '-';

    if (typeof raw === 'string' && raw.trim().length > 0) {
      name = raw.trim();
    } else if (raw && typeof raw === 'object') {
      const nestedName = (raw as Record<string, unknown>).name;
      if (typeof nestedName === 'string' && nestedName.trim().length > 0) {
        name = nestedName.trim();
      }
    }

    const rawCpf =
      item.clientCpf ??
      (item as unknown as Record<string, unknown>).client_cpf ??
      (item as unknown as Record<string, unknown>).cpf ??
      (item as unknown as Record<string, unknown>).client;

    if (typeof rawCpf === 'string' && rawCpf.trim().length > 0) {
      cpf = rawCpf.trim();
    } else if (rawCpf && typeof rawCpf === 'object') {
      const nestedCpf = (rawCpf as Record<string, unknown>).cpf;
      if (typeof nestedCpf === 'string' && nestedCpf.trim().length > 0) {
        cpf = nestedCpf.trim();
      }
    }

    return { name, cpf };
  }

  function readClientName(item: NegotiationItem | null): string {
    return normalizeClient(item).name;
  }

  function readClientCpf(item: NegotiationItem | null): string {
    return normalizeClient(item).cpf;
  }

  function getBrokerName(item: NegotiationItem): string {
    return item.brokerName ?? item.capturingBrokerName ?? item.sellingBrokerName ?? '-';
  }

  function getStatusLabel(status?: string, internalStatus?: string): string {
    const value = String(status ?? internalStatus ?? '').trim().toUpperCase();
    if (!value) return '-';
    if (value === 'PROPOSAL_UNSIGNED') return 'Proposta enviada';
    if (value === 'PROPOSAL_SIGNED') return 'Proposta assinada';
    if (value === 'REFUSED') return 'Recusada';
    if (value === 'UNDER_REVIEW' || value === 'DOCUMENTATION_PHASE') return 'Em análise';
    if (value === 'APPROVED' || value === 'IN_NEGOTIATION') return 'Aprovada';
    if (value === 'PROPOSAL_SENT') return 'Proposta enviada';
    if (value === 'PROPOSAL_DRAFT') return 'Rascunho';
    if (value === 'REJECTED') return 'Rejeitada';
    if (value === 'CANCELLED') return 'Cancelada';
    return value;
  }

  function getStatusBadgeClass(status?: string, internalStatus?: string): string {
    const value = String(status ?? internalStatus ?? '').trim().toUpperCase();
    if (value === 'PROPOSAL_SIGNED') {
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    }
    if (value === 'PROPOSAL_UNSIGNED') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    }
    if (value === 'REFUSED') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
    if (value === 'APPROVED' || value === 'IN_NEGOTIATION') {
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    }
    if (value === 'REJECTED' || value === 'CANCELLED') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  }

  function requestSummaryFetch(resetPage = false) {
    if (resetPage) summaryPage = 1;
    summaryRefreshKey += 1;
  }

  function requestPropertyFetch(resetPage = false) {
    if (resetPage) propertyPage = 1;
    propertyRefreshKey += 1;
  }

  function formatCurrency(value?: number | null) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return 'R$ 0,00';
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  }

  function paymentLines(payment?: PaymentBreakdown | null) {
    const normalized = payment ?? {
      dinheiro: 0,
      permuta: 0,
      financiamento: 0,
      outros: 0,
    };
    return [
      { label: 'Dinheiro', value: normalized.dinheiro ?? 0 },
      { label: 'Permuta', value: normalized.permuta ?? 0 },
      { label: 'Financiamento', value: normalized.financiamento ?? 0 },
      { label: 'Outros', value: normalized.outros ?? 0 },
    ];
  }

  function idsMatch(a?: string | number | null, b?: string | number | null): boolean {
    if (a == null || b == null) return false;
    return String(a) === String(b);
  }

  function isApproveBusy() {
    return processingAction || uploadingSignedPdf || deletingSignedPdf || savingResponsibles;
  }

  function hasResponsiblesInconsistentState(proposalId?: string | null): boolean {
    if (!proposalId) return true;
    if (responsiblesLoading) return true;
    if (responsiblesLoadError.trim().length > 0) return true;
    return responsiblesLoadedProposalId !== proposalId;
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

  function requiresSellerBrokerSelection() {
    return !sameAsCapturing && selectedSellerBrokerId == null;
  }

  function normalizeErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const maybeError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const apiMessage =
        maybeError.response?.data?.message ?? maybeError.response?.data?.error ?? maybeError.message;
      if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
        return apiMessage;
      }
    }
    return fallback;
  }

  function clearSellerSearchDebounce() {
    if (!sellerSearchDebounce) return;
    clearTimeout(sellerSearchDebounce);
    sellerSearchDebounce = null;
  }

  function clearSellerBrokerBlurTimeout() {
    if (!sellerBrokerBlurTimeout) return;
    clearTimeout(sellerBrokerBlurTimeout);
    sellerBrokerBlurTimeout = null;
  }

  function clearSignedPdfSelection() {
    selectedSignedPdfFile = null;
    signedPdfInputRenderKey += 1;
  }

  function selectedFilterStatus(): string {
    return PROPOSAL_FILTERS.find((item) => item.key === selectedProposalFilter)?.status ?? 'PROPOSAL_SIGNED';
  }

  function isSignedProposal(item: NegotiationItem | null): boolean {
    const value = String(item?.status ?? item?.internalStatus ?? '').trim().toUpperCase();
    return value === 'PROPOSAL_SIGNED';
  }

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

  function responsibleSnapshot(list: ResponsibleOption[]): string {
    return [...list]
      .map((item) => item.id)
      .sort((a, b) => a - b)
      .join(',');
  }

  function normalizeResponsibleOption(item: unknown): ResponsibleOption | null {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    const rawId = raw.id ?? raw.userId ?? raw.responsibleId;
    const parsedId = Number(rawId);
    if (!Number.isFinite(parsedId)) return null;

    const rawName = raw.name ?? raw.fullName ?? raw.nome;
    const name =
      typeof rawName === 'string' && rawName.trim().length > 0
        ? rawName.trim()
        : `Responsável #${parsedId}`;
    const email = typeof raw.email === 'string' ? raw.email : null;
    return { id: parsedId, name, email };
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

  function hasResponsibleChanges(): boolean {
    if (hasResponsiblesInconsistentState(selectedProposal?.id ?? null)) return true;
    return responsibleSnapshot(selectedResponsibles) !== responsiblesSnapshot;
  }

  async function saveResponsiblesSelection(proposalId: string, silent = false): Promise<boolean> {
    if (hasResponsiblesInconsistentState(proposalId)) {
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
    sameAsCapturing = true;
    sellerBrokerSearchQuery = '';
    sellerBrokerOptions = [];
    selectedSellerBrokerId = null;
    selectedSellerBrokerName = '';
    sellerBrokerError = '';
    clearSellerSearchDebounce();
    clearSellerBrokerBlurTimeout();
    sellerBrokerDropdownOpen = false;
  }

  function syncProposalInState(proposalId: string, patch: Partial<NegotiationItem>) {
    propertyRequests = propertyRequests.map((item) =>
      item.id === proposalId ? { ...item, ...patch } : item
    );
    if (selectedProposal?.id === proposalId) {
      selectedProposal = { ...selectedProposal, ...patch };
    }
  }

  function getSelectedProposalDefaultSameBroker(item: NegotiationItem): boolean {
    return item.sellingBrokerId == null || idsMatch(item.sellingBrokerId, item.capturingBrokerId);
  }

  function normalizeBrokerOption(item: unknown): ApprovedBrokerOption | null {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    const id = raw.id ?? raw.brokerId ?? raw.userId;
    if (id == null || (typeof id !== 'string' && typeof id !== 'number')) {
      return null;
    }
    const rawName = raw.name ?? raw.fullName ?? raw.nome;
    const name = typeof rawName === 'string' && rawName.trim().length > 0
      ? rawName.trim()
      : `Corretor #${id}`;
    const creci = typeof raw.creci === 'string' ? raw.creci : null;
    return { id, name, creci };
  }

  function extractSignedDocumentId(payload: unknown): number | null {
    const sources: unknown[] = [payload];
    if (payload && typeof payload === 'object') {
      const nested = (payload as Record<string, unknown>).data;
      sources.push(nested);
    }

    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;
      const record = source as Record<string, unknown>;
      const candidate =
        record.signedDocumentId ??
        record.signed_document_id ??
        record.signedProposalDocumentId ??
        record.documentId ??
        record.document_id;
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) return parsed;
      }
    }

    return null;
  }

  function extractSignedDocumentFileName(payload: unknown): string | null {
    const sources: unknown[] = [payload];
    if (payload && typeof payload === 'object') {
      sources.push((payload as Record<string, unknown>).data);
    }

    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;
      const record = source as Record<string, unknown>;
      const candidate =
        record.signedDocumentFileName ??
        record.signed_document_file_name ??
        record.fileName ??
        record.file_name ??
        record.originalFileName ??
        record.original_file_name;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    return null;
  }

  function clearPropertyModalState() {
    showPropertyModal = false;
    selectedProperty = null;
    propertyRequests = [];
    propertyPage = 1;
    propertyTotalItems = 0;
    propertyTotalPages = 1;
  }

  async function fetchSummary() {
    summaryLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', selectedFilterStatus());
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
      params.set('status', selectedFilterStatus());
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
    sameAsCapturing = getSelectedProposalDefaultSameBroker(item);
    if (sameAsCapturing) {
      selectedSellerBrokerId = item.capturingBrokerId ?? null;
      selectedSellerBrokerName = item.capturingBrokerName ?? item.brokerName ?? '';
    } else {
      selectedSellerBrokerId = item.sellingBrokerId ?? null;
      selectedSellerBrokerName = item.sellingBrokerName ?? '';
      sellerBrokerSearchQuery = selectedSellerBrokerName;
      if (selectedSellerBrokerId != null && selectedSellerBrokerName) {
        sellerBrokerOptions = [{ id: selectedSellerBrokerId, name: selectedSellerBrokerName }];
      }
    }
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

  async function searchApprovedBrokers(query: string) {
    searchingSellerBrokers = true;
    try {
      const params = new URLSearchParams();
      params.set('status', 'approved');
      params.set('search', query);
      params.set('page', '1');
      params.set('limit', '10');
      const response = await api.get<PaginatedResponse<Record<string, unknown>>>(
        `/admin/brokers?${params.toString()}`
      );
      const options = Array.isArray(response?.data)
        ? response.data.map((item) => normalizeBrokerOption(item)).filter((item): item is ApprovedBrokerOption => item != null)
        : [];

      if (
        selectedSellerBrokerId != null &&
        selectedSellerBrokerName &&
        !options.some((item) => idsMatch(item.id, selectedSellerBrokerId))
      ) {
        sellerBrokerOptions = [
          { id: selectedSellerBrokerId, name: selectedSellerBrokerName },
          ...options,
        ];
      } else {
        sellerBrokerOptions = options;
      }
    } catch (error) {
      console.error('Erro ao buscar corretores aprovados:', error);
      sellerBrokerOptions = [];
      toast.error(normalizeErrorMessage(error, 'Não foi possível buscar corretores aprovados.'));
    } finally {
      searchingSellerBrokers = false;
    }
  }

  function onSellerBrokerSearchInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement | null;
    sellerBrokerSearchQuery = input?.value ?? '';
    sellerBrokerError = '';
    sellerBrokerDropdownOpen = true;

    const typedQuery = sellerBrokerSearchQuery.trim();
    const selectedName = selectedSellerBrokerName.trim();
    if (
      selectedSellerBrokerId != null &&
      (!selectedName || typedQuery.localeCompare(selectedName, 'pt-BR', { sensitivity: 'accent' }) !== 0)
    ) {
      selectedSellerBrokerId = null;
      selectedSellerBrokerName = '';
    }

    clearSellerSearchDebounce();
    if (sameAsCapturing) return;

    const query = typedQuery;
    if (query.length < 2) {
      sellerBrokerOptions = [];
      searchingSellerBrokers = false;
      return;
    }

    sellerSearchDebounce = setTimeout(() => {
      void searchApprovedBrokers(query);
    }, 300);
  }

  function onSameAsCapturingChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement | null;
    const checked = input?.checked ?? false;
    sameAsCapturing = checked;
    sellerBrokerError = '';
    clearSellerSearchDebounce();
    clearSellerBrokerBlurTimeout();
    sellerBrokerOptions = [];
    searchingSellerBrokers = false;
    sellerBrokerDropdownOpen = false;

    if (checked) {
      selectedSellerBrokerId = selectedProposal?.capturingBrokerId ?? null;
      selectedSellerBrokerName = selectedProposal?.capturingBrokerName ?? selectedProposal?.brokerName ?? '';
      sellerBrokerSearchQuery = '';
      return;
    }

    const currentSellingId = selectedProposal?.sellingBrokerId ?? null;
    const hasDifferentSellingBroker =
      currentSellingId != null && !idsMatch(currentSellingId, selectedProposal?.capturingBrokerId ?? null);
    if (hasDifferentSellingBroker) {
      selectedSellerBrokerId = currentSellingId;
      selectedSellerBrokerName = selectedProposal?.sellingBrokerName ?? '';
      sellerBrokerSearchQuery = selectedSellerBrokerName;
      if (selectedSellerBrokerName) {
        sellerBrokerOptions = [{ id: currentSellingId, name: selectedSellerBrokerName }];
      }
    } else {
      selectedSellerBrokerId = null;
      selectedSellerBrokerName = '';
      sellerBrokerSearchQuery = '';
    }
  }

  function selectSellerBroker(option: ApprovedBrokerOption) {
    selectedSellerBrokerId = option.id;
    selectedSellerBrokerName = option.name;
    sellerBrokerSearchQuery = option.name;
    sellerBrokerError = '';
    sellerBrokerDropdownOpen = false;
  }

  function clearSellerBrokerSelection() {
    selectedSellerBrokerId = null;
    selectedSellerBrokerName = '';
    sellerBrokerSearchQuery = '';
    sellerBrokerOptions = [];
    sellerBrokerError = '';
    searchingSellerBrokers = false;
    clearSellerSearchDebounce();
    sellerBrokerDropdownOpen = false;
  }

  function openSellerBrokerDropdown() {
    if (sameAsCapturing) return;
    clearSellerBrokerBlurTimeout();
    sellerBrokerDropdownOpen = true;
  }

  function scheduleCloseSellerBrokerDropdown() {
    clearSellerBrokerBlurTimeout();
    sellerBrokerBlurTimeout = setTimeout(() => {
      sellerBrokerDropdownOpen = false;
    }, 120);
  }

  async function saveSellingBrokerSelection(proposalId: string): Promise<boolean> {
    if (!selectedProposal) return false;
    if (!sameAsCapturing && selectedSellerBrokerId == null) {
      sellerBrokerError = 'Selecione um corretor vendedor para aprovar.';
      toast.error('Selecione um corretor vendedor para aprovar.');
      return false;
    }

    savingSellerBroker = true;
    try {
      const payload = {
        sameAsCapturing,
        sellingBrokerId: sameAsCapturing ? null : selectedSellerBrokerId,
      };
      await api.put(`/admin/negotiations/${proposalId}/selling-broker`, payload);
      syncProposalInState(proposalId, {
        sellingBrokerId: payload.sellingBrokerId,
        sellingBrokerName: sameAsCapturing
          ? selectedProposal.capturingBrokerName ?? selectedProposal.brokerName ?? null
          : selectedSellerBrokerName || selectedProposal.sellingBrokerName || null,
      });
      return true;
    } catch (error) {
      console.error('Erro ao salvar corretor vendedor:', error);
      toast.error(normalizeErrorMessage(error, 'Não foi possível salvar o corretor vendedor.'));
      return false;
    } finally {
      savingSellerBroker = false;
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
    if (hasResponsiblesInconsistentState(proposalId)) {
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
            Atualizado em
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
                    {formatCurrency(item.topProposal.value)} - {formatDate(item.topProposal.createdAt)}
                  </div>
                {:else}
                  -
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.updatedAt)}
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
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Comprador</p>
                    <p class="text-sm text-gray-900 dark:text-gray-100">{readClientName(item)}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{readClientCpf(item)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Usuário</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{getBrokerName(item)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Valor</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{formatDate(item.validityDate)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Data</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{formatDate(item.updatedAt)}</p>
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

  {#if showDetailModal && selectedProposal}
  <div
    class="fixed inset-0 z-[60] flex max-h-dvh items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeDetailModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="my-auto flex w-full max-w-2xl flex-col rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 sm:max-h-[90vh]">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Análise da proposta</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedProposal.propertyCode
              ? `${selectedProposal.propertyCode}`
              : `#${selectedProposal.propertyId}`}
            {#if selectedProposal.propertyTitle}
              - {selectedProposal.propertyTitle}
            {/if}
          </p>
        </div>
        <Button variant="outline" size="sm" title="Fechar modal" className="px-2" on:click={() => closeDetailModal()} disabled={isApproveBusy()}>
          <X class="h-4 w-4" />
        </Button>
      </div>

      <div class="min-h-0 max-h-[min(70vh,32rem)] flex-1 overflow-y-auto pr-1 sm:max-h-[min(65vh,40rem)]">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Comprador</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{readClientName(selectedProposal)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{readClientCpf(selectedProposal)}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formatDate(selectedProposal.validityDate)}
            </p>
          </div>
        </div>

        <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Condições de pagamento</p>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            {#each paymentLines(selectedProposal.payment) as item (item.label)}
              <div class="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <span class="font-semibold">{item.label}:</span> {formatCurrency(item.value)}
              </div>
            {/each}
          </div>
          <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Valor total: {formatCurrency(selectedProposal.value)}
          </p>
        </div>

        <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">PDF assinado</p>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {#if selectedProposal.signedDocumentId != null}
              PDF assinado anexado.
            {:else}
              Nenhum PDF assinado anexado.
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {#if selectedProposal.signedDocumentId != null}
              Você pode visualizar, excluir ou substituir.
            {:else}
              Envie um PDF assinado para habilitar a aprovação.
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {signedPdfDisplayName()}
          </p>

          {#if requiresSignedPdf()}
            <p class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              Para aprovar, é obrigatório anexar um PDF assinado.
            </p>
          {/if}

          <div class="mt-3">
            <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
              O envio inicia automaticamente ao selecionar o arquivo.
            </p>
            {#key signedPdfInputRenderKey}
              <input
                bind:this={signedPdfFileInput}
                type="file"
                accept="application/pdf"
                on:change={handleSignedPdfChange}
                class="sr-only"
              />
            {/key}
            <div class="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploadingSignedPdf || deletingSignedPdf || processingAction}
                on:click={() => signedPdfFileInput?.click()}
              >
                {#if uploadingSignedPdf}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {selectedProposal?.signedDocumentId != null ? 'Substituir PDF' : 'Enviar PDF'}
              </Button>
            </div>
            {#if uploadingSignedPdf}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Enviando PDF assinado...</p>
            {/if}
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              on:click={deleteSignedPdf}
              disabled={deletingSignedPdf || uploadingSignedPdf || processingAction || selectedProposal.signedDocumentId == null}
            >
              {#if deletingSignedPdf}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Excluir PDF
            </Button>
            <Button
              variant="outline"
              on:click={viewSignedPdf}
              disabled={viewingPdf || uploadingSignedPdf || deletingSignedPdf || selectedProposal.signedDocumentId == null}
            >
              {#if viewingPdf}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Visualizar PDF Assinado
            </Button>
          </div>
        </div>

        <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Responsável por acompanhar o processo
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Selecione até 5 pessoas para acompanhar esta proposta.
          </p>

          <div class="mt-3 space-y-2">
            <div class="relative">
              <input
                type="text"
                value={responsibleSearchQuery}
                on:focus={openResponsibleDropdown}
                on:blur={scheduleCloseResponsibleDropdown}
                on:input={onResponsibleSearchInput}
                placeholder="Digite ao menos 2 letras para buscar responsável"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                disabled={responsiblesLoading || savingResponsibles}
              />

              {#if responsibleDropdownOpen}
                <div class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {#if responsibleSearchQuery.trim().length < 2}
                    <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      Digite ao menos 2 letras para buscar.
                    </p>
                  {:else if searchingResponsibles}
                    <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Buscando responsáveis...</p>
                  {:else if responsibleOptions.length === 0}
                    <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum responsável encontrado.</p>
                  {:else}
                    {#each responsibleOptions as option (`${option.id}`)}
                      <button
                        type="button"
                        class="flex w-full items-center justify-between border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
                        on:click={() => addResponsible(option)}
                      >
                        <span>{option.name}</span>
                        {#if option.email}
                          <span class="text-xs text-gray-500 dark:text-gray-400">{option.email}</span>
                        {/if}
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>

            {#if responsiblesLoading}
              <p class="text-xs text-gray-500 dark:text-gray-400">Carregando responsáveis...</p>
            {/if}
            {#if responsiblesLoadError}
              <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <p>{responsiblesLoadError}</p>
                {#if selectedProposal}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    on:click={() => fetchResponsibles(selectedProposal.id)}
                    disabled={responsiblesLoading || savingResponsibles || processingAction}
                  >
                    {#if responsiblesLoading}
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {/if}
                    Tentar novamente
                  </Button>
                {/if}
              </div>
            {/if}

            {#if selectedResponsibles.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each selectedResponsibles as responsible (responsible.id)}
                  <span class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {responsible.name}
                    <button
                      type="button"
                      aria-label={`Remover ${responsible.name}`}
                      class="text-gray-500 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-300"
                      on:click={() => removeResponsible(responsible.id)}
                      disabled={savingResponsibles}
                    >
                      ×
                    </button>
                  </span>
                {/each}
              </div>
            {:else}
              <p class="text-xs text-gray-500 dark:text-gray-400">Nenhum responsável selecionado.</p>
            {/if}

            <p class="text-xs text-gray-500 dark:text-gray-400">
              {selectedResponsibles.length}/5 responsáveis selecionados.
            </p>
            {#if responsibleError}
              <p class="text-xs font-medium text-red-600 dark:text-red-400">{responsibleError}</p>
            {/if}
            <div>
              <Button
                size="sm"
                variant="outline"
                on:click={() => selectedProposal && saveResponsiblesSelection(selectedProposal.id)}
                disabled={savingResponsibles || responsiblesLoading || hasResponsiblesInconsistentState(selectedProposal?.id ?? null) || !hasResponsibleChanges()}
              >
                {#if savingResponsibles}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Salvar responsáveis
              </Button>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <label
            for="reject-reason"
            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Motivo da rejeição (obrigatório para rejeitar)
          </label>
          <textarea
            id="reject-reason"
            bind:value={rejectReason}
            maxlength="500"
            rows={4}
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            placeholder="Descreva o motivo da rejeição..."
          ></textarea>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        {#if isSignedProposal(selectedProposal)}
          <Button
            variant="destructive"
            className="bg-red-600 text-white hover:bg-red-700"
            on:click={rejectSelected}
            disabled={isApproveBusy()}
          >
            {#if processingAction}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Rejeitar
          </Button>
          <Button
            variant="outline"
            className="bg-green-600 text-white hover:bg-green-700"
            on:click={approveSelected}
            disabled={isApproveBusy() || requiresSignedPdf() || hasResponsiblesInconsistentState(selectedProposal?.id ?? null)}
          >
            {#if processingAction || savingResponsibles}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Aprovar
          </Button>
        {:else}
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Aprovação/Rejeição disponível apenas para propostas assinadas.
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}

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
