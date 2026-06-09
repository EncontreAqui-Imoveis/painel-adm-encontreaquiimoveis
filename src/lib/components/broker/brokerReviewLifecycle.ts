import type { BrokerFormState } from '$lib/components/broker/brokerReviewHelpers';

export type BrokerReviewClosedState = {
  brokerDetail: null;
  detailError: null;
  isDetailLoading: false;
  lastBrokerId: null;
  isEditMode: false;
  deleteError: null;
  isDeleteDialogOpen: false;
  lastCepLookup: '';
  cepLookupError: null;
  brokerForm: BrokerFormState;
};

export function createBrokerReviewClosedState(): BrokerReviewClosedState {
  return {
    brokerDetail: null,
    detailError: null,
    isDetailLoading: false,
    lastBrokerId: null,
    isEditMode: false,
    deleteError: null,
    isDeleteDialogOpen: false,
    lastCepLookup: '',
    cepLookupError: null,
    brokerForm: {
      name: '',
      email: '',
      phone: '',
      street: '',
      number: '',
      complement: '',
      bairro: '',
      city: '',
      state: '',
      cep: '',
      creci: '',
      semCep: false,
      semNumero: false,
    },
  };
}

export function getBrokerIdToLoad(open: boolean, brokerId: number | undefined, lastBrokerId: number | null) {
  if (!open || !brokerId) return null;
  return brokerId !== lastBrokerId ? brokerId : null;
}

export function shouldDispatchClose(previousOpen: boolean, currentOpen: boolean): boolean {
  return previousOpen && !currentOpen;
}
