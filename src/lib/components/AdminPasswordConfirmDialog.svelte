<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  export let open = false;
  export let title = 'Confirmar ação';
  export let description = '';
  export let confirmLabel = 'Confirmar';
  export let isSubmitting = false;
  export let error: string | null = null;

  let password = '';
  let localError: string | null = null;

  const dispatch = createEventDispatcher<{
    confirm: { password: string };
  }>();

  $: if (!open) {
    password = '';
    localError = null;
  }

  function handleConfirm() {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      localError = 'Informe a senha atual do administrador.';
      return;
    }

    localError = null;
    dispatch('confirm', { password: trimmedPassword });
  }
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content className="max-w-md">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      {#if description}
        <Dialog.Description>{description}</Dialog.Description>
      {/if}
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <label class="block space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <span>Senha do administrador</span>
        <input
          type="password"
          bind:value={password}
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          placeholder="Digite sua senha atual"
          autocomplete="current-password"
          disabled={isSubmitting}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </label>

      {#if localError}
        <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {localError}
        </div>
      {/if}

      {#if error}
        <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      {/if}
    </div>

    <Dialog.Footer className="flex gap-2">
      <Button variant="outline" on:click={() => (open = false)} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button variant="destructive" on:click={handleConfirm} disabled={isSubmitting}>
        {#if isSubmitting}
          <Loader2 class="h-4 w-4 animate-spin" />
        {/if}
        {confirmLabel}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
