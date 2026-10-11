import type { ContractItem } from './types';
import type { ContractSignatureViewingEvidence } from './contractSignatureViewing';

// These identifiers describe a form's scope; they are not proof that the PDF was viewed.
export type SignedReplacementContext = ContractSignatureViewingEvidence;

export type SignedReplacementDeclaration = { replacementReason: string } & (
  { equivalenceDeclared: true; contractContentUnchanged?: never }
  | { contractContentUnchanged: true; equivalenceDeclared?: never }
);

export function currentSignedReplacementContext(contract: ContractItem | null): SignedReplacementContext | null {
  const version = contract?.signatures?.currentVersion;
  if (!contract || contract.status !== 'AWAITING_SIGNATURES' || !version
    || !contract.documents?.some((doc) => doc.id === version.documentId
      && doc.documentType === 'contrato_assinado' && doc.metadata?.contractId === contract.id)) return null;
  return { contractId: contract.id, signedVersionId: version.id, documentId: version.documentId,
    draftRevisionId: version.draftRevisionId };
}

export function matchesSignedReplacementContext(contract: ContractItem | null, context: SignedReplacementContext): boolean {
  const current = currentSignedReplacementContext(contract);
  return !!current && current.contractId === context.contractId && current.signedVersionId === context.signedVersionId
    && current.documentId === context.documentId && current.draftRevisionId === context.draftRevisionId;
}

export function signedReplacementError(file: File | null, declaration?: SignedReplacementDeclaration): string | null {
  if (!file || file.size === 0 || file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) {
    return 'Selecione um PDF válido para substituir o contrato assinado.';
  }
  const reason = declaration?.replacementReason?.trim();
  if (!reason || new TextEncoder().encode(reason).byteLength > 65535) return 'Informe uma justificativa válida para a substituição.';
  // Never coerce multipart strings or accept both declarations at once.
  if (!declaration || !((declaration.equivalenceDeclared === true && declaration.contractContentUnchanged === undefined)
    || (declaration.contractContentUnchanged === true && declaration.equivalenceDeclared === undefined))) {
    return 'Declare explicitamente a equivalência ou que o conteúdo contratual permanece inalterado.';
  }
  return null;
}
