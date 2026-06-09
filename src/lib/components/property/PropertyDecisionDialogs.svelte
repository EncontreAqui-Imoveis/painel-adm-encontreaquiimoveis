<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { formatCurrencyInput } from '$lib/components/create-property-helpers';

  export let rejectDialogOpen = false;
  export let rejectObservation = '';
  export let rejectObservationError: string | null = null;
  export let isProcessing = false;
  export let confirmRejectProperty: () => void | Promise<void> = () => {};
  export let closeRejectDialog: () => void = () => {};

  export let soldDialogOpen = false;
  export let soldByPlatform: boolean | null = null;
  export let soldSaleValue = '';
  export let soldCommissionRate = '';
  export let soldCommissionValue = '';
  export let isSavingSold = false;
  export let resetSoldDialogState: () => void = () => {};
  export let handleSoldSave: () => void | Promise<void> = () => {};
</script>

{#if rejectDialogOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Rejeitar imóvel</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Informe a observação que justifica a rejeição antes de concluir a ação.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={closeRejectDialog}
          aria-label="Fechar modal"
        >
          ×
        </button>
      </div>
      <label class="mt-4 block">
        <span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Observação</span>
        <textarea
          rows="4"
          maxlength="500"
          bind:value={rejectObservation}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Explique o motivo da rejeição"
        ></textarea>
      </label>
      {#if rejectObservationError}
        <p class="mt-2 text-sm text-red-600 dark:text-red-300">{rejectObservationError}</p>
      {/if}
      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" on:click={closeRejectDialog} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button variant="destructive" on:click={confirmRejectProperty} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Confirmar rejeição
        </Button>
      </div>
    </div>
  </div>
{/if}

{#if soldDialogOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Imóvel vendido</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Esse imóvel foi vendido pelo Encontre Aqui?
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={resetSoldDialogState}
          aria-label="Fechar modal"
        >×</button>
      </div>

      {#if soldByPlatform === null}
        <div class="mt-6 flex justify-center gap-4">
          <Button
            className="bg-emerald-500 text-white hover:bg-emerald-600"
            on:click={() => {
              soldByPlatform = true;
            }}
          >Sim, vendido pelo Encontre Aqui</Button>
          <Button
            variant="outline"
            on:click={() => {
              soldByPlatform = false;
            }}
          >Não</Button>
        </div>
      {:else if soldByPlatform === false}
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-300">
          O imóvel será marcado como vendido e movido para a lista de imóveis vendidos.
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="outline" on:click={resetSoldDialogState} disabled={isSavingSold}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-500 text-white hover:bg-emerald-600"
            on:click={handleSoldSave}
            disabled={isSavingSold}
          >
            {#if isSavingSold}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Confirmar
          </Button>
        </div>
      {:else}
        <div class="mt-4 space-y-3">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Comissão (VGV)</h4>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400">Valor da venda (VGV)</span>
            <input
              name="sold_sale_value"
              type="text"
              inputmode="numeric"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={soldSaleValue}
              placeholder="R$ 0,00"
              on:input={(event) => {
                const target = event.target as HTMLInputElement;
                soldSaleValue = formatCurrencyInput(target.value);
              }}
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400">Taxa de comissão (%)</span>
            <input
              name="sold_commission_rate"
              type="text"
              inputmode="decimal"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={soldCommissionRate}
              placeholder="Ex: 5,00"
              on:input={(event) => {
                const target = event.target as HTMLInputElement;
                soldCommissionRate = formatCurrencyInput(target.value);
              }}
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400">Valor da comissão</span>
            <input
              name="sold_commission_value"
              type="text"
              inputmode="numeric"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={soldCommissionValue}
              placeholder="R$ 0,00"
              on:input={(event) => {
                const target = event.target as HTMLInputElement;
                soldCommissionValue = formatCurrencyInput(target.value);
              }}
            />
          </label>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="outline" on:click={resetSoldDialogState} disabled={isSavingSold}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-500 text-white hover:bg-emerald-600"
            on:click={handleSoldSave}
            disabled={isSavingSold}
          >
            {#if isSavingSold}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Salvar e marcar como vendido
          </Button>
        </div>
      {/if}
    </div>
  </div>
{/if}
