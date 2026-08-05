import { get } from 'svelte/store';
import { writable } from 'svelte/store';
import { authToken } from './store';

const ADMIN_SESSION_KEY = 'adminSession';

export type AdminCapabilities = {
  canReviewDocuments: boolean;
  canReplaceDocuments: boolean;
  canCreateDocuments: boolean;
  canManageContractWorkflow: boolean;
  canDeleteDocuments: boolean;
  canDeleteEntities: boolean;
  canClearNotifications: boolean;
  canManageAdministration?: boolean;
};

export type AdminSession = {
  role: 'admin' | 'document_operator';
  capabilities: AdminCapabilities;
  id?: number;
  name?: string;
  email?: string;
};

function readAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (!parsed.capabilities || typeof parsed.capabilities !== 'object') return null;
    return {
      role: parsed.role === 'document_operator' ? 'document_operator' : 'admin',
      capabilities: parsed.capabilities as AdminCapabilities,
      id: typeof parsed.id === 'number' ? parsed.id : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export const adminSession = writable<AdminSession | null>(readAdminSession());
adminSession.subscribe((value) => {
  if (typeof window === 'undefined') return;
  if (value) {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(value));
  } else {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
});

export const sessionToken = authToken;

export function readSessionToken(): string | null {
  return get(authToken);
}

export function hasSessionToken(): boolean {
  return Boolean(readSessionToken());
}

export function setSessionToken(token: string | null): void {
  authToken.set(token);
}

export function setAdminSession(token: string, admin: unknown): void {
  authToken.set(token);
  const candidate = admin as Partial<AdminSession> | null;
  if (!candidate?.capabilities || typeof candidate.capabilities !== 'object') {
    adminSession.set(null);
    return;
  }
  adminSession.set({
    role: candidate.role === 'document_operator' ? 'document_operator' : 'admin',
    capabilities: candidate.capabilities as AdminCapabilities,
    id: typeof candidate.id === 'number' ? candidate.id : undefined,
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
    email: typeof candidate.email === 'string' ? candidate.email : undefined,
  });
}

export function clearSessionToken(): void {
  authToken.set(null);
  adminSession.set(null);
}
