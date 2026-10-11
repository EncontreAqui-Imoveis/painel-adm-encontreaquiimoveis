import type { ContractItem } from './types';

// The endpoint has no expected-revision field; this context protects local forms and responses.
export function draftPublicationContext(contract: ContractItem | null): string | null {
  if (!contract || contract.status !== 'AWAITING_SIGNATURES') return null;
  const version = contract.signatures?.currentVersion;
  return JSON.stringify([contract.id, contract.status, contract.draftReview?.revisionId ?? null,
    contract.draftReview?.documentId ?? null, version?.id ?? null, version?.documentId ?? null,
    version?.draftRevisionId ?? null]);
}

export function newDraftPdfError(file: File | null): string | null {
  if (!file) return 'Selecione um novo PDF da minuta.';
  if (file.size === 0 || file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) {
    return 'Selecione um PDF não vazio para a nova minuta.';
  }
  return null;
}
