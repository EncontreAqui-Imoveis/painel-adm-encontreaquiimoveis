<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { formatPhoneDisplayBr } from '$lib/utils/phoneFormat';
  import {
    formatCurrency,
    resolvePriceLines,
    type AreaUnit,
  } from '$lib/components/property/propertyFormattingHelpers';
  import {
    humanizePropertyRequestType,
    propertyRequestTypeBadgeClasses,
    type PropertyRequestType,
    type PropertyRequestTypeFilter,
    reviewPropertyRequestTypeLabel,
  } from '$lib/components/property/propertyReviewHelpers';
  import { humanizePropertyStatus, propertyStatusBadgeClasses } from '$lib/components/property/propertyPresentationHelpers';
  import type { PropertyImage, PropertyStatus } from '$lib/types';

  type QueueProperty = {
    id: number;
    title: string;
    status: PropertyStatus;
    purpose?: string | null;
    bairro?: string | null;
    city?: string | null;
    state?: string | null;
    broker_name?: string | null;
    broker_phone?: string | null;
    images?: string | (string | PropertyImage)[] | null;
    request_type?: PropertyRequestType | null;
    created_at?: string | null;
    updated_at?: string | null;
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    promotion_price?: number | null;
    promotional_rent_price?: number | null;
    area_construida_valor?: number | null;
    area_terreno_valor?: number | null;
    area_construida_m2?: number | null;
    area_terreno_m2?: number | null;
    area_construida_unidade?: AreaUnit | null;
    area_terreno_unidade?: AreaUnit | null;
  };

  export let displayedProperties: QueueProperty[] = [];
  export let isReviewOnly = false;
  export let reviewRequestType: PropertyRequestTypeFilter = 'all';
  export let selectedProperty: QueueProperty | null = null;
  export let isDetailLoading = false;
  export let getPropertyCoverUrl: (property: QueueProperty) => string | null = () => null;
  export let openCoverPreviewFromList: (property: QueueProperty, event: Event) => void = () => {};
  export let markThumbnailAsBroken: (propertyId: number) => void = () => {};
  export let inferPropertyRequestType: (property: QueueProperty) => PropertyRequestType = () =>
    'creation';
  export let reviewProperty: (property: QueueProperty, event?: Event) => void | Promise<void> =
    () => {};
  export let handleSort: (column: string) => void = () => {};
  export let getSortIndicator: (column: string) => string = () => '';
</script>

{#if displayedProperties.length === 0}
  <div class="rounded-md border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
    <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">
      {#if isReviewOnly}
        Nenhuma solicitação encontrada
      {:else}
        Nenhum imóvel encontrado
      {/if}
    </h2>
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
      {#if isReviewOnly}
        Não há itens pendentes no recorte "{reviewPropertyRequestTypeLabel(reviewRequestType)}".
      {:else}
        Ajuste os filtros para visualizar outros resultados.
      {/if}
    </p>
  </div>
{:else}
  <div class="space-y-3 md:hidden">
    {#each displayedProperties as property}
      <div
        class={`w-full rounded-lg border p-4 text-left shadow-sm transition ${
          isReviewOnly
            ? 'border-green-200 bg-green-50/40 dark:border-green-800/60 dark:bg-gray-900/70'
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
        }`}
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-100 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {#if getPropertyCoverUrl(property)}
                <div
                  role="button"
                  tabindex="0"
                  class="h-full w-full"
                  aria-label={`Abrir capa do imóvel ${property.title} em tela cheia`}
                  on:click|stopPropagation={(event) => openCoverPreviewFromList(property, event)}
                  on:keydown|stopPropagation={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openCoverPreviewFromList(property, event);
                    }
                  }}
                >
                  <img
                    src={getPropertyCoverUrl(property)}
                    alt=""
                    class="h-full w-full object-cover"
                    loading="lazy"
                    on:error={() => markThumbnailAsBroken(property.id)}
                  />
                </div>
              {:else}
                Sem imagem
              {/if}
            </div>
            <div class="min-w-0">
              <div class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {property.title}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">ID: {property.id}</div>
            </div>
          </div>
          <span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${propertyStatusBadgeClasses(property.status)}`}>
            {humanizePropertyStatus(property.status, property.purpose)}
          </span>
        </div>
        {#if isReviewOnly}
          {@const requestType = inferPropertyRequestType(property)}
          <div class="mt-2">
            <span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${propertyRequestTypeBadgeClasses(requestType)}`}>
              Solicitação: {humanizePropertyRequestType(requestType)}
            </span>
          </div>
        {/if}
        <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {property.bairro ?? '-'}
          {#if property.city}
            {' - '}{property.city}
          {/if}
          {#if property.state}
            / {property.state}
          {/if}
        </div>
        <div class="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
          {#each resolvePriceLines(property) as line}
            <div>{line.label}: {formatCurrency(line.value)}</div>
          {/each}
        </div>
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-300">
          Anunciante: {property.broker_name ?? '-'}
        </div>
        <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
          Telefone do anunciante: {formatPhoneDisplayBr(property.broker_phone)}
        </div>
        <div class="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
            on:click={(event) => {
              event.stopPropagation();
              reviewProperty(property, event);
            }}
            disabled={isDetailLoading && selectedProperty?.id === property.id}
          >
            {#if isDetailLoading && selectedProperty?.id === property.id}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            {:else}
              Revisar
            {/if}
          </Button>
        </div>
      </div>
    {/each}
  </div>
  <div
    class={`hidden md:block show-scrollbar overflow-x-auto rounded-lg border shadow-sm ${
      isReviewOnly
        ? 'border-green-200 bg-green-50/40 dark:border-green-800/60 dark:bg-gray-900/70'
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
    }`}
  >
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.title')}>
              Imóvel
              <span>{getSortIndicator('p.title')}</span>
            </button>
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.city')}>
              Localização
              <span>{getSortIndicator('p.city')}</span>
            </button>
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.price')}>
              Valor
              <span>{getSortIndicator('p.price')}</span>
            </button>
          </th>
          {#if isReviewOnly}
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Solicitação
            </th>
          {/if}
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Anunciante</th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Telefone do anunciante</th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#each displayedProperties as property}
          <tr
            class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            on:click={(event) => reviewProperty(property, event)}
          >
            <td class="px-6 py-4">
              <div class="flex min-w-0 items-start gap-3">
                <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-100 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {#if getPropertyCoverUrl(property)}
                    <button
                      type="button"
                      class="h-full w-full"
                      aria-label={`Abrir capa do imóvel ${property.title} em tela cheia`}
                      on:click={(event) => openCoverPreviewFromList(property, event)}
                    >
                      <img
                        src={getPropertyCoverUrl(property)}
                        alt={`Capa do imóvel ${property.title}`}
                        class="h-full w-full object-cover"
                        loading="lazy"
                        on:error={() => markThumbnailAsBroken(property.id)}
                      />
                    </button>
                  {:else}
                    Sem imagem
                  {/if}
                </div>
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 dark:text-gray-100">{property.title}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">ID: {property.id}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {property.bairro ?? '-'}
              {#if property.city}
                {' - '}{property.city}
              {/if}
              {#if property.state}
                / {property.state}
              {/if}
            </td>
            <td class="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <div class="flex flex-col gap-1">
                {#each resolvePriceLines(property) as line}
                  <span>{line.label}: {formatCurrency(line.value)}</span>
                {/each}
              </div>
            </td>
            {#if isReviewOnly}
              {@const requestType = inferPropertyRequestType(property)}
              <td class="px-6 py-4">
                <span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${propertyRequestTypeBadgeClasses(requestType)}`}>
                  {humanizePropertyRequestType(requestType)}
                </span>
              </td>
            {/if}
            <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
              {property.broker_name ?? '-'}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
              {formatPhoneDisplayBr(property.broker_phone)}
            </td>
            <td class="px-6 py-4 text-right">
              <Button
                variant="outline"
                size="sm"
                className="border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
                on:click={(event) => reviewProperty(property, event)}
                disabled={isDetailLoading && selectedProperty?.id === property.id}
              >
                {#if isDetailLoading && selectedProperty?.id === property.id}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                {:else}
                  Revisar
                {/if}
              </Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
