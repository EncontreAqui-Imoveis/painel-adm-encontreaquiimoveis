<script lang="ts">
  import {
    Download,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Maximize2,
    RefreshCcw,
    RotateCw,
    Trash2,
    X,
    ZoomIn,
    ZoomOut,
  } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import type { ContractDocument, ContractItem } from '$lib/components/contracts/types';
  import { onDestroy, tick } from 'svelte';

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
  export let doc: ContractDocument | null = null;
  export let onClose: () => void = () => {};
  export let onToggleFullscreen: () => void | Promise<void> = () => {};
  export let onZoomOut: () => void = () => {};
  export let onZoomIn: () => void = () => {};
  export let onResetZoom: () => void = () => {};
  export let onDownload: () => void = () => {};
  export let onReplace: () => void = () => {};
  export let onDelete: () => void | Promise<void> = () => {};

  let closeButtonEl: HTMLButtonElement | null = null;
  let confirmationCancelEl: HTMLButtonElement | null = null;
  let previewViewportEl: HTMLDivElement | null = null;
  let pageObserver: IntersectionObserver | null = null;
  let currentPage = 1;
  let lastOpenState = false;
  let pendingConfirmation: 'replace' | 'delete' | null = null;
  let mediaDimensions: Record<string, { width: number; height: number }> = {};
  let currentRotation = 0;

  $: normalizedRotation = ((currentRotation % 360) + 360) % 360;
  $: isSideways = normalizedRotation === 90 || normalizedRotation === 270;

  $: if (open !== lastOpenState) {
    lastOpenState = open;
    if (open) {
      currentPage = 1;
      currentRotation = 0;
      void tick().then(() => closeButtonEl?.focus());
    }
  }

  $: if (pendingConfirmation) {
    void tick().then(() => confirmationCancelEl?.focus());
  }

  $: if (open && kind === 'pdf' && pdfPages.length > 0) {
    void refreshPageObserver();
  }

  function requestConfirmation(action: 'replace' | 'delete') {
    pendingConfirmation = action;
  }

  function closeConfirmation() {
    pendingConfirmation = null;
  }

  async function refreshPageObserver() {
    await tick();
    pageObserver?.disconnect();
    pageObserver = null;
    if (!previewViewportEl || typeof IntersectionObserver === 'undefined') return;

    const pageNodes = Array.from(
      previewViewportEl.querySelectorAll<HTMLElement>('[data-page-number]')
    );
    pageObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible) {
          currentPage = Number(visible.target.getAttribute('data-page-number') ?? 1);
        }
      },
      { root: previewViewportEl, threshold: [0.2, 0.5, 0.8] }
    );
    pageNodes.forEach((node) => pageObserver?.observe(node));
  }

  onDestroy(() => {
    pageObserver?.disconnect();
  });

  function scrollToPage(pageNumber: number) {
    const boundedPage = Math.min(Math.max(pageNumber, 1), pdfPages.length);
    const page = previewViewportEl?.querySelector<HTMLElement>(
      `[data-page-number="${boundedPage}"]`
    );
    page?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    currentPage = boundedPage;
  }

  function rememberMediaDimensions(key: string, event: Event) {
    const image = event.currentTarget as HTMLImageElement;
    if (!image.naturalWidth || !image.naturalHeight) return;
    mediaDimensions = {
      ...mediaDimensions,
      [key]: { width: image.naturalWidth, height: image.naturalHeight },
    };
  }

  function previewBaseWidth(zoomLevel: number) {
    return Math.max(240, 960 * zoomLevel);
  }

  function mediaKeyForPage(pageNumber?: number) {
    return pageNumber == null ? 'image' : `pdf-${pageNumber}`;
  }

  function mediaRatio(key: string) {
    const dimensions = mediaDimensions[key];
    return dimensions ? dimensions.height / dimensions.width : 1;
  }

  function previewContentWidth(sideways: boolean, zoomLevel: number) {
    const key = kind === 'image' ? mediaKeyForPage() : mediaKeyForPage(pdfPages[0]?.pageNumber);
    const width = previewBaseWidth(zoomLevel);
    return sideways ? width * mediaRatio(key) : width;
  }

  function previewContentStyle(sideways: boolean, zoomLevel: number) {
    return `width: ${previewContentWidth(sideways, zoomLevel)}px; max-width: ${!sideways && zoomLevel <= 1 ? '100%' : 'none'};`;
  }

  function previewPageStyle(sideways: boolean, zoomLevel: number) {
    return sideways ? `height: ${previewBaseWidth(zoomLevel)}px;` : '';
  }

  function previewImageStyle(sideways: boolean, rotationDegrees: number, zoomLevel: number) {
    const width = sideways ? `${previewBaseWidth(zoomLevel)}px` : '100%';
    return `width: ${width}; transform: rotate(${rotationDegrees}deg); transform-origin: center center;`;
  }

  function rotateDocument() {
    currentRotation = (currentRotation + 90) % 360;
  }

  async function confirmAction() {
    const action = pendingConfirmation;
    pendingConfirmation = null;
    if (action === 'replace') onReplace();
    if (action === 'delete') await onDelete();
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (pendingConfirmation) {
        closeConfirmation();
      } else {
        onClose();
      }
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

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
            <button
              bind:this={closeButtonEl}
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
        {#if loading && pdfPages.length === 0}
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
            bind:this={previewViewportEl}
            data-testid="document-preview-viewport"
            class={`relative min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-gray-100 overscroll-contain ${
              isFullscreen ? 'rounded-none border-0 bg-black p-0 pb-24' : 'p-4'
            } dark:border-gray-800 dark:bg-black`}
          >
            {#if isFullscreen}
              <div
                data-testid="document-preview-fullscreen-controls"
                class="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between bg-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10"
              >
                <div class="pointer-events-auto flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
                  {#if kind === 'pdf' && pdfPages.length > 0}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 rounded-full border-white/20 p-0 text-white hover:bg-white/10"
                      on:click={() => scrollToPage(currentPage - 1)}
                      ariaLabel="Página anterior"
                      title="Página anterior"
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft class="h-4 w-4" />
                    </Button>
                    <span class="min-w-[5rem] text-center text-xs font-medium" aria-live="polite">
                      Página {currentPage} de {pdfPages.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 rounded-full border-white/20 p-0 text-white hover:bg-white/10"
                      on:click={() => scrollToPage(currentPage + 1)}
                      ariaLabel="Próxima página"
                      title="Próxima página"
                      disabled={currentPage >= pdfPages.length}
                    >
                      <ChevronRight class="h-4 w-4" />
                    </Button>
                  {/if}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10"
                    on:click={onZoomOut}
                    ariaLabel="Diminuir zoom"
                    title="Diminuir zoom"
                  >
                    <ZoomOut class="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10"
                    on:click={onZoomIn}
                    ariaLabel="Aumentar zoom"
                    title="Aumentar zoom"
                  >
                    <ZoomIn class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-full px-3 border-white/20 text-white hover:bg-white/10" on:click={onResetZoom}>
                    100%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-full border-white/20 p-0 text-white hover:bg-white/10"
                    on:click={rotateDocument}
                    ariaLabel="Girar documento"
                    title="Girar 90 graus"
                  >
                    <RotateCw class="h-4 w-4" />
                  </Button>
                </div>
                <div class="pointer-events-auto flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
                  <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10" on:click={onDownload} title="Baixar documento">
                    <Download class="h-4 w-4" />
                  </Button>
                  {#if doc}
                    <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10" on:click={() => requestConfirmation('replace')} ariaLabel="Substituir documento" title="Substituir documento">
                      <RefreshCcw class="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" className="h-9 w-9 rounded-full p-0" on:click={() => requestConfirmation('delete')} ariaLabel="Excluir documento" title="Excluir documento">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  {/if}
                  <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0 border-white/20 text-white hover:bg-white/10" on:click={onToggleFullscreen} title="Sair da tela cheia">
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            {:else}
              <div class="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-gray-100/85 pb-3 pt-1 backdrop-blur-sm dark:bg-black/35">
                <div class="flex items-center gap-2">
                  {#if kind === 'pdf' && pdfPages.length > 0}
                    <Button
                      size="sm"
                      variant="outline"
                      on:click={() => scrollToPage(currentPage - 1)}
                      ariaLabel="Página anterior"
                      title="Página anterior"
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft class="h-4 w-4" />
                    </Button>
                    <span class="min-w-[5rem] text-center text-xs font-medium text-gray-700 dark:text-gray-200" aria-live="polite">
                      Página {currentPage} de {pdfPages.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      on:click={() => scrollToPage(currentPage + 1)}
                      ariaLabel="Próxima página"
                      title="Próxima página"
                      disabled={currentPage >= pdfPages.length}
                    >
                      <ChevronRight class="h-4 w-4" />
                    </Button>
                  {/if}
                  <Button size="sm" variant="outline" on:click={onZoomOut} ariaLabel="Diminuir zoom" title="Diminuir zoom">
                    <ZoomOut class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" on:click={onZoomIn} ariaLabel="Aumentar zoom" title="Aumentar zoom">
                    <ZoomIn class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" on:click={onResetZoom}>
                    100%
                  </Button>
                  <Button size="sm" variant="outline" on:click={rotateDocument} ariaLabel="Girar documento" title="Girar 90 graus">
                    <RotateCw class="h-4 w-4" />
                  </Button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0" on:click={onDownload} title="Baixar documento">
                    <Download class="h-4 w-4" />
                  </Button>
                  {#if doc}
                    <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0" on:click={() => requestConfirmation('replace')} ariaLabel="Substituir documento" title="Substituir documento">
                      <RefreshCcw class="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" className="h-9 w-9 rounded-full p-0" on:click={() => requestConfirmation('delete')} ariaLabel="Excluir documento" title="Excluir documento">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  {/if}
                  <Button size="sm" variant="outline" on:click={onToggleFullscreen} title="Alternar tela cheia">
                    <Maximize2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            {/if}

            <div class="relative flex w-full justify-center overscroll-contain">
              {#if loading}
                <div class="pointer-events-none sticky top-0 z-10 mx-auto mb-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white shadow-lg" aria-live="polite">
                  Carregando páginas...
                </div>
              {/if}
              {#if kind === 'image'}
                <div
                  data-testid="document-preview-scaled-content"
                  data-rotation={normalizedRotation}
                  data-zoom={zoom}
                  class="shrink-0"
                  style={previewContentStyle(isSideways, zoom)}
                >
                  <div class={`flex w-full justify-center overflow-visible ${isSideways ? 'items-center' : ''}`} style={previewPageStyle(isSideways, zoom)}>
                    <img
                      src={sourceUrl}
                      alt={fileName}
                      class={`h-auto rounded-lg object-contain shadow-2xl ${isFullscreen ? 'max-h-[100vh]' : 'max-h-[76vh]'}`}
                      style={previewImageStyle(isSideways, normalizedRotation, zoom)}
                      on:load={(event) => rememberMediaDimensions(mediaKeyForPage(), event)}
                    />
                  </div>
                </div>
              {:else}
                <div
                  data-testid="document-preview-scaled-content"
                  data-rotation={normalizedRotation}
                  data-zoom={zoom}
                  class="flex shrink-0 flex-col items-center gap-4"
                  style={previewContentStyle(isSideways, zoom)}
                >
                  {#if pdfText}
                    <p class="sr-only" data-testid="document-preview-pdf-text">{pdfText}</p>
                  {/if}
                  {#if pdfPages.length === 0}
                    <div class="flex min-h-[280px] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                      Renderizando páginas do PDF...
                    </div>
                  {:else}
                    {#each pdfPages as page (page.pageNumber)}
                      <div
                        data-page-number={page.pageNumber}
                        class={`flex w-full scroll-mt-2 justify-center overflow-visible rounded-lg bg-white p-2 shadow-2xl dark:bg-gray-950 ${isSideways ? 'items-center' : ''}`}
                        style={previewPageStyle(isSideways, zoom)}
                      >
                        <img
                          src={page.dataUrl}
                          alt={`${fileName} - página ${page.pageNumber}`}
                          class="h-auto rounded-md object-contain"
                          style={previewImageStyle(isSideways, normalizedRotation, zoom)}
                          on:load={(event) => rememberMediaDimensions(mediaKeyForPage(page.pageNumber), event)}
                        />
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      {#if pendingConfirmation}
        <div
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          on:click={(event) => event.target === event.currentTarget && closeConfirmation()}
        >
          <div
            class="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-900"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="document-confirmation-title"
            aria-describedby="document-confirmation-description"
          >
            <h4 id="document-confirmation-title" class="text-base font-semibold text-gray-900 dark:text-gray-100">
              {pendingConfirmation === 'delete' ? 'Excluir documento?' : 'Substituir documento?'}
            </h4>
            <p id="document-confirmation-description" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {pendingConfirmation === 'delete'
                ? 'O arquivo será removido e o requisito voltará a ficar pendente.'
                : 'O arquivo atual será substituído pelo novo documento enviado.'}
            </p>
            <div class="mt-5 flex justify-end gap-2">
              <button
                bind:this={confirmationCancelEl}
                type="button"
                class="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                on:click={closeConfirmation}
              >
                Cancelar
              </button>
              <Button size="sm" variant={pendingConfirmation === 'delete' ? 'destructive' : 'default'} on:click={confirmAction}>
                {pendingConfirmation === 'delete' ? 'Excluir documento' : 'Substituir documento'}
              </Button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
