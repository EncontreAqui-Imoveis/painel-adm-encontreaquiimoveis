<script lang="ts">
  type Variant = 'default' | 'outline' | 'destructive';
  type Size = 'sm' | 'md' | 'lg';

  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: Variant = 'default';
  export let size: Size = 'md';
  export let disabled = false;
  export let title: string | undefined = undefined;
  export let className = '';

  const variantClasses: Record<Variant, string> = {
    default: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-400 disabled:text-white/60',
    outline:
      'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400 disabled:text-white/60',
  };

  const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
  }
</script>

<button
  type={type}
  {title}
  class={cx(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:has-[.animate-spin]:cursor-wait',
    variantClasses[variant],
    sizeClasses[size],
    className
  )}
  {disabled}
  on:click
>
  <slot />
</button>
