<script lang="ts">
  export let proposerName = '';
  export let buyerName = '';
  export let advertiserName = '';
  export let sellerName = '';
  export let buyerLabel = 'Comprador';
  export let sellerLabel = 'Vendedor';
  export let buyerDescription = 'Documentos do adquirente legal';
  export let sellerDescription = 'Documentos do proprietário legal';

  function displayName(value: string): string {
    return value.trim() || '(A definir)';
  }
</script>

<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
  <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
    <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Proponente</p>
    <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{displayName(proposerName)}</p>
    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ator que iniciou a proposta</p>
  </div>
  <div class="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
    <p class="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">{buyerLabel}</p>
    <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{displayName(buyerName)}</p>
    <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">{buyerDescription}</p>
  </div>
  <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
    <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Anunciante</p>
    <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{displayName(advertiserName)}</p>
    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ator que publicou o imóvel</p>
  </div>
  <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
    <p class="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">{sellerLabel}</p>
    <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{displayName(sellerName)}</p>
    <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">{sellerDescription}</p>
  </div>
</div>
