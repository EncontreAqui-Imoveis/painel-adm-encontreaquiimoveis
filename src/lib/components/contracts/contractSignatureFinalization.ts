import type { ContractItem, ContractSignatureStatus } from './types';
import { contractSideLabel } from './contractsDisplayHelpers';
import { resolveApiErrorMessage } from './contractsFormHelpers';

type Side = 'seller' | 'buyer';
export type SignatureFinalizationState =
  | { status: 'loading' | 'unavailable' | 'outsideStage' }
  | { status: 'pending' | 'complete'; currentVersionId: number | null;
      seller: ContractSignatureStatus['status']; buyer: ContractSignatureStatus['status']; pendingSides: Side[] };

export function signatureSideLabel(contract: ContractItem, side: Side): string {
  return contract.dealType === 'sale' || contract.dealType === 'rent'
    ? contractSideLabel(contract, side) : `Parte ${side}`;
}

export function signatureFinalizationState(contract: ContractItem | null,
  detailsState: 'loading' | 'ready' | 'error'): SignatureFinalizationState {
  if (!contract || contract.status !== 'AWAITING_SIGNATURES') return { status: 'outsideStage' };
  if (detailsState === 'loading') return { status: 'loading' };
  const state = contract.signatures;
  if (detailsState !== 'ready' || !state) return { status: 'unavailable' };
  if (state.currentVersion === null) return { status: 'pending', currentVersionId: null,
    seller: 'PENDING', buyer: 'PENDING', pendingSides: ['seller', 'buyer'] };
  const version = state.currentVersion;
  const statuses = ['PENDING', 'CONFIRMED', 'PRESERVED'];
  if (!version || ![version.id, version.documentId, version.draftRevisionId].every((id) => Number.isSafeInteger(id) && id > 0)
    || !statuses.includes(state.seller?.status) || !statuses.includes(state.buyer?.status)) return { status: 'unavailable' };
  // The backend resolves validity and preservation chains. Do not reinterpret historical events here.
  const pendingSides = (['seller', 'buyer'] as const).filter((side) => state[side].status === 'PENDING');
  return { status: pendingSides.length ? 'pending' : 'complete', currentVersionId: version.id,
    seller: state.seller.status, buyer: state.buyer.status, pendingSides };
}

export function finalizationErrorMessage(error: unknown, contract: ContractItem): string {
  const source = error && typeof error === 'object'
    ? error as { response?: { data?: Record<string, unknown> } } : null;
  const data = source?.response?.data;
  let message: string | null = null;
  if (data?.code === 'CONTRACT_CURRENT_SIGNED_VERSION_REQUIRED') {
    message = 'Envie um PDF assinado corrente da revisão aprovada antes de finalizar.';
  } else if (data?.code === 'CONTRACT_SIGNATURE_CONFIRMATIONS_REQUIRED') {
    const rawSides = data.pendingSides;
    const pendingSides = Array.isArray(rawSides)
      ? (['seller', 'buyer'] as const).filter((side) => rawSides.includes(side)) : [];
    message = pendingSides.length
      ? `Confirme as assinaturas pendentes: ${pendingSides.map((side) => signatureSideLabel(contract, side)).join(' e ')}.`
      : 'As confirmações de assinatura estão incompletas. Atualize os detalhes para consultar as pendências.';
  }
  return resolveApiErrorMessage(message ? { ...source, response: { data: { ...data, error: message } } } : error,
    'Não foi possível finalizar o contrato.');
}
