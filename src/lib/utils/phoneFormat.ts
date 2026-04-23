function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhoneDisplayBr(
  value?: string | null,
  fallback = '-'
): string {
  if (value == null) return fallback;

  const trimmed = String(value).trim();
  if (!trimmed) return fallback;

  const digits = onlyDigits(trimmed);
  if (!digits) return trimmed;

  let localDigits = digits;
  if (localDigits.startsWith('55') && localDigits.length > 10) {
    localDigits = localDigits.slice(2);
  }
  if (localDigits.length > 11) {
    localDigits = localDigits.slice(-11);
  }

  if (localDigits.length === 11) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7)}`;
  }

  if (localDigits.length === 10) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
  }

  if (localDigits.length > 2) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2)}`;
  }

  return trimmed;
}
