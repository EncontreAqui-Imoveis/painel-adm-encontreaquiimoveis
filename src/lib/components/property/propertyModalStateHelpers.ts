import { formatCurrency } from '$lib/components/property/propertyFormattingHelpers';

export type PropertyModalStateLike = {
  bedrooms?: number | null;
  bathrooms?: number | null;
  garage_spots?: number | null;
  sem_quadra?: number | boolean | null;
  sem_lote?: number | boolean | null;
  quadra?: string | null;
  lote?: string | null;
  valor_condominio?: number | null;
  valor_iptu?: number | null;
  broker_name?: string | null;
  owner_name?: string | null;
};

export type PropertyModalResetState = {
  isModalOpen: boolean;
  selectedProperty: null;
  editableProperty: null;
  editSemNumero: boolean;
  editSemQuadra: boolean;
  editSemLote: boolean;
  editSemCep: boolean;
  editBedroomsAsZero: boolean;
  editBathroomsAsZero: boolean;
  editGarageSpotsAsZero: boolean;
  editSelectedAmenities: string[];
  editError: null;
  rejectDialogOpen: boolean;
  rejectObservation: string;
  rejectObservationError: null;
  brokenPreviewImages: Set<string>;
  selectedPropertyGalleryImages: unknown[];
  isEditMode: boolean;
};

export function buildPropertyModalResetState(): PropertyModalResetState {
  return {
    isModalOpen: false,
    selectedProperty: null,
    editableProperty: null,
    editSemNumero: false,
    editSemQuadra: false,
    editSemLote: false,
    editSemCep: false,
    editBedroomsAsZero: false,
    editBathroomsAsZero: false,
    editGarageSpotsAsZero: false,
    editSelectedAmenities: [],
    editError: null,
    rejectDialogOpen: false,
    rejectObservation: '',
    rejectObservationError: null,
    brokenPreviewImages: new Set<string>(),
    selectedPropertyGalleryImages: [],
    isEditMode: false,
  };
}

export function buildSoldDialogResetState() {
  return {
    soldDialogOpen: false,
    soldByPlatform: null,
    soldSaleValue: '',
    soldCommissionRate: '',
    soldCommissionValue: '',
    isSavingSold: false,
  };
}

export function resolvePropertyEditNumericFlags(property: PropertyModalStateLike) {
  return {
    editBedroomsAsZero: Number(property.bedrooms ?? -1) === 0,
    editBathroomsAsZero: Number(property.bathrooms ?? -1) === 0,
    editGarageSpotsAsZero: Number(property.garage_spots ?? -1) === 0,
    editSemQuadra: Boolean(property.sem_quadra) || String(property.quadra ?? '').trim() === '',
    editSemLote: Boolean(property.sem_lote) || String(property.lote ?? '').trim() === '',
  };
}

export function resolvePropertyEditExtraState(property: PropertyModalStateLike) {
  return {
    editValorCondominioDisplay:
      property.valor_condominio != null ? formatCurrency(Number(property.valor_condominio)) : '',
    editValorIptuDisplay:
      property.valor_iptu != null ? formatCurrency(Number(property.valor_iptu)) : '',
    advertiserQuery: property.broker_name ?? property.owner_name ?? '',
    selectedAdvertiser: null,
  };
}
