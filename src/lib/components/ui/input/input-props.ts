/**
 * Props do Input — espelhadas em `input.svelte` para o TS do IDE aceitar
 * `id`, handlers e `bind:value` ao importar de `$lib/components/ui/input`.
 */
export type InputProps = {
  className?: string;
  id?: string;
  type?: 'text' | 'number' | 'search';
  value?: string | number | undefined;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  maxLength?: number | undefined;
  oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
  onkeydown?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
  onkeyup?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
};
