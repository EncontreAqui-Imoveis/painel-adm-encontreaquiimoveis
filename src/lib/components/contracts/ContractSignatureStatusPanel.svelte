<script lang="ts">
  import type { ContractDocument, ContractItem } from './types';
  import { contractSideLabel } from './contractsDisplayHelpers';
  import { Button } from '$lib/components/ui/button';
  import { matchesSignatureViewingContext, type ContractSignatureViewingEvidence } from './contractSignatureViewing';

  export let contract: ContractItem;
  export let loading = false;
  export let error = false;
  export let canConfirm = false;
  export let confirmingSide: 'seller' | 'buyer' | null = null;
  export let actionsDisabled = false;
  export let viewingEvidence: ContractSignatureViewingEvidence | null = null;
  export let onViewDocument: (doc: ContractDocument) => void = () => {};
  export let onConfirmSignature: (side: 'seller' | 'buyer', versionId: number, checked: boolean) => Promise<void> = async () => {};

  let checkedSides = { seller: false, buyer: false };
  let checkedContext = '';
  let checkedEvidence: ContractSignatureViewingEvidence | null = null;

  const sides = ['seller', 'buyer'] as const;
  $: signatures = contract.signatures;
  $: version = signatures?.currentVersion;
  $: hasViewedCurrentPdf = matchesSignatureViewingContext(contract, viewingEvidence);
  // Document identity comes from the current-version DTO, never from list order or upload metadata.
  $: currentDocument = version ? contract.documents?.find((doc) => doc.id === version.documentId
    && doc.documentType === 'contrato_assinado' && doc.metadata?.contractId === contract.id) : undefined;
  // Keep declarations across a same-PDF refresh; a different context or viewing attempt resets them.
  $: {
    const context = `${contract.id}:${version?.id}:${version?.documentId}:${version?.draftRevisionId}:${contract.status}:${error}:${canConfirm}`;
    if (context !== checkedContext || viewingEvidence !== checkedEvidence) {
      checkedContext = context;
      checkedEvidence = viewingEvidence;
      checkedSides = { seller: false, buyer: false };
    }
  }

  function confirmSide(side: 'seller' | 'buyer'): void {
    if (!canConfirm || loading || error || actionsDisabled || confirmingSide || !version
      || !matchesSignatureViewingContext(contract, viewingEvidence)
      || contract.status !== 'AWAITING_SIGNATURES' || !currentDocument?.downloadUrl
      || !checkedSides[side] || signatures?.[side].status !== 'PENDING') return;
    const versionId = version.id;
    checkedSides = { ...checkedSides, [side]: false };
    void onConfirmSignature(side, versionId, true);
  }

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
      {#if currentDocument?.downloadUrl}
        <Button size="sm" variant="outline" disabled={actionsDisabled || confirmingSide !== null}
          on:click={() => currentDocument && onViewDocument(currentDocument)}>Visualizar PDF corrente</Button>
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
    {#if canConfirm && contract.status === 'AWAITING_SIGNATURES' && currentDocument?.downloadUrl}
      <p role="status" class="mt-3 text-xs text-gray-600 dark:text-gray-300">
        {hasViewedCurrentPdf ? 'PDF corrente visualizado. Declare a conferência de cada assinatura antes de confirmar.'
          : 'Visualize o PDF corrente com sucesso antes de declarar a conferência das assinaturas.'}
      </p>
    {/if}
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
          {#if canConfirm && contract.status === 'AWAITING_SIGNATURES' && evidence.status === 'PENDING'}
            {#if currentDocument?.downloadUrl}
              <div class="mt-3 space-y-3">
                <label class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" bind:checked={checkedSides[side]}
                    disabled={!hasViewedCurrentPdf || actionsDisabled || confirmingSide !== null}
                    class="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-emerald-600" />
                  <span>Declaro que conferi a assinatura de {sideLabel(side)} no PDF corrente, versão #{version.id}.</span>
                </label>
                <Button size="sm" disabled={!hasViewedCurrentPdf || !checkedSides[side] || actionsDisabled || confirmingSide !== null}
                  on:click={() => confirmSide(side)}>
                  {confirmingSide === side ? 'Confirmando…' : `Confirmar assinatura (${sideLabel(side)})`}
                </Button>
              </div>
            {:else}
              <p class="mt-3 text-xs text-gray-600 dark:text-gray-300">Atualize os detalhes para disponibilizar o PDF corrente antes de confirmar.</p>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
    <p class="mt-3 text-xs text-gray-600 dark:text-gray-300">O upload do PDF não confirma automaticamente as assinaturas.</p>
  {/if}
</section>
