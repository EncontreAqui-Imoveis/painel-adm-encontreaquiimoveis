const STATUS_LABELS: Record<string, string> = {
  pending_verification: 'Pendente de verificação',
  pending_documents: 'Pendente de documentos',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  pending: 'Pendente',
};

const STATUS_BADGES: Record<string, string> = {
  pending_verification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending_documents: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

export function normalizeBrokerStatus(status?: string | null): string {
  return String(status ?? '').trim().toLowerCase();
}

export function formatBrokerStatusLabel(status?: string | null): string {
  const normalized = normalizeBrokerStatus(status);
  if (!normalized) return '-';
  return STATUS_LABELS[normalized] ?? status ?? '-';
}

export function getBrokerStatusBadgeClass(status?: string | null): string {
  const normalized = normalizeBrokerStatus(status);
  if (!normalized) {
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
  return (
    STATUS_BADGES[normalized] ??
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  );
}
