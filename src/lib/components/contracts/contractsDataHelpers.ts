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
  doc_identidade: 'Documento de Identidade',
  comprovante_endereco: 'Comprovante de Endereço',
  certidao_casamento_nascimento: 'Certidão de Casamento/Nascimento',
  certidao_inteiro_teor: 'Certidão de Inteiro Teor',
  certidao_onus_acoes: 'Certidão de Ônus/Ações',
  comprovante_renda: 'Comprovante de Renda',
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
];

export const sellerRequiredInfoFields: RequiredFieldDescriptor[] = [
  { keys: ['estado_civil', 'estadoCivil'], label: 'Estado Civil' },
  { keys: ['profissao'], label: 'Profissão' },
  { keys: ['email'], label: 'E-mail' },
  { keys: ['telefone', 'phone'], label: 'Telefone' },
  { keys: ['dados_bancarios', 'dadosBancarios'], label: 'Dados Bancários' },
];

export const buyerRequiredInfoFields: RequiredFieldDescriptor[] = [
  { keys: ['estado_civil', 'estadoCivil'], label: 'Estado Civil' },
  { keys: ['profissao'], label: 'Profissão' },
  { keys: ['email'], label: 'E-mail' },
  { keys: ['telefone', 'phone'], label: 'Telefone' },
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
  'Separado(a)',
  'União estável',
  'Não informado',
];

export const matrixDocumentSortOrder = [
  'doc_identidade',
  'comprovante_endereco',
  'certidao_casamento_nascimento',
  'certidao_inteiro_teor',
  'certidao_onus_acoes',
  'comprovante_renda',
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
  const directName = String(
    contract.buyerClientName ??
      contract.buyer_client_name ??
      contract.clientName ??
      (contract as unknown as Record<string, unknown>).client_name ??
      (contract as unknown as Record<string, unknown>).clientName ??
      (contract as unknown as Record<string, unknown>).buyerName ??
      (contract as unknown as Record<string, unknown>).buyer_name ??
      ''
  ).trim();
  if (directName.length > 0) {
    return directName;
  }

  const buyerInfo = contract.buyerInfo ?? null;
  const fromInfo = getRecordValueRaw(buyerInfo, [
    'nome',
    'nome_completo',
    'nomeCompleto',
    'buyer_name',
    'buyerName',
    'client_name',
    'clientName',
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
        'client_name',
        'clientName',
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

  return '-';
}

export function getOwnerDisplayName(contract: ContractItem | null | undefined): string {
  if (!contract) return '-';

  const directName = String(
    contract.ownerName ??
      contract.propertyOwnerName ??
      (contract.ownerInfo && typeof contract.ownerInfo === 'object'
        ? (contract.ownerInfo as Record<string, unknown>).nome ??
          (contract.ownerInfo as Record<string, unknown>).name ??
          (contract.ownerInfo as Record<string, unknown>).fullName ??
          (contract.ownerInfo as Record<string, unknown>).full_name
        : '') ??
      (contract as unknown as Record<string, unknown>).owner_name ??
      (contract as unknown as Record<string, unknown>).property_owner_name ??
      ''
  ).trim();

  if (directName.length > 0) {
    return directName;
  }

  const sellerInfo = contract.sellerInfo ?? null;
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

  return contract.capturingBrokerName ?? '-';
}

export function getContractPartySummary(contract: ContractItem | null | undefined): string {
  if (!contract) return 'Anunciante: - · Comprador: -';
  return `Anunciante: ${getOwnerDisplayName(contract)} · Comprador: ${getBuyerDisplayName(contract)}`;
}

export function formatDocumentPreviewName(doc: ContractDocument | null | undefined): string {
  if (!doc) return 'Documento';
  const original = normalizePossiblyMojibakeText(String(doc.originalFileName ?? ''));
  return original || documentLabel(doc.documentType ?? doc.type ?? null);
}
