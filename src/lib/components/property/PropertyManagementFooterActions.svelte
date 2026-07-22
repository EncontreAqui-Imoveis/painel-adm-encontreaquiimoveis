<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';

  export let allowApproval = false;
  export let isEditMode = false;
  export let selectedStatus: string = '';
  export let hasEditableProperty = false;
  export let isProcessing = false;
  export let isSavingEdit = false;
  export let onClose: () => void = () => {};
  export let onReject: () => void = () => {};
  export let onSave: () => void | Promise<void> = () => {};
  export let onApprove: () => void = () => {};
</script>

<Button variant="outline" on:click={onClose} disabled={isProcessing}>
  Sair
</Button>

{#if allowApproval}
  {#if selectedStatus !== 'rejected'}
    <Button variant="destructive" on:click={onReject} disabled={isProcessing}>
      {#if isProcessing}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Rejeitar
    </Button>
  {/if}
{/if}

{#if isEditMode && hasEditableProperty}
  <Button
    className={allowApproval ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}
    on:click={onSave}
    disabled={isSavingEdit || isProcessing}
  >
    {#if isSavingEdit}
      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
    {/if}
    Salvar
  </Button>
{/if}

{#if allowApproval && selectedStatus !== 'approved'}
  <Button className="bg-emerald-600 text-white hover:bg-emerald-700" on:click={onApprove} disabled={isProcessing}>
    {#if isProcessing}
      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
    {/if}
    Aprovar
  </Button>
{/if}
