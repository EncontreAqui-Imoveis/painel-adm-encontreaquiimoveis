<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import type { ContractMatrixRowView, ContractItem } from '$lib/components/contracts/types';

  export let contract: ContractItem | null = null;
  export let rows: ContractMatrixRowView[] = [];
  export let documentLabel: (documentType: string) => string = (value) => value;
  export let documentFileName: (doc: ContractMatrixRowView['sellerDocs'][number]) => string = () => 'Documento';
  export let isMatrixUploading: (key: string) => boolean = () => false;
  export let matrixCellUploadLabel: (
    contract: ContractItem | null,
    documentType: string,
    side: 'seller' | 'buyer'
  ) => string = () => 'Enviar';
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

  function actorName(role: 'proposer' | 'advertiser'): string {
    if (!contract) return 'Não identificado';
    const value = role === 'proposer'
      ? contract.proposerName ?? contract.buyerClientName ?? contract.clientName
      : contract.advertiserName;
    return String(value ?? '').trim() || (role === 'advertiser' ? 'Anunciante não vinculado' : 'Não identificado');
  }

  function requiredCount(side: 'seller' | 'buyer'): number {
    return rows.filter((row) => side === 'seller' ? row.sellerRequired : row.buyerRequired).length;
  }
</script>

<div id="contract-doc-matrix" class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
  <p id="contract-doc-matrix-help" class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
    Matriz de Documentos
  </p>
  <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Proponente</p>
      <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{actorName('proposer')}</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ator que iniciou a proposta</p>
    </div>
    <div class="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
      <p class="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">Comprador</p>
      <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{requiredCount('buyer')} requisitos jurídicos</p>
      <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">Documentos do adquirente legal</p>
    </div>
    <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Anunciante</p>
      <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{actorName('advertiser')}</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ator que publicou o imóvel</p>
    </div>
    <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
      <p class="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">Vendedor</p>
      <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{requiredCount('seller')} requisitos jurídicos</p>
      <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">Documentos do proprietário legal</p>
    </div>
  </div>
  <div class="mt-2 overflow-x-auto">
    <table class="w-full min-w-[620px] text-sm" aria-describedby="contract-doc-matrix-help">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Documento</th>
          <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Vendedor</th>
          <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Comprador</th>
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
                      <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
                            <span class={`rounded-full px-2 py-1 text-[11px] font-semibold ${documentStatusClass(sellerDoc)}`}>
                              {documentStatusLabel(sellerDoc)}
                            </span>
                          {/if}
                        </div>
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="outline" on:click={() => onDownload(sellerDoc)} disabled={downloadingDocumentId === sellerDoc.id}>
                            {#if downloadingDocumentId === sellerDoc.id}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Baixar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            on:click={() => onReplace(documentType, 'seller', String(sellerDoc.documentType ?? '').trim().toLowerCase())}
                            disabled={!canAddAnotherMatrixDocument(contract, documentType, 'seller')}
                          >
                            {#if isMatrixUploading(`seller:${documentType}`)}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            {matrixCellUploadLabel(contract, documentType, 'seller')}
                          </Button>
                          <Button size="sm" variant="destructive" on:click={() => onDelete(sellerDoc)} disabled={matrixDeletingDocumentId === sellerDoc.id}>
                            {#if matrixDeletingDocumentId === sellerDoc.id}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Excluir
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            on:click={() => onReview(sellerDoc, 'APPROVED')}
                            disabled={reviewDocumentId === sellerDoc.id}
                          >
                            {#if reviewDocumentId === sellerDoc.id}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Aprovar<span class="sr-only"> documento</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            on:click={() => onReview(sellerDoc, 'REJECTED')}
                            disabled={reviewDocumentId === sellerDoc.id}
                          >
                            Rejeitar<span class="sr-only"> documento</span>
                          </Button>
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
                      <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
                            <span class={`rounded-full px-2 py-1 text-[11px] font-semibold ${documentStatusClass(buyerDoc)}`}>
                              {documentStatusLabel(buyerDoc)}
                            </span>
                          {/if}
                        </div>
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="outline" on:click={() => onDownload(buyerDoc)} disabled={downloadingDocumentId === buyerDoc.id}>
                            {#if downloadingDocumentId === buyerDoc.id}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Baixar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            on:click={() => onReplace(documentType, 'buyer', String(buyerDoc.documentType ?? '').trim().toLowerCase())}
                            disabled={!canAddAnotherMatrixDocument(contract, documentType, 'buyer')}
                          >
                            {#if isMatrixUploading(`buyer:${documentType}`)}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            {matrixCellUploadLabel(contract, documentType, 'buyer')}
                          </Button>
                          <Button size="sm" variant="destructive" on:click={() => onDelete(buyerDoc)} disabled={matrixDeletingDocumentId === buyerDoc.id}>
                            {#if matrixDeletingDocumentId === buyerDoc.id}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Excluir
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            on:click={() => onReview(buyerDoc, 'APPROVED')}
                            disabled={reviewDocumentId === buyerDoc.id}
                          >
                            {#if reviewDocumentId === buyerDoc.id}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Aprovar<span class="sr-only"> documento</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            on:click={() => onReview(buyerDoc, 'REJECTED')}
                            disabled={reviewDocumentId === buyerDoc.id}
                          >
                            Rejeitar<span class="sr-only"> documento</span>
                          </Button>
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
