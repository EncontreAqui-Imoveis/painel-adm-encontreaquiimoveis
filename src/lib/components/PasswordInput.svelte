<script lang="ts">
  import { Eye, EyeOff } from 'lucide-svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  type $$Props = Omit<HTMLInputAttributes, 'type' | 'value' | 'class'> & {
    value?: string;
    className?: string;
    visibilityLabel?: string;
  };
  export let value = '';
  export let className = '';
  export let visibilityLabel = 'senha';
  let visible = false;
  // Clearing a form or changing its account starts the next entry masked.
  $: if (!value) visible = false;
</script>

<div class="password-control">
  <input {...$$restProps} type={visible ? 'text' : 'password'} bind:value class={className} on:input on:change on:keydown on:keyup on:keypress on:blur on:focus />
  <button type="button" class="visibility-control" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${visibilityLabel}`} aria-pressed={visible} aria-controls={$$restProps.id} disabled={$$restProps.disabled} on:click={() => (visible = !visible)}>
    {#if visible}<EyeOff size={20} aria-hidden="true" />{:else}<Eye size={20} aria-hidden="true" />{/if}
  </button>
</div>

<style>
  .password-control { position: relative; min-width: 0; width: 100%; }
  .password-control > input { width: 100%; min-width: 0; min-height: 44px; padding-inline-end: 3rem; }
  .visibility-control { position: absolute; inset-block: 0; right: 0; display: flex; align-items: center; justify-content: center; width: 44px; border: 0; border-radius: 0.375rem; background: transparent; color: inherit; cursor: pointer; }
  .visibility-control:focus-visible { outline: 2px solid #047857; outline-offset: -3px; }
  .visibility-control:disabled { cursor: not-allowed; opacity: 0.5; }
</style>
