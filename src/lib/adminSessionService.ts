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
            { version: '1.4.9', date: 'Hoje', time: '18:10', status: 'success', impact: 'Nenhum' },
            { version: '1.4.8', date: 'Hoje', time: '14:20', status: 'stable', impact: 'Nenhum' },
            { version: '1.4.7', date: 'Hoje', time: '11:05', status: 'stable', impact: 'Nenhum' },
            { version: '1.4.6', date: 'Hoje', time: '09:00', status: 'rollback', impact: 'Erro no Checkout' },
            { version: '1.4.5', date: 'Hoje', time: '08:30', status: 'success', impact: 'Nenhum' },
            { version: '1.4.4', date: 'Ontem', time: '18:15', status: 'stable', impact: 'Nenhum' },
            { version: '1.4.3', date: 'Ontem', time: '16:00', status: 'stable', impact: 'Nenhum' },
            { version: '1.4.2', date: 'Ontem', time: '10:30', status: 'stable', impact: 'Baixo' },
            { version: '1.4.1', date: '12 Fev', time: '14:15', status: 'rollback', impact: 'Picos de Latência' },
            { version: '1.4.0', date: '12 Fev', time: '10:00', status: 'stable', impact: 'Baixo' },
            { version: '1.3.9', date: '05 Fev', time: '04:00', status: 'stable', impact: 'Nenhum' },
            { version: '1.3.8', date: '01 Fev', time: '23:00', status: 'stable', impact: 'Nenhum' },
            { version: '1.3.7', date: '28 Jan', time: '01:00', status: 'stable', impact: 'Nenhum' },
            { version: '1.3.6', date: '25 Jan', time: '02:00', status: 'stable', impact: 'Nenhum' }
          ],
          externalServices: [
            { name: 'Railway App', provider: 'Railway (Node.js Core)', status: 'operational', latency: '45ms', cost: 120.50 },
            { name: 'Vercel Edge', provider: 'Vercel (Frontend Svelte)', status: 'operational', latency: '12ms', cost: 100.00 },
            { name: 'Firebase Auth', provider: 'Google Cloud', status: 'operational', latency: '110ms', cost: 0 },
            { name: 'Cloudflare R2', provider: 'Cloudflare (Docs Storage)', status: 'degraded', latency: '850ms', cost: 25.90 },
            { name: 'Cloudinary CDN', provider: 'Cloudinary (Imagens)', status: 'operational', latency: '35ms', cost: 45.00 }
          ]
        })
      });
    }, 400); // Simulate network delay
  });
}
