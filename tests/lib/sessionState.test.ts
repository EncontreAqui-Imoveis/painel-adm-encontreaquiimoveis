import { beforeEach, describe, expect, it } from 'vitest';
import {
  adminSession,
  clearSessionToken,
  getDefaultAdminCapabilities,
  hasSessionToken,
  readSessionToken,
  setAdminSession,
  setSessionToken,
} from '../../src/lib/sessionState';

describe('sessionState', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    clearSessionToken();
  });

  it('persists and reads the current session token', () => {
    setSessionToken('session-token');

    expect(readSessionToken()).toBe('session-token');
    expect(hasSessionToken()).toBe(true);
    expect(sessionStorage.getItem('authToken')).toBe('session-token');
  });

  it('clears the stored session token', () => {
    setSessionToken('session-token');

    clearSessionToken();

    expect(readSessionToken()).toBeNull();
    expect(hasSessionToken()).toBe(false);
    expect(sessionStorage.getItem('authToken')).toBeNull();
  });

  it('derives default capabilities for admin role when capabilities are omitted', () => {
    setAdminSession('token-123', { role: 'admin', name: 'Admin Test' });

    let current: any = null;
    const unsubscribe = adminSession.subscribe((val: any) => { current = val; });
    unsubscribe();

    expect(current).not.toBeNull();
    expect(current.role).toBe('admin');
    expect(current.capabilities).toEqual(getDefaultAdminCapabilities('admin'));
    expect(current.capabilities.canManageAdministration).toBe(true);
  });

  it('derives restricted capabilities for document_operator role', () => {
    setAdminSession('token-456', { role: 'document_operator', name: 'Doc Operator' });

    let current: any = null;
    const unsubscribe = adminSession.subscribe((val: any) => { current = val; });
    unsubscribe();

    expect(current).not.toBeNull();
    expect(current.role).toBe('document_operator');
    expect(current.capabilities).toEqual(getDefaultAdminCapabilities('document_operator'));
    expect(current.capabilities.canManageAdministration).toBe(false);
  });
});
