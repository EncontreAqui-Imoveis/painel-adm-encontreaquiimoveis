import type { ContractApprovalStatus, ContractDocument, ContractItem } from './types';

export type ContractStatus = ContractItem['status'];

export const tabs: { key: ContractStatus; label: string }[] = [
  { key: 'AWAITING_DOCS', label: 'Aguardando Documentos' },
  { key: 'IN_DRAFT', label: 'Em Confecção' },
  { key: 'AWAITING_SIGNATURES', label: 'Aguardando Assinaturas' },
  { key: 'FINALIZED', label: 'Finalizados' },
];

export const documentTypeLabels: Record<string, string> = {
  doc_identidade: 'Documento Pessoal',
  doc_identidade_conjuge: 'Documento Pessoal do Cônjuge',
  comprovante_endereco: 'Comprovante de Endereço',
  certidao_casamento_nascimento: 'Certidão de Estado Civil',
  certidao_inteiro_teor: 'Certidão de Inteiro Teor',
  certidao_inteiro_teor_escritura: 'Certidão de Inteiro Teor/Escritura',
  certidao_onus_acoes: 'Certidão de Ônus/Ações',
  comprovante_renda: 'Comprovante de Renda',
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

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
}

export function documentLabel(type?: string | null): string {
  if (!type) return 'Documento';
  const normalized = String(type).trim().toLowerCase();
  if (normalized.startsWith('cliente_outro_')) {
    return 'Outro';
  }
  return documentTypeLabels[normalized] ?? type;
}

export function normalizeDocumentStatus(doc?: ContractDocument | null): string {
  const direct = String(doc?.status ?? doc?.categoryStatus ?? '').trim().toUpperCase();
  if (direct.length > 0) {
    return direct;
  }

  const metadata = doc?.metadata ?? null;
  return String(metadata?.status ?? metadata?.reviewStatus ?? metadata?.validationStatus ?? '')
    .trim()
    .toUpperCase();
}

export function hasDocumentReviewStatus(doc?: ContractDocument | null): boolean {
  const status = normalizeDocumentStatus(doc);
  return status === 'REJECTED' || status === 'NOT_APPLICABLE' || status === 'PENDING';
}

export function documentStatusLabel(doc?: ContractDocument | null): string {
  const status = normalizeDocumentStatus(doc);
  if (status === 'APPROVED') return 'Aprovado';
  if (status === 'APPROVED_WITH_RES') return 'Aprovado com ressalvas';
  if (status === 'REJECTED') return 'Rejeitado';
  if (status === 'NOT_APPLICABLE') return 'Não aplicável';
  if (status === 'PENDING') return 'Pendente';
  return '';
}

export function documentStatusClass(doc?: ContractDocument | null): string {
  const status = normalizeDocumentStatus(doc);
  if (status === 'APPROVED') {
    return 'bg-emerald-600 text-white';
  }
  if (status === 'APPROVED_WITH_RES') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }
  if (status === 'REJECTED') {
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  }
  if (status === 'NOT_APPLICABLE') {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300';
  }
  if (status === 'PENDING') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function normalizePossiblyMojibakeText(value: string): string {
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

export function isRentalContract(contract?: ContractItem | null): boolean {
  return contract?.dealType === 'rent';
}

export function contractSideLabel(
  contract: ContractItem | null | undefined,
  side: 'seller' | 'buyer'
): string {
  if (isRentalContract(contract)) {
    return side === 'seller' ? 'Locador' : 'Locatário';
  }
  return side === 'seller' ? 'Vendedor' : 'Comprador';
}

export function contractSideDataLabel(
  contract: ContractItem | null | undefined,
  side: 'seller' | 'buyer'
): string {
  return `Dados ${contractSideLabel(contract, side)}`;
}

export function contractSideDocumentDescription(
  contract: ContractItem | null | undefined,
  side: 'seller' | 'buyer'
): string {
  if (isRentalContract(contract)) {
    return side === 'seller' ? 'Documentos do locador legal' : 'Documentos do locatário legal';
  }
  return side === 'seller' ? 'Documentos do proprietário legal' : 'Documentos do adquirente legal';
}

export function contractDraftTemplateSummary(contract?: ContractItem | null): {
  label: string;
  templateKey: string;
  templateVersion: string;
} {
  const draftMetadata = (contract?.documents ?? []).find(
    (doc) => String(doc.documentType ?? '').trim().toLowerCase() === 'contrato_minuta'
  )?.metadata;
  const metadata = draftMetadata && typeof draftMetadata === 'object' ? draftMetadata : {};
  const isRental = isRentalContract(contract);
  const templateKey = String(
    metadata.templateKey ?? (isRental ? 'rental_contract_v1' : 'sale_contract_v1')
  );
  const templateVersion = String(metadata.templateVersion ?? '1');
  return {
    label: isRental ? 'Contrato de Locação' : 'Contrato de Compra e Venda',
    templateKey,
    templateVersion,
  };
}

export function documentSideLabel(
  doc?: ContractDocument | null,
  contract?: ContractItem | null
): string {
  const side = String(doc?.side ?? '').trim().toLowerCase();
  if (side === 'seller') return contractSideLabel(contract, 'seller');
  if (side === 'buyer') return contractSideLabel(contract, 'buyer');
  return '';
}

export function truncateFileName(name: string, maxLen = 15): string {
  const trimmed = String(name ?? '').trim();
  if (trimmed.length <= maxLen) return trimmed;

  const lastDotIndex = trimmed.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return trimmed.slice(0, maxLen) + '...';
  }

  const baseName = trimmed.slice(0, lastDotIndex);
  const extension = trimmed.slice(lastDotIndex);

  if (baseName.length <= maxLen) {
    return trimmed;
  }

  return baseName.slice(0, maxLen) + '...' + extension.slice(1);
}

export function documentFileName(doc?: ContractDocument | null): string {
  const original = normalizePossiblyMojibakeText(String(doc?.originalFileName ?? ''));
  if (original.length > 0) {
    return truncateFileName(original, 15);
  }
  const type = String(doc?.documentType ?? '').trim();
  if (type.length > 0) {
    return truncateFileName(`${type}.pdf`, 15);
  }
  return 'documento.pdf';
}

export function tableActionLabel(status?: string | null): string {
  const normalized = String(status ?? '').trim().toUpperCase();
  if (normalized === 'AWAITING_DOCS') return 'Analisar Documentação';
  if (normalized === 'IN_DRAFT') return 'Anexar Minuta';
  if (normalized === 'AWAITING_SIGNATURES') return 'Finalizar Venda/Locação';
  return 'Editar';
}

export function statusLabel(status?: string | null): string {
  const normalized = String(status ?? '').trim();
  return tabs.find((tab) => tab.key === normalized)?.label ?? normalized;
}

export function previousStageLabel(currentStatus?: string | null): string {
  const normalized = String(currentStatus ?? '').trim().toUpperCase();
  if (normalized === 'IN_DRAFT') {
    return 'a aba de documentos pendentes';
  }
  if (normalized === 'AWAITING_SIGNATURES') {
    return 'a aba de confecção da minuta';
  }
  return 'a etapa anterior';
}

export function approvalLabel(status?: ContractApprovalStatus | null): string {
  switch (String(status ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'Aprovado';
    case 'APPROVED_WITH_RES':
      return 'Aprovado com ressalvas';
    case 'REJECTED':
      return 'Rejeitado';
    default:
      return 'Pendente';
  }
}

export function approvalBadgeClass(status?: ContractApprovalStatus | null): string {
  switch (String(status ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'APPROVED_WITH_RES':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function approvalAllowsProgress(status?: ContractApprovalStatus | null): boolean {
  const normalized = String(status ?? '').trim().toUpperCase();
  return normalized === 'APPROVED' || normalized === 'APPROVED_WITH_RES';
}

export function getSideApprovalUiState(
  status?: ContractApprovalStatus | null
): 'pending' | 'approved' | 'rejected' {
  const normalized = String(status ?? '').trim().toUpperCase();
  if (normalized === 'REJECTED') return 'rejected';
  if (approvalAllowsProgress(status)) return 'approved';
  return 'pending';
}

export function canApproveSide(status?: ContractApprovalStatus | null): boolean {
  const uiState = getSideApprovalUiState(status);
  return uiState === 'pending' || uiState === 'rejected';
}

export function canRejectSide(status?: ContractApprovalStatus | null): boolean {
  const uiState = getSideApprovalUiState(status);
  return uiState === 'pending' || uiState === 'approved';
}

export function canRestartSide(status?: ContractApprovalStatus | null): boolean {
  return getSideApprovalUiState(status) !== 'pending';
}

export function getApprovalProgressLabel(contract: ContractItem | null | undefined): string {
  if (!contract) return 'Pendente';
  const backendLabel = contract.approvalProgress?.label?.trim();
  if (backendLabel) return backendLabel;

  const sellerStatus = String(contract.sellerApprovalStatus ?? '').trim().toUpperCase();
  const buyerStatus = String(contract.buyerApprovalStatus ?? '').trim().toUpperCase();
  const sellerProgress = approvalAllowsProgress(contract.sellerApprovalStatus);
  const buyerProgress = approvalAllowsProgress(contract.buyerApprovalStatus);

  if (sellerStatus === 'REJECTED' || buyerStatus === 'REJECTED') {
    return 'Rejeitado';
  }

  if (sellerProgress && buyerProgress) {
    return sellerStatus === 'APPROVED_WITH_RES' || buyerStatus === 'APPROVED_WITH_RES'
      ? 'Aprovado com ressalvas'
      : 'Aprovado';
  }

  if (sellerProgress || buyerProgress) {
    return 'Em análise';
  }

  return 'Pendente';
}

export function isRejectedContract(contract: ContractItem | null | undefined): boolean {
  if (!contract) return false;

  const backendStatus = String(contract.approvalProgress?.status ?? '').trim().toUpperCase();
  const backendLabel = String(contract.approvalProgress?.label ?? '').trim().toLowerCase();
  const sellerStatus = String(contract.sellerApprovalStatus ?? '').trim().toUpperCase();
  const buyerStatus = String(contract.buyerApprovalStatus ?? '').trim().toUpperCase();

  if (backendStatus === 'REJECTED') return true;
  if (backendLabel === 'rejeitado') return true;
  return sellerStatus === 'REJECTED' || buyerStatus === 'REJECTED';
}

export function getApprovalProgressToneClass(contract: ContractItem | null | undefined): string {
  const backendStatus = String(contract?.approvalProgress?.status ?? '').trim().toUpperCase();
  const sellerStatus = String(contract?.sellerApprovalStatus ?? '').trim().toUpperCase();
  const buyerStatus = String(contract?.buyerApprovalStatus ?? '').trim().toUpperCase();
  const status = backendStatus || sellerStatus || buyerStatus;

  if (status === 'REJECTED') {
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  }
  if (status === 'APPROVED_WITH_RES') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }
  if (status === 'APPROVED') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  }
  if (status === 'IN_PROGRESS') {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export function getApprovalNextStepLabel(contract: ContractItem | null | undefined): string {
  if (!contract) return 'Aguardando avaliação dos dois lados';
  const backendNextStep = contract.approvalProgress?.nextStep?.trim();
  if (backendNextStep) return backendNextStep;

  const sellerStatus = String(contract.sellerApprovalStatus ?? '').trim().toUpperCase();
  const buyerStatus = String(contract.buyerApprovalStatus ?? '').trim().toUpperCase();
  const sellerProgress = approvalAllowsProgress(contract.sellerApprovalStatus);
  const buyerProgress = approvalAllowsProgress(contract.buyerApprovalStatus);

  if (sellerStatus === 'REJECTED' || buyerStatus === 'REJECTED') {
    return 'Aguardando correção do lado rejeitado';
  }

  if (sellerProgress && buyerProgress) {
    return 'Pronto para a minuta';
  }

  if (sellerProgress && !buyerProgress) {
    return 'Aguardando aprovação do comprador';
  }

  if (!sellerProgress && buyerProgress) {
    return 'Aguardando aprovação do captador';
  }

  return 'Aguardando avaliação dos dois lados';
}
