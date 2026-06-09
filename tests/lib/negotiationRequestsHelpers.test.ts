import { describe, expect, it } from 'vitest';
import {
  canSaveResponsiblesSelection,
  hasResponsiblesInconsistentState,
  hasResponsibleChanges,
  responsibleSnapshot,
  responsiblesBlockApproval,
  type NegotiationItem,
  type ResponsibleOption,
  type ResponsibleSelectionState,
} from '../../src/lib/components/negotiations/negotiationRequestsHelpers';

describe('negotiationRequestsHelpers responsible flow', () => {
  const selected: ResponsibleOption[] = [
    { id: 2, name: 'B' },
    { id: 1, name: 'A' },
  ];
  const state: ResponsibleSelectionState = {
    loading: false,
    loadError: '',
    loadedProposalId: 'neg-1',
    snapshot: responsibleSnapshot([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]),
  };

  it('flags inconsistent state when the proposal id or loading state is invalid', () => {
    expect(hasResponsiblesInconsistentState(null, state)).toBe(true);
    expect(hasResponsiblesInconsistentState('neg-2', state)).toBe(true);
    expect(hasResponsiblesInconsistentState('neg-1', { ...state, loading: true })).toBe(true);
  });

  it('allows signed proposals to bypass responsible loading and detects selection changes', () => {
    const signedProposal = { id: 'neg-1', signedDocumentId: 10 } as NegotiationItem;
    expect(
      responsiblesBlockApproval(signedProposal, { ...state, loading: true, loadError: 'x' }),
    ).toBe(false);
    expect(hasResponsibleChanges(selected, state, 'neg-1')).toBe(false);
    expect(hasResponsibleChanges([{ id: 3, name: 'C' }], state, 'neg-1')).toBe(true);
  });

  it('keeps save eligibility tied to a consistent selection state', () => {
    expect(canSaveResponsiblesSelection('neg-1', selected, state)).toBe(true);
    expect(
      canSaveResponsiblesSelection('neg-1', [...selected, { id: 3, name: 'C' }, { id: 4, name: 'D' }, { id: 5, name: 'E' }, { id: 6, name: 'F' }], state),
    ).toBe(false);
  });
});
