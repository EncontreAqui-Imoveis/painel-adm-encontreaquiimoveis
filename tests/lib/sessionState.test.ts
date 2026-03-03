import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSessionToken,
  hasSessionToken,
  readSessionToken,
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
});
