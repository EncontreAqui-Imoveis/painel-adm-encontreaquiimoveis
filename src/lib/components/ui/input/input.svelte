<script lang="ts" module>
  export type { InputProps } from './input-props';
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { InputProps as InputBindings } from './input-props';

  const dispatch = createEventDispatcher<{
    input: string;
    keydown: KeyboardEvent;
    keyup: KeyboardEvent;
  }>();

  let {
    className = '',
    id = undefined,
    type = 'text',
    value = $bindable(undefined),
    placeholder = '',
    disabled = false,
    name = '',
    maxLength = undefined,
    inputMode = undefined,
    ariaInvalid = undefined,
    ariaDescribedby = undefined,
    oninput,
    onkeydown,
    onkeyup,
  }: InputBindings = $props();

  function handleInput(event: Event): void {
    oninput?.(event as Event & { currentTarget: HTMLInputElement });
    dispatch('input', (event.currentTarget as HTMLInputElement).value);
  }

  function handleKeydown(event: KeyboardEvent): void {
    onkeydown?.(event as KeyboardEvent & { currentTarget: HTMLInputElement });
    dispatch('keydown', event);
  }

  function handleKeyup(event: KeyboardEvent): void {
    onkeyup?.(event as KeyboardEvent & { currentTarget: HTMLInputElement });
    dispatch('keyup', event);
  }
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
  inputmode={inputMode}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedby}
  oninput={handleInput}
  onkeydown={handleKeydown}
  onkeyup={handleKeyup}
/>
