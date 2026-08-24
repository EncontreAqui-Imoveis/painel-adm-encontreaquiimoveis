import { contractSideLabel, documentLabel } from './contractsDisplayHelpers';
import {
  buyerMatrixDocumentTypes,
  buyerRentalRequiredInfoFields,
  buyerRequiredInfoFields,
  contractScopedDocumentTypes,
  documentTypeLabels,
  hasRecordValue,
  maritalStatusOptions,
  matrixDocumentSortOrder,
  outroMatrixSlotTypes,
  rentRequiredDocTypes,
  saleRequiredDocTypes,
  sellerRequiredInfoFields,
  type MatrixRequirement,
  type MatrixRow,
  type MatrixSide,
  type RequiredFieldDescriptor,
} from './contractsDataHelpers';
import type { ContractDocument, ContractItem } from './types';

export type ContractMatrixRowView = MatrixRow & {
  sellerDocs: ContractDocument[];
  buyerDocs: ContractDocument[];
};

export { documentTypeLabels, maritalStatusOptions };

export function getDocumentSide(doc: ContractDocument): 'seller' | 'buyer' | null {
  const side = String(doc.side ?? '').trim().toLowerCase();
  if (side === 'seller' || side === 'buyer') {
    return side;
  }
  return null;
}

export function documentSideOrder(doc: ContractDocument): number {
  const side = getDocumentSide(doc);
  if (side === 'buyer') return 0;
  if (side === 'seller') return 1;
  return 2;
}

export function isDoubleEndedDeal(_contract: ContractItem | null | undefined): boolean {
  return false;
}

export function matrixSortWeight(documentType: string): number {
  const index = matrixDocumentSortOrder.indexOf(String(documentType ?? '').trim().toLowerCase());
  return index >= 0 ? index : matrixDocumentSortOrder.length;
}

export function shouldShowBuyerMatrixSide(documentType: string): boolean {
  return buyerMatrixDocumentTypes.has(String(documentType ?? '').trim().toLowerCase());
}

function requiresSpouseDocuments(info: Record<string, unknown> | null | undefined): boolean {
  const civilStatus = String(info?.estado_civil ?? info?.estadoCivil ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');
  return civilStatus === 'casado(a)' || civilStatus === 'casado' || civilStatus === 'união estável' || civilStatus === 'uniao estavel';
}

export function requiresExactSaleSplit(contract: ContractItem | null): boolean {
  return contract?.dealType === 'sale';
}

export function getRequiredDocTypes(contract: ContractItem): string[] {
  if (contract.dealType === 'rent') {
    return [...rentRequiredDocTypes];
  }
  if (contract.dealType === 'sale') {
    return [...saleRequiredDocTypes];
  }

  // Legacy contracts without a modality cannot be classified as sale or rent.
  // Keep only the neutral slots until the API provides its canonical matrix.
  return ['doc_identidade', 'comprovante_endereco', 'certidao_casamento_nascimento', 'outro'];
}

export function normalizeMatrixSide(value: unknown): MatrixSide | null {
  const side = String(value ?? '').trim().toLowerCase();
  if (side === 'seller') return 'seller';
  if (side === 'buyer') return 'buyer';
  if (side === 'captador' || side === 'capturing') return 'seller';
  return null;
}

export function normalizeMatrixDocumentType(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function readRawMatrixRequirements(contract: ContractItem): MatrixRequirement[] {
  // The canonical matrix provides preferredDocumentType. Prefer it to avoid
  // reinterpreting API categories in the client.
  const raw = contract.documentRequirementMatrix ?? contract.documentRequirements;
  const entries: MatrixRequirement[] = [];

  const categoryToDocumentTypes = (category: string): string[] => {
    switch (category.trim().toLowerCase()) {
      case 'identidade':
        return ['doc_identidade'];
      case 'comprovante_endereco':
        return ['comprovante_endereco'];
      case 'estado_civil':
        return ['certidao_casamento_nascimento'];
      case 'conjuge_documentos':
        return ['doc_identidade_conjuge'];
      case 'comprovante_renda':
        return ['comprovante_renda'];
      case 'seguro_incendio':
        return ['seguro_incendio'];
      case 'dados_bancarios':
        return ['dados_bancarios'];
      case 'certidao_inteiro_teor_escritura':
        return ['certidao_inteiro_teor_escritura'];
      case 'certidao_onus_acoes':
        return ['certidao_onus_acoes'];
      case 'outro':
        return ['outro'];
      case 'docs_imovel':
        // Compatibility for records created before the API exposed the
        // preferredDocumentType. Never infer from property description.
        return contract.dealType === 'sale'
          ? ['certidao_inteiro_teor_escritura', 'certidao_onus_acoes']
          : ['certidao_inteiro_teor_escritura'];
      default:
        return [];
    }
  };

  const pushFromSideRows = (side: MatrixSide, rows: unknown) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const source = row as Record<string, unknown>;
      const applicability = String(source.applicability ?? '').trim().toLowerCase();
      if (applicability === 'not_applicable') continue;
      const preferredDocumentType = normalizeMatrixDocumentType(
        source.preferredDocumentType ?? source.documentType ?? source.type
      );
      const category = String(source.category ?? '').trim();
      const docTypes = preferredDocumentType
        ? [preferredDocumentType]
        : category
          ? categoryToDocumentTypes(category)
          : [];
      for (const documentType of docTypes) {
        entries.push({ documentType, side });
      }
    }
  };

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const source = raw as Record<string, unknown>;
    pushFromSideRows('seller', source.seller);
    pushFromSideRows('buyer', source.buyer);
    return entries;
  }

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const source = entry as Record<string, unknown>;
      const documentType = normalizeMatrixDocumentType(
        source.documentType ?? source.type ?? source.document ?? source.key
      );
      const side = normalizeMatrixSide(source.side ?? source.party ?? source.role);
      if (!documentType || !side) continue;
      entries.push({ documentType, side });
    }
  }

  return entries;
}

export function getMatrixRows(contract: ContractItem): MatrixRow[] {
  const requirements = readRawMatrixRequirements(contract);
  if (requirements.length === 0) {
    // Legacy contracts without the API matrix still need marital documents only
    // when the legal qualification declares a spouse.
    const fallbackTypes = getRequiredDocTypes(contract).filter(
      (documentType) => documentType !== 'certidao_casamento_nascimento'
    );
    const rows = fallbackTypes
      .map((documentType) => ({
        documentType,
        sellerRequired: true,
        buyerRequired: shouldShowBuyerMatrixSide(documentType),
      }));

    const appendSpouseDocuments = (side: MatrixSide) => {
      const applies = side === 'seller'
        ? requiresSpouseDocuments(contract.sellerInfo ?? contract.ownerInfo)
        : requiresSpouseDocuments(contract.buyerInfo);
      if (!applies) return;
      for (const documentType of ['doc_identidade_conjuge', 'certidao_casamento_nascimento']) {
        const row = rows.find((entry) => entry.documentType === documentType);
        if (row) {
          if (side === 'seller') row.sellerRequired = true;
          else row.buyerRequired = true;
          continue;
        }
        rows.push({
          documentType,
          sellerRequired: side === 'seller',
          buyerRequired: side === 'buyer',
        });
      }
    };

    appendSpouseDocuments('seller');
    appendSpouseDocuments('buyer');
    return rows.sort((left, right) => matrixSortWeight(left.documentType) - matrixSortWeight(right.documentType));
  }

  const rows = new Map<string, MatrixRow>();
  for (const requirement of requirements) {
    const normalizedDocumentType = isOutroMatrixDocumentType(requirement.documentType)
      ? 'outro'
      : requirement.documentType;
    const current = rows.get(normalizedDocumentType) ?? {
      documentType: normalizedDocumentType,
      sellerRequired: false,
      buyerRequired: false,
    };
    if (requirement.side === 'seller') current.sellerRequired = true;
    if (requirement.side === 'buyer') current.buyerRequired = true;
    rows.set(normalizedDocumentType, current);
  }

  return Array.from(rows.values())
    .sort((left, right) => matrixSortWeight(left.documentType) - matrixSortWeight(right.documentType));
}

export function getNonProposalDocuments(contract: ContractItem): ContractDocument[] {
  return (contract.documents ?? []).filter((doc) => {
    const documentType = String(doc.documentType ?? '').trim().toLowerCase();
    return documentType !== 'proposal' && !isRejectedContractDocument(doc);
  });
}

export function isRejectedContractDocument(doc: ContractDocument): boolean {
  const metadata = doc.metadata ?? {};
  const status = String(
    doc.status ?? metadata.status ?? metadata.reviewStatus ?? metadata.validationStatus ?? ''
  )
    .trim()
    .toUpperCase();
  return status === 'REJECTED';
}

export function documentMatchesCurrentContract(contract: ContractItem, doc: ContractDocument): boolean {
  const documentType = String(doc.documentType ?? '').trim().toLowerCase();
  if (!contractScopedDocumentTypes.has(documentType)) {
    return true;
  }

  const metadataContractId = String(doc.metadata?.contractId ?? '').trim();
  if (!metadataContractId) {
    return false;
  }

  return metadataContractId === contract.id;
}

export function getAllContractDocuments(contract: ContractItem): ContractDocument[] {
  return getNonProposalDocuments(contract)
    .filter((doc) => documentMatchesCurrentContract(contract, doc))
    .sort((left, right) => {
      const leftSideOrder = documentSideOrder(left);
      const rightSideOrder = documentSideOrder(right);
      if (leftSideOrder !== rightSideOrder) {
        return leftSideOrder - rightSideOrder;
      }
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      if (leftDate !== rightDate) {
        return rightDate - leftDate;
      }
      return Number(right.id ?? 0) - Number(left.id ?? 0);
    });
}

export function getCurrentDraftDocument(contract: ContractItem | null): ContractDocument | null {
  if (!contract) return null;
  return (
    getAllContractDocuments(contract).find(
      (doc) => String(doc.documentType ?? '').trim().toLowerCase() === 'contrato_minuta'
    ) ?? null
  );
}

export function hasCurrentDraftDocument(contract: ContractItem | null): boolean {
  return getCurrentDraftDocument(contract) != null;
}

export function draftUploadInputLabel(contract: ContractItem | null): string {
  return hasCurrentDraftDocument(contract) ? 'Trocar minuta' : 'PDF da minuta';
}

export function draftSubmitLabel(contract: ContractItem | null): string {
  return hasCurrentDraftDocument(contract) ? 'Substituir minuta' : 'Anexar Minuta';
}

export function listMissingRecordFields(
  source: Record<string, unknown> | null | undefined,
  fields: RequiredFieldDescriptor[]
): string[] {
  return fields
    .filter((field) => !hasRecordValue(source, field.keys))
    .map((field) => field.label);
}

export function listMissingSellerInfo(contract: ContractItem): string[] {
  return listMissingRecordFields(
    contract.ownerInfo ?? contract.sellerInfo ?? null,
    sellerRequiredInfoFields
  );
}

export function listMissingBuyerInfo(contract: ContractItem): string[] {
  const requiresRentalGuarantee = contract.dealType === 'rent';
  const requiredFields = requiresRentalGuarantee
    ? [...buyerRequiredInfoFields, ...buyerRentalRequiredInfoFields]
    : buyerRequiredInfoFields;

  return listMissingRecordFields(contract.buyerInfo ?? null, requiredFields);
}

export function listMissingRequiredDocuments(contract: ContractItem): string[] {
  const rows = getMatrixRows(contract);
  const missing: string[] = [];

  if (isDoubleEndedDeal(contract)) {
    for (const row of rows) {
      if (!row.sellerRequired) continue;
      if (getDocumentForMatrixCell(contract, row.documentType, 'seller') == null) {
        missing.push(documentLabel(row.documentType));
      }
    }
    return missing;
  }

  for (const row of rows) {
    const sellerDoc = getDocumentForMatrixCell(contract, row.documentType, 'seller');
    const buyerDoc = getDocumentForMatrixCell(contract, row.documentType, 'buyer');
    if (row.documentType !== 'outro' && row.sellerRequired && sellerDoc == null) {
      missing.push(`${documentLabel(row.documentType)} (${contractSideLabel(contract, 'seller')})`);
    }
    if (row.documentType !== 'outro' && row.buyerRequired && buyerDoc == null) {
      missing.push(`${documentLabel(row.documentType)} (${contractSideLabel(contract, 'buyer')})`);
    }
  }

  return missing;
}

export function listBlockingDocumentStatuses(contract: ContractItem): string[] {
  return getNonProposalDocuments(contract)
    .map((doc) => {
      const status = String(doc.status ?? '').trim().toUpperCase();
      if (isOutroMatrixDocumentType(doc.documentType)) {
        return null;
      }
      if (!status) {
        return null;
      }
      if (status !== 'REJECTED' && status !== 'PENDING') {
        return null;
      }

      const side = getDocumentSide(doc);
      const sideLabel = side
        ? ` (${contractSideLabel(contract, side)})`
        : '';
      const label = documentLabel(doc.documentType) + sideLabel;
      return `${label}: ${status === 'REJECTED' ? 'rejeitado' : 'pendente'}`;
    })
    .filter((item): item is string => item != null);
}

export function computeApprovalLockReasonsForSide(
  contract: ContractItem | null,
  side: 'seller' | 'buyer',
  modalMode: string = 'review_docs'
): string[] {
  if (!contract || modalMode !== 'review_docs') {
    return [];
  }

  const reasons: string[] = [];
  const missingInfo = side === 'seller' ? listMissingSellerInfo(contract) : listMissingBuyerInfo(contract);
  if (missingInfo.length > 0) {
    reasons.push(`${contractSideLabel(contract, side)} sem: ${missingInfo.join(', ')}`);
  }

  const rows = getMatrixRows(contract);
  const missingDocs: string[] = [];
  for (const row of rows) {
    const isRequired = side === 'seller' ? row.sellerRequired : row.buyerRequired;
    if (row.documentType !== 'outro' && isRequired) {
      const doc = getDocumentForMatrixCell(contract, row.documentType, side);
      if (doc == null) {
        missingDocs.push(documentLabel(row.documentType));
      }
    }
  }
  if (missingDocs.length > 0) {
    reasons.push(`Documentos (${contractSideLabel(contract, side)}) faltando: ${missingDocs.join(', ')}`);
  }

  const blockingDocs = getNonProposalDocuments(contract)
    .filter((doc) => {
      const docSide = getDocumentSide(doc);
      return docSide === side || docSide == null;
    })
    .map((doc) => {
      const status = String(doc.status ?? doc.categoryStatus ?? '').trim().toUpperCase();
      if (isOutroMatrixDocumentType(doc.documentType) || !status) return null;
      if (status !== 'REJECTED' && status !== 'PENDING') return null;
      return `${documentLabel(doc.documentType)}: ${status === 'REJECTED' ? 'rejeitado' : 'pendente'}`;
    })
    .filter((item): item is string => item != null);

  if (blockingDocs.length > 0) {
    reasons.push(`Documentos (${contractSideLabel(contract, side)}) bloqueados: ${blockingDocs.join(', ')}`);
  }

  return reasons;
}

export function computeApprovalLockReasons(
  contract: ContractItem | null,
  modalMode: string = 'review_docs'
): string[] {
  if (!contract || modalMode !== 'review_docs') {
    return [];
  }

  return [
    ...computeApprovalLockReasonsForSide(contract, 'seller', modalMode),
    ...computeApprovalLockReasonsForSide(contract, 'buyer', modalMode),
  ];
}

export function getDocumentForMatrixCell(
  contract: ContractItem,
  documentType: string,
  side: 'seller' | 'buyer'
): ContractDocument | null {
  const normalizedType = documentType.trim().toLowerCase();
  const docs = getNonProposalDocuments(contract).filter((doc) =>
    documentBelongsToMatrixCell(doc, normalizedType)
  );
  if (docs.length === 0) {
    return null;
  }

  const direct = docs.find((doc) => getDocumentSide(doc) === side);
  if (direct) {
    return direct;
  }

  const neutral = docs.find((doc) => getDocumentSide(doc) == null);
  if (neutral) {
    return neutral;
  }

  if (isDoubleEndedDeal(contract)) {
    return docs[0] ?? null;
  }

  return null;
}

export function getDocumentsForMatrixCell(
  contract: ContractItem | null | undefined,
  documentType: string,
  side: 'seller' | 'buyer'
): ContractDocument[] {
  if (!contract) return [];
  const normalizedType = documentType.trim().toLowerCase();
  const docs = getNonProposalDocuments(contract).filter((doc) =>
    documentBelongsToMatrixCell(doc, normalizedType)
  );
  if (docs.length === 0) {
    return [];
  }

  const direct = docs.filter((doc) => getDocumentSide(doc) === side);
  const neutral = docs.filter((doc) => getDocumentSide(doc) == null);

  const ordered = [...direct, ...neutral];
  if (ordered.length > 0) {
    return Array.from(new Map(ordered.map((doc) => [doc.id, doc])).values());
  }

  if (isDoubleEndedDeal(contract)) {
    return Array.from(new Map(docs.map((doc) => [doc.id, doc])).values());
  }

  return [];
}

export function canAddAnotherMatrixDocument(
  contract: ContractItem | null | undefined,
  documentType: string,
  side: 'seller' | 'buyer'
): boolean {
  const docs = getDocumentsForMatrixCell(contract, documentType, side);
  if (!isOutroMatrixDocumentType(documentType)) {
    return true;
  }
  return docs.length < 15;
}

export function matrixCellUploadLabel(
  contract: ContractItem | null | undefined,
  documentType: string,
  side: 'seller' | 'buyer'
): string {
  const docs = getDocumentsForMatrixCell(contract, documentType, side);
  return docs.length > 0 ? 'Substituir' : 'Enviar';
}

export function resolveMatrixUploadCategory(
  documentType: string,
  _side?: 'seller' | 'buyer'
): string {
  const normalizedType = documentType.trim().toLowerCase();
  if (normalizedType === 'doc_identidade') return 'identidade';
  if (normalizedType === 'doc_identidade_conjuge') return 'conjuge_documentos';
  if (normalizedType === 'comprovante_endereco') return 'comprovante_endereco';
  if (normalizedType === 'certidao_casamento_nascimento') return 'estado_civil';
  if (normalizedType === 'comprovante_renda') return 'comprovante_renda';
  if (
    normalizedType === 'certidao_inteiro_teor' ||
    normalizedType === 'certidao_onus_acoes' ||
    normalizedType === 'certidao_inteiro_teor_escritura'
  ) {
    return 'docs_imovel';
  }
  if (normalizedType === 'dados_bancarios') return 'dados_bancarios';
  if (normalizedType === 'outro' || normalizedType.startsWith('cliente_outro_')) return 'outro';
  return normalizedType;
}

export function isOutroMatrixDocumentType(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'outro' || normalized.startsWith('cliente_outro_');
}

export function documentTypeMatchesMatrixCell(documentType: string, matrixType: string): boolean {
  if (matrixType === 'outro') {
    return isOutroMatrixDocumentType(documentType);
  }
  return documentType === matrixType;
}

function documentBelongsToMatrixCell(doc: ContractDocument, matrixType: string): boolean {
  const documentType = String(doc.documentType ?? '').trim().toLowerCase();
  const documentCategory = String(
    doc.documentCategory ?? doc.metadata?.documentCategory ?? doc.metadata?.document_category ?? ''
  )
    .trim()
    .toLowerCase();

  if (matrixType === 'dados_bancarios') {
    // Legacy uploads used the generic "outro" type but retained their category.
    return documentType === 'dados_bancarios' || documentCategory === 'dados_bancarios';
  }

  if (matrixType === 'outro' && documentCategory === 'dados_bancarios') {
    return false;
  }

  return documentTypeMatchesMatrixCell(documentType, matrixType);
}

export function resolveOutroMatrixDocumentType(
  contract: ContractItem | null | undefined,
  side: 'seller' | 'buyer'
): string | null {
  if (!contract) return null;
  const docs = getDocumentsForMatrixCell(contract, 'outro', side);
  if (docs.length >= outroMatrixSlotTypes.length) {
    return null;
  }

  const usedTypes = new Set(
    docs
      .map((doc) => String(doc.documentType ?? '').trim().toLowerCase())
      .filter((value) => value.startsWith('cliente_outro_'))
  );

  for (const slotType of outroMatrixSlotTypes) {
    if (!usedTypes.has(slotType)) {
      return slotType;
    }
  }

  return null;
}

export function resolveOutroMatrixDocumentTypes(
  contract: ContractItem | null | undefined,
  side: 'seller' | 'buyer',
  count: number
): string[] {
  if (!contract) return [];
  const docs = getDocumentsForMatrixCell(contract, 'outro', side);
  if (docs.length >= outroMatrixSlotTypes.length) {
    return [];
  }

  const usedTypes = new Set(
    docs
      .map((doc) => String(doc.documentType ?? '').trim().toLowerCase())
      .filter((value) => value.startsWith('cliente_outro_'))
  );
  const availableSlots = outroMatrixSlotTypes.filter((slotType) => !usedTypes.has(slotType));
  return availableSlots.slice(0, Math.max(0, count));
}
