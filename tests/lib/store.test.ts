import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.resetModules();
  });

  it('migrates a legacy auth token from localStorage to sessionStorage on bootstrap', async () => {
    localStorage.setItem('authToken', 'legacy-token');

    const storeModule = await import('../../src/lib/store');

    expect(storeModule.getStoredAuthToken()).toBe('legacy-token');
    expect(sessionStorage.getItem('authToken')).toBe('legacy-token');
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('persists and clears the auth token in sessionStorage', async () => {
    const storeModule = await import('../../src/lib/store');

    storeModule.authToken.set('fresh-token');
    expect(sessionStorage.getItem('authToken')).toBe('fresh-token');
    expect(storeModule.getStoredAuthToken()).toBe('fresh-token');

    localStorage.setItem('authToken', 'stale-token');
    storeModule.clearStoredAuthToken();
    storeModule.authToken.set(null);

    expect(sessionStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(storeModule.getStoredAuthToken()).toBeNull();
  });
});
