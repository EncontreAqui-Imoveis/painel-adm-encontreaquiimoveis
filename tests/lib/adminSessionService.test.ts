import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('$lib/api', () => ({
  baseURL: 'https://api.example.com',
}));

describe('adminSessionService', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('requests admin login with the expected payload', async () => {
    const { requestAdminLogin } = await import('$lib/adminSessionService');

    await requestAdminLogin('admin@example.com', 'secret');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/admin/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'secret',
        }),
      })
    );
  });

  it('requests dashboard stats with the bearer token', async () => {
    const { requestAdminDashboardStats } = await import('$lib/adminSessionService');

    await requestAdminDashboardStats('token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/admin/dashboard/stats',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer token-123',
        },
      })
    );
  });
});
