<script lang="ts">
  import { createEventDispatcher, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { DIALOG_CONTEXT_KEY, type DialogContextValue } from './context';

  export let open = false;
  export let closeOnOverlay = true;
  export let dismissible = true;

  const dispatch = createEventDispatcher<{ openChange: boolean }>();
  const openStore = writable(open);

  function setOpen(value: boolean) {
    if (open === value) return;
    open = value;
    openStore.set(value);
    dispatch('openChange', value);
  }

  $: openStore.set(open);

  function close() {
    if (!open || !dismissible) return;
    setOpen(false);
  }

  setContext<DialogContextValue>(DIALOG_CONTEXT_KEY, {
    open: openStore,
    close,
    setOpen,
    closeOnOverlay,
  });
</script>

<slot />
