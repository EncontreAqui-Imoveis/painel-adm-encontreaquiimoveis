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
          },
          alerts: [
            {
              id: 'err-8902',
              severity: 'critical',
              service: 'PDF Generation Service (Go)',
              message: 'Pod restarting continuously (OOMKilled). Contract generation failing.',
              duration: '12m',
              time: '12:12'
            },
            {
              id: 'err-8903',
              severity: 'warning',
              service: 'MySQL TiDB connection pool',
              message: 'Connection pool usage approaching 85% capacity limits.',
              duration: '45m',
              time: '11:38'
            }
          ],
          budget: {
            sloTarget: 99.9,
            sloCurrent: 99.88,
            budgetTotalRaw: 43.2,
            budgetSpentRaw: 48.5
          },
          availability: {
            uptimeCurrent: 99.92,
            downtimeMinutes: 34.5
          },
          toil: {
            automatedCount: 88,
            manualCount: 12
          },
          releases: [
            { version: '1.4.2', date: 'Hoje', time: '08:30', status: 'success', impact: 'Nenhum' },
            { version: '1.4.1', date: 'Ontem', time: '14:15', status: 'rollback', impact: 'Picos de Latência' },
            { version: '1.4.0', date: '12 Fev', time: '22:00', status: 'stable', impact: 'Baixo' },
            { version: '1.3.9', date: '05 Fev', time: '04:00', status: 'stable', impact: 'Nenhum' }
          ]
        })
      });
    }, 400); // Simulate network delay
  });
}
