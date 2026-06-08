<script lang="ts">
  export let mode: 'create' | 'edit' = 'create';
  export let title = '';
  export let description = '';
  export let variant: 'neutral' | 'orange' = 'neutral';
  export let showHeader = true;
</script>

<section
  class={`rounded-2xl border shadow-sm ${
    variant === 'orange'
      ? 'border-orange-200 bg-orange-50/80 shadow-orange-100 dark:border-orange-900/40 dark:bg-orange-950/15'
      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
  }`}
>
  {#if showHeader}
    <header class={`border-b px-6 py-4 ${variant === 'orange' ? 'border-orange-200 dark:border-orange-900/40' : 'border-gray-200 dark:border-gray-800'}`}>
      <div class="flex flex-col gap-1">
        <div class={`text-xs font-semibold uppercase tracking-wider ${variant === 'orange' ? 'text-orange-700 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>
          {mode === 'create' ? 'Cadastro' : 'Edição'}
        </div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        {#if description}
          <p class="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        {/if}
      </div>
    </header>
  {/if}

  <div class="space-y-6 p-6">
    <slot />
  </div>

  <slot name="footer" />
</section>
