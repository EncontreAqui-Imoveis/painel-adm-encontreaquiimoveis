<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';

  export let isEditMode = false;
  export let isProcessing = false;
  export let showApprove = false;
  export let showReject = true;
  export let showDemote = false;
  export let hasBrokerDetail = false;
  export let onClose: () => void;
  export let onToggleEdit: (value: boolean) => void;
  export let onSave: () => void;
  export let onApprove: () => void;
  export let onReject: () => void;
  export let onDemote: () => void;
  export let onOpenDeleteDialog: () => void;
</script>

<Dialog.Footer className="flex gap-2">
  <Button variant="outline" on:click={onClose} disabled={isProcessing}>
    Cancelar
  </Button>
  {#if isEditMode}
    <Button variant="outline" on:click={() => onToggleEdit(false)} disabled={isProcessing}>
      Voltar
    </Button>
    <Button on:click={onSave} disabled={isProcessing}>
      {#if isProcessing}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Salvar alterações
    </Button>
  {:else}
    <Button variant="outline" on:click={() => onToggleEdit(true)} disabled={isProcessing || !hasBrokerDetail}>
      Editar
    </Button>
    {#if showApprove}
      <Button
        variant="outline"
        className="bg-green-600 text-white hover:bg-green-700"
        on:click={onApprove}
        disabled={isProcessing}
      >
        {#if isProcessing}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Aprovar
      </Button>
    {/if}
    {#if showReject}
      <Button variant="destructive" className="bg-red-500 text-white hover:bg-red-600" on:click={onReject} disabled={isProcessing}>
        {#if isProcessing}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Rejeitar
      </Button>
    {/if}
    {#if showDemote}
      <Button
        variant="destructive"
        className="bg-amber-600 text-white hover:bg-amber-700"
        on:click={onDemote}
        disabled={isProcessing}
      >
        {#if isProcessing}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Tornar Usuário
      </Button>
    {/if}
    <Button className="bg-red-700 text-white hover:bg-red-800" on:click={onOpenDeleteDialog} disabled={isProcessing}>
      Excluir
    </Button>
  {/if}
</Dialog.Footer>
