<script lang="ts">
  import type { ContractItem } from './types';
  import { contractSideLabel } from './contractsDisplayHelpers';

  export let contract: ContractItem;
  export let loading = false;
  export let error = false;

  const sides = ['seller', 'buyer'] as const;
  $: signatures = contract.signatures;
  $: version = signatures?.currentVersion;
  // Document identity comes from the current-version DTO, never from list order or upload metadata.
  $: currentDocument = version ? contract.documents?.find((doc) => doc.id === version.documentId
    && doc.documentType === 'contrato_assinado' && doc.metadata?.contractId === contract.id) : undefined;

  function sideLabel(side: 'seller' | 'buyer'): string {
    return contract.dealType === 'sale' || contract.dealType === 'rent'
      ? contractSideLabel(contract, side) : `Parte ${side}`;
  }

  function formatTimestamp(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR');
  }
</script>

<section aria-labelledby="contract-signature-status-title" aria-busy={loading}
  class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
  <h4 id="contract-signature-status-title" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
    Assinaturas presenciais
  </h4>
  {#if loading}
    <p role="status" class="mt-2 text-sm text-gray-600 dark:text-gray-300">Carregando estado das assinaturas…</p>
  {:else if error}
    <p role="alert" class="mt-2 text-sm text-red-700 dark:text-red-300">
      Não foi possível consultar o estado das assinaturas. Use Atualizar para tentar novamente.
    </p>
  {:else if !signatures}
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
      Dados de assinaturas não disponíveis para este contrato. Nenhuma confirmação pode ser identificada nesta consulta.
    </p>
  {:else if !version}
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
      Nenhum PDF assinado corrente. Documentos históricos não representam uma versão vigente.
    </p>
  {:else}
    <div class="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
      <p class="font-medium">PDF corrente: {currentDocument?.originalFileName || `Documento #${version.documentId}`}</p>
      <p>Versão #{version.id} · Documento #{version.documentId} · Revisão da minuta #{version.draftRevisionId}</p>
      <p class="text-xs">Enviado por administrador #{version.uploadedByAdminId} em {formatTimestamp(version.uploadedAt)}</p>
      {#if !currentDocument}
        <p class="text-xs">O documento corrente não está disponível nesta listagem.</p>
      {/if}
      {#if version.previousVersionId != null}
        <p class="text-xs">Versão anterior: #{version.previousVersionId}</p>
      {/if}
      {#if version.replacementReason}
        <p class="break-words whitespace-pre-wrap text-xs">Justificativa da substituição: {version.replacementReason}</p>
      {/if}
      {#if version.equivalence}
        <p class="text-xs">Equivalência declarada por administrador #{version.equivalence.declaredByAdminId} em {formatTimestamp(version.equivalence.declaredAt)}.</p>
        <p class="break-words whitespace-pre-wrap text-xs">Justificativa da equivalência: {version.equivalence.reason}</p>
      {/if}
    </div>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      {#each sides as side}
        {@const evidence = signatures[side]}
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{sideLabel(side)}</h5>
          {#if evidence.status === 'CONFIRMED'}
            <p class="mt-2 rounded bg-emerald-100 px-2 py-1 text-sm text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">Confirmada diretamente</p>
          {:else if evidence.status === 'PRESERVED'}
            <p class="mt-2 rounded bg-blue-100 px-2 py-1 text-sm text-blue-900 dark:bg-blue-900/40 dark:text-blue-200">Preservada por equivalência</p>
          {:else}
            <p class="mt-2 rounded bg-amber-100 px-2 py-1 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">Pendente</p>
          {/if}
          {#if evidence.status === 'CONFIRMED' || evidence.status === 'PRESERVED'}
            <div class="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
              {#if evidence.confirmedByAdminId != null}<p>Confirmação original: administrador #{evidence.confirmedByAdminId}</p>{/if}
              {#if evidence.confirmedAt}<p>Data da confirmação: {formatTimestamp(evidence.confirmedAt)}</p>{/if}
              {#if evidence.eventId != null}<p>Evento vigente: #{evidence.eventId}</p>{/if}
              {#if evidence.status === 'PRESERVED'}
                {#if evidence.originalSignedVersionId != null}<p>Confirmação originada da versão #{evidence.originalSignedVersionId}</p>{/if}
                {#if evidence.originalEventId != null}<p>Evento original: #{evidence.originalEventId}</p>{/if}
                {#if evidence.sourceEventId != null}<p>Evento de origem da preservação: #{evidence.sourceEventId}</p>{/if}
                {#if evidence.preservation}
                  <p>Preservação registrada por administrador #{evidence.preservation.performedByAdminId} em {formatTimestamp(evidence.preservation.performedAt)}.</p>
                  <p class="break-words whitespace-pre-wrap">Justificativa: {evidence.preservation.reason}</p>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <p class="mt-3 text-xs text-gray-600 dark:text-gray-300">O upload do PDF não confirma automaticamente as assinaturas.</p>
  {/if}
</section>
