<script lang="ts">
  import { X } from 'lucide-svelte';

  export let open = false;
  export let url = '';
  export let title = '';
  export let close: () => void;
</script>

{#if open}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
    role="presentation"
    on:click={close}
  >
    <div class="relative max-h-full max-w-full overflow-hidden">
      <button
        type="button"
        class="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        on:click|stopPropagation={close}
      >
        <X class="h-6 w-6" />
      </button>
      <img src={url} alt={title} class="max-h-[90vh] max-w-full rounded-lg object-contain" />
      <div class="mt-4 text-center font-medium text-white">{title}</div>
    </div>
  </div>
{/if}
