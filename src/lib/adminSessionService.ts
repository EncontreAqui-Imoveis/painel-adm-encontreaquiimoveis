import { baseURL } from './api';

export async function requestAdminLogin(email: string, password: string): Promise<Response> {
  return fetch(`${baseURL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function requestAdminDashboardStats(token: string): Promise<Response> {
  return fetch(`${baseURL}/admin/dashboard/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function requestAdminSreStats(token: string): Promise<any> {
  // TODO: Replace with actual backend endpoint once implemented
  // return fetch(`${baseURL}/admin/dashboard/sre`, {
  //   headers: { Authorization: `Bearer ${token}` }
  // });

  // MOCK DATA based on Google SRE Golden Signals
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: async () => ({
          latency: {
            p99: 145,
            unit: 'ms',
            status: 'healthy',
            trend: 'down',
            trendValue: '12ms',
            history: Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 100)
          },
          traffic: {
            rps: 243,
            unit: 'req/s',
            status: 'healthy',
            trend: 'up',
            trendValue: '5%',
            history: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100) + 150)
          },
          errors: {
            rate: 0.8,
            unit: '%',
            status: 'warning',
            trend: 'up',
            trendValue: '0.2%',
            history: Array.from({ length: 12 }, () => Math.random() * 2)
          },
          saturation: {
            cpu: 68,
            unit: '%',
            status: 'healthy',
            trend: 'neutral',
            trendValue: '0%',
            history: Array.from({ length: 12 }, () => Math.floor(Math.random() * 30) + 50)
          }
        })
      });
    }, 400); // Simulate network delay
  });
}
