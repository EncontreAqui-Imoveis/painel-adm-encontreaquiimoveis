import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleUnauthorizedResponse,
  readSessionToken,
  clearSessionToken,
} = vi.hoisted(() => ({
  handleUnauthorizedResponse: vi.fn<(status?: number) => boolean>(),
  readSessionToken: vi.fn<() => string | null>(),
  clearSessionToken: vi.fn<() => void>(),
}));

vi.mock('../../src/lib/api', () => ({
  baseURL: 'https://api.example.com',
  handleUnauthorizedResponse,
}));

vi.mock('../../src/lib/sessionState', () => ({
  readSessionToken,
  clearSessionToken,
}));

import {
  fetchPlatformResponse,
  resolveApiAssetUrl,
} from '../../src/lib/adminFetchService';

describe('adminFetchService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    handleUnauthorizedResponse.mockReset().mockReturnValue(false);
    readSessionToken.mockReset().mockReturnValue('token-123');
    clearSessionToken.mockReset();
    global.fetch = vi.fn();
  });

  it('builds authenticated requests using the configured base URL', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.mocked(global.fetch).mockResolvedValue(response);

    const result = await fetchPlatformResponse('/admin/contracts?page=1');

    expect(result).toBe(response);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/admin/contracts?page=1',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('returns null and clears session when no token is available', async () => {
    readSessionToken.mockReturnValue(null);

    const result = await fetchPlatformResponse('/admin/contracts');

    expect(result).toBeNull();
    expect(clearSessionToken).toHaveBeenCalledOnce();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows unauthenticated requests when skipAuth is enabled', async () => {
    const response = new Response(JSON.stringify({ data: [] }), { status: 200 });
    vi.mocked(global.fetch).mockResolvedValue(response);

    await fetchPlatformResponse('/properties/cities', { skipAuth: true });

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('returns null when unauthorized handling is triggered', async () => {
    const response = new Response(null, { status: 401 });
    vi.mocked(global.fetch).mockResolvedValue(response);
    handleUnauthorizedResponse.mockReturnValue(true);

    const result = await fetchPlatformResponse('/admin/contracts');

    expect(result).toBeNull();
    expect(handleUnauthorizedResponse).toHaveBeenCalledWith(401);
  });

  it('normalizes relative asset paths against the API base URL', () => {
    expect(resolveApiAssetUrl('uploads/image.png')).toBe(
      'https://api.example.com/uploads/image.png'
    );
    expect(resolveApiAssetUrl('/uploads/image.png')).toBe(
      'https://api.example.com/uploads/image.png'
    );
    expect(resolveApiAssetUrl('https://cdn.example.com/image.png')).toBe(
      'https://cdn.example.com/image.png'
    );
  });
});
