import { describe, expect, it } from 'vitest';

import {
  formatBrokerStatusLabel,
  getBrokerStatusBadgeClass,
  normalizeBrokerStatus,
} from '../../src/lib/utils/brokerStatus';

describe('brokerStatus utils', () => {
  it('normaliza status e rótulos em português', () => {
    expect(normalizeBrokerStatus('  pending_documents ')).toBe('pending_documents');
    expect(formatBrokerStatusLabel('pending_verification')).toBe('Pendente de verificação');
    expect(formatBrokerStatusLabel('pending_documents')).toBe('Pendente de documentos');
    expect(formatBrokerStatusLabel('approved')).toBe('Aprovado');
    expect(formatBrokerStatusLabel('rejected')).toBe('Rejeitado');
    expect(formatBrokerStatusLabel('desconhecido')).toBe('desconhecido');
  });

  it('retorna badge seguro para status conhecido e desconhecido', () => {
    expect(getBrokerStatusBadgeClass('approved')).toContain('bg-green-100');
    expect(getBrokerStatusBadgeClass('pending_documents')).toContain('bg-amber-100');
    expect(getBrokerStatusBadgeClass('desconhecido')).toContain('bg-gray-100');
  });
});
