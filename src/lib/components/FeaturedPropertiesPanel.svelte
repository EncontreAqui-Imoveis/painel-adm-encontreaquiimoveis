<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';

  type FeaturedProperty = {
    id: number;
    title: string;
    city?: string | null;
    state?: string | null;
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    purpose?: string | null;
    position?: number | null;
  };

  const MAX_FEATURED = 20;

  let featured: FeaturedProperty[] = [];
  let candidates: FeaturedProperty[] = [];
  let search = '';
  let isLoadingFeatured = false;
  let isLoadingCandidates = false;
  let isSaving = false;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  $: selectedIds = new Set(featured.map((item) => item.id));
  $: canSave = !isSaving && !isLoadingFeatured;

  onMount(() => {
    loadFeatured();
    loadCandidates();
  });

  function formatCurrency(value?: number | null): string {
    if (value == null || Number.isNaN(value)) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function loadFeatured() {
    isLoadingFeatured = true;
    try {
      const payload = await api.get<{ data?: FeaturedProperty[] }>('/admin/featured-properties');
      featured = payload?.data ?? [];
    } catch (err) {
      console.error('Erro ao carregar destaques:', err);
      toast.error('Erro ao carregar destaques.');
      featured = [];
    } finally {
      isLoadingFeatured = false;
    }
  }

  async function loadCandidates() {
    isLoadingCandidates = true;
    try {
      const params = new URLSearchParams();
      params.append('status', 'approved');
      const trimmedSearch = search.trim();
      params.append('limit', trimmedSearch ? '100' : '5');
      params.append('page', '1');
      params.append('sortBy', 'p.created_at');
      params.append('sortOrder', 'desc');
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }

      const payload = await api.get<{ data?: FeaturedProperty[] }>(
        `/admin/properties-with-brokers?${params.toString()}`
      );
      candidates = payload?.data ?? [];
    } catch (err) {
      console.error('Erro ao carregar imóveis aprovados:', err);
      toast.error('Erro ao carregar imóveis aprovados.');
      candidates = [];
    } finally {
      isLoadingCandidates = false;
    }
  }

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    search = target.value;
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    searchTimer = setTimeout(() => {
      loadCandidates();
    }, 300);
  }

  function addFeatured(item: FeaturedProperty) {
    if (featured.length >= MAX_FEATURED) {
      toast.error('Limite maximo de 20 destaques.');
      return;
    }
    if (selectedIds.has(item.id)) return;
    featured = [...featured, item];
  }

  function removeFeatured(id: number) {
    featured = featured.filter((item) => item.id !== id);
  }

  function moveFeatured(id: number, direction: number) {
    const index = featured.findIndex((item) => item.id === id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= featured.length) return;
    const updated = [...featured];
    const [item] = updated.splice(index, 1);
    updated.splice(nextIndex, 0, item);
    featured = updated;
  }

  async function saveFeatured() {
    if (!canSave) return;
    isSaving = true;
    try {
      await apiClient.put('/admin/featured-properties', {
        propertyIds: featured.map((item) => item.id),
      });
      toast.success('Destaques atualizados.');
    } catch (err) {
      console.error('Erro ao salvar destaques:', err);
      toast.error('Erro ao salvar destaques.');
    } finally {
      isSaving = false;
    }
  }
</script>

<section class="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
  <div class="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Destaques escolhidos
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Selecione até {MAX_FEATURED} imóveis aprovados para aparecer na vitrine de destaques. Clicando em salvar, os imóveis selecionados substituirão os atuais destaques do app. 
        </p>
      </div>
      <button
        class="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
        on:click={saveFeatured}
        disabled={!canSave}
      >
        {isSaving ? 'Salvando...' : 'Salvar destaques'}
      </button>
    </div>
    <div class="text-sm text-gray-500 dark:text-gray-400">
      Selecionados: <strong>{featured.length}</strong> / {MAX_FEATURED}
    </div>
  </div>

  <div class="grid gap-6 px-6 py-6 lg:grid-cols-2">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Selecionados
        </h3>
        <button
          class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          on:click={loadFeatured}
          disabled={isLoadingFeatured}
        >
          Remover todos
        </button>
      </div>

      {#if isLoadingFeatured}
        <div class="text-sm text-gray-500 dark:text-gray-400">Carregando destaques...</div>
      {:else if featured.length === 0}
        <div class="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum destaque selecionado. Os destaques do app irão mostrar os imóveis mais recentes.
        </div>
      {:else}
        <div class="space-y-3">
          {#each featured as item, index}
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {index + 1}. {item.title}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {item.city ?? '-'} / {item.state ?? '-'}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(item.price_sale ?? item.price)} • {item.purpose ?? 'Sem finalidade'}
                  </p>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex items-center gap-2">
                    <button
                      class="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                      on:click={() => moveFeatured(item.id, -1)}
                      disabled={index === 0}
                      aria-label="Mover para cima"
                    >
                      ▲
                    </button>
                    <button
                      class="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                      on:click={() => moveFeatured(item.id, 1)}
                      disabled={index === featured.length - 1}
                      aria-label="Mover para baixo"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    class="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                    on:click={() => removeFeatured(item.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Imóveis aprovados
        </h3>
        <input
          id="featured-search"
          name="featured_search"
          maxlength="120"
          class="w-44 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          placeholder="Buscar..."
          value={search}
          on:input={handleSearchInput}
        />
      </div>

      {#if isLoadingCandidates}
        <div class="text-sm text-gray-500 dark:text-gray-400">Carregando aprovados...</div>
      {:else if candidates.length === 0}
        <div class="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum imóvel aprovado encontrado.
        </div>
      {:else}
        <div class="space-y-3">
          {#each candidates as item}
            <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.title}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {item.city ?? '-'} / {item.state ?? '-'}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(item.price_sale ?? item.price)} • {item.purpose ?? 'Sem finalidade'}
                  </p>
                </div>
                <button
                  class="rounded-md border border-green-200 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/30"
                  on:click={() => addFeatured(item)}
                  disabled={selectedIds.has(item.id) || featured.length >= MAX_FEATURED}
                >
                  {selectedIds.has(item.id) ? 'Adicionado' : 'Adicionar'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</section>
