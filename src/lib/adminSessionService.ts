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

export async function fetchAdminProfile(token: string): Promise<Response> {
  return fetch(`${baseURL}/admin/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


