<script lang="ts">
  export let className = '';
  export let type: 'text' | 'number' | 'search' = 'text';
  export let value: string | number | undefined = undefined;
  export let placeholder = '';
  export let disabled = false;
  export let name = '';
  export let maxLength: number | undefined = undefined;
</script>

<input
  class={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${className}`}
  bind:value
  {type}
  {placeholder}
  {disabled}
  {name}
  maxlength={maxLength}
  on:input
  on:keydown
  on:keyup
/>
