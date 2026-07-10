import { api, apiClient } from '$lib/apiClient';

export type MatrixUploadContext = {
  documentType: string;
  side: 'seller' | 'buyer';
  existingDocumentType?: string | null;
};

export type PreviewDownloadResult = {
  blob: Blob;
  downloadName: string;
};

export type ContractApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'APPROVED_WITH_RES'
  | 'REJECTED'
  | 'NOT_APPLICABLE';

function readPayload<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return ((response as { data?: T }).data ?? {}) as T;
  }
  return (response ?? {}) as T;
}

export async function uploadMatrixDocument(
  contractId: string,
  file: File,
  context: MatrixUploadContext,
  documentCategory: string
): Promise<void> {
  const form = new FormData();
  form.append('documentType', context.existingDocumentType?.trim() || context.documentType);
  form.append('documentCategory', documentCategory);
  form.append('side', context.side);
  form.append('file', file);
  await apiClient.post(`/contracts/${contractId}/documents`, form);
}

export async function deleteContractDocument(contractId: string, documentId: number): Promise<void> {
  await api.delete(`/contracts/${contractId}/documents/${documentId}`);
}

export async function deleteFinalizedContractDocument(
  contractId: string,
  documentId: number
): Promise<void> {
  await api.delete(`/admin/contracts/${contractId}/finalized-docs/${documentId}`);
}

export async function uploadSignedDocument(
  contractId: string,
  documentType: string,
  file: File
): Promise<void> {
  const form = new FormData();
  form.append('documentType', documentType);
  form.append('file', file);
  await apiClient.post(`/admin/contracts/${contractId}/signed-docs`, form);
}

export async function uploadFinalizedContractDocument(
  contractId: string,
  documentType: string,
  file: File,
  side?: 'seller' | 'buyer'
): Promise<void> {
  const form = new FormData();
  form.append('documentType', documentType);
  if (side) {
    form.append('side', side);
  }
  form.append('file', file);
  await apiClient.post(`/admin/contracts/${contractId}/finalized-docs`, form);
}

export async function submitContractDraft(
  contractId: string,
  file: File | null,
  reuseCurrentDraft: boolean
): Promise<void> {
  const form = new FormData();
  if (file) {
    form.append('file', file);
  }
  if (reuseCurrentDraft) {
    form.append('reuseCurrentDraft', 'true');
  }
  await apiClient.post(`/admin/contracts/${contractId}/draft`, form);
}

export async function finalizeContract(
  contractId: string,
  commissionData: Record<string, unknown>
): Promise<void> {
  await api.post(`/admin/contracts/${contractId}/finalize`, {
    commission_data: commissionData,
  });
}

export async function deleteFinalizedContractById(contractId: string): Promise<void> {
  await api.delete(`/admin/contracts/${contractId}`);
}

export async function reopenFinalizedContractById(contractId: string): Promise<{
  message?: string;
  data?: { message?: string };
}> {
  const response = await api.put(`/admin/contracts/${contractId}/reopen`, {});
  return readPayload<{ message?: string; data?: { message?: string } }>(response);
}

export async function transitionContractById(
  contractId: string,
  direction: 'previous' | 'next'
): Promise<void> {
  await api.put(`/admin/contracts/${contractId}/transition`, { direction });
}

export async function evaluateContractSide(
  contractId: string,
  side: 'seller' | 'buyer',
  status: ContractApprovalStatus,
  reason?: string
): Promise<{ movedToDraft?: boolean }> {
  const response = await api.put<{ movedToDraft?: boolean }>(
    `/admin/contracts/${contractId}/evaluate-side`,
    {
      side,
      status,
      reason,
    }
  );
  return readPayload<{ movedToDraft?: boolean }>(response);
}

export async function reviewContractDocument(
  contractId: string,
  documentId: number,
  status: 'APPROVED' | 'REJECTED',
  reason?: string
): Promise<void> {
  await api.patch(`/contracts/${contractId}/documents/${documentId}/status`, {
    status,
    ...(reason ? { description: reason } : {}),
  });
}

export async function downloadContractDocumentsZip(contractId: string): Promise<Blob> {
  const response = await apiClient.get(`/admin/contracts/${contractId}/documents.zip`, {
    responseType: 'blob',
  });
  return response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: 'application/zip' });
}

export async function downloadContractDocumentBlob(url: string): Promise<{
  blob: Blob;
  headers: Record<string, unknown>;
}> {
  const response = await apiClient.get(url, {
    responseType: 'blob',
  });
  return {
    blob:
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/octet-stream' }),
    headers: (response.headers ?? {}) as Record<string, unknown>,
  };
}

export async function downloadContractDocumentByUrl(
  url: string
): Promise<PreviewDownloadResult> {
  const response = await downloadContractDocumentBlob(url);
  const dispositionHeader = String(
    response.headers?.['content-disposition'] ?? response.headers?.['Content-Disposition'] ?? ''
  );
  const utfMatch = dispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
  const basicMatch = dispositionHeader.match(/filename=\"?([^\";]+)\"?/i);
  const resolvedFromHeader = utfMatch?.[1] ? decodeURIComponent(utfMatch[1]) : basicMatch?.[1];

  return {
    blob: response.blob,
    downloadName: resolvedFromHeader || 'documento.pdf',
  };
}
