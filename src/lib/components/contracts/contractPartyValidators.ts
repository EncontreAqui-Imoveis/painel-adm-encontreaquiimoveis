export const contractPartyFieldLimits = {
  name: 120,
  profession: 80,
  email: 254,
  cpfDigits: 11,
  phoneDigits: 11,
  bankDetails: 500,
} as const;

export function normalizeCpfDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, contractPartyFieldLimits.cpfDigits);
}

export function formatCpf(value: string | null | undefined): string {
  const digits = normalizeCpfDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidCpf(value: string | null | undefined): boolean {
  const digits = normalizeCpfDigits(value);
  if (digits.length !== contractPartyFieldLimits.cpfDigits || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const checkDigit = (base: string, factor: number) => {
    const sum = [...base].reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return checkDigit(digits.slice(0, 9), 10) === Number(digits[9]) &&
    checkDigit(digits.slice(0, 10), 11) === Number(digits[10]);
}

export function normalizePhoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, contractPartyFieldLimits.phoneDigits);
}

export function formatPhoneBr(value: string | null | undefined): string {
  const digits = normalizePhoneDigits(value);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${area}) ${local}`;
  const localPrefixLength = digits.length === 11 ? 5 : 4;
  return `(${area}) ${local.slice(0, localPrefixLength)}-${local.slice(localPrefixLength)}`;
}

export function isValidPhoneBr(value: string | null | undefined): boolean {
  const length = normalizePhoneDigits(value).length;
  return length === 10 || length === 11;
}

export function isValidEmail(value: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());
}
