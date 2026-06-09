import { describe, expect, it } from 'vitest';
import {
  humanizePropertyRequestType,
  inferPropertyRequestType,
  propertyRequestTypeBadgeClasses,
  reviewPropertyRequestTypeLabel,
} from '../../src/lib/components/property/propertyReviewHelpers';

describe('propertyReviewHelpers', () => {
  it('classifica a solicitação por timestamps quando o backend não informa o tipo', () => {
    expect(
      inferPropertyRequestType({
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:03:00Z',
      })
    ).toBe('edit');
    expect(
      inferPropertyRequestType({
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:10Z',
      })
    ).toBe('creation');
  });

  it('normaliza rótulos e badges da solicitação', () => {
    expect(humanizePropertyRequestType('creation')).toBe('Criação');
    expect(propertyRequestTypeBadgeClasses('edit')).toContain('blue');
    expect(reviewPropertyRequestTypeLabel('all')).toBe('criação e edição');
  });
});
