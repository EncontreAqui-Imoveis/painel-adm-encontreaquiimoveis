<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { ContractItem } from './types';
  import { signatureSideLabel, type SignatureFinalizationState } from './contractSignatureFinalization';
  const sides = ['seller', 'buyer'] as const;
  export let contract: ContractItem;
  export let state: SignatureFinalizationState;
  export let refreshing = false;
  export let onRefresh: () => void = () => {};
</script>

{#if contract.status === 'AWAITING_SIGNATURES'}
  <section aria-label="Requisitos de assinatura para finalização"
    class="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
    <h4 class="font-semibold">Assinaturas para finalização</h4>
    {#if state.status === 'loading'}
      <p role="status" class="mt-2">Consultando as assinaturas. Aguarde os detalhes antes de finalizar.</p>
    {:else if state.status === 'unavailable' || state.status === 'outsideStage'}
      <p role="alert" class="mt-2">Estado das assinaturas indisponível. Atualize os detalhes antes de tentar finalizar.</p>
    {:else if state.status === 'pending' || state.status === 'complete'}
      {#if state.currentVersionId === null}
        <p class="mt-2 text-amber-800 dark:text-amber-200">Falta o PDF assinado corrente da revisão aprovada. PDFs históricos não atendem a este requisito.</p>
      {:else}
        <p class="mt-2">PDF corrente: versão #{state.currentVersionId}.</p>
      {/if}
      <ul class="mt-2 space-y-1">
        {#each sides as side}
          <li>{signatureSideLabel(contract, side)}:
            {state[side] === 'CONFIRMED' ? 'confirmada diretamente'
              : state[side] === 'PRESERVED' ? 'preservada por equivalência' : 'confirmação pendente'}.</li>
        {/each}
      </ul>
      <p class="mt-2 text-xs">
        {state.status === 'complete' ? 'Requisitos de assinatura atendidos. A finalização ainda depende das demais validações.'
          : 'A finalização fica bloqueada enquanto houver pendências de assinatura.'}
      </p>
    {/if}
    <Button size="sm" variant="outline" className="mt-3" on:click={onRefresh} disabled={refreshing}>
      {refreshing ? 'Atualizando assinaturas…' : 'Atualizar estado das assinaturas'}
    </Button>
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">O backend verifica definitivamente as assinaturas ao finalizar.</p>
  </section>
{/if}
