<script lang="ts">
  import { PROPERTY_AMENITY_OPTIONS, toggleAmenity } from '$lib/propertyAmenities';

  export let selectedAmenities: string[] = [];
</script>

<div class="rounded-md border border-gray-200 p-4 dark:border-gray-700">
  <p class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">Comodidades</p>
  <div class="grid gap-3 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2 lg:grid-cols-3">
    {#each PROPERTY_AMENITY_OPTIONS as amenity}
      <label class="inline-flex items-center gap-2">
        <input
          type="checkbox"
          id={`property-amenity-${amenity.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`}
          class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          checked={selectedAmenities.includes(amenity)}
          on:change={(event) => {
            const nextChecked = (event.target as HTMLInputElement).checked;
            selectedAmenities = toggleAmenity(selectedAmenities, amenity, nextChecked);
          }}
        />
        {amenity}
      </label>
    {/each}
  </div>
</div>
