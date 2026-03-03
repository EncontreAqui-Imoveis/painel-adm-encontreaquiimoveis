<script lang="ts">
    import { themePreference } from './themeState';
</script>

<div class="flex items-center justify-center bg-gray-700 dark:bg-gray-800 rounded-lg p-1">
    <button on:click={() => $themePreference = 'light'} class="w-1/2 px-3 py-1 text-sm rounded-md transition-colors {$themePreference === 'light' ? 'bg-brand-green text-white' : 'text-gray-400 hover:text-white'}">Claro</button>
    <button on:click={() => $themePreference = 'dark'} class="w-1/2 px-3 py-1 text-sm rounded-md transition-colors {$themePreference === 'dark' ? 'bg-brand-green text-white' : 'text-gray-400 hover:text-white'}">Escuro</button>
</div>
