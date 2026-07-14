<script lang="ts">
  import { Download, Loader2, Pencil, Trash2, Upload } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import type { ContractMatrixRowView, ContractItem } from '$lib/components/contracts/types';

  export let contract: ContractItem | null = null;
  export let rows: ContractMatrixRowView[] = [];
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

  function nameFromInfo(info: Record<string, unknown> | null | undefined): string {
    const value = info?.nome ?? info?.name ?? info?.fullName ?? info?.full_name;
    return String(value ?? '').trim();
  }

  function actorName(role: 'proposer' | 'buyer' | 'advertiser' | 'seller'): string {
    if (!contract) return '(A definir)';
    const value = role === 'proposer'
      ? contract.proposerName ?? contract.buyerClientName ?? contract.clientName
      : role === 'buyer'
      ? nameFromInfo(contract.buyerInfo) || contract.buyerClientName || contract.clientName
      : role === 'advertiser'
      ? contract.advertiserName ?? contract.ownerName ?? contract.propertyOwnerName
      : nameFromInfo(contract.sellerInfo ?? contract.ownerInfo) || contract.sellerClientName || contract.ownerName;
    return String(value ?? '').trim() || '(A definir)';
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
      <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{actorName('buyer')}</p>
      <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">Documentos do adquirente legal</p>
    </div>
    <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Anunciante</p>
      <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{actorName('advertiser')}</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ator que publicou o imóvel</p>
    </div>
    <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
      <p class="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">Vendedor</p>
      <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{actorName('seller')}</p>
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
                          <details class="relative">
                            <summary class="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                              <Pencil class="h-3.5 w-3.5" /> Editar
                            </summary>
                            <div class="absolute bottom-full left-0 z-10 mb-2 flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Baixar documento" title="Baixar" on:click={() => onDownload(sellerDoc)} disabled={downloadingDocumentId === sellerDoc.id}>
                                {#if downloadingDocumentId === sellerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Download class="h-4 w-4" />{/if}
                              </button>
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Substituir documento" title="Substituir" on:click={() => onReplace(documentType, 'seller', String(sellerDoc.documentType ?? '').trim().toLowerCase())} disabled={!canAddAnotherMatrixDocument(contract, documentType, 'seller')}>
                                {#if isMatrixUploading(`seller:${documentType}`)}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Upload class="h-4 w-4" />{/if}
                              </button>
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40" aria-label="Excluir documento" title="Excluir" on:click={() => onDelete(sellerDoc)} disabled={matrixDeletingDocumentId === sellerDoc.id}>
                                {#if matrixDeletingDocumentId === sellerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Trash2 class="h-4 w-4" />{/if}
                              </button>
                            </div>
                          </details>
                          {#if !isApproved(sellerDoc)}
                            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" on:click={() => onReview(sellerDoc, 'APPROVED')} disabled={reviewDocumentId === sellerDoc.id}>
                              {#if reviewDocumentId === sellerDoc.id}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{/if}
                              Aprovar<span class="sr-only"> documento</span>
                            </Button>
                          {/if}
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
                          <details class="relative">
                            <summary class="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                              <Pencil class="h-3.5 w-3.5" /> Editar
                            </summary>
                            <div class="absolute bottom-full left-0 z-10 mb-2 flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Baixar documento" title="Baixar" on:click={() => onDownload(buyerDoc)} disabled={downloadingDocumentId === buyerDoc.id}>
                                {#if downloadingDocumentId === buyerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Download class="h-4 w-4" />{/if}
                              </button>
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800" aria-label="Substituir documento" title="Substituir" on:click={() => onReplace(documentType, 'buyer', String(buyerDoc.documentType ?? '').trim().toLowerCase())} disabled={!canAddAnotherMatrixDocument(contract, documentType, 'buyer')}>
                                {#if isMatrixUploading(`buyer:${documentType}`)}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Upload class="h-4 w-4" />{/if}
                              </button>
                              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40" aria-label="Excluir documento" title="Excluir" on:click={() => onDelete(buyerDoc)} disabled={matrixDeletingDocumentId === buyerDoc.id}>
                                {#if matrixDeletingDocumentId === buyerDoc.id}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Trash2 class="h-4 w-4" />{/if}
                              </button>
                            </div>
                          </details>
                          {#if !isApproved(buyerDoc)}
                            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" on:click={() => onReview(buyerDoc, 'APPROVED')} disabled={reviewDocumentId === buyerDoc.id}>
                              {#if reviewDocumentId === buyerDoc.id}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{/if}
                              Aprovar<span class="sr-only"> documento</span>
                            </Button>
                          {/if}
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
