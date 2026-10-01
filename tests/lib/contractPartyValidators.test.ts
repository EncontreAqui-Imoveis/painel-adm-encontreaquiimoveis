import { describe, expect, it } from 'vitest';

import {
  formatCpf,
  formatPhoneBr,
  isValidCpf,
  isValidEmail,
  isValidPhoneBr,
  normalizeCpfDigits,
  normalizePhoneDigits,
} from '../../src/lib/components/contracts/contractPartyValidators';

describe('contractPartyValidators', () => {
  it('mascara e normaliza CPF sem enviar pontuação', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(normalizeCpfDigits('529.982.247-25')).toBe('52998224725');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('mascara telefones brasileiros de 10 e 11 dígitos', () => {
    expect(formatPhoneBr('1133334444')).toBe('(11) 3333-4444');
    expect(formatPhoneBr('11999994444')).toBe('(11) 99999-4444');
    expect(normalizePhoneDigits('(11) 99999-4444')).toBe('11999994444');
    expect(isValidPhoneBr('1133334444')).toBe(true);
    expect(isValidPhoneBr('11999994444')).toBe(true);
    expect(isValidPhoneBr('11999')).toBe(false);
  });

  it('rejeita e-mail incompleto', () => {
    expect(isValidEmail('aads@')).toBe(false);
    expect(isValidEmail('contato@example.com')).toBe(true);
  });
});
