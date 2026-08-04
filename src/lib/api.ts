import { authToken, clearStoredAuthToken } from './store';

// Vite injeta as variaveis apenas pela forma direta `import.meta.env`.
// Optional chaining aqui faz o cliente ignorar VITE_API_URL e cair no fallback.
const metaEnv = import.meta.env as Record<string, string | boolean | undefined>;
const envBase =
  metaEnv.VITE_API_URL ??
  '';
const isDev = Boolean(metaEnv.DEV);
const mode = String(metaEnv.MODE ?? '');
const isTestMode = mode === 'test' || mode === 'smoke' || String(metaEnv.VITE_TEST_MODE || '') === '1';
const resolvedBase =
  typeof envBase === 'string' && envBase.trim().length > 0
    ? envBase.trim()
    : isDev || isTestMode
      ? 'http://localhost:3333'
      : 'https://backend-production-6acc.up.railway.app';

if (!resolvedBase) {
  throw new Error('VITE_API_URL não configurado. Configure no .env do painel.');
}

let parsedBase: URL;
try {
  parsedBase = new URL(resolvedBase);
} catch {
  throw new Error('VITE_API_URL inválida. Use uma URL completa, ex: https://api.exemplo.com');
}

if (!isDev && parsedBase.protocol !== 'https:') {
  throw new Error('VITE_API_URL deve usar HTTPS em produção.');
}

// Remove barras finais para evitar URLs com "//" quando os endpoints já começam com "/"
export const baseURL = parsedBase.toString().replace(/\/+$/, '');

export function handleUnauthorizedResponse(status?: number): boolean {
  if (status === 401) {
    clearStoredAuthToken();
    authToken.set(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return true;
  }
  return false;
}
