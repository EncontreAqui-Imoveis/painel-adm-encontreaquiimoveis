// Mesmo contrato de security/passwordPolicy.ts da API: somente NOVAS senhas.
export const ADMIN_PASSWORD_MIN_LENGTH = 14;
export const ADMIN_PASSWORD_MAX_BYTES = 72;

export function validateNewAdminPassword(password: string): string | null {
  if (password.trim().length === 0) return 'Informe uma senha.';
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return `A senha deve ter pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`;
  if (new TextEncoder().encode(password).length > ADMIN_PASSWORD_MAX_BYTES) return `A senha deve ter no máximo ${ADMIN_PASSWORD_MAX_BYTES} bytes UTF-8. Acentos e emojis podem ocupar mais de um byte.`;
  return null;
}

export function isAdminPasswordPolicyError(code: unknown): boolean {
  return ['PASSWORD_REQUIRED', 'PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG', 'PASSWORD_TOO_LONG_BYTES', 'PASSWORD_NOT_DIFFERENT'].includes(String(code));
}
