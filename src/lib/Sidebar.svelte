<script lang="ts">
  import {
    BadgeDollarSign,
    Bell,
    Building2,
    ChevronDown,
    ClipboardList,
    FileText,
    FolderKanban,
    Handshake,
    House,
    HousePlus,
    LayoutDashboard,
    ScrollText,
    ShieldCheck,
    UserPlus,
    UserRound,
    Users
  } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { clearSessionToken } from './sessionState';
  import { api } from './apiClient';
  import ThemeToggle from './ThemeToggle.svelte';
  import type { View } from './types';
  import encontreaquiimoveis from '../static/logo_principal.svg';

  export let isOpen = false;
  export let activeView: View;
  export let onNavigate: (view: View) => void = () => {};
  export let pendingCounts: {
    propertyRequests: number;
    brokerRequests: number;
  } = { propertyRequests: 0, brokerRequests: 0 };

  const validViews: View[] = [
    'dashboard',
    'properties',
    'property_requests',
    'sold_properties',
    'negotiation_requests',
    'negotiation_progress',
    'negotiation_contracts',
    'commissions',
    'create_property',
    'create_user',
    'brokers',
    'clients',
    'verification',
    'notifications'
  ];

  type GroupKey = 'imoveis' | 'negociacoes' | 'usuarios' | 'verificacao';

  type SidebarItem = {
    view: View | null;
    label: string;
    icon: any;
    disabled?: boolean;
  };

  const imoveisItems: SidebarItem[] = [
    {
      view: 'properties',
      label: 'Imóveis',
      icon: Building2
    },
    {
      view: 'sold_properties',
      label: 'Imóveis Vendidos/Alugados',
      icon: House
    },
    {
      view: 'create_property',
      label: 'Cadastrar Imóvel',
      icon: HousePlus
    }
  ];

  const usuariosItems: SidebarItem[] = [
    {
      view: 'brokers',
      label: 'Corretores',
      icon: Users
    },
    {
      view: 'clients',
      label: 'Clientes',
      icon: UserRound
    },
    {
      view: 'create_user',
      label: 'Cadastrar Usuário',
      icon: UserPlus
    }
  ];

  const negociacoesItems: SidebarItem[] = [
    {
      view: 'negotiation_progress',
      label: 'Imóveis em Negociação',
      icon: Handshake
    },
    {
      view: 'negotiation_contracts',
      label: 'Contratos',
      icon: FileText
    },
    {
      view: 'commissions',
      label: 'Comissões (VGV)',
      icon: BadgeDollarSign
    }
  ];

  const verificacaoItems: SidebarItem[] = [
    {
      view: 'verification',
      label: 'Solicitações de Corretores',
      icon: ShieldCheck
    },
    {
      view: 'property_requests',
      label: 'Solicitações (Imóveis)',
      icon: ClipboardList
    },
    {
      view: 'negotiation_requests',
      label: 'Solicitação de Propostas',
      icon: ScrollText
    }
  ];

  const storageKey = 'sidebar_open_groups';

  let openGroups: Record<GroupKey, boolean> = {
    imoveis: false,
    negociacoes: false,
    usuarios: false,
    verificacao: false
  };

  const navItemBase =
    'w-full text-left flex items-start gap-3 rounded-xl px-4 py-3 text-[15px] leading-snug transition';
  const navItemActive =
    'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20';
  const navItemInactive =
    'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white';

  const groupButtonBase =
    'w-full text-left flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[15px] transition text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white';

  function isValidView(view: string): view is View {
    return validViews.includes(view as View);
  }

  function persistOpenGroups() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(openGroups));
  }

  function toggleGroup(group: GroupKey) {
    openGroups = { ...openGroups, [group]: !openGroups[group] };
    persistOpenGroups();
  }

  function getGroupForView(view: View | string | null): GroupKey | null {
    if (!view || !isValidView(view)) return null;
    if (imoveisItems.some((item) => item.view === view)) return 'imoveis';
    if (negociacoesItems.some((item) => item.view === view)) return 'negociacoes';
    if (usuariosItems.some((item) => item.view === view)) return 'usuarios';
    if (verificacaoItems.some((item) => item.view === view)) return 'verificacao';
    return null;
  }

  function updateLocation(view: View) {
    if (typeof window === 'undefined') return;

    const pathMap: Partial<Record<View, string>> = {
      properties: '/admin/properties',
      negotiation_requests: '/admin/negociacoes/solicitacoes',
      negotiation_progress: '/admin/negociacoes/andamento',
      negotiation_contracts: '/admin/contratos',
      commissions: '/admin/comissoes',
    };

    const mappedPath = pathMap[view];
    if (mappedPath) {
      const currentPath = window.location.pathname;
      if (currentPath !== mappedPath || window.location.hash) {
        window.history.replaceState({}, '', mappedPath);
      }
      return;
    }

    if (window.location.hash.replace('#', '') === view) return;
    window.location.hash = view;
  }

  function handleNavigation(view: string) {
    if (isValidView(view)) {
      onNavigate(view);
      updateLocation(view);
    } else {
      console.error(`Tentativa de navegar para view invalida: ${view}`);
      onNavigate('dashboard');
      updateLocation('dashboard');
    }
  }

  async function handleLogout() {
    try {
      await api.post('/admin/logout', {});
    } catch {
      // Mesmo que a revogacao falhe, o token local precisa ser descartado.
    } finally {
      clearSessionToken();
    }
  }

  function navItemClass(view: View, extra = '') {
    return `${navItemBase} ${activeView === view ? navItemActive : navItemInactive} ${extra}`.trim();
  }

  function handleHashChange() {
    if (typeof window === 'undefined') return;
    const hashView = window.location.hash.replace('#', '');
    if (hashView && isValidView(hashView) && hashView !== activeView) {
      onNavigate(hashView);
    }
  }

  $: {
    const activeGroup = getGroupForView(activeView);
    if (activeGroup && !openGroups[activeGroup]) {
      openGroups = { ...openGroups, [activeGroup]: true };
      persistOpenGroups();
    }
  }

  onMount(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Record<GroupKey, boolean>>;
        openGroups = { ...openGroups, ...parsed };
      } catch {
        // ignore corrupt storage
      }
    }

    const hashView = window.location.hash.replace('#', '');
    if (hashView && isValidView(hashView)) {
      onNavigate(hashView);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });
</script>

<div
  class="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden {isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
  on:click={() => (isOpen = false)}
  on:keydown|self={(e) => {
    if (e.key === 'Enter' || e.key === ' ') isOpen = false;
  }}
  role="button"
  tabindex="0"
  aria-label="Fechar menu"
></div>

<aside
  class="fixed inset-y-0 left-0 z-30 flex w-[19rem] flex-col transform bg-white text-slate-900 border-r border-slate-200 shadow-lg shadow-black/5 transition-transform duration-300 ease-in-out dark:bg-slate-950 dark:text-white dark:border-white/5 dark:shadow-xl dark:shadow-black/40 sm:w-80 lg:w-64 lg:translate-x-0 {isOpen ? 'translate-x-0' : '-translate-x-full'}"
>
  <div class="h-16 flex items-center px-4 border-b border-slate-200 dark:border-white/5">
    <div class="w-full">
      <div
        class="flex items-center justify-center h-12 w-full rounded-xl bg-white ring-1 ring-black/10 dark:bg-white/95 dark:ring-black/5 overflow-hidden"
      >
        <img
          src={encontreaquiimoveis}
          alt="Encontre Aqui Imóveis"
          class="h-10 w-auto max-w-[90%] object-contain"
          loading="lazy"
          draggable="false"
        />
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
    <nav class="space-y-2">
    <button
      class={navItemClass('dashboard')}
      on:click={() => handleNavigation('dashboard')}
    >
      <LayoutDashboard class="mt-0.5 h-5 w-5 shrink-0" />
      <span class="min-w-0 flex-1">Dashboard</span>
    </button>

    <div class="space-y-1">
      <button
        class={groupButtonBase}
        on:click={() => toggleGroup('imoveis')}
        aria-expanded={openGroups.imoveis}
      >
        <span class="flex min-w-0 items-center gap-2">
          <FolderKanban class="h-5 w-5 shrink-0" />
          <span class="truncate">Imóveis</span>
        </span>
        <span class="flex items-center gap-2">
          <ChevronDown class={`h-4 w-4 transition-transform ${openGroups.imoveis ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {#if openGroups.imoveis}
        <div class="space-y-1">
          {#each imoveisItems as item}
            {#if item.view && !item.disabled}
              <button
                class={navItemClass(item.view, 'pl-10')}
                on:click={() => handleNavigation(item.view as View)}
              >
                <svelte:component this={item.icon} class="mt-0.5 h-5 w-5 shrink-0" />
                <span class="min-w-0 flex-1 break-words">{item.label}</span>
                {#if item.view === 'property_requests' && pendingCounts.propertyRequests > 0}
                  <span
                    class="ml-auto mt-0.5 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                  >
                    {pendingCounts.propertyRequests}
                  </span>
                {/if}
              </button>
            {:else}
              <button
                class="w-full cursor-not-allowed text-left flex items-start gap-3 rounded-xl px-4 py-3 pl-10 text-[15px] leading-snug text-slate-400 dark:text-slate-500"
                disabled
              >
                <svelte:component this={item.icon} class="mt-0.5 h-5 w-5 shrink-0" />
                <span class="min-w-0 flex-1 break-words">{item.label}</span>
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>

    <div class="space-y-1">
      <button
        class={groupButtonBase}
        on:click={() => toggleGroup('usuarios')}
        aria-expanded={openGroups.usuarios}
      >
        <span class="flex min-w-0 items-center gap-2">
          <Users class="h-5 w-5 shrink-0" />
          <span class="truncate">Usuários</span>
        </span>
        <ChevronDown class={`h-4 w-4 transition-transform ${openGroups.usuarios ? 'rotate-180' : ''}`} />
      </button>
      {#if openGroups.usuarios}
        <div class="space-y-1">
          {#each usuariosItems as item}
            <button
              class={navItemClass(item.view as View, 'pl-10')}
              on:click={() => handleNavigation(item.view as View)}
            >
              <svelte:component this={item.icon} class="mt-0.5 h-5 w-5 shrink-0" />
              <span class="min-w-0 flex-1 break-words">{item.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="space-y-1">
      <button
        class={groupButtonBase}
        on:click={() => toggleGroup('negociacoes')}
        aria-expanded={openGroups.negociacoes}
      >
        <span class="flex min-w-0 items-center gap-2">
          <FileText class="h-5 w-5 shrink-0" />
          <span class="truncate">Negociações</span>
        </span>
        <ChevronDown class={`h-4 w-4 transition-transform ${openGroups.negociacoes ? 'rotate-180' : ''}`} />
      </button>
      {#if openGroups.negociacoes}
        <div class="space-y-1">
          {#each negociacoesItems as item}
            <button
              class={navItemClass(item.view as View, 'pl-10')}
              on:click={() => handleNavigation(item.view as View)}
            >
              <svelte:component this={item.icon} class="mt-0.5 h-5 w-5 shrink-0" />
              <span class="min-w-0 flex-1 break-words">{item.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="space-y-1">
      <button
        class={groupButtonBase}
        on:click={() => toggleGroup('verificacao')}
        aria-expanded={openGroups.verificacao}
      >
        <span class="flex min-w-0 items-center gap-2">
          <ShieldCheck class="h-5 w-5 shrink-0" />
          <span class="truncate">Verificação</span>
        </span>
        <span class="flex items-center gap-2">
          {#if !openGroups.verificacao && (pendingCounts.propertyRequests + pendingCounts.brokerRequests) > 0}
            <span class="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {pendingCounts.propertyRequests + pendingCounts.brokerRequests}
            </span>
          {/if}
          <ChevronDown class={`h-4 w-4 transition-transform ${openGroups.verificacao ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {#if openGroups.verificacao}
        <div class="space-y-1">
          {#each verificacaoItems as item}
            <button
              class={navItemClass(item.view as View, 'pl-10')}
              on:click={() => handleNavigation(item.view as View)}
            >
              <svelte:component this={item.icon} class="mt-0.5 h-5 w-5 shrink-0" />
              <span class="min-w-0 flex-1 break-words">{item.label}</span>
              {#if item.view === 'verification' && pendingCounts.brokerRequests > 0}
                <span
                  class="ml-auto mt-0.5 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                >
                  {pendingCounts.brokerRequests}
                </span>
              {:else if item.view === 'property_requests' && pendingCounts.propertyRequests > 0}
                <span
                  class="ml-auto mt-0.5 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                >
                  {pendingCounts.propertyRequests}
                </span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <button
      class={navItemClass('notifications')}
      on:click={() => handleNavigation('notifications')}
    >
      <Bell class="mt-0.5 h-5 w-5 shrink-0" />
      <span class="min-w-0 flex-1">Notificações</span>
    </button>
    </nav>

    <div class="pt-4 border-t border-white/10 space-y-4">
      <ThemeToggle />
      <button
        on:click={handleLogout}
        class="w-full flex items-center justify-center px-4 py-2 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-colors"
      >
        <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Sair
      </button>
    </div>
  </div>
</aside>
