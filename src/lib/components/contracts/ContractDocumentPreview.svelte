<script lang="ts">
  import {
    Download,
    Loader2,
    Maximize2,
    RefreshCcw,
    Trash2,
    X,
    ZoomIn,
    ZoomOut,
  } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import type { ContractDocument, ContractItem } from '$lib/components/contracts/types';

  export let open = false;
  export let isFullscreen = false;
  export let fullscreenTargetEl: HTMLDivElement | null = null;
  export let loading = false;
  export let error = '';
  export let title = '';
  export let fileName = '';
  export let kind: 'image' | 'pdf' = 'image';
  export let sourceUrl = '';
  export let zoom = 1;
  export let pdfPages: Array<{ pageNumber: number; dataUrl: string }> = [];
  export let pdfText = '';
  export let pdfFallbackUsed = false;
  export let doc: ContractDocument | null = null;
  export let onClose: () => void = () => {};
  export let onToggleFullscreen: () => void | Promise<void> = () => {};
  export let onZoomOut: () => void = () => {};
  export let onZoomIn: () => void = () => {};
  export let onResetZoom: () => void = () => {};
  export let onDownload: () => void = () => {};
  export let onReplace: () => void = () => {};
  export let onDelete: () => void | Promise<void> = () => {};
</script>

{#if open}
  <div
    class={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden overscroll-none bg-black/75 ${isFullscreen ? 'p-0' : 'p-3'}`}
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
    on:keydown={() => {}}
  >
    <div
      bind:this={fullscreenTargetEl}
      class={`flex w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-950 ${
        isFullscreen ? 'fixed inset-0 h-screen max-h-screen max-w-none rounded-none bg-black' : 'max-h-[92vh] max-w-6xl rounded-2xl'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
    >
      {#if !isFullscreen}
        <div class="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {doc ? 'Documento do contrato' : 'Imagem do imóvel'}
            </p>
            <h3 id="document-preview-title" class="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {title || 'Visualização'}
            </h3>
            {#if fileName}
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">{fileName}</p>
            {/if}
          </div>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="outline" on:click={onToggleFullscreen} title="Alternar tela cheia">
              <Maximize2 class="h-4 w-4" />
            </Button>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              on:click={onClose}
              aria-label="Fechar visualização"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      {/if}

      <div class={`flex min-h-0 flex-1 flex-col gap-3 overflow-hidden ${isFullscreen ? 'p-0' : 'p-4'}`}>
        {#if loading}
          <div class="flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 class="h-4 w-4 animate-spin" />
              Carregando visualização...
            </div>
          </div>
        {:else if error}
          <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        {:else}
          <div
            class={`relative min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-gray-100 overscroll-y-contain ${
              isFullscreen ? 'rounded-none border-0 bg-black p-0' : 'p-4'
            } dark:border-gray-800 dark:bg-black`}
          >
            {#if isFullscreen}
              <div class="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-end justify-between px-4">
                <div class="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-white shadow-2xl backdrop-blur">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10"
                    on:click={onZoomOut}
                    title="Diminuir zoom"
                  >
                    <ZoomOut class="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10"
                    on:click={onZoomIn}
                    title="Aumentar zoom"
                  >
                    <ZoomIn class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-full px-3 border-white/20 text-white hover:bg-white/10" on:click={onResetZoom}>
                    100%
                  </Button>
                </div>
                <div class="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-white shadow-2xl backdrop-blur">
                  <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10" on:click={onDownload} title="Baixar documento">
                    <Download class="h-4 w-4" />
                  </Button>
                  {#if doc}
                    <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10" on:click={onReplace} title="Substituir documento">
                      <RefreshCcw class="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" className="h-9 w-9 rounded-full p-0" on:click={onDelete} title="Excluir documento">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  {/if}
                  <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10" on:click={onToggleFullscreen} title="Sair da tela cheia">
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            {:else}
              <div class="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div class="flex items-center gap-2">
                  <Button size="sm" variant="outline" on:click={onZoomOut}>
                    <ZoomOut class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" on:click={onZoomIn}>
                    <ZoomIn class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" on:click={onResetZoom}>
                    100%
                  </Button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0" on:click={onDownload} title="Baixar documento">
                    <Download class="h-4 w-4" />
                  </Button>
                  {#if doc}
                    <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0" on:click={onReplace} title="Substituir documento">
                      <RefreshCcw class="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" className="h-9 w-9 rounded-full p-0" on:click={onDelete} title="Excluir documento">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  {/if}
                  <Button size="sm" variant="outline" on:click={onToggleFullscreen} title="Alternar tela cheia">
                    <Maximize2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            {/if}

            <div class="relative flex min-h-full w-full justify-center overflow-hidden overscroll-y-contain" style={`transform: scale(${zoom}); transform-origin: top center;`}>
              {#if kind === 'image'}
                <img
                  src={sourceUrl}
                  alt={fileName}
                  class={`max-w-full rounded-lg object-contain shadow-2xl ${isFullscreen ? 'max-h-[100vh]' : 'max-h-[76vh]'}`}
                />
              {:else}
                <div class="flex w-full max-w-[960px] flex-col items-center gap-4">
                  {#if pdfText}
                    <p class="sr-only" data-testid="document-preview-pdf-text">{pdfText}</p>
                  {/if}
                  {#if pdfFallbackUsed && pdfText}
                    <div
                      class="pointer-events-none absolute left-4 top-4 z-20 max-w-[min(32rem,calc(100%-2rem))] rounded-md bg-black/70 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur"
                      data-testid="document-preview-pdf-visible-text"
                    >
                      {pdfText.split(' ').filter(Boolean).slice(0, 12).join(' ')}
                    </div>
                  {/if}
                  {#if pdfPages.length === 0}
                    <div class="flex min-h-[280px] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                      Renderizando páginas do PDF...
                    </div>
                  {:else}
                    {#each pdfPages as page (page.pageNumber)}
                      <div class="w-full rounded-lg bg-white p-2 shadow-2xl dark:bg-gray-950">
                        <img src={page.dataUrl} alt={`${fileName} - página ${page.pageNumber}`} class="h-auto w-full rounded-md object-contain" />
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
