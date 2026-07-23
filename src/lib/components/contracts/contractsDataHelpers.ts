import { documentLabel } from './contractsDisplayHelpers';
import type { ContractDocument, ContractItem } from './types';

export type RequiredFieldDescriptor = {
  keys: string[];
  label: string;
};

export type MatrixSide = 'seller' | 'buyer';

export type MatrixRequirement = {
  documentType: string;
  side: MatrixSide;
};

export type MatrixRow = {
  documentType: string;
  sellerRequired: boolean;
  buyerRequired: boolean;
};

export const documentTypeLabels: Record<string, string> = {
  doc_identidade: 'Documento Pessoal',
  doc_identidade_conjuge: 'Documento Pessoal do Cônjuge',
  comprovante_endereco: 'Comprovante de Endereço',
  certidao_casamento_nascimento: 'Certidão de Estado Civil',
  certidao_inteiro_teor: 'Certidão de Inteiro Teor',
  certidao_inteiro_teor_escritura: 'Certidão de Inteiro Teor/Escritura',
  certidao_onus_acoes: 'Certidão de Ônus/Ações',
  comprovante_renda: 'Comprovante de Renda',
  seguro_incendio: 'Apólice/Comprovante de Seguro Incêndio',
  dados_bancarios: 'Dados Bancários',
  contrato_minuta: 'Contrato (Minuta)',
  contrato_assinado: 'Contrato Assinado',
  comprovante_pagamento: 'Comprovante de Pagamento',
  boleto_vistoria: 'Boleto de Vistoria',
  outro: 'Outro',
  cliente_cnh: 'CNH do Cliente',
  cliente_identidade: 'Identidade (RG) do Cliente',
  cliente_cpf: 'CPF do Cliente',
};

export const outroMatrixSlotTypes = Array.from({ length: 15 }, (_, index) =>
  `cliente_outro_${String(index + 1).padStart(2, '0')}`
);

export const signedReviewDocTypes = new Set([
  'contrato_assinado',
  'comprovante_pagamento',
  'boleto_vistoria',
]);

export const contractScopedDocumentTypes = new Set([
  'contrato_minuta',
  'contrato_assinado',
  'comprovante_pagamento',
  'boleto_vistoria',
  'outro',
  'certidao_inteiro_teor_escritura',
  ...outroMatrixSlotTypes,
]);

export const saleRequiredDocTypes = [
  'doc_identidade',
  'comprovante_endereco',
  'certidao_casamento_nascimento',
  'certidao_inteiro_teor',
  'certidao_onus_acoes',
];

export const rentRequiredDocTypes = [
  'doc_identidade',
  'comprovante_endereco',
  'certidao_casamento_nascimento',
  'comprovante_renda',
  'certidao_inteiro_teor_escritura',
  'seguro_incendio',
];

export const sellerRequiredInfoFields: RequiredFieldDescriptor[] = [
  { keys: ['estado_civil', 'estadoCivil'], label: 'Estado Civil' },
  { keys: ['profissao'], label: 'Profissão' },
  { keys: ['dados_bancarios', 'dadosBancarios'], label: 'Dados Bancários' },
];

export const buyerRequiredInfoFields: RequiredFieldDescriptor[] = [
  { keys: ['estado_civil', 'estadoCivil'], label: 'Estado Civil' },
  { keys: ['profissao'], label: 'Profissão' },
];

export const buyerRentalRequiredInfoFields: RequiredFieldDescriptor[] = [
  { keys: ['garantia_locacao', 'garantiaLocacao'], label: 'Garantia de Locação' },
];

export const maritalStatusOptions = [
  '',
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
];

export const matrixDocumentSortOrder = [
  'doc_identidade',
  'doc_identidade_conjuge',
  'comprovante_endereco',
  'certidao_casamento_nascimento',
  'certidao_inteiro_teor',
  'certidao_inteiro_teor_escritura',
  'certidao_onus_acoes',
  'comprovante_renda',
  'seguro_incendio',
  'dados_bancarios',
  'outro',
];

export const buyerMatrixDocumentTypes = new Set([
  'doc_identidade',
  'comprovante_endereco',
  'certidao_casamento_nascimento',
  'comprovante_renda',
  'outro',
]);

export function normalizePossiblyMojibakeText(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (!/[ÃÂ�]/.test(trimmed)) return trimmed;

  try {
    const bytes = Uint8Array.from(trimmed, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder('utf-8').decode(bytes).trim();
    if (!decoded || decoded.includes('�')) return trimmed;
    return decoded;
  } catch {
    return trimmed;
  }
}

export function getRecordValueRaw(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): string {
  if (!source) return '';
  for (const key of keys) {
    const value = source[key];
    if (value != null && String(value).trim().length > 0) {
      return String(value).trim();
    }
  }
  return '';
}

export function getRecordValue(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): string {
  const raw = getRecordValueRaw(source, keys);
  return raw.length ? raw : '-';
}

export function hasRecordValue(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): boolean {
  if (!source) return false;
  for (const key of keys) {
    const value = source[key];
    if (value != null && String(value).trim().length > 0) {
      return true;
    }
  }
  return false;
}

export function formatPhoneMaskBr(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getBuyerDisplayName(contract: ContractItem | null | undefined): string {
  if (!contract) return '-';

  const buyerInfo = contract.buyerInfo ?? null;
  const fromInfo = getRecordValueRaw(buyerInfo, [
    'nome',
    'nome_completo',
    'nomeCompleto',
    'buyer_name',
    'buyerName',
    'cliente_nome',
    'clienteNome',
    'nome_cliente',
    'nomeCliente',
    'name',
    'full_name',
    'fullName',
  ]);
  if (fromInfo.length > 0) {
    return fromInfo;
  }

  if (buyerInfo && typeof buyerInfo === 'object') {
    const nestedBuyer = (buyerInfo as Record<string, unknown>).buyer;
    if (nestedBuyer && typeof nestedBuyer === 'object') {
      const nestedBuyerName = getRecordValueRaw(nestedBuyer as Record<string, unknown>, [
        'nome',
        'nome_completo',
        'nomeCompleto',
        'buyer_name',
        'buyerName',
        'cliente_nome',
        'clienteNome',
        'nome_cliente',
        'nomeCliente',
        'name',
        'full_name',
        'fullName',
      ]);
      if (nestedBuyerName.length > 0) {
        return nestedBuyerName;
      }
    }
  }

  const directName = String(
    contract.buyerClientName ??
      contract.buyer_client_name ??
      (contract as unknown as Record<string, unknown>).buyerName ??
      (contract as unknown as Record<string, unknown>).buyer_name ??
      contract.proposerName ??
      contract.clientName ??
      (contract as unknown as Record<string, unknown>).client_name ??
      (contract as unknown as Record<string, unknown>).clientName ??
      ''
  ).trim();
  if (directName.length > 0) {
    return directName;
  }

  return '-';
}

function getOptionalNumericField(
  contract: ContractItem | null | undefined,
  keys: string[]
): number | null {
  if (!contract) return null;

  for (const key of keys) {
    const raw = (contract as unknown as Record<string, unknown>)[key];
    if (raw == null || raw === '') {
      continue;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function getContractOwnerId(contract: ContractItem | null | undefined): number | null {
  return getOptionalNumericField(contract, [
    'ownerId',
    'propertyOwnerId',
    'property_owner_id',
    'owner_id',
  ]);
}

export function getContractBuyerClientId(
  contract: ContractItem | null | undefined
): number | null {
  return getOptionalNumericField(contract, [
    'buyerClientId',
    'buyer_client_id',
  ]);
}

export function getContractSellerClientId(
  contract: ContractItem | null | undefined
): number | null {
  return getOptionalNumericField(contract, [
    'sellerClientId',
    'seller_client_id',
  ]);
}

export function getAdvertiserDisplayName(contract: ContractItem | null | undefined): string {
  if (!contract) return '-';

  const directName = String(
    contract.advertiserName ??
      contract.capturingBrokerName ??
      ''
  ).trim();

  if (directName.length > 0) {
    return directName;
  }

  return '-';
}

// The advertiser/capturing broker is an operational actor, not necessarily the legal seller.
// Contract screens labelled "Vendedor" must resolve only the legal qualification/property owner.
export function getSellerDisplayName(contract: ContractItem | null | undefined): string {
  if (!contract) return '-';

  const sellerInfo = contract.sellerInfo ?? contract.ownerInfo ?? null;
  const fromInfo = getRecordValueRaw(sellerInfo, [
    'nome',
    'nome_completo',
    'nomeCompleto',
    'owner_name',
    'ownerName',
    'seller_name',
    'sellerName',
    'name',
    'full_name',
    'fullName',
  ]);
  if (fromInfo.length > 0) {
    return fromInfo;
  }

  const directName = String(
    contract.sellerClientName ??
      contract.propertyOwnerName ??
      contract.ownerName ??
      (contract as unknown as Record<string, unknown>).seller_name ??
      (contract as unknown as Record<string, unknown>).seller_client_name ??
      (contract as unknown as Record<string, unknown>).property_owner_name ??
      (contract as unknown as Record<string, unknown>).owner_name ??
      ''
  ).trim();

  return directName || '-';
}

export function getOwnerDisplayName(contract: ContractItem | null | undefined): string {
  return getSellerDisplayName(contract);
}

export function getContractPartySummary(contract: ContractItem | null | undefined): string {
  if (!contract) return 'Vendedor: - · Comprador: -';
  return `Vendedor: ${getSellerDisplayName(contract)} · Comprador: ${getBuyerDisplayName(contract)}`;
}

export function formatDocumentPreviewName(doc: ContractDocument | null | undefined): string {
  if (!doc) return 'Documento';
  const original = normalizePossiblyMojibakeText(String(doc.originalFileName ?? ''));
  return original || documentLabel(doc.documentType ?? doc.type ?? null);
}
