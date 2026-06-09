<script lang="ts">
  import { clampAreaInput, clampCountInput } from '$lib/components/create-property-helpers';

  export let idPrefix = 'create-property';
  export let bedrooms: string | number | null | undefined = '';
  export let bedroomsAsZero = false;
  export let bathrooms: string | number | null | undefined = '';
  export let bathroomsAsZero = false;
  export let garageSpots: string | number | null | undefined = '';
  export let garageSpotsAsZero = false;
  export let areaConstruida: string | number | null | undefined = '';
  export let areaConstruidaUnidade: 'm2' | 'hectare' | 'alqueire' | null | undefined = 'm2';
  export let areaTerreno: string | number | null | undefined = '';
  export let areaTerrenoUnidade: 'm2' | 'hectare' | 'alqueire' | null | undefined = 'm2';
</script>

<div class="space-y-6">
  <div class="grid gap-4 md:grid-cols-3">
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <label for={`${idPrefix}-bedrooms`} class="flex items-center justify-between gap-3">
        <span>Quartos *</span>
        <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            bind:checked={bedroomsAsZero}
            on:change={() => {
              if (bedroomsAsZero) bedrooms = '0';
            }}
          />
          Sem quarto
        </label>
      </label>
      <input
        id={`${idPrefix}-bedrooms`}
        name="bedrooms"
        maxlength="2"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900"
        bind:value={bedrooms}
        inputmode="numeric"
        pattern="\d*"
        disabled={bedroomsAsZero}
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          bedrooms = clampCountInput(target.value);
        }}
      />
    </div>
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <label for={`${idPrefix}-bathrooms`} class="flex items-center justify-between gap-3">
        <span>Banheiros *</span>
        <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            bind:checked={bathroomsAsZero}
            on:change={() => {
              if (bathroomsAsZero) bathrooms = '0';
            }}
          />
          Sem banheiro
        </label>
      </label>
      <input
        id={`${idPrefix}-bathrooms`}
        name="bathrooms"
        maxlength="2"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900"
        bind:value={bathrooms}
        inputmode="numeric"
        pattern="\d*"
        disabled={bathroomsAsZero}
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          bathrooms = clampCountInput(target.value);
        }}
      />
    </div>
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <label for={`${idPrefix}-garage-spots`} class="flex items-center justify-between gap-3">
        <span>Garagens *</span>
        <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            bind:checked={garageSpotsAsZero}
            on:change={() => {
              if (garageSpotsAsZero) garageSpots = '0';
            }}
          />
          Sem garagem
        </label>
      </label>
      <input
        id={`${idPrefix}-garage-spots`}
        name="garage_spots"
        maxlength="2"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900"
        bind:value={garageSpots}
        inputmode="numeric"
        pattern="\d*"
        disabled={garageSpotsAsZero}
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          garageSpots = clampCountInput(target.value);
        }}
      />
    </div>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <span>Área construída *</span>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          id={`${idPrefix}-area-construida`}
          name="area_construida_valor"
          maxlength="12"
          class="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={areaConstruida}
          inputmode="decimal"
          on:input={(event) => {
            const target = event.target as HTMLInputElement;
            areaConstruida = clampAreaInput(target.value);
          }}
        />
        <select
          id={`${idPrefix}-area-construida-unidade`}
          name="area_construida_unidade"
          class="w-full shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-44 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={areaConstruidaUnidade}
        >
          <option value="m2">m²</option>
          <option value="hectare">Hectare (ha)</option>
          <option value="alqueire">Alqueire</option>
        </select>
      </div>
      <span class="text-xs font-normal text-gray-500 dark:text-gray-400">
        Informe o valor conforme a unidade selecionada.
      </span>
    </div>
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <span>Área do terreno *</span>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          id={`${idPrefix}-area-terreno`}
          name="area_terreno_valor"
          maxlength="12"
          class="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={areaTerreno}
          inputmode="decimal"
          on:input={(event) => {
            const target = event.target as HTMLInputElement;
            areaTerreno = clampAreaInput(target.value);
          }}
        />
        <select
          id={`${idPrefix}-area-terreno-unidade`}
          name="area_terreno_unidade"
          class="w-full shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-44 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={areaTerrenoUnidade}
        >
          <option value="m2">m²</option>
          <option value="hectare">Hectare (ha)</option>
          <option value="alqueire">Alqueire</option>
        </select>
      </div>
    </div>
  </div>
</div>
