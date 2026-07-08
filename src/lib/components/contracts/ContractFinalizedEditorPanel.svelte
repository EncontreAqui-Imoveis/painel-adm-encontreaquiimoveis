<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import type { ContractItem, ContractDocument } from '$lib/components/contracts/types';

  export let contract: ContractItem | null = null;
  export let documents: ContractDocument[] = [];
  export let downloadingAllDocuments = false;
  export let deletingFinalizedDocumentId: number | null = null;
  export let downloadingDocumentId: number | null = null;
  export let deletingContract = false;
  export let reopeningContract = false;
  export let uploadingSignedDoc = false;
  export let selectedSignedFile: File | null = null;
  export let pendingReplacementDocumentId: number | null = null;
  export let signedUploadInputEl: HTMLInputElement | null = null;
  export let signedDocType = 'contrato_assinado';
  export let selectedSignedDocSide: 'seller' | 'buyer' = 'seller';
  export let documentTypeLabels: Record<string, string> = {};
  export let documentLabel: (documentType: string | null | undefined) => string = () => 'Documento';
  export let documentSideLabel: (doc: ContractDocument) => string | null = () => null;
  export let documentFileName: (doc: ContractDocument | null) => string = () => 'Documento';
  export let formatDate: (value?: string | null) => string = () => '';
  export let statusLabel: (status: string | null | undefined) => string = () => '';
  export let readCommissionValue: (source: Record<string, unknown> | null | undefined, key: string) => string = () => '';
  export let finalizedDocumentRequiresSide: (documentType: string) => boolean = () => false;
  export let prepareSignedDocumentReplacement: (doc: ContractDocument) => void = () => {};
  export let deleteFinalizedDocument: (doc: ContractDocument) => void | Promise<void> = () => {};
  export let downloadAllDocuments: (contract: ContractItem) => void | Promise<void> = () => {};
  export let uploadFinalizedDocument: () => void | Promise<void> = () => {};
  export let triggerSignedFilePicker: () => void = () => {};
  export let handleSignedFileChange: (event: Event) => void = () => {};
  export let cancelSignedDocumentReplacement: () => void = () => {};
  export let closeModal: () => void = () => {};
  export let reopenFinalizedContract: () => void | Promise<void> = () => {};
  export let deleteFinalizedContract: (contract: ContractItem) => void | Promise<void> = () => {};
  export let openDocumentPreview: (doc: ContractDocument, contract: ContractItem) => void = () => {};
  export let viewDocument: (doc: ContractDocument, contract: ContractItem) => void = () => {};
</script>

<div class="space-y-4">
  <p class="text-sm text-gray-600 dark:text-gray-300">
    Gerencie os documentos e o ciclo final deste contrato.
  </p>

  <div class="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
    <p><span class="font-semibold">Status:</span> {statusLabel(contract?.status)}</p>
    <p><span class="font-semibold">Atualizado em:</span> {formatDate(contract?.updatedAt ?? contract?.createdAt)}</p>
    <p><span class="font-semibold">Valor:</span> {readCommissionValue(contract?.commissionData ?? null, 'valorVenda') || '-'}</p>
  </div>

  <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
    <div class="flex items-center justify-between gap-3">
      <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
        Documentos do contrato finalizado
      </p>
      <Button
        size="sm"
        variant="outline"
        on:click={() => contract && downloadAllDocuments(contract)}
        disabled={downloadingAllDocuments || documents.length === 0}
      >
        {#if downloadingAllDocuments}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Baixar tudo (.zip)
      </Button>
    </div>
    {#if documents.length === 0}
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Nenhum documento vinculado a este contrato.
      </p>
    {:else}
      <div class="mt-2 space-y-2">
        {#each documents as doc (doc.id)}
          <div class="flex flex-col gap-2 rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-gray-900 dark:text-gray-100">
                  {documentLabel(doc.documentType)}
                </p>
                {#if documentSideLabel(doc)}
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {documentSideLabel(doc)}
                  </span>
                {/if}
              </div>
              <button
                type="button"
                class="mt-1 block text-left text-xs text-gray-500 hover:underline dark:text-gray-400 break-words whitespace-normal"
                on:click={() => contract && openDocumentPreview(doc, contract)}
              >
                {documentFileName(doc)}
              </button>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Enviado em {formatDate(doc.createdAt)}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button size="sm" variant="outline" on:click={() => contract && openDocumentPreview(doc, contract)}>
                Visualizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                on:click={() => contract && viewDocument(doc, contract)}
                disabled={downloadingDocumentId === doc.id}
              >
                {#if downloadingDocumentId === doc.id}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Baixar
              </Button>
              <Button size="sm" variant="outline" on:click={() => prepareSignedDocumentReplacement(doc)}>
                Substituir
              </Button>
              <Button
                size="sm"
                variant="destructive"
                on:click={() => deleteFinalizedDocument(doc)}
                disabled={deletingFinalizedDocumentId === doc.id}
              >
                {#if deletingFinalizedDocumentId === doc.id}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Excluir
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
    <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
      Adicionar documento
    </p>
    <div class="mt-3 grid gap-3 md:grid-cols-3">
      <label class="text-sm text-gray-700 dark:text-gray-200">
        Tipo do Documento
        <select
          bind:value={signedDocType}
          class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          {#each Object.entries(documentTypeLabels) as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>
      {#if finalizedDocumentRequiresSide(signedDocType)}
        <label class="text-sm text-gray-700 dark:text-gray-200">
          Lado
          <select
            bind:value={selectedSignedDocSide}
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="seller">Anunciante</option>
            <option value="buyer">Comprador</option>
          </select>
        </label>
      {/if}
      <label class="text-sm text-gray-700 dark:text-gray-200">
        Arquivo
        <input
          bind:this={signedUploadInputEl}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          on:change={handleSignedFileChange}
          class="mt-1 block w-full text-sm text-gray-700 dark:text-gray-200"
        />
      </label>
    </div>
    {#if selectedSignedFile}
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Selecionado: {selectedSignedFile.name}
      </p>
    {/if}
    {#if pendingReplacementDocumentId}
      <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
        <span>Substituição em andamento.</span>
        <Button size="sm" variant="outline" on:click={cancelSignedDocumentReplacement}>
          Cancelar substituição
        </Button>
      </div>
    {/if}
    <div class="mt-3 flex justify-end">
      <Button
        className="bg-blue-600 text-white hover:bg-blue-700"
        on:click={selectedSignedFile ? uploadFinalizedDocument : triggerSignedFilePicker}
        disabled={uploadingSignedDoc}
      >
        {#if uploadingSignedDoc}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {selectedSignedFile ? 'Adicionar documento' : 'Selecionar PDF'}
      </Button>
    </div>
  </div>

  <div class="flex justify-end gap-2">
    <Button
      variant="outline"
      on:click={() => closeModal()}
      disabled={reopeningContract || deletingContract || uploadingSignedDoc}
    >
      Fechar
    </Button>
    <Button
      variant="outline"
      on:click={reopenFinalizedContract}
      disabled={reopeningContract || deletingContract || uploadingSignedDoc}
    >
      {#if reopeningContract}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Voltar pra Disponível
    </Button>
    <Button
      variant="destructive"
      on:click={() => contract && deleteFinalizedContract(contract)}
      disabled={reopeningContract || deletingContract || uploadingSignedDoc}
    >
      {#if deletingContract}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Excluir
    </Button>
  </div>
</div>
