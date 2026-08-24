<script lang="ts">
  import Login from './lib/Login.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { authToken, theme } from './lib/store';
  import type { View } from './lib/types';

  type LazySvelteComponent = any;
  let DashboardComponent: LazySvelteComponent | null = null;

  async function loadDashboard() {
    if (DashboardComponent) return;
    const module = await import('./lib/Dashboard.svelte');
    DashboardComponent = module.default;
  }

  $: {
    if (typeof window !== 'undefined') {
      const isDark =
        $theme === 'dark' ||
        ($theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }

  let initialView: View = 'dashboard';
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path === '/admin/properties') {
      initialView = 'properties';
    } else if (path === '/admin/negociacoes/solicitacoes') {
      initialView = 'negotiation_requests';
    } else if (path === '/admin/negociacoes/andamento') {
      initialView = 'negotiation_progress';
    } else if (path === '/admin/contratos') {
      initialView = 'negotiation_contracts';
    } else if (path === '/admin/comissoes') {
      initialView = 'commissions';
    }
  }

  import { fetchAdminProfile } from './lib/adminSessionService';
  import { setAdminSession } from './lib/sessionState';

  async function syncAdminProfile(token: string) {
    try {
      const res = await fetchAdminProfile(token);
      if (res.ok) {
        const data = await res.json();
        if (data?.admin) {
          setAdminSession(token, data.admin);
        }
      }
    } catch (err) {
      console.warn('Não foi possível sincronizar perfil do admin:', err);
    }
  }

  $: if ($authToken) {
    syncAdminProfile($authToken);
    loadDashboard();
  }
</script>

<main class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white dark:bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)]">
  {#if $authToken}
    {#if DashboardComponent}
      <svelte:component this={DashboardComponent} {initialView} />
    {:else}
      <div class="flex min-h-screen items-center justify-center">
        <div class="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
      </div>
    {/if}
  {:else}
    <Login />
  {/if}
</main>

<Toaster />
