import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authToken } from '../../src/lib/store';
import Sidebar from '../../src/lib/Sidebar.svelte';

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}));

vi.mock('../../src/lib/apiClient', () => ({
  api: {
    post: apiPostMock,
  },
}));

describe('Sidebar', () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    sessionStorage.clear();
    localStorage.clear();
    window.location.hash = '';
    authToken.set(null);
  });

  it('revokes the admin session and clears the local token on logout', async () => {
    authToken.set('admin-token');

    render(Sidebar, {
      isOpen: true,
      activeView: 'dashboard',
      onNavigate: vi.fn(),
      pendingCounts: {
        propertyRequests: 0,
        brokerRequests: 0,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/logout', {});
    });

    expect(get(authToken)).toBeNull();
    expect(sessionStorage.getItem('authToken')).toBeNull();
  });

  it('still clears the local token when the remote logout fails', async () => {
    authToken.set('admin-token');
    apiPostMock.mockRejectedValueOnce(new Error('network failure'));

    render(Sidebar, {
      isOpen: true,
      activeView: 'dashboard',
      onNavigate: vi.fn(),
      pendingCounts: {
        propertyRequests: 0,
        brokerRequests: 0,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/logout', {});
    });

    expect(get(authToken)).toBeNull();
    expect(sessionStorage.getItem('authToken')).toBeNull();
  });

  it('navigates from the current URL hash and tolerates corrupt stored group state', async () => {
    const onNavigate = vi.fn();
    localStorage.setItem('sidebar_open_groups', '{invalid-json');
    window.location.hash = '#notifications';

    render(Sidebar, {
      isOpen: true,
      activeView: 'dashboard',
      onNavigate,
      pendingCounts: {
        propertyRequests: 0,
        brokerRequests: 0,
      },
    });

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('notifications');
    });

    expect(screen.getByRole('button', { name: 'Painel' })).toBeInTheDocument();
  });

  it('reacts to hashchange events for valid views only', async () => {
    const onNavigate = vi.fn();

    render(Sidebar, {
      isOpen: true,
      activeView: 'dashboard',
      onNavigate,
      pendingCounts: {
        propertyRequests: 0,
        brokerRequests: 0,
      },
    });

    window.location.hash = '#clients';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('clients');
    });

    onNavigate.mockClear();
    window.location.hash = '#nao-existe';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('exibe a aba de vendidos/alugados dentro de Imóveis', async () => {
    const onNavigate = vi.fn();

    render(Sidebar, {
      isOpen: true,
      activeView: 'dashboard',
      onNavigate,
      pendingCounts: {
        propertyRequests: 0,
        brokerRequests: 0,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Imóveis' }));

    const soldMenuItem = await screen.findByRole('button', { name: 'Vendidos / Alugados' });
    expect(soldMenuItem).toBeInTheDocument();

    await fireEvent.click(soldMenuItem);
    expect(onNavigate).toHaveBeenCalledWith('sold_properties', undefined);
  });
});
