import { describe, expect, it } from 'vitest';
import {
  humanizePropertyStatus,
  propertyStatusBadgeClasses,
  publicCodeLabel,
  resolveSelectedPropertyPublicCode,
} from '../../src/lib/components/property/propertyPresentationHelpers';

describe('propertyPresentationHelpers', () => {
  it('formata status e classes visuais do imóvel', () => {
    expect(humanizePropertyStatus('approved', 'Casa')).toBe('Casa');
    expect(humanizePropertyStatus('sold')).toBe('Vendido');
    expect(propertyStatusBadgeClasses('rented')).toContain('amber');
  });

  it('normaliza referência pública', () => {
    expect(publicCodeLabel('-')).toBe('Sem referência pública');
    expect(resolveSelectedPropertyPublicCode('RV-100')).toBe('RV-100');
  });
});
