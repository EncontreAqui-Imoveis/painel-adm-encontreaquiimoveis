<script lang="ts">
  import { Loader2, Eye, Trash2, Upload } from 'lucide-svelte';
  import type { BrokerDocumentLabelKey } from '$lib/components/broker/brokerReviewHelpers';

  export let hasRealDocuments = false;
  export let resolvedCreciFrontUrl = '';
  export let resolvedCreciBackUrl = '';
  export let resolvedSelfieUrl = '';
  export let isDeletingDocument = false;
  export let isUploadingDocument = false;
  export let getDocumentLabel: (docType: BrokerDocumentLabelKey) => string;
  export let getDocumentActionLabel: (action: 'view' | 'delete' | 'replace' | 'send', docType: BrokerDocumentLabelKey) => string;
  export let openPreview: (url: string, title: string) => void;
  export let deleteDocument: (docType: BrokerDocumentLabelKey) => void | Promise<void>;
  export let uploadDocument: (docType: BrokerDocumentLabelKey, file: File) => void | Promise<void>;

  let documentInputEl: HTMLInputElement | null = null;
  let currentUploadDocType: BrokerDocumentLabelKey = 'creciFront';

  function triggerDocumentUpload(docType: BrokerDocumentLabelKey) {
    currentUploadDocType = docType;
    documentInputEl?.click();
  }

  async function handleDocumentFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    await uploadDocument(currentUploadDocType, file);
    input.value = '';
  }
</script>

<div class="mt-6 space-y-4">
  <h4 class="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">Documentação</h4>
  {#if !hasRealDocuments}
    <p class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
      O corretor ainda não enviou documentos reais para revisão.
    </p>
  {/if}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    {#each [
      { key: 'creciFront' as const, url: resolvedCreciFrontUrl },
      { key: 'creciBack' as const, url: resolvedCreciBackUrl },
      { key: 'selfie' as const, url: resolvedSelfieUrl },
    ] as document}
      <div class="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 transition-all hover:border-green-300 hover:bg-green-50/30 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-green-700/50">
        <div class="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">
          {getDocumentLabel(document.key)}
        </div>
        {#if document.url}
          <div class="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <img src={document.url} alt={getDocumentLabel(document.key)} class="h-full w-full object-cover" />
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-full bg-white p-2 text-gray-900 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  on:click={() => openPreview(document.url, getDocumentLabel(document.key))}
                  title={getDocumentActionLabel('view', document.key)}
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="rounded-full bg-red-500 p-2 text-white shadow-sm hover:bg-red-600"
                  on:click={() => deleteDocument(document.key)}
                  disabled={isDeletingDocument}
                  title={getDocumentActionLabel('delete', document.key)}
                >
                  {#if isDeletingDocument}
                    <Loader2 class="h-4 w-4 animate-spin" />
                  {:else}
                    <Trash2 class="h-4 w-4" />
                  {/if}
                </button>
                <button
                  type="button"
                  class="rounded-full bg-green-600 p-2 text-white shadow-sm hover:bg-green-700"
                  on:click={() => triggerDocumentUpload(document.key)}
                  disabled={isUploadingDocument}
                  title={getDocumentActionLabel('replace', document.key)}
                  aria-label={getDocumentActionLabel('replace', document.key)}
                >
                  <Upload class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        {:else}
          <button
            type="button"
            class="flex flex-col items-center gap-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
            on:click={() => triggerDocumentUpload(document.key)}
            disabled={isUploadingDocument}
          >
            <div class="rounded-full border border-gray-300 p-2 dark:border-gray-600">
              <Upload class="h-5 w-5" />
            </div>
            <span class="text-[10px] font-medium uppercase tracking-wider">
              {getDocumentActionLabel('send', document.key)}
            </span>
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <input
    type="file"
    accept="image/*"
    class="hidden"
    bind:this={documentInputEl}
    on:change={handleDocumentFileChange}
  />
</div>
