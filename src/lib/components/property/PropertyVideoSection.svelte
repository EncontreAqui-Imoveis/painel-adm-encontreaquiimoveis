<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';

  export let inputEl: HTMLInputElement | null = null;
  export let existingVideoUrl: string | null = null;
  export let stagedVideo: File | null = null;
  export let stagedVideoPreview: string | null = null;
  export let videoUploading = false;
  export let videoDeleting = false;
  export let videoDeleteError: string | null = null;
  export let onOpenPicker: () => void = () => {};
  export let onSelection: (event: Event) => void = () => {};
  export let onDrop: (event: DragEvent) => void = () => {};
  export let onUpload: () => void | Promise<void> = () => {};
  export let onClear: () => void = () => {};
  export let onDelete: () => void | Promise<void> = () => {};

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

<div>
  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Video</h3>

  {#if existingVideoUrl}
    <div class="mt-2 overflow-hidden rounded-lg bg-black/10 dark:bg-gray-800">
      <video class="h-64 w-full rounded-lg object-cover" src={existingVideoUrl} controls preload="metadata">
        <track kind="captions" srclang="pt" label="Portugues" />
      </video>
    </div>
  {:else}
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Nenhum video cadastrado.</p>
  {/if}

  <div class="mt-3 space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="upload-video-input">
      Enviar vídeo
    </label>
    <div
      class={`rounded-md border-2 border-dashed p-3 transition ${
        isDropActive
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
      role="group"
      aria-label="Envio de video do imóvel"
      on:dragover={handleDragOver}
      on:dragenter={handleDragEnter}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
    >
      <input
        id="upload-video-input"
        name="video"
        bind:this={inputEl}
        class="sr-only"
        type="file"
        accept="video/*"
        on:change={onSelection}
        disabled={videoUploading || videoDeleting}
      />
      <div class="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" on:click={onOpenPicker} disabled={videoUploading || videoDeleting}>
          Escolher vídeo
        </Button>
        <span class="text-sm text-gray-600 dark:text-gray-300">
          {stagedVideo ? stagedVideo.name : 'Nenhum vídeo selecionado'}
        </span>
      </div>
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Arraste e solte um vídeo aqui ou clique para selecionar.
      </p>
    </div>

    {#if stagedVideoPreview}
      <div class="mt-2 overflow-hidden rounded-lg bg-black/10 dark:bg-gray-800">
        <video class="h-64 w-full rounded-lg object-cover" src={stagedVideoPreview} controls preload="metadata">
          <track kind="captions" srclang="pt" label="Portugues" />
        </video>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button on:click={onUpload} disabled={videoUploading || videoDeleting}>
          {#if videoUploading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Salvar
        </Button>
        <Button variant="outline" on:click={onClear} disabled={videoUploading || videoDeleting}>
          Sair
        </Button>
      </div>
    {/if}

    {#if existingVideoUrl}
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" on:click={onDelete} disabled={videoDeleting || videoUploading}>
          {#if videoDeleting}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Remover vídeo
        </Button>
      </div>
    {/if}

    {#if videoUploading}
      <p class="text-xs text-gray-500 dark:text-gray-400">Enviando video...</p>
    {/if}
    {#if videoDeleteError}
      <p class="text-xs text-red-500 dark:text-red-400">{videoDeleteError}</p>
    {/if}
  </div>
</div>
