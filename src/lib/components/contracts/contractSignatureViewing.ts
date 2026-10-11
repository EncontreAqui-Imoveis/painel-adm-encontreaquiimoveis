import type { ContractItem } from './types';

/** Temporary UI evidence only; authorization and signature events remain on the server. */
export type ContractSignatureViewingEvidence = {
  contractId: string;
  signedVersionId: number;
  documentId: number;
  draftRevisionId: number;
};

export function matchesSignatureViewingContext(
  contract: ContractItem | null,
  evidence: ContractSignatureViewingEvidence | null
): boolean {
  const version = contract?.signatures?.currentVersion;
  const document = version && contract?.documents?.find((doc) => doc.id === version.documentId
    && doc.documentType === 'contrato_assinado' && doc.metadata?.contractId === contract.id);
  return !!contract && !!evidence && !!version && contract.status === 'AWAITING_SIGNATURES'
    && !!document?.downloadUrl
    && evidence.contractId === contract.id && evidence.signedVersionId === version.id
    && evidence.documentId === version.documentId && evidence.draftRevisionId === version.draftRevisionId;
}
