<script lang="ts">
  import { Check, CircleAlert, Clock3, Download, Loader2, Pencil, Trash2, Upload, X } from 'lucide-svelte';
  import { clickOutside } from '$lib/actions/clickOutside';
  import { Button } from '$lib/components/ui/button';
  import type { ContractMatrixRowView, ContractItem } from '$lib/components/contracts/types';

  export let contract: ContractItem | null = null;
  export let rows: ContractMatrixRowView[] = [];
  export let sellerLabel = 'Vendedor';
  export let buyerLabel = 'Comprador';
  export let documentLabel: (documentType: string) => string = (value) => value;
  export let documentFileName: (doc: ContractMatrixRowView['sellerDocs'][number]) => string = () => 'Documento';
  export let isMatrixUploading: (key: string) => boolean = () => false;
  export let canAddAnotherMatrixDocument: (
    contract: ContractItem | null,
    documentType: string,
    side: 'seller' | 'buyer'
  ) => boolean = () => false;
  export let downloadingDocumentId: number | null = null;
  export let matrixDeletingDocumentId: number | null = null;
  export let reviewDocumentId: number | null = null;
  export let onOpenPreview: (doc: ContractMatrixRowView['sellerDocs'][number]) => void = () => {};
  export let onDownload: (doc: ContractMatrixRowView['sellerDocs'][number]) => void = () => {};
  export let onReplace: (documentType: string, side: 'seller' | 'buyer', existingDocumentType?: string | null) => void = () => {};
  export let onDelete: (doc: ContractMatrixRowView['sellerDocs'][number]) => void = () => {};
  export let onUpload: (documentType: string, side: 'seller' | 'buyer') => void = () => {};
  export let documentStatusLabel: (doc: ContractMatrixRowView['sellerDocs'][number]) => string = () => '';
  export let documentStatusClass: (doc: ContractMatrixRowView['sellerDocs'][number]) => string = () => '';
  export let onReview: (doc: ContractMatrixRowView['sellerDocs'][number], status: 'APPROVED' | 'REJECTED') => void = () => {};

  let openDocumentMenuId: number | null = null;

  function toggleDocumentMenu(documentId: number) {
    openDocumentMenuId = openDocumentMenuId === documentId ? null : documentId;
  }

  function closeDocumentMenu() {
    openDocumentMenuId = null;
  }

  function closeDocumentMenuOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') closeDocumentMenu();
  }

  function isApproved(doc: ContractMatrixRowView['sellerDocs'][number]): boolean {
    const metadata = doc.metadata ?? {};
    const status = String(
      doc.status ?? metadata.status ?? metadata.reviewStatus ?? metadata.validationStatus ?? ''
    )
      .trim()
      .toUpperCase();
    return status === 'APPROVED';
  }

  function documentStatus(doc: ContractMatrixRowView['sellerDocs'][number]): string {
    const metadata = doc.metadata ?? {};
    return String(
      doc.status ?? doc.categoryStatus ?? metadata.status ?? metadata.reviewStatus ?? metadata.validationStatus ?? 'PENDING'
    )
      .trim()
      .toUpperCase();
  }

  function isRejected(doc: ContractMatrixRowView['sellerDocs'][number]): boolean {
    return documentStatus(doc) === 'REJECTED';
  }
</script>

<svelte:window on:keydown={closeDocumentMenuOnEscape} />

<div id="contract-doc-matrix" class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
  <p id="contract-doc-matrix-help" class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
    Matriz de Documentos
  </p>
  <div class="mt-3 overflow-x-auto">
    <table class="w-full min-w-[620px] text-sm" aria-describedby="contract-doc-matrix-help">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Documento</th>
          <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">{sellerLabel}</th>
          <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">{buyerLabel}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          {@const documentType = row.documentType}
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="px-3 py-3 text-gray-700 dark:text-gray-200">{documentLabel(documentType)}</td>
            <td class="px-3 py-3">
              {#if row.sellerRequired}
                <div class="space-y-2">
                  {#if row.sellerDocs.length === 0}
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <Clock3 class="h-3 w-3" />
                        Pendente
                      </span>
                      <Button size="sm" variant="outline" on:click={() => onUpload(documentType, 'seller')}>
                        {#if isMatrixUploading(`seller:${documentType}`)}
                          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        Enviar
                      </Button>
                    </div>
                  {:else}
                    {#each row.sellerDocs as sellerDoc (sellerDoc.id)}
                      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
                        <div class="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            class="text-left font-medium text-gray-900 hover:underline dark:text-gray-100 break-words whitespace-normal"
                            on:click={() => onOpenPreview(sellerDoc)}
                          >
                            {documentFileName(sellerDoc)}
                          </button>
                          {#if documentStatusLabel(sellerDoc)}
                            <span class={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${documentStatusClass(sellerDoc)}`}>
                              {#if isApproved(sellerDoc)}
                                <Check class="h-3 w-3" />
                              {:else if isRejected(sellerDoc)}
                                <CircleAlert class="h-3 w-3" />
                              {:else}
                                <Clock3 class="h-3 w-3" />
                              {/if}
                              {documentStatusLabel(sellerDoc)}
                            </span>
                          {/if}
                        </div>
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                          {#if !isApproved(sellerDoc)}
                          <div class="relative" use:clickOutside={closeDocumentMenu}>
                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                              aria-label="Editar documento"
                              title="Editar documento"
                              aria-expanded={openDocumentMenuId === sellerDoc.id}
                              on:click={() => toggleDocumentMenu(sellerDoc.id)}
                            >
                              <Pencil class="h-4 w-4" />
                            </button>
                            {#if openDocumentMenuId === sellerDoc.id}
                            <div class="absolute bottom-full left-0 z-10 mb-2 flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900" role="menu" aria-label="Ações do documento">
                              {#if !isApproved(sellerDoc)}
                                <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Baixar documento" title="Baixar" on:click={() => { onDownload(sellerDoc); closeDocumentMenu(); }} disabled={downloadingDocumentId === sellerDoc.id}>
                                  {#if downloadingDocumentId === sellerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Download class="h-4 w-4" />{/if}
                                </button>
                              {/if}
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Substituir documento" title="Substituir" on:click={() => { onReplace(documentType, 'seller', String(sellerDoc.documentType ?? '').trim().toLowerCase()); closeDocumentMenu(); }} disabled={!canAddAnotherMatrixDocument(contract, documentType, 'seller')}>
                                {#if isMatrixUploading(`seller:${documentType}`)}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Upload class="h-4 w-4" />{/if}
                              </button>
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40" aria-label="Excluir documento" title="Excluir" on:click={() => { onDelete(sellerDoc); closeDocumentMenu(); }} disabled={matrixDeletingDocumentId === sellerDoc.id}>
                                {#if matrixDeletingDocumentId === sellerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Trash2 class="h-4 w-4" />{/if}
                              </button>
                            </div>
                            {/if}
                          </div>
                          {/if}
                          {#if isApproved(sellerDoc)}
                            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50" aria-label="Baixar documento aprovado" title="Baixar documento aprovado" on:click={() => onDownload(sellerDoc)} disabled={downloadingDocumentId === sellerDoc.id}>
                              {#if downloadingDocumentId === sellerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Download class="h-4 w-4" />{/if}
                            </button>
                          {:else}
                            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full p-2 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-emerald-950/50" aria-label="Aprovar documento" title="Aprovar documento" on:click={() => onReview(sellerDoc, 'APPROVED')} disabled={reviewDocumentId === sellerDoc.id}>
                              {#if reviewDocumentId === sellerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check class="h-4 w-4" />{/if}
                            </button>
                            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full p-2 text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-950/50" aria-label="Rejeitar documento" title="Rejeitar documento" on:click={() => onReview(sellerDoc, 'REJECTED')} disabled={reviewDocumentId === sellerDoc.id}>
                              <X class="h-4 w-4" />
                            </button>
                          {/if}
                        </div>
                      </div>
                    {/each}
                    {#if documentType.trim().toLowerCase() === 'outro'}
                      <div class="mt-3 border-t border-dashed border-gray-200 pt-3 dark:border-gray-700">
                        {#if canAddAnotherMatrixDocument(contract, documentType, 'seller')}
                          <Button size="sm" variant="outline" on:click={() => onUpload(documentType, 'seller')}>
                            {#if isMatrixUploading(`seller:${documentType}`)}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Adicionar outro
                          </Button>
                        {:else}
                          <p class="text-xs text-gray-500 dark:text-gray-400">Limite de 15 documentos atingido.</p>
                        {/if}
                      </div>
                    {/if}
                  {/if}
                </div>
              {:else}
                <span class="text-xs text-gray-500 dark:text-gray-400">N/A</span>
              {/if}
            </td>
            <td class="px-3 py-3">
              {#if row.buyerRequired}
                <div class="space-y-2">
                  {#if row.buyerDocs.length === 0}
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <Clock3 class="h-3 w-3" />
                        Pendente
                      </span>
                      <Button size="sm" variant="outline" on:click={() => onUpload(documentType, 'buyer')}>
                        {#if isMatrixUploading(`buyer:${documentType}`)}
                          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        Enviar
                      </Button>
                    </div>
                  {:else}
                    {#each row.buyerDocs as buyerDoc (buyerDoc.id)}
                      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
                        <div class="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            class="text-left font-medium text-gray-900 hover:underline dark:text-gray-100 break-words whitespace-normal"
                            on:click={() => onOpenPreview(buyerDoc)}
                          >
                            {documentFileName(buyerDoc)}
                          </button>
                          {#if documentStatusLabel(buyerDoc)}
                            <span class={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${documentStatusClass(buyerDoc)}`}>
                              {#if isApproved(buyerDoc)}
                                <Check class="h-3 w-3" />
                              {:else if isRejected(buyerDoc)}
                                <CircleAlert class="h-3 w-3" />
                              {:else}
                                <Clock3 class="h-3 w-3" />
                              {/if}
                              {documentStatusLabel(buyerDoc)}
                            </span>
                          {/if}
                        </div>
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                          {#if !isApproved(buyerDoc)}
                          <div class="relative" use:clickOutside={closeDocumentMenu}>
                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                              aria-label="Editar documento"
                              title="Editar documento"
                              aria-expanded={openDocumentMenuId === buyerDoc.id}
                              on:click={() => toggleDocumentMenu(buyerDoc.id)}
                            >
                              <Pencil class="h-4 w-4" />
                            </button>
                            {#if openDocumentMenuId === buyerDoc.id}
                            <div class="absolute bottom-full left-0 z-10 mb-2 flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900" role="menu" aria-label="Ações do documento">
                              {#if !isApproved(buyerDoc)}
                                <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Baixar documento" title="Baixar" on:click={() => { onDownload(buyerDoc); closeDocumentMenu(); }} disabled={downloadingDocumentId === buyerDoc.id}>
                                  {#if downloadingDocumentId === buyerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Download class="h-4 w-4" />{/if}
                                </button>
                              {/if}
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Substituir documento" title="Substituir" on:click={() => { onReplace(documentType, 'buyer', String(buyerDoc.documentType ?? '').trim().toLowerCase()); closeDocumentMenu(); }} disabled={!canAddAnotherMatrixDocument(contract, documentType, 'buyer')}>
                                {#if isMatrixUploading(`buyer:${documentType}`)}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Upload class="h-4 w-4" />{/if}
                              </button>
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40" aria-label="Excluir documento" title="Excluir" on:click={() => { onDelete(buyerDoc); closeDocumentMenu(); }} disabled={matrixDeletingDocumentId === buyerDoc.id}>
                                {#if matrixDeletingDocumentId === buyerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Trash2 class="h-4 w-4" />{/if}
                              </button>
                            </div>
                            {/if}
                          </div>
                          {/if}
                          {#if isApproved(buyerDoc)}
                            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50" aria-label="Baixar documento aprovado" title="Baixar documento aprovado" on:click={() => onDownload(buyerDoc)} disabled={downloadingDocumentId === buyerDoc.id}>
                              {#if downloadingDocumentId === buyerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Download class="h-4 w-4" />{/if}
                            </button>
                          {:else}
                            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full p-2 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-emerald-950/50" aria-label="Aprovar documento" title="Aprovar documento" on:click={() => onReview(buyerDoc, 'APPROVED')} disabled={reviewDocumentId === buyerDoc.id}>
                              {#if reviewDocumentId === buyerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check class="h-4 w-4" />{/if}
                            </button>
                            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full p-2 text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-950/50" aria-label="Rejeitar documento" title="Rejeitar documento" on:click={() => onReview(buyerDoc, 'REJECTED')} disabled={reviewDocumentId === buyerDoc.id}>
                              <X class="h-4 w-4" />
                            </button>
                          {/if}
                        </div>
                      </div>
                    {/each}
                    {#if documentType.trim().toLowerCase() === 'outro'}
                      <div class="mt-3 border-t border-dashed border-gray-200 pt-3 dark:border-gray-700">
                        {#if canAddAnotherMatrixDocument(contract, documentType, 'buyer')}
                          <Button size="sm" variant="outline" on:click={() => onUpload(documentType, 'buyer')}>
                            {#if isMatrixUploading(`buyer:${documentType}`)}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Adicionar outro
                          </Button>
                        {:else}
                          <p class="text-xs text-gray-500 dark:text-gray-400">Limite de 15 documentos atingido.</p>
                        {/if}
                      </div>
                    {/if}
                  {/if}
                </div>
              {:else}
                <span class="text-xs text-gray-500 dark:text-gray-400">N/A</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
