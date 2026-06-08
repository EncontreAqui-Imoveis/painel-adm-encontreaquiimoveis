<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';

  export let inputEl: HTMLInputElement | null = null;
  export let stagedImages: File[] = [];
  export let stagedImagePreviews: string[] = [];
  export let imageUploading = false;
  export let imageUploadError: string | null = null;
  export let onOpenPicker: () => void = () => {};
  export let onSelection: (event: Event) => void = () => {};
  export let onDrop: (event: DragEvent) => void = () => {};
  export let onRemoveStagedImage: (index: number) => void = () => {};
  export let onUpload: () => void | Promise<void> = () => {};
  export let onClear: () => void = () => {};

  let isDropActive = false;

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    isDropActive = true;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDropActive = true;
  }

  function handleDragLeave() {
    isDropActive = false;
  }

  function handleDrop(event: DragEvent) {
    isDropActive = false;
    onDrop(event);
  }
</script>

<div class="space-y-2">
  <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="upload-images-input">
    Enviar novas imagens
  </label>
  <p class="text-xs text-gray-500 dark:text-gray-400">Limite total: 20 imagens por imóvel.</p>
  <div
    class={`rounded-md border-2 border-dashed p-3 transition ${
      isDropActive
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
        : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}
    role="group"
    aria-label="Envio de imagens do imóvel"
    on:dragover={handleDragOver}
    on:dragenter={handleDragEnter}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <input
      id="upload-images-input"
      name="images"
      bind:this={inputEl}
      class="sr-only"
      type="file"
      accept="image/*"
      multiple
      on:change={onSelection}
      disabled={imageUploading}
    />
    <div class="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" on:click={onOpenPicker} disabled={imageUploading}>
        Escolher imagens
      </Button>
      <span class="text-sm text-gray-600 dark:text-gray-300">
        {#if stagedImages.length > 0}
          {stagedImages.length} imagem(ns) selecionada(s)
        {:else}
          Nenhuma imagem selecionada
        {/if}
      </span>
    </div>
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Arraste e solte imagens aqui ou clique para selecionar.
    </p>
  </div>

  {#if stagedImages.length > 0}
    <div class="show-scrollbar mt-3 flex gap-3 overflow-x-auto rounded-md bg-gray-50 p-3 dark:bg-gray-800/60">
      {#each stagedImagePreviews as preview, index}
        <div class="relative flex-shrink-0">
          <img src={preview} alt="Prévia da imagem" class="h-24 w-auto rounded-md object-cover shadow" />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white hover:bg-black/80"
            on:click={() => onRemoveStagedImage(index)}
            aria-label="Remover imagem selecionada"
          >
            X
          </button>
        </div>
      {/each}
    </div>
    <div class="flex flex-wrap gap-2">
      <Button on:click={onUpload} disabled={imageUploading}>
        {#if imageUploading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Salvar
      </Button>
      <Button variant="outline" on:click={onClear} disabled={imageUploading}>
        Sair
      </Button>
    </div>
  {/if}

  {#if imageUploading}
    <p class="text-xs text-gray-500 dark:text-gray-400">Enviando imagens...</p>
  {/if}
  {#if imageUploadError}
    <p class="text-xs text-red-500 dark:text-red-400">{imageUploadError}</p>
  {/if}
</div>
