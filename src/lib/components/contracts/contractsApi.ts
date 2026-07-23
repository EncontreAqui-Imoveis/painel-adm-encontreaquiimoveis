import { api } from '$lib/apiClient';

export type ContractStatus = 'AWAITING_DOCS' | 'IN_DRAFT' | 'AWAITING_SIGNATURES' | 'FINALIZED';

export type ContractListItem = {
  id: string;
  status: ContractStatus;
};

export type ContractDetailResponse<TContract> = {
  contract?: TContract;
  documents?: unknown[];
};

function readPayload<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return ((response as { data?: T }).data ?? {}) as T;
  }
  return (response ?? {}) as T;
}

function readListResponse<T>(response: unknown): { items: T[]; total: number } {
  if (!response || typeof response !== 'object') {
    return { items: [], total: 0 };
  }

  const maybeAxios = response as { data?: unknown; total?: unknown };
  const raw = maybeAxios.data ?? response;

  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      total: Number(maybeAxios.total ?? raw.length),
    };
  }

  if (raw && typeof raw === 'object') {
    const payload = raw as { data?: unknown; total?: unknown };
    const items = Array.isArray(payload.data) ? (payload.data as T[]) : [];
    return {
      items,
      total: Number(payload.total ?? maybeAxios.total ?? items.length),
    };
  }

  return { items: [], total: Number(maybeAxios.total ?? 0) };
}

export async function listContracts<TContract extends ContractListItem>(
  status: ContractStatus,
  page: number,
  limit: number,
  search?: string
): Promise<{ items: TContract[]; total: number }> {
  const params = new URLSearchParams({
    status,
    page: String(page),
    limit: String(limit),
  });
  const normalizedSearch = String(search ?? '').trim();
  if (normalizedSearch) {
    params.set('search', normalizedSearch);
  }
  const response = await api.get<{ data?: TContract[]; total?: number }>(
    `/admin/contracts?${params.toString()}`
  );
  return readListResponse<TContract>(response);
}

export async function getContractDetails<TContract>(
  contractId: string
): Promise<ContractDetailResponse<TContract>> {
  const response = await api.get(`/contracts/${contractId}`);
  if (response && typeof response === 'object' && 'data' in response) {
    const maybeAxios = response as { data?: unknown };
    const raw = maybeAxios.data ?? response;
    if (raw && typeof raw === 'object' && ('contract' in (raw as object) || 'documents' in (raw as object))) {
      return raw as ContractDetailResponse<TContract>;
    }
  }
  return readPayload<ContractDetailResponse<TContract>>(response);
}

export async function saveContractPartyInfo<TPayload extends { side: 'seller' | 'buyer' }>(
  contractId: string,
  payload: TPayload
): Promise<void> {
  await api.put(`/admin/contracts/${contractId}/data`, payload);
}
