export type PaymentBreakdown = {
  dinheiro: number;
  permuta: number;
  financiamento: number;
  outros: number;
};

export type NegotiationItem = {
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
  createdAt?: string | null;
  validityDate?: string | null;
  payment?: PaymentBreakdown | null;
  updatedAt?: string | null;
  signedDocumentId?: number | null;
  signedDocumentFileName?: string | null;
  capturingBrokerId?: string | number | null;
  sellingBrokerId?: string | number | null;
};

export type ResponsibleOption = {
  id: number;
  name: string;
  email?: string | null;
};

export type ResponsibleSelectionState = {
  loading: boolean;
  loadError: string;
  loadedProposalId: string | null;
  snapshot: string;
};

export type ProposalFilterKey = 'sent' | 'signed' | 'refused';

export const PROPOSAL_FILTERS: Array<{ key: ProposalFilterKey; label: string; status: string }> = [
  { key: 'sent', label: 'Propostas Enviadas', status: 'PROPOSAL_UNSIGNED' },
  { key: 'signed', label: 'Propostas Assinadas', status: 'PROPOSAL_SIGNED' },
  { key: 'refused', label: 'Propostas Recusadas', status: 'REFUSED' },
];

export type PaginatedResponse<T> = {
  data?: T[];
  page?: number;
  limit?: number;
  total?: number;
  propertyId?: number;
};

export function normalizeClient(item: NegotiationItem | null): { name: string; cpf: string } {
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

export function readClientName(item: NegotiationItem | null): string {
  return normalizeClient(item).name;
}

export function readClientCpf(item: NegotiationItem | null): string {
  return normalizeClient(item).cpf;
}

export function getBrokerName(item: NegotiationItem): string {
  return item.brokerName ?? item.capturingBrokerName ?? '-';
}

export function getStatusLabel(status?: string, internalStatus?: string): string {
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

export function getStatusBadgeClass(status?: string, internalStatus?: string): string {
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

export function formatCurrency(value?: number | null): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 'R$ 0,00';
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export function paymentLines(payment?: PaymentBreakdown | null) {
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

export function normalizeErrorMessage(error: unknown, fallback: string): string {
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

export function isSignedProposal(item: NegotiationItem | null): boolean {
  if (!item) return false;
  if (item.signedDocumentId != null) return true;
  const value = String(item?.status ?? item?.internalStatus ?? '').trim().toUpperCase();
  return value === 'PROPOSAL_SIGNED';
}

export function selectedFilterStatus(filterKey: ProposalFilterKey): string {
  return PROPOSAL_FILTERS.find((item) => item.key === filterKey)?.status ?? 'PROPOSAL_SIGNED';
}

export function responsibleSnapshot(list: ResponsibleOption[]): string {
  return [...list]
    .map((item) => item.id)
    .sort((a, b) => a - b)
    .join(',');
}

export function hasResponsiblesInconsistentState(
  proposalId: string | null | undefined,
  state: ResponsibleSelectionState
): boolean {
  if (!proposalId) return true;
  if (state.loading) return true;
  if (state.loadError.trim().length > 0) return true;
  return state.loadedProposalId !== proposalId;
}

export function responsiblesBlockApproval(
  proposal: NegotiationItem | null,
  state: ResponsibleSelectionState
): boolean {
  if (!proposal) return true;
  if (proposal.signedDocumentId != null) return false;
  return hasResponsiblesInconsistentState(proposal.id, state);
}

export function hasResponsibleChanges(
  selectedResponsibles: ResponsibleOption[],
  state: ResponsibleSelectionState,
  proposalId: string | null | undefined
): boolean {
  if (hasResponsiblesInconsistentState(proposalId, state)) return true;
  return responsibleSnapshot(selectedResponsibles) !== state.snapshot;
}

export function canSaveResponsiblesSelection(
  proposalId: string | null | undefined,
  selectedResponsibles: ResponsibleOption[],
  state: ResponsibleSelectionState
): boolean {
  if (hasResponsiblesInconsistentState(proposalId, state)) return false;
  return selectedResponsibles.length <= 5;
}

export function normalizeResponsibleOption(item: unknown): ResponsibleOption | null {
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

export function extractSignedDocumentId(payload: unknown): number | null {
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

export function extractSignedDocumentFileName(payload: unknown): string | null {
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
