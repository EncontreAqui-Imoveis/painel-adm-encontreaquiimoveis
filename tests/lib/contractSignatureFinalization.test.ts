import { describe, expect, it } from 'vitest';
import { signatureFinalizationState, finalizationErrorMessage, signatureSideLabel } from '../../src/lib/components/contracts/contractSignatureFinalization';
import type { ContractItem, ContractSignatureStatus } from '../../src/lib/components/contracts/types';

const side = (status: ContractSignatureStatus['status']): ContractSignatureStatus => ({ status,
  eventId: null, confirmedByAdminId: null, confirmedAt: null, sourceEventId: null,
  originalEventId: null, originalSignedVersionId: null, preservation: null });
const contract = (): ContractItem => ({ id: 'c', negotiationId: 'n', propertyId: 1, status: 'AWAITING_SIGNATURES',
  signatures: { currentVersion: { id: 31, documentId: 41, draftRevisionId: 11, uploadedByAdminId: 1,
    uploadedAt: '', previousVersionId: null, replacementReason: null, equivalence: null },
    seller: side('CONFIRMED'), buyer: side('CONFIRMED') } });

describe('signature finalization state', () => {
  it.each(['CONFIRMED', 'PRESERVED'] as const)('accepts effective %s states without resolving history again', (status) => {
    const item = contract(); item.signatures!.seller = side(status); item.signatures!.buyer = side(status);
    expect(signatureFinalizationState(item, 'ready').status).toBe('complete');
    item.signatures!.buyer = side('PRESERVED');
    expect(signatureFinalizationState(item, 'ready').status).toBe('complete');
  });
  it.each(['seller', 'buyer'] as const)('identifies only the pending %s', (pendingSide) => {
    const item = contract(); item.signatures![pendingSide] = side('PENDING');
    expect(signatureFinalizationState(item, 'ready')).toMatchObject({ status: 'pending', pendingSides: [pendingSide] });
    item.signatures!.seller = side('PENDING'); item.signatures!.buyer = side('PENDING');
    expect(signatureFinalizationState(item, 'ready')).toMatchObject({ pendingSides: ['seller', 'buyer'] });
  });
  it('never considers historical confirmations effective without a current PDF', () => {
    const item = contract(); item.signatures!.currentVersion = null;
    expect(signatureFinalizationState(item, 'ready')).toMatchObject({ status: 'pending', currentVersionId: null,
      seller: 'PENDING', buyer: 'PENDING' });
  });
  it('distinguishes loading and unavailable data from proven pending requirements', () => {
    const item = contract();
    expect(signatureFinalizationState(item, 'loading')).toEqual({ status: 'loading' });
    expect(signatureFinalizationState(item, 'error')).toEqual({ status: 'unavailable' });
    delete item.signatures;
    expect(signatureFinalizationState(item, 'ready')).toEqual({ status: 'unavailable' });
  });
  it('rejects incomplete DTOs and invalidated event tags as availability failures', () => {
    const item = contract();
    const malformed: unknown = { ...item.signatures, buyer: { status: 'INVALIDATED' } };
    item.signatures = malformed as ContractItem['signatures'];
    expect(signatureFinalizationState(item, 'ready').status).toBe('unavailable');
    item.signatures = contract().signatures; item.signatures!.currentVersion!.draftRevisionId = 0;
    expect(signatureFinalizationState(item, 'ready').status).toBe('unavailable');
  });
  it('does not use readyForFinalization, documents or propertyPurpose as approval or modality', () => {
    const item = contract(); Object.assign(item, { readyForFinalization: true }); item.propertyPurpose = 'Aluguel';
    item.signatures!.buyer = side('PENDING');
    expect(signatureFinalizationState(item, 'ready').status).toBe('pending');
    expect(signatureSideLabel(item, 'buyer')).toBe('Parte buyer');
    item.status = 'AWAITING_MINUTE_REVIEW';
    expect(signatureFinalizationState(item, 'ready')).toEqual({ status: 'outsideStage' });
  });
});

describe('real finalization error response', () => {
  it.each(['sale', 'rent'] as const)('labels valid pendingSides for %s and preserves request IDs', (dealType) => {
    const item = contract(); item.dealType = dealType;
    const message = finalizationErrorMessage({ response: { data: { code: 'CONTRACT_SIGNATURE_CONFIRMATIONS_REQUIRED',
      pendingSides: ['buyer', 'bad-side', 'buyer'], requestId: 'req-1' } } }, item);
    expect(message).toBe(`Confirme as assinaturas pendentes: ${dealType === 'sale' ? 'Comprador' : 'Locatário'}. (Req: req-1)`);
  });
  it('handles missing or invalid pendingSides without inventing sides', () => {
    const error = { response: { data: { code: 'CONTRACT_SIGNATURE_CONFIRMATIONS_REQUIRED', pendingSides: ['invalid'] } } };
    expect(finalizationErrorMessage(error, contract())).toContain('Atualize os detalhes');
  });
  it('explains the required current PDF', () => {
    expect(finalizationErrorMessage({ response: { data: { code: 'CONTRACT_CURRENT_SIGNED_VERSION_REQUIRED' } } }, contract()))
      .toContain('PDF assinado corrente da revisão aprovada');
  });
  it.each(['CONTRACT_BILATERAL_CONSENT_REQUIRED', 'CONTRACT_CURRENT_SIGNED_VERSION_INCOMPATIBLE',
    'CONTRACT_APPROVED_REVISION_REQUIRED', 'CONTRACT_REVISION_SCOPE_MISMATCH', 'CONTRACT_APPROVED_DRAFT_INVALID',
    'CONTRACT_DEAL_TYPE_MISSING'])('preserves the backend message for %s', (code) => {
    expect(finalizationErrorMessage({ response: { data: { code, error: 'Requisito indicado pelo servidor.' } } }, contract()))
      .toBe('Requisito indicado pelo servidor.');
  });
});
