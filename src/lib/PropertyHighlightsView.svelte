<script lang="ts">
  import FeaturedPropertiesPanel from '$lib/components/FeaturedPropertiesPanel.svelte';
</script>

<div class="space-y-4 p-4 md:p-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Destaques no site</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Defina quais imóveis aprovados aparecem em destaque no catálogo público.
    </p>
  </div>
  <FeaturedPropertiesPanel />
</div>
