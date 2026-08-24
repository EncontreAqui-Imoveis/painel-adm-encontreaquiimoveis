export type ContractApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'APPROVED_WITH_RES'
  | 'REJECTED'
  | 'NOT_APPLICABLE';

export type ContractDocument = {
  id: number;
  type?: string | null;
  documentType?: string | null;
  documentCategory?: string | null;
  status?: ContractApprovalStatus | null;
  categoryStatus?: ContractApprovalStatus | null;
  metadata?: Record<string, unknown> | null;
  side?: 'seller' | 'buyer' | null;
  originalFileName?: string | null;
  downloadUrl?: string | null;
  createdAt?: string | null;
};

export type ContractItem = {
  id: string;
  /** Modalidade imutavel resolvida pelo backend a partir da negociacao aprovada. */
  dealType?: 'sale' | 'rent' | null;
  status:
    | 'AWAITING_DOCS'
    | 'IN_DRAFT'
    | 'AWAITING_MINUTE_REVIEW'
    | 'AWAITING_SIGNATURES'
    | 'FINALIZED';
  negotiationId: string;
  propertyId: number;
  propertyCode?: string | null;
  propertyTitle?: string | null;
  propertyImageUrl?: string | null;
  propertyPurpose?: string | null;
  capturingBrokerId?: number | null;
  sellingBrokerId?: number | null;
  advertiserId?: number | null;
  proposerId?: number | null;
  initiatorSide?: 'buyer' | 'seller' | null;
  legalBuyerUserId?: number | null;
  ownerId?: number | null;
  buyerClientId?: number | null;
  sellerClientId?: number | null;
  capturingBrokerName?: string | null;
  sellingBrokerName?: string | null;
  ownerName?: string | null;
  propertyOwnerName?: string | null;
  buyerClientName?: string | null;
  sellerClientName?: string | null;
  advertiserName?: string | null;
  proposerName?: string | null;
  buyer_client_name?: string | null;
  clientName?: string | null;
  clientCpf?: string | null;
  ownerInfo?: Record<string, unknown> | null;
  sellerInfo?: Record<string, unknown> | null;
  buyerInfo?: Record<string, unknown> | null;
  sellerApprovalStatus?: ContractApprovalStatus | null;
  buyerApprovalStatus?: ContractApprovalStatus | null;
  sellerApprovalReason?: Record<string, unknown> | null;
  buyerApprovalReason?: Record<string, unknown> | null;
  approvalProgress?: {
    status?: string | null;
    label?: string | null;
    nextStep?: string | null;
  } | null;
  commissionData?: Record<string, unknown> | null;
  workflowMetadata?: Record<string, unknown> | null;
  identityCapabilities?: {
    seller?: { canEditName?: boolean; canEditCpf?: boolean } | null;
    buyer?: { canEditName?: boolean; canEditCpf?: boolean } | null;
  } | null;
  draftReview?: {
    revisionId?: number | null;
    revisionNumber?: number | null;
    documentId?: number | null;
    originalFileName?: string | null;
    createdAt?: string | null;
    sellerDecision?: 'CONSENTED' | 'CHANGES_REQUESTED' | null;
    sellerReason?: string | null;
    buyerDecision?: 'CONSENTED' | 'CHANGES_REQUESTED' | null;
    buyerReason?: string | null;
    allConsented?: boolean;
  } | null;
  responsibleUserIds?: number[] | null;
  documents?: ContractDocument[];
  documentRequirements?: unknown;
  /** Matriz canônica com o tipo de documento preferido para cada requisito. */
  documentRequirementMatrix?: unknown;
  documentProgress?: unknown;
  agencyName?: string | null;
  agencyAddress?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ContractMatrixCellDoc = ContractDocument;

export type ContractMatrixRowView = {
  documentType: string;
  sellerRequired: boolean;
  buyerRequired: boolean;
  sellerDocs: ContractMatrixCellDoc[];
  buyerDocs: ContractMatrixCellDoc[];
};

export type ContractDocumentRejection = {
  id?: number;
  source_document_id?: number;
  document_type?: string;
  document_label?: string;
  original_file_name?: string;
  owner_side?: 'seller' | 'buyer' | null;
  reason?: string;
  uploaded_by_user_id?: number;
  rejected_by_admin_id?: number;
  rejected_at?: string;
  rejected_by_admin_name?: string;
};
