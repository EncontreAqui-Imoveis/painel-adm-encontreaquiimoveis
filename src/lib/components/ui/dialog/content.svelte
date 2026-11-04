<script lang="ts">
  import { getContext, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { DIALOG_CONTEXT_KEY, type DialogContextValue } from './context';

  export let className = '';
  export let ariaLabel: string | undefined = undefined;

  const fallbackContext: DialogContextValue = {
    open: writable(false),
    close: () => undefined,
    setOpen: () => undefined,
    closeOnOverlay: true,
  };

  const ctx = getContext<DialogContextValue>(DIALOG_CONTEXT_KEY) ?? fallbackContext;

  let isOpen = false;
  const unsubscribe = ctx.open.subscribe((value) => {
    isOpen = value;
  });

  onDestroy(() => {
    unsubscribe?.();
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
    role="presentation"
    on:click={() => ctx.closeOnOverlay && ctx.close()}
  >
    <div
      class={`relative w-full max-w-3xl rounded-lg border border-gray-200 bg-white shadow-xl transition-all dark:border-gray-800 dark:bg-gray-900 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabindex="-1"
      on:click|stopPropagation
      on:keydown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          ctx.close();
        }
      }}
    >
      <slot />
    </div>
  </div>
{/if}
