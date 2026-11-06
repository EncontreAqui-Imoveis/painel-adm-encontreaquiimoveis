<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Eye, EyeOff, Loader2 } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  export let open = false;
  export let title = 'Confirmar ação';
  export let description = '';
  export let confirmLabel = 'Confirmar';
  export let isSubmitting = false;
  export let error: string | null = null;

  let password = '';
  let showPassword = false;
  let localError: string | null = null;

  const dispatch = createEventDispatcher<{
    confirm: { password: string };
  }>();

  $: if (!open) {
    password = '';
    showPassword = false;
    localError = null;
  }

  function handleConfirm() {
    if (isSubmitting) return;
    if (!password.trim()) {
      localError = 'Informe a senha atual do administrador.';
      return;
    }

    localError = null;
    dispatch('confirm', { password });
  }

  function focusPassword(node: HTMLInputElement) {
    const previous = document.activeElement as HTMLElement | null;
    node.focus();
    return { destroy: () => previous?.focus() };
  }

  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const dialog = (event.target as HTMLElement).closest('[role="dialog"]');
    const controls = dialog?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)');
    if (!controls?.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
</script>

<div on:keydown={trapFocus} role="presentation">
<Dialog.Root bind:open={open} dismissible={!isSubmitting}>
  <Dialog.Content className="max-w-md" ariaLabel={title}>
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      {#if description}
        <Dialog.Description>{description}</Dialog.Description>
      {/if}
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="relative">
      <label class="block space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <span>Senha do administrador</span>
        <input
          type={showPassword ? 'text' : 'password'}
          use:focusPassword
          bind:value={password}
          class="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-12 text-sm text-gray-900 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          placeholder="Digite sua senha atual"
          autocomplete="current-password"
          disabled={isSubmitting}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleConfirm();
            }
          }}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute bottom-0 right-0 h-11 w-11 border-0! p-0!"
        ariaLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        disabled={isSubmitting}
        on:click={() => (showPassword = !showPassword)}
      >
        {#if showPassword}
          <EyeOff class="h-5 w-5" aria-hidden="true" />
        {:else}
          <Eye class="h-5 w-5" aria-hidden="true" />
        {/if}
      </Button>
      </div>

      {#if localError}
        <div role="alert" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {localError}
        </div>
      {/if}

      {#if error}
        <div role="alert" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
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
</div>
