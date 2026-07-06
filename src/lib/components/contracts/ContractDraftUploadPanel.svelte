<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import type { ContractItem, ContractDocument } from '$lib/components/contracts/types';

  export let contract: ContractItem | null = null;
  export let currentDraftDocument: ContractDocument | null = null;
  export let documents: ContractDocument[] = [];
  export let selectedDraftFile: File | null = null;
  export let uploadingDraft = false;
  export let movingToPreviousStage = false;
  export let deletingDraftDocumentId: number | null = null;
  export let downloadingDocumentId: number | null = null;
  export let documentFileName: (doc: ContractDocument | null) => string = () => 'Documento';
  export let documentLabel: (documentType: string | null | undefined) => string = () => 'Documento';
  export let documentSideLabel: (doc: ContractDocument) => string | null = () => null;
  export let formatDate: (value?: string | null) => string = () => '';
  export let hasCurrentDraftDocument: (value: ContractItem | null) => boolean = () => false;
  export let draftUploadInputLabel: (value: ContractItem | null) => string = () => 'PDF da minuta';
  export let draftSubmitLabel: (value: ContractItem | null) => string = () => 'Anexar Minuta';
  export let triggerDraftPicker: () => void = () => {};
  export let submitDraft: (options?: { reuseCurrentDraft?: boolean }) => Promise<void> | void = () => {};
  export let moveContractToPreviousStage: () => void = () => {};
  export let closeModal: () => void = () => {};
  export let openDocumentPreview: (doc: ContractDocument, contract: ContractItem) => void = () => {};
  export let viewDocument: (doc: ContractDocument, contract: ContractItem) => void = () => {};
  export let deleteDraftDocument: (doc: ContractDocument) => Promise<void> | void = () => {};
  export let handleDraftFileChange: (event: Event) => void = () => {};
  export let draftUploadInputEl: HTMLInputElement | null = null;
</script>

<div class="space-y-4">
  {#if currentDraftDocument}
    <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
        Minuta atual
      </p>
      <div class="mt-2 flex flex-col gap-3 rounded bg-gray-50 px-3 py-3 text-sm dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <button
            type="button"
            class="mt-1 block text-left text-xs text-gray-500 hover:underline dark:text-gray-400 break-words whitespace-normal"
            on:click={() => {
              if (contract && currentDraftDocument) {
                void openDocumentPreview(currentDraftDocument, contract);
              }
            }}
          >
            {documentFileName(currentDraftDocument)}
          </button>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Enviado em {formatDate(currentDraftDocument?.createdAt)}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            on:click={() => {
              if (contract && currentDraftDocument) {
                void openDocumentPreview(currentDraftDocument, contract);
              }
            }}
          >
            Visualizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            on:click={() => {
              if (contract && currentDraftDocument) {
                void viewDocument(currentDraftDocument, contract);
              }
            }}
            disabled={downloadingDocumentId === currentDraftDocument.id}
          >
            {#if downloadingDocumentId === currentDraftDocument.id}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Baixar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            on:click={() => {
              if (currentDraftDocument) {
                void deleteDraftDocument(currentDraftDocument);
              }
            }}
            disabled={deletingDraftDocumentId === currentDraftDocument.id || uploadingDraft || movingToPreviousStage}
          >
            {#if deletingDraftDocumentId === currentDraftDocument.id}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Excluir minuta
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <div class="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-950/20">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          PDF da minuta
        </p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {#if hasCurrentDraftDocument(contract)}
            Se quiser trocar a minuta atual, selecione um novo PDF abaixo.
          {:else}
            Selecione o PDF que será usado como minuta oficial deste contrato.
          {/if}
        </p>
      </div>
      <span class={`rounded-full px-3 py-1 text-xs font-semibold ${hasCurrentDraftDocument(contract) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
        {hasCurrentDraftDocument(contract) ? 'Minuta anexada' : 'Minuta pendente'}
      </span>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <input
        id="draft-pdf"
        bind:this={draftUploadInputEl}
        type="file"
        accept="application/pdf,.pdf"
        on:change={handleDraftFileChange}
        class="sr-only"
        aria-hidden="true"
        tabindex="-1"
      />
      <Button variant="outline" on:click={triggerDraftPicker}>
        {draftUploadInputLabel(contract)}
      </Button>
      {#if hasCurrentDraftDocument(contract) && !selectedDraftFile}
        <Button
          variant="outline"
          on:click={() => submitDraft({ reuseCurrentDraft: true })}
          disabled={uploadingDraft || movingToPreviousStage}
        >
          {#if uploadingDraft}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Prosseguir com a mesma minuta
        </Button>
      {/if}
      {#if selectedDraftFile}
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {selectedDraftFile.name}
        </span>
      {:else}
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {hasCurrentDraftDocument(contract)
            ? 'Selecione um arquivo apenas se quiser substituir a minuta atual.'
            : 'Nenhum arquivo selecionado.'}
        </span>
      {/if}
    </div>
  </div>

  <div id="finalized-document-upload" class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
      Documentos do contrato
    </p>
    {#if documents.length === 0}
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Nenhum documento do contrato anexado até o momento.
      </p>
    {:else}
      <div class="mt-2 space-y-2">
        {#each documents as doc (doc.id)}
          <div class="flex flex-col gap-2 rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="text-left font-medium text-gray-900 hover:underline dark:text-gray-100"
                  on:click={() => {
                    if (contract) {
                      void openDocumentPreview(doc, contract);
                    }
                  }}
                >
                  {documentLabel(doc.documentType)}
                </button>
                {#if documentSideLabel(doc)}
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {documentSideLabel(doc)}
                  </span>
                {/if}
              </div>
              <button
                type="button"
                class="mt-1 block text-left text-xs text-gray-500 hover:underline dark:text-gray-400 break-words whitespace-normal"
                on:click={() => {
                  if (contract) {
                    void openDocumentPreview(doc, contract);
                  }
                }}
              >
                {documentFileName(doc)}
              </button>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Enviado em {formatDate(doc.createdAt)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              on:click={() => {
                if (contract) {
                  void openDocumentPreview(doc, contract);
                }
              }}
            >
              Visualizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              on:click={() => {
                if (contract) {
                  void viewDocument(doc, contract);
                }
              }}
              disabled={downloadingDocumentId === doc.id}
            >
              {#if downloadingDocumentId === doc.id}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Baixar
            </Button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="flex justify-end gap-2">
    <Button
      variant="outline"
      on:click={moveContractToPreviousStage}
      disabled={uploadingDraft || movingToPreviousStage}
    >
      {#if movingToPreviousStage}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Voltar
    </Button>
    <Button
      variant="outline"
      on:click={closeModal}
      disabled={uploadingDraft || movingToPreviousStage}
    >
      Fechar
    </Button>
    {#if hasCurrentDraftDocument(contract)}
      {#if selectedDraftFile}
        <Button
          className="bg-green-600 text-white hover:bg-green-700"
          on:click={() => submitDraft()}
          disabled={uploadingDraft || movingToPreviousStage}
        >
          {#if uploadingDraft}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          {draftSubmitLabel(contract)}
        </Button>
      {/if}
    {:else}
      <Button
        className="bg-green-600 text-white hover:bg-green-700"
        on:click={() => submitDraft()}
        disabled={uploadingDraft || movingToPreviousStage || !selectedDraftFile}
      >
        {#if uploadingDraft}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {draftSubmitLabel(contract)}
      </Button>
    {/if}
  </div>
</div>
