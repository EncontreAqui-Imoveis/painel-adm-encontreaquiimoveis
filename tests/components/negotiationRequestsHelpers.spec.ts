import { describe, expect, it } from 'vitest';
import { formatCpf, isValidCpf, normalizeCpfDigits } from '../../src/lib/components/negotiations/negotiationRequestsHelpers';

describe('negotiationRequestsHelpers', () => {
  it('formata e normaliza CPF', () => {
    expect(normalizeCpfDigits('529.982.247-25')).toBe('52998224725');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCpf('529.982.247-25')).toBe('529.982.247-25');
  });

  it('valida CPF pela fórmula oficial', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123.456.789-00')).toBe(false);
  });
});
