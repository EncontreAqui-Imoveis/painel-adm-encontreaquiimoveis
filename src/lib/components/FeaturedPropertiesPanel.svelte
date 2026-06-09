<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import {
    addStateLabel,
    candidatePriceLabel,
    crossScopeBadge,
    formatCurrency,
    formatLocation,
    isDualPurpose,
    mergeCandidatesWithFeatured,
    membershipLabel,
    purposeSupportsRent,
    purposeSupportsSale,
    rowAddDisabled,
    sortFeaturedList,
    type FeaturedPropertyLike,
  } from '$lib/components/featured-properties/featuredPropertiesHelpers';

  type FeaturedProperty = FeaturedPropertyLike;

  const MAX_FEATURED = 20;

  let featuredSale: FeaturedProperty[] = [];
  let featuredRent: FeaturedProperty[] = [];
  let candidates: FeaturedProperty[] = [];
  let search = '';
  let isLoadingFeatured = false;
  let isLoadingCandidates = false;
  let isSaving = false;
  let isImagePreviewOpen = false;
  let previewImageUrl: string | null = null;
  let previewImageAlt = 'Pré-visualização do imóvel';
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  let dualModalItem: FeaturedProperty | null = null;
  let dualAddSale = true;
  let dualAddRent = true;

  $: canSave = !isSaving && !isLoadingFeatured;

  onMount(() => {
    loadFeatured();
    loadCandidates();
  });

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

  function openDualModal(item: FeaturedProperty) {
    const inSale = featuredSale.some((i) => i.id === item.id);
    const inRent = featuredRent.some((i) => i.id === item.id);
    dualAddSale = !inSale;
    dualAddRent = !inRent;
    dualModalItem = item;
  }

  function closeDualModal() {
    dualModalItem = null;
  }

  function confirmDualModal() {
    const pick = dualModalItem;
    if (!pick) return;
    if (!dualAddSale && !dualAddRent) {
      toast.error('Marque ao menos uma vitrine.');
      return;
    }
    const inSale = featuredSale.some((i) => i.id === pick.id);
    const inRent = featuredRent.some((i) => i.id === pick.id);
    if (dualAddSale && !inSale) {
      addToScopeList('sale', pick);
    }
    if (dualAddRent && !inRent) {
      addToScopeList('rent', pick);
    }
    closeDualModal();
  }

  async function loadFeatured() {
    isLoadingFeatured = true;
    try {
      const payload = await api.get<{
        data?: { sale?: FeaturedProperty[]; rent?: FeaturedProperty[] } | FeaturedProperty[];
      }>('/admin/featured-properties');
      const data = payload?.data;
      if (Array.isArray(data)) {
        featuredSale = sortFeaturedList(data);
        featuredRent = [];
        return;
      }
      if (data && typeof data === 'object' && 'sale' in data && 'rent' in data) {
        featuredSale = sortFeaturedList(Array.isArray(data.sale) ? data.sale : []);
        featuredRent = sortFeaturedList(Array.isArray(data.rent) ? data.rent : []);
        return;
      }
      featuredSale = [];
      featuredRent = [];
    } catch (err) {
      console.error('Erro ao carregar destaques:', err);
      toast.error('Erro ao carregar destaques.');
      featuredSale = [];
      featuredRent = [];
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
      candidates = mergeCandidatesWithFeatured(featuredSale, featuredRent, payload?.data ?? []);
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

  function addToScopeList(scope: 'sale' | 'rent', item: FeaturedProperty) {
    const list = scope === 'sale' ? featuredSale : featuredRent;
    if (list.length >= MAX_FEATURED) {
      toast.error(
        `Limite maximo de ${MAX_FEATURED} imóveis na vitrine de ${scope === 'sale' ? 'venda' : 'aluguel'}.`
      );
      return;
    }
    if (list.some((i) => i.id === item.id)) return;
    if (scope === 'sale') {
      featuredSale = [...featuredSale, item];
    } else {
      featuredRent = [...featuredRent, item];
    }
  }

  function requestAdd(item: FeaturedProperty) {
    if (isDualPurpose(item.purpose)) {
      if (featuredSale.some((i) => i.id === item.id) && featuredRent.some((i) => i.id === item.id)) {
        return;
      }
      openDualModal(item);
      return;
    }
    if (purposeSupportsSale(item.purpose) && !purposeSupportsRent(item.purpose)) {
      addToScopeList('sale', item);
    } else if (purposeSupportsRent(item.purpose) && !purposeSupportsSale(item.purpose)) {
      addToScopeList('rent', item);
    } else {
      addToScopeList('sale', item);
    }
  }

  function removeFeatured(scope: 'sale' | 'rent', id: number) {
    if (scope === 'sale') {
      featuredSale = featuredSale.filter((item) => item.id !== id);
    } else {
      featuredRent = featuredRent.filter((item) => item.id !== id);
    }
  }

  function moveFeatured(scope: 'sale' | 'rent', id: number, direction: number) {
    const list = scope === 'sale' ? featuredSale : featuredRent;
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const updated = [...list];
    const [row] = updated.splice(index, 1);
    updated.splice(nextIndex, 0, row);
    if (scope === 'sale') {
      featuredSale = updated;
    } else {
      featuredRent = updated;
    }
  }

  function clearSaleList() {
    featuredSale = [];
  }

  function clearRentList() {
    featuredRent = [];
  }

  async function saveFeatured() {
    if (!canSave) return;
    isSaving = true;
    try {
      await apiClient.put('/admin/featured-properties', {
        salePropertyIds: featuredSale.map((item) => item.id),
        rentPropertyIds: featuredRent.map((item) => item.id),
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
          Destaques da vitrine
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Até {MAX_FEATURED} imóveis em <strong>venda</strong> e {MAX_FEATURED} em <strong>aluguel</strong> (independentes). O app e o site usam a vitrine conforme o modo do usuário.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          type="button"
          on:click={loadFeatured}
          disabled={isLoadingFeatured}
        >
          Recarregar
        </button>
        <button
          class="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          type="button"
          on:click={saveFeatured}
          disabled={!canSave}
        >
          {isSaving ? 'Salvando...' : 'Salvar destaques'}
        </button>
      </div>
    </div>
    <div class="text-sm text-gray-500 dark:text-gray-400">
      Venda: <strong>{featuredSale.length}</strong> / {MAX_FEATURED} · Aluguel:
      <strong>{featuredRent.length}</strong> / {MAX_FEATURED}
    </div>
  </div>

  <div class="space-y-6 px-6 py-6">
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Venda
          </h3>
          <button
            class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            type="button"
            on:click={clearSaleList}
          >
            Limpar venda
          </button>
        </div>
        {#if isLoadingFeatured}
          <div class="text-sm text-gray-500 dark:text-gray-400">Carregando…</div>
        {:else if featuredSale.length === 0}
          <div
            class="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
          >
            Nenhum destaque de venda.
          </div>
        {:else}
          <div class="space-y-2">
            {#each featuredSale as item, index}
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {index + 1}. {item.title}
                      </p>
                      {#if crossScopeBadge('sale', item, featuredSale, featuredRent)}
                        <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                          {crossScopeBadge('sale', item, featuredSale, featuredRent)}
                        </span>
                      {/if}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {item.city ?? '-'} / {item.state ?? '-'}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(item.price_sale ?? item.price)} • {item.purpose ?? '-'}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <div class="flex items-center gap-1">
                      <button
                        class="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                        type="button"
                        on:click={() => moveFeatured('sale', item.id, -1)}
                        disabled={index === 0}
                        aria-label="Mover para cima"
                      >
                        ▲
                      </button>
                      <button
                        class="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                        type="button"
                        on:click={() => moveFeatured('sale', item.id, 1)}
                        disabled={index === featuredSale.length - 1}
                        aria-label="Mover para baixo"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      class="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                      type="button"
                      on:click={() => removeFeatured('sale', item.id)}
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

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Aluguel
          </h3>
          <button
            class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            type="button"
            on:click={clearRentList}
          >
            Limpar aluguel
          </button>
        </div>
        {#if isLoadingFeatured}
          <div class="text-sm text-gray-500 dark:text-gray-400">Carregando…</div>
        {:else if featuredRent.length === 0}
          <div
            class="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
          >
            Nenhum destaque de aluguel.
          </div>
        {:else}
          <div class="space-y-2">
            {#each featuredRent as item, index}
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {index + 1}. {item.title}
                      </p>
                      {#if crossScopeBadge('rent', item, featuredSale, featuredRent)}
                        <span class="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                          {crossScopeBadge('rent', item, featuredSale, featuredRent)}
                        </span>
                      {/if}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {item.city ?? '-'} / {item.state ?? '-'}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(item.price_rent ?? item.price)} • {item.purpose ?? '-'}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <div class="flex items-center gap-1">
                      <button
                        class="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                        type="button"
                        on:click={() => moveFeatured('rent', item.id, -1)}
                        disabled={index === 0}
                        aria-label="Mover para cima"
                      >
                        ▲
                      </button>
                      <button
                        class="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                        type="button"
                        on:click={() => moveFeatured('rent', item.id, 1)}
                        disabled={index === featuredRent.length - 1}
                        aria-label="Mover para baixo"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      class="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                      type="button"
                      on:click={() => removeFeatured('rent', item.id)}
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
          placeholder="Buscar título, ID, código..."
          value={search}
          on:input={handleSearchInput}
        />
      </div>

      {#if isLoadingCandidates}
        <div class="text-sm text-gray-500 dark:text-gray-400">Carregando aprovados...</div>
      {:else if candidates.length === 0}
        <div
          class="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
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
                <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Finalidade</th>
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
                      <div
                        class="flex h-12 w-16 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      >
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
                    {item.purpose ?? '-'}
                  </td>
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {candidatePriceLabel(item)}
                  </td>
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {item.broker_name ?? '-'}
                  </td>
                  <td class="px-3 py-2 text-right">
                    <div class="flex flex-col items-end gap-1">
                      <button
                        class="rounded-md border border-green-200 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/30"
                        type="button"
                        on:click={() => requestAdd(item)}
                        disabled={rowAddDisabled(item, featuredSale, featuredRent, MAX_FEATURED)}
                      >
                        {addStateLabel(item, featuredSale, featuredRent)}
                      </button>
                      {#if membershipLabel(item, featuredSale, featuredRent)}
                        <span class="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          {membershipLabel(item, featuredSale, featuredRent)}
                        </span>
                      {/if}
                    </div>
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

{#if dualModalItem}
  {@const dual = dualModalItem}
  <div
    class="fixed inset-0 z-[280] flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(e) => e.target === e.currentTarget && closeDualModal()}
  >
    <div
      class="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dual-modal-title"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 id="dual-modal-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Onde exibir?
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {dual.title} — venda e aluguel. Escolha a(s) vitrine(s).
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={closeDualModal}
          aria-label="Fechar modal"
        >
          ×
        </button>
      </div>
      <div class="mt-4 space-y-3">
        <label class="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            class="rounded border-gray-300 text-green-600"
            bind:checked={dualAddSale}
            disabled={featuredSale.some((i) => i.id === dual.id) || featuredSale.length >= MAX_FEATURED}
          />
          Vitrine venda
        </label>
        <label class="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            class="rounded border-gray-300 text-green-600"
            bind:checked={dualAddRent}
            disabled={featuredRent.some((i) => i.id === dual.id) || featuredRent.length >= MAX_FEATURED}
          />
          Vitrine aluguel
        </label>
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button
          class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
          type="button"
          on:click={closeDualModal}
        >
          Cancelar
        </button>
        <button
          class="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          type="button"
          on:click={confirmDualModal}
        >
          Aplicar
        </button>
      </div>
    </div>
  </div>
{/if}

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
      <img
        src={previewImageUrl}
        alt={previewImageAlt}
        class="max-h-[90vh] max-w-[95vw] rounded-md object-contain"
      />
      <button
        type="button"
        class="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
        aria-label="Fechar"
        on:click|stopPropagation={closeImagePreview}
      >
        x
      </button>
    </div>
  </div>
{/if}
