import { api } from '$lib/apiClient';
import type { BrokerFormState } from '$lib/components/broker/brokerReviewHelpers';

export type BrokerStatusActionResult = {
  status: string;
  role: string;
};

function readResponsePayload<T extends Record<string, unknown>>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return ((response as { data?: T }).data ?? {}) as T;
  }
  return (response ?? {}) as T;
}

export async function fetchBrokerDetailById(brokerId: number) {
  const response = await api.get(`/admin/brokers/${brokerId}`);
  return readResponsePayload(response);
}

export async function updateBrokerStatusById(
  brokerId: number,
  newStatus: 'approved' | 'rejected'
): Promise<BrokerStatusActionResult> {
  const response = await api.patch(`/admin/brokers/${brokerId}/status`, {
    status: newStatus,
  });
  const payload = readResponsePayload<{ role?: string; status?: string }>(response);
  const resolvedStatus = String(payload?.status ?? newStatus).trim() || newStatus;
  const resolvedRole = payload?.role ?? (resolvedStatus === 'approved' ? 'broker' : 'client');
  return { status: resolvedStatus, role: resolvedRole };
}

export async function demoteBrokerToClientById(brokerId: number): Promise<BrokerStatusActionResult> {
  const response = await api.post(`/admin/clients/${brokerId}/demote-broker`, {});
  const payload = readResponsePayload<{ role?: string; status?: string }>(response);
  const resolvedStatus = String(payload?.status ?? 'rejected').trim() || 'rejected';
  const resolvedRole = payload?.role ?? 'client';
  return { status: resolvedStatus, role: resolvedRole };
}

export async function saveBrokerById(
  brokerId: number,
  brokerForm: BrokerFormState,
  currentStatus: string,
  fallbackStatus: string
): Promise<{ status: string }> {
  const numberDigits = brokerForm.number.replace(/\D+/g, '');
  const resolvedCep = brokerForm.semCep ? '' : brokerForm.cep.replace(/\D+/g, '');
  const response = await api.put(`/admin/brokers/${brokerId}`, {
    name: brokerForm.name.trim(),
    email: brokerForm.email.trim(),
    phone: brokerForm.phone.trim(),
    street: brokerForm.street.trim(),
    number: brokerForm.semNumero ? null : (numberDigits || null),
    complement: brokerForm.complement.trim(),
    bairro: brokerForm.bairro.trim(),
    city: brokerForm.city.trim(),
    state: brokerForm.state.trim(),
    cep: resolvedCep || null,
    sem_numero: brokerForm.semNumero ? 1 : 0,
    sem_cep: brokerForm.semCep ? 1 : 0,
    creci: brokerForm.creci.trim(),
  });
  const payload = readResponsePayload<{ status?: string }>(response);
  const resolvedStatus = String(payload?.status ?? currentStatus ?? fallbackStatus).trim();
  return { status: resolvedStatus || fallbackStatus };
}

export async function reauthAndDeleteBrokerById(brokerId: number, password: string): Promise<string> {
  const response = await api.post<{ reauthToken: string }>('/admin/reauth', {
    password,
  });
  await api.delete(`/admin/brokers/${brokerId}`, {
    headers: {
      'X-Admin-Reauth': response.reauthToken,
    },
  });
  return response.reauthToken;
}

export async function deleteBrokerDocumentById(brokerId: number, docType: string): Promise<void> {
  await api.delete(`/admin/brokers/${brokerId}/documents/${docType}`);
}

export async function uploadBrokerDocumentById(
  brokerId: number,
  docType: string,
  file: File
): Promise<void> {
  const formData = new FormData();
  formData.append(docType, file);
  await api.post(`/admin/brokers/${brokerId}/documents`, formData);
}

export async function lookupCepAddress(value: string): Promise<{
  street: string | null;
  bairro: string | null;
  city: string | null;
  state: string | null;
  errorMessage: string | null;
}> {
  const digits = value.replace(/\D+/g, '');
  if (digits.length !== 8) {
    return { street: null, bairro: null, city: null, state: null, errorMessage: null };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) throw new Error('Falha ao consultar CEP.');
    const data = await response.json();
    if (data?.erro) {
      return { street: null, bairro: null, city: null, state: null, errorMessage: 'CEP não encontrado.' };
    }
    return {
      street: data?.logradouro ? String(data.logradouro) : null,
      bairro: data?.bairro ? String(data.bairro) : null,
      city: data?.localidade ? String(data.localidade) : null,
      state: data?.uf ? String(data.uf) : null,
      errorMessage: null,
    };
  } catch (error) {
    console.error('Erro ao consultar CEP:', error);
    return { street: null, bairro: null, city: null, state: null, errorMessage: 'CEP não encontrado.' };
  }
}
