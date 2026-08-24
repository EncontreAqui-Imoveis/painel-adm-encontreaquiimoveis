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
  role: 'admin' | 'document_operator' | 'operational_assistant';
  capabilities: AdminCapabilities;
  id?: number;
  name?: string;
  email?: string;
};

export function getDefaultAdminCapabilities(role: 'admin' | 'document_operator' | 'operational_assistant' = 'admin'): AdminCapabilities {
  const isAdmin = role === 'admin';
  const canManageWorkflow = isAdmin || role === 'operational_assistant';
  return {
    canReviewDocuments: true,
    canReplaceDocuments: true,
    canCreateDocuments: canManageWorkflow,
    canManageContractWorkflow: canManageWorkflow,
    canDeleteDocuments: isAdmin,
    canDeleteEntities: isAdmin,
    canClearNotifications: isAdmin,
    canManageAdministration: isAdmin,
  };
}

function resolveCapabilities(role: 'admin' | 'document_operator' | 'operational_assistant', rawCapabilities?: unknown): AdminCapabilities {
  const defaults = getDefaultAdminCapabilities(role);
  if (!rawCapabilities || typeof rawCapabilities !== 'object') {
    return defaults;
  }
  const caps = rawCapabilities as Record<string, unknown>;
  return {
    canReviewDocuments: typeof caps.canReviewDocuments === 'boolean' ? caps.canReviewDocuments : defaults.canReviewDocuments,
    canReplaceDocuments: typeof caps.canReplaceDocuments === 'boolean' ? caps.canReplaceDocuments : defaults.canReplaceDocuments,
    canCreateDocuments: typeof caps.canCreateDocuments === 'boolean' ? caps.canCreateDocuments : defaults.canCreateDocuments,
    canManageContractWorkflow: typeof caps.canManageContractWorkflow === 'boolean' ? caps.canManageContractWorkflow : defaults.canManageContractWorkflow,
    canDeleteDocuments: typeof caps.canDeleteDocuments === 'boolean' ? caps.canDeleteDocuments : defaults.canDeleteDocuments,
    canDeleteEntities: typeof caps.canDeleteEntities === 'boolean' ? caps.canDeleteEntities : defaults.canDeleteEntities,
    canClearNotifications: typeof caps.canClearNotifications === 'boolean' ? caps.canClearNotifications : defaults.canClearNotifications,
    canManageAdministration: typeof caps.canManageAdministration === 'boolean' ? caps.canManageAdministration : defaults.canManageAdministration,
  };
}

function readAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    const role: 'admin' | 'document_operator' | 'operational_assistant' =
      parsed.role === 'document_operator'
        ? 'document_operator'
        : parsed.role === 'operational_assistant'
          ? 'operational_assistant'
          : 'admin';
    return {
      role,
      capabilities: resolveCapabilities(role, parsed.capabilities),
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
  const role: 'admin' | 'document_operator' | 'operational_assistant' =
    candidate?.role === 'document_operator'
      ? 'document_operator'
      : candidate?.role === 'operational_assistant'
        ? 'operational_assistant'
        : 'admin';
  adminSession.set({
    role,
    capabilities: resolveCapabilities(role, candidate?.capabilities),
    id: typeof candidate?.id === 'number' ? candidate.id : undefined,
    name: typeof candidate?.name === 'string' ? candidate.name : undefined,
    email: typeof candidate?.email === 'string' ? candidate.email : undefined,
  });
}

export function clearSessionToken(): void {
  authToken.set(null);
  adminSession.set(null);
}
