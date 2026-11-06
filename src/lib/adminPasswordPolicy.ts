// Mesmo contrato de security/passwordPolicy.ts da API: somente NOVAS senhas.
export const ADMIN_PASSWORD_MIN_LENGTH = 14;
export const PASSWORD_MAX_LENGTH = 128;

export function validateNewAdminPassword(password: string): string | null {
  if (password.trim().length === 0) return 'Informe uma senha.';
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return `A senha deve ter pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `A senha deve ter no maximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  return null;
}

export function isAdminPasswordPolicyError(code: unknown): boolean {
  return ['PASSWORD_REQUIRED', 'PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG'].includes(String(code));
}
