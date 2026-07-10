import { documentLabel } from './contractsDisplayHelpers';
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

export function requiresExactSaleSplit(contract: ContractItem | null): boolean {
  const purpose = String(contract?.propertyPurpose ?? '').trim().toLowerCase();
  const isRentalOnly = purpose.includes('alug') && !purpose.includes('venda');
  return !isRentalOnly;
}

export function getRequiredDocTypes(contract: ContractItem): string[] {
  const purpose = String(contract.propertyPurpose ?? '').trim().toLowerCase();
  const isSale = purpose.includes('venda') || purpose.includes('sale');
  const isRent = purpose.includes('alug') || purpose.includes('rent');

  if (isSale && isRent) {
    return Array.from(new Set([...saleRequiredDocTypes, ...rentRequiredDocTypes]));
  }
  if (isRent) {
    return [...rentRequiredDocTypes];
  }
  return [...saleRequiredDocTypes];
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
  const raw = contract.documentRequirements;
  const entries: MatrixRequirement[] = [];
  const purpose = String(contract.propertyPurpose ?? '').trim().toLowerCase();
  const isRentalOnly = purpose.includes('alug') && !purpose.includes('venda');

  const categoryToDocumentTypes = (category: string): string[] => {
    switch (category.trim().toLowerCase()) {
      case 'identidade':
        return ['doc_identidade'];
      case 'comprovante_endereco':
        return ['comprovante_endereco'];
      case 'estado_civil':
        return ['certidao_casamento_nascimento'];
      case 'conjuge_documentos':
        return ['outro'];
      case 'comprovante_renda':
        return ['comprovante_renda'];
      case 'dados_bancarios':
        return ['outro'];
      case 'docs_imovel':
        return isRentalOnly
          ? ['certidao_inteiro_teor_escritura']
          : ['certidao_inteiro_teor', 'certidao_onus_acoes'];
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
      const category = String(source.category ?? '').trim();
      if (!category) continue;
      const docTypes = categoryToDocumentTypes(category);
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
    const fallbackTypes = getRequiredDocTypes(contract);
    return fallbackTypes
      .map((documentType) => ({
        documentType,
        sellerRequired: true,
        buyerRequired: shouldShowBuyerMatrixSide(documentType),
      }))
      .sort((left, right) => matrixSortWeight(left.documentType) - matrixSortWeight(right.documentType));
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
    .map((row) => ({
      ...row,
      buyerRequired: row.buyerRequired || shouldShowBuyerMatrixSide(row.documentType),
    }))
    .sort((left, right) => matrixSortWeight(left.documentType) - matrixSortWeight(right.documentType));
}

export function getNonProposalDocuments(contract: ContractItem): ContractDocument[] {
  return (contract.documents ?? []).filter((doc) => {
    const documentType = String(doc.documentType ?? '').trim().toLowerCase();
    return documentType !== 'proposal';
  });
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
  const normalizedPurpose = String(contract.propertyPurpose ?? '').toLowerCase();
  const requiresRentalGuarantee = normalizedPurpose.includes('alug') || normalizedPurpose.includes('rent');
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
      missing.push(`${documentLabel(row.documentType)} (Vendedor)`);
    }
    if (row.documentType !== 'outro' && row.buyerRequired && buyerDoc == null) {
      missing.push(`${documentLabel(row.documentType)} (Comprador)`);
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
      const sideLabel = side === 'seller' ? ' (Vendedor)' : side === 'buyer' ? ' (Comprador)' : '';
      const label = documentLabel(doc.documentType) + sideLabel;
      return `${label}: ${status === 'REJECTED' ? 'rejeitado' : 'pendente'}`;
    })
    .filter((item): item is string => item != null);
}

export function computeApprovalLockReasons(
  contract: ContractItem | null,
  modalMode: string = 'review_docs'
): string[] {
  if (!contract || modalMode !== 'review_docs') {
    return [];
  }

  const reasons: string[] = [];
  const missingSellerInfo = listMissingSellerInfo(contract);
  const missingBuyerInfo = listMissingBuyerInfo(contract);
  const missingDocuments = listMissingRequiredDocuments(contract);
  const blockingDocuments = listBlockingDocumentStatuses(contract);

  if (missingSellerInfo.length > 0) {
      reasons.push(`Vendedor sem: ${missingSellerInfo.join(', ')}`);
  }

  if (missingBuyerInfo.length > 0) {
    reasons.push(`Comprador sem: ${missingBuyerInfo.join(', ')}`);
  }

  if (missingDocuments.length > 0) {
    reasons.push(`Documentos faltando: ${missingDocuments.join(', ')}`);
  }

  if (blockingDocuments.length > 0) {
    reasons.push(`Documentos bloqueados: ${blockingDocuments.join(', ')}`);
  }

  return reasons;
}

export function getDocumentForMatrixCell(
  contract: ContractItem,
  documentType: string,
  side: 'seller' | 'buyer'
): ContractDocument | null {
  const normalizedType = documentType.trim().toLowerCase();
  const docs = getNonProposalDocuments(contract).filter(
    (doc) => String(doc.documentType ?? '').trim().toLowerCase() === normalizedType
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
  const docs = getNonProposalDocuments(contract).filter(
    (doc) =>
      documentTypeMatchesMatrixCell(String(doc.documentType ?? '').trim().toLowerCase(), normalizedType)
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
