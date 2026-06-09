import { describe, expect, it } from 'vitest';
import {
  extractRequestIdFromError,
  formatBrokerReviewDate,
  formatBrokerReviewErrorMessage,
  getBrokerDocumentActionLabel,
  getBrokerDocumentLabel,
  resolveBrokerDocumentUrls,
} from '../../src/lib/components/broker/brokerReviewHelpers';

describe('brokerReviewHelpers', () => {
  it('formata data e labels dos documentos', () => {
    expect(formatBrokerReviewDate('2026-01-10T10:00:00Z')).toContain('10/01/2026');
    expect(getBrokerDocumentLabel('creciFront')).toBe('Frente do CRECI');
    expect(getBrokerDocumentActionLabel('replace', 'selfie')).toBe('Substituir selfie com creci');
  });

  it('extrai requestId de diferentes origens', () => {
    expect(extractRequestIdFromError({ requestId: 'abc-123' })).toBe('abc-123');
    expect(
      extractRequestIdFromError({
        response: { data: { request_id: 'xyz-987' } },
      })
    ).toBe('xyz-987');
  });

  it('formata mensagem de erro com requestId quando disponível', () => {
    expect(
      formatBrokerReviewErrorMessage(
        { message: 'Falha de atualização', requestId: 'req-1' },
        'Fallback'
      )
    ).toBe('Falha de atualização (requestId: req-1)');
  });

  it('resolve urls de documentos em payload legado', () => {
    expect(
      resolveBrokerDocumentUrls({
        id: 1,
        documents: {
          creci_front_url: '/uploads/front.jpg',
          creci_back_url: 'https://example.com/back.jpg',
          selfie_url: 'https://example.com/selfie.jpg',
        },
      })
    ).toEqual({
      creciFrontUrl: '',
      creciBackUrl: 'https://example.com/back.jpg',
      selfieUrl: 'https://example.com/selfie.jpg',
    });
  });
});
