import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('api helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
  });

  it('returns false and keeps the session intact for non-401 responses', async () => {
    const storeModule = await import('../../src/lib/store');
    const apiModule = await import('../../src/lib/api');

    storeModule.authToken.set('admin-token');

    expect(apiModule.handleUnauthorizedResponse(403)).toBe(false);
    expect(get(storeModule.authToken)).toBe('admin-token');
    expect(sessionStorage.getItem('authToken')).toBe('admin-token');
  });

  it('returns true and clears the stored session for 401 responses', async () => {
    const storeModule = await import('../../src/lib/store');
    storeModule.authToken.set('admin-token');

    vi.stubGlobal('window', undefined);
    const apiModule = await import('../../src/lib/api');

    expect(apiModule.handleUnauthorizedResponse(401)).toBe(true);
    expect(get(storeModule.authToken)).toBeNull();
    expect(sessionStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});
