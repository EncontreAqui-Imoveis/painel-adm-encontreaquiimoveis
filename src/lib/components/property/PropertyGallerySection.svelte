<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  type GalleryImage = {
    id?: number | null;
    url: string;
  };

  export let containerEl: HTMLDivElement | null = null;
  export let images: GalleryImage[] = [];
  export let visibleImages: GalleryImage[] = [];
  export let brokenCount = 0;
  export let isEditMode = false;
  export let getImageIndexByUrl: (url: string) => number = () => -1;
  export let onOpenPreview: (url: string, index: number) => void = () => {};
  export let onDeleteImage: (imageId: number) => void = () => {};
  export let onMarkBroken: (url?: string | null) => void = () => {};
</script>

<div>
  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria</h3>
  {#if images.length > 0}
    <div
      bind:this={containerEl}
      class="show-scrollbar mt-2 flex max-w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain rounded-md bg-gray-50 p-3 touch-pan-x [-webkit-overflow-scrolling:touch] dark:bg-gray-800/60"
    >
      {#each visibleImages as image (image.id)}
        <div class="relative flex shrink-0 flex-col items-center gap-2" data-gallery-image-id={image.id}>
          <button
            type="button"
            class="rounded-md p-0 shadow focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Abrir imagem do imóvel"
            on:click={() => onOpenPreview(image.url, getImageIndexByUrl(image.url))}
          >
            <img
              src={image.url}
              alt="Foto do imóvel"
              class="h-32 w-48 max-w-none rounded-md object-cover sm:w-56"
              loading="lazy"
              on:error={() => onMarkBroken(image.url)}
            />
          </button>
          {#if isEditMode && image.id != null}
            <Button variant="destructive" size="sm" on:click={() => onDeleteImage(image.id!)}>
              Remover
            </Button>
          {/if}
        </div>
      {/each}
    </div>
    {#if brokenCount > 0}
      <p class="mt-2 text-xs text-amber-600 dark:text-amber-300">
        {brokenCount} imagem(ns) corrompida(s) foram ocultada(s).
      </p>
    {/if}
  {:else}
    <p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma imagem cadastrada.</p>
  {/if}
</div>
