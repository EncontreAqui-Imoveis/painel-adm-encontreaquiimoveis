<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';

  type FeaturedProperty = {
    id: number;
    code?: string | null;
    title: string;
    bairro?: string | null;
    city?: string | null;
    state?: string | null;
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    purpose?: string | null;
    broker_name?: string | null;
    property_image_url?: string | null;
    position?: number | null;
  };

  const MAX_FEATURED = 20;

  let featured: FeaturedProperty[] = [];
  let candidates: FeaturedProperty[] = [];
  let search = '';
  let isLoadingFeatured = false;
  let isLoadingCandidates = false;
  let isSaving = false;
  let isImagePreviewOpen = false;
  let previewImageUrl: string | null = null;
  let previewImageAlt = 'Pré-visualização do imóvel';
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

  function formatLocation(item: FeaturedProperty): string {
    const parts = [item.bairro, item.city, item.state]
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);
    return parts.length > 0 ? parts.join(' - ') : '-';
  }

  function openImagePreview(url: string | null | undefined, alt?: string) {
    if (!url) return;
    previewImageUrl = url;
    previewImageAlt = alt ?? 'Pré-visualização do imóvel';
    isImagePreviewOpen = true;
  }

  function closeImagePreview() {
    isImagePreviewOpen = false;
    previewImageUrl = null;
  }

  function handlePreviewKeydown(event: KeyboardEvent) {
    if (!isImagePreviewOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeImagePreview();
    }
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
      params.append('limit', trimmedSearch ? '100' : '12');
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

<svelte:window on:keydown={handlePreviewKeydown} />

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

  <div class="space-y-6 px-6 py-6">
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
          placeholder="Buscar por título, ID, código, cidade ou anunciante..."
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
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table class="w-full min-w-[720px] text-sm">
            <thead class="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Foto</th>
                <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">ID/Código</th>
                <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Localização</th>
                <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Valor</th>
                <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Anunciante</th>
                <th class="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Ação</th>
              </tr>
            </thead>
            <tbody>
              {#each candidates as item}
                <tr class="border-t border-gray-200 dark:border-gray-800">
                  <td class="px-3 py-2">
                    {#if item.property_image_url}
                      <button
                        type="button"
                        aria-label={`Abrir imagem de ${item.title}`}
                        on:click|stopPropagation={() => openImagePreview(item.property_image_url, item.title)}
                      >
                        <img
                          src={item.property_image_url}
                          alt={item.title}
                          class="h-12 w-16 rounded-md object-cover"
                          loading="lazy"
                        />
                      </button>
                    {:else}
                      <div class="flex h-12 w-16 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Sem foto
                      </div>
                    {/if}
                  </td>
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-200">
                    <div class="font-semibold">#{item.id}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{item.code ?? '-'}</div>
                  </td>
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-200">
                    <div class="font-medium">{item.title}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{formatLocation(item)}</div>
                  </td>
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {formatCurrency(item.price_sale ?? item.price)}
                  </td>
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {item.broker_name ?? '-'}
                  </td>
                  <td class="px-3 py-2 text-right">
                    <button
                      class="rounded-md border border-green-200 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/30"
                      on:click={() => addFeatured(item)}
                      disabled={selectedIds.has(item.id) || featured.length >= MAX_FEATURED}
                    >
                      {selectedIds.has(item.id) ? 'Adicionado' : 'Adicionar'}
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</section>

{#if isImagePreviewOpen && previewImageUrl}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
    role="button"
    tabindex="0"
    aria-label="Fechar visualização da imagem"
    on:click={closeImagePreview}
    on:keydown={handlePreviewKeydown}
  >
    <div class="relative max-h-[90vh] max-w-[95vw]" role="presentation">
      <img src={previewImageUrl} alt={previewImageAlt} class="max-h-[90vh] max-w-[95vw] rounded-md object-contain" />
      <button
        type="button"
        class="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
        aria-label="Fechar"
        on:click={closeImagePreview}
      >
        x
      </button>
    </div>
  </div>
{/if}
