<script lang="ts">
  import { tick } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import ContractActorsGrid from '$lib/components/contracts/ContractActorsGrid.svelte';
  import type {
    ContractDraftChangeRequest,
    ContractItem,
    ContractDocument,
  } from '$lib/components/contracts/types';

  export let contract: ContractItem | null = null;
  export let sellerLabel = 'Parte Vendedora/Locadora';
  export let buyerLabel = 'Parte Compradora/Locatária';
  export let proposerName = '';
  export let buyerName = '';
  export let advertiserName = '';
  export let sellerName = '';
  export let buyerDescription = 'Documentos do adquirente legal';
  export let sellerDescription = 'Documentos do proprietário legal';
  export let currentDraftDocument: ContractDocument | null = null;
  export let documents: ContractDocument[] = [];
  export let selectedDraftFile: File | null = null;
  export let uploadingDraft = false;
  export let movingToPreviousStage = false;
  export let deletingDraftDocumentId: number | null = null;
  export let canDeleteDocuments = true;
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
  export let requestKeepCurrentDraft: (changeRequest: ContractDraftChangeRequest) => void = () => {};
  export let requestDraftReplacementConfirmation: () => void = () => {};
  export let moveContractToPreviousStage: () => void = () => {};
  export let closeModal: () => void = () => {};
  export let openDocumentPreview: (doc: ContractDocument, contract: ContractItem) => void = () => {};
  export let viewDocument: (doc: ContractDocument, contract: ContractItem) => void = () => {};
  export let deleteDraftDocument: (doc: ContractDocument) => Promise<void> | void = () => {};
  export let handleDraftFileChange: (event: Event) => void = () => {};
  export let draftUploadInputEl: HTMLInputElement | null = null;

  let isAwaitingMinuteReview = false;
  let buyerChangeRequest: ContractDraftChangeRequest | null = null;
  let sellerChangeRequest: ContractDraftChangeRequest | null = null;
  let pendingChangeRequests: Array<{
    side: 'seller' | 'buyer';
    label: string;
    request: ContractDraftChangeRequest;
  }> = [];
  let resolvedChangeRequests: Array<{
    side: 'seller' | 'buyer';
    label: string;
    request: ContractDraftChangeRequest;
  }> = [];
  $: isAwaitingMinuteReview = contract?.status === 'AWAITING_MINUTE_REVIEW';
  $: buyerChangeRequest = contract?.draftReview?.buyerChangeRequest ?? null;
  $: sellerChangeRequest = contract?.draftReview?.sellerChangeRequest ?? null;
  $: pendingChangeRequests = [
    buyerChangeRequest?.pendingResolution ? { side: 'buyer' as const, label: buyerLabel, request: buyerChangeRequest } : null,
    sellerChangeRequest?.pendingResolution ? { side: 'seller' as const, label: sellerLabel, request: sellerChangeRequest } : null,
  ].filter((entry): entry is { side: 'seller' | 'buyer'; label: string; request: ContractDraftChangeRequest } => entry !== null);
  $: resolvedChangeRequests = [
    buyerChangeRequest?.resolution ? { side: 'buyer' as const, label: buyerLabel, request: buyerChangeRequest } : null,
    sellerChangeRequest?.resolution ? { side: 'seller' as const, label: sellerLabel, request: sellerChangeRequest } : null,
  ].filter((entry): entry is { side: 'seller' | 'buyer'; label: string; request: ContractDraftChangeRequest } => entry !== null);

  function onPickDraftFile() {
    if (draftUploadInputEl) {
      draftUploadInputEl.click();
    } else {
      (document.getElementById('draft-pdf') as HTMLInputElement | null)?.click();
      triggerDraftPicker();
    }
  }

  async function handleReviewDraftFileChange(event: Event) {
    handleDraftFileChange(event);
    await tick();
    if (selectedDraftFile) {
      await submitDraft();
    }
  }
</script>

<div class="space-y-4">
  {#if contract}
    <ContractActorsGrid
      {proposerName}
      {buyerName}
      {advertiserName}
      {sellerName}
      {buyerLabel}
      {sellerLabel}
      {buyerDescription}
      {sellerDescription}
    />
  {/if}

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
          {#if canDeleteDocuments && !isAwaitingMinuteReview}
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
          {/if}
        </div>
      </div>
      {#if contract?.draftReview && !isAwaitingMinuteReview}
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <p class="rounded bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {buyerLabel}: {contract.draftReview.buyerDecision === 'CONSENTED'
              ? 'conferida'
              : contract.draftReview.buyerDecision === 'CHANGES_REQUESTED'
                ? 'solicitou correção'
                : 'aguardando'}
          </p>
          {#if contract.draftReview.buyerDecision === 'CHANGES_REQUESTED' && contract.draftReview.buyerReason}
            <p class="-mt-1 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Motivo do {buyerLabel.toLowerCase()}: {contract.draftReview.buyerReason}
            </p>
          {/if}
          <p class="rounded bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {sellerLabel}: {contract.draftReview.sellerDecision === 'CONSENTED'
              ? 'conferida'
              : contract.draftReview.sellerDecision === 'CHANGES_REQUESTED'
                ? 'solicitou correção'
                : 'aguardando'}
          </p>
          {#if contract.draftReview.sellerDecision === 'CHANGES_REQUESTED' && contract.draftReview.sellerReason}
            <p class="-mt-1 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Motivo do {sellerLabel.toLowerCase()}: {contract.draftReview.sellerReason}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if isAwaitingMinuteReview}
    <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
        Revisão pelas partes
      </p>
      {#if !currentDraftDocument}
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          A minuta atual não está disponível.
        </p>
      {/if}

      {#if contract?.draftReview}
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <p class="rounded bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {buyerLabel}: {contract.draftReview.buyerDecision === 'CONSENTED'
              ? 'De acordo'
              : contract.draftReview.buyerDecision === 'CHANGES_REQUESTED'
                ? 'Solicitou correção'
                : 'Aguardando'}
          </p>
          <p class="rounded bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {sellerLabel}: {contract.draftReview.sellerDecision === 'CONSENTED'
              ? 'De acordo'
              : contract.draftReview.sellerDecision === 'CHANGES_REQUESTED'
                ? 'Solicitou correção'
                : 'Aguardando'}
          </p>
        </div>

        {#each pendingChangeRequests as changeRequest (changeRequest.request.id)}
          <section class="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
            <h3 class="font-semibold">Correção solicitada</h3>
            <p class="mt-2"><span class="font-medium">Solicitado por:</span> {changeRequest.label}</p>
            {#if changeRequest.request.requestedAt}
              <p class="mt-1 text-xs text-amber-800 dark:text-amber-200">
                {formatDate(changeRequest.request.requestedAt)}
              </p>
            {/if}
            <p class="mt-3 font-medium">Motivo</p>
            <p class="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded bg-white/70 p-2 text-sm dark:bg-black/20">
              {changeRequest.request.reason ?? 'Motivo não informado.'}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                on:click={() => requestKeepCurrentDraft(changeRequest.request)}
                disabled={uploadingDraft || movingToPreviousStage}
              >
                Manter minuta
              </Button>
            </div>
          </section>
        {/each}

        {#each resolvedChangeRequests as changeRequest (changeRequest.request.id)}
          <section class="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
            <h3 class="font-semibold">Solicitação analisada</h3>
            <p class="mt-2"><span class="font-medium">Solicitado por:</span> {changeRequest.label}</p>
            <p class="mt-3 font-medium">Motivo da solicitação</p>
            <p class="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-white/70 p-2 text-sm dark:bg-black/20">
              {changeRequest.request.reason ?? 'Motivo não informado.'}
            </p>
            <p class="mt-3"><span class="font-medium">Decisão:</span> Minuta mantida</p>
            <p class="mt-3 font-medium">Motivo da administração</p>
            <p class="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-white/70 p-2 text-sm dark:bg-black/20">
              {changeRequest.request.resolution?.reason ?? 'Motivo não informado.'}
            </p>
          </section>
        {/each}
      {:else}
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Aguardando a conferência das partes.
        </p>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <input
        id="draft-pdf"
        bind:this={draftUploadInputEl}
        type="file"
        accept="application/pdf,.pdf"
        on:change={handleReviewDraftFileChange}
        class="sr-only"
        aria-hidden="true"
        tabindex="-1"
      />
      <Button
        size="sm"
        variant="outline"
        on:click={() => {
          if (selectedDraftFile) {
            void submitDraft();
          } else if (pendingChangeRequests.length > 0) {
            requestDraftReplacementConfirmation();
          } else {
            onPickDraftFile();
          }
        }}
        disabled={uploadingDraft || movingToPreviousStage}
      >
        {#if uploadingDraft}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {uploadingDraft ? 'Substituindo…' : 'Substituir minuta'}
      </Button>
    </div>
  {:else}
  <div class="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-950/20">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {hasCurrentDraftDocument(contract) ? 'PDF da minuta' : 'Minuta atual'}
        </p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {#if hasCurrentDraftDocument(contract)}
            Se quiser trocar a minuta atual, selecione um novo PDF abaixo.
          {:else}
            Nenhuma minuta anexada. Selecione o PDF que será usado como minuta oficial deste contrato.
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
      <Button variant="outline" on:click={onPickDraftFile}>
        {draftUploadInputLabel(contract)}
      </Button>
      {#if hasCurrentDraftDocument(contract) && !selectedDraftFile}
        <Button
          className="bg-green-600 text-white hover:bg-green-700"
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
  {/if}

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
      Voltar para a etapa anterior
    </Button>
    <Button
      variant="outline"
      on:click={closeModal}
      disabled={uploadingDraft || movingToPreviousStage}
    >
      Fechar
    </Button>
    {#if !isAwaitingMinuteReview && hasCurrentDraftDocument(contract)}
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
      {:else}
        <Button
          className="bg-green-600 text-white hover:bg-green-700"
          on:click={() => submitDraft({ reuseCurrentDraft: true })}
          disabled={uploadingDraft || movingToPreviousStage}
        >
          {#if uploadingDraft}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Prosseguir com a mesma minuta
        </Button>
      {/if}
    {:else if !isAwaitingMinuteReview}
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
