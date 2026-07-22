<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';

  type EditablePropertyLike = {
    status?: string;
    purpose?: string | null;
  };

  export let isEditMode = false;
  export let editableProperty: EditablePropertyLike | null = null;
  export let isSavingEdit = false;
  export let isProcessing = false;
  export let toggleEditMode: () => void;
  export let saveEdits: () => void;
  export let openPromotionNotificationFromSelected: () => void;
</script>

<div class="flex items-center gap-2">
  <Button variant="outline" on:click={toggleEditMode} disabled={isSavingEdit}>
    {isEditMode ? 'Cancelar edição' : 'Editar dados'}
  </Button>
  {#if isEditMode && editableProperty}
    <Button
      className="bg-emerald-500 text-white hover:bg-emerald-600"
      on:click={saveEdits}
      disabled={isSavingEdit || isProcessing}
    >
      {#if isSavingEdit}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Salvar
    </Button>
  {/if}
  <Button
    variant="outline"
    on:click={openPromotionNotificationFromSelected}
    disabled={isProcessing || isSavingEdit}
  >
    Notificar promoção
  </Button>
  {#if isEditMode && editableProperty?.status === 'pending_approval'}
    <span
      class="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
    >
      Pendente de aprovação
    </span>
  {:else if isEditMode && editableProperty}
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-500 dark:text-gray-400" for="status-select">Status</label>
      <select
        id="status-select"
        name="status"
        class="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-500"
        bind:value={editableProperty.status}
      >
        <option value="approved">Disponível</option>
        {#if editableProperty.purpose === 'Aluguel' || editableProperty.purpose === 'Venda e Aluguel'}
          <option value="rented">Alugado</option>
        {/if}
        {#if editableProperty.purpose === 'Venda' || editableProperty.purpose === 'Venda e Aluguel'}
          <option value="sold">Vendido</option>
        {/if}
      </select>
    </div>
  {/if}
</div>
