<script lang="ts" module>
  export type { InputProps } from './input-props';
</script>

<script lang="ts">
  import type { InputProps as InputBindings } from './input-props';

  let {
    className = '',
    id = undefined,
    type = 'text',
    value = $bindable(undefined),
    placeholder = '',
    disabled = false,
    name = '',
    maxLength = undefined,
    oninput,
    onkeydown,
    onkeyup,
  }: InputBindings = $props();
</script>

<input
  class={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${className}`}
  {id}
  bind:value
  {type}
  {placeholder}
  {disabled}
  {name}
  maxlength={maxLength}
  {oninput}
  {onkeydown}
  {onkeyup}
/>
