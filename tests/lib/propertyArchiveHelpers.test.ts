import { describe, expect, it } from 'vitest';
import {
  extractCoverUrl,
  formatAreaFromDetail,
  formatCurrency,
  formatDate,
  propertyStatusLabel,
  purposeLabel,
  statusClass,
  statusLabel,
} from '../../src/lib/components/property-archive/propertyArchiveHelpers';

describe('propertyArchiveHelpers', () => {
  it('formats status and labels consistently', () => {
    expect(statusLabel('sold')).toBe('Vendido');
    expect(statusClass('rented')).toContain('amber');
    expect(propertyStatusLabel('pending_approval')).toBe('Pendente');
    expect(purposeLabel('')).toBe('-');
  });

  it('formats dates, currency and area fallbacks', () => {
    expect(formatDate('2026-03-01T10:00:00.000Z')).toBe('01/03/2026');
    expect(formatCurrency(350000)).toContain('R$');
    expect(formatAreaFromDetail(null, 2332, 'hectare')).toBe('2332 ha');
  });

  it('extracts the cover URL from the supported payload shapes', () => {
    expect(
      extractCoverUrl({
        images: JSON.stringify([{ url: 'https://cdn.example.com/capa.jpg' }]),
      }),
    ).toBe('https://cdn.example.com/capa.jpg');
    expect(
      extractCoverUrl({
        image_url: ' https://cdn.example.com/direta.jpg ',
      }),
    ).toBe('https://cdn.example.com/direta.jpg');
  });
});
