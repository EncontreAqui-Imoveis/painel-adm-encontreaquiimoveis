import { derived } from 'svelte/store';
import { theme } from './store';

export const themePreference = theme;

export const isDarkTheme = derived(themePreference, ($theme) => {
  if (typeof window === 'undefined') {
    return false;
  }

  if ($theme === 'dark') {
    return true;
  }

  if ($theme === 'light') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});
