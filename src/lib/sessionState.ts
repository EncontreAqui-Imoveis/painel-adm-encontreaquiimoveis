import { get } from 'svelte/store';
import { authToken } from './store';

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

export function clearSessionToken(): void {
  authToken.set(null);
}
