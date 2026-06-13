<script lang="ts">
  import { formatPromotionPercentageInput } from '$lib/components/create-property-helpers';
  import {
    formatCurrency,
    getPurposeFlags,
    resolvePriceLines,
  } from '$lib/components/property/propertyFormattingHelpers';
  import {
    RENT_PROPERTY_PRICE_INPUT_MAX_LENGTH,
    RENT_PROPERTY_PRICE_MAX,
    SALE_PROPERTY_PRICE_INPUT_MAX_LENGTH,
    SALE_PROPERTY_PRICE_MAX,
    formatPropertyPriceInput,
    parsePropertyPriceInput,
  } from '$lib/propertyPriceLimits';

  type PropertyPricingLike = {
    purpose?: string | null;
    price?: number | null;
    price_sale?: number | null;
    price_rent?: number | null;
    promotion_percentage?: number | null;
    promotional_rent_percentage?: number | null;
    promotion_price?: number | null;
    promotional_rent_price?: number | null;
  };

  export let isEditMode = false;
  export let selectedProperty: PropertyPricingLike | null = null;
  export let editableProperty: PropertyPricingLike | null = null;
  export let editPriceSaleDisplay = '';
  export let editPriceRentDisplay = '';
  export let editPromotionSalePercentageDisplay = '';
  export let editPromotionRentPercentageDisplay = '';
  export let editPromotionPriceSaleDisplay = '';
  export let editPromotionPriceRentDisplay = '';
  export let refreshPromotionPreviewDisplays: () => void = () => {};

  function handlePurposeChange() {
    if (!editableProperty) return;
    const flags = getPurposeFlags(editableProperty.purpose ?? null);

    if (!flags.supportsSale) {
      editableProperty.price_sale = null;
      editableProperty.promotion_price = null;
      editableProperty.promotion_percentage = null;
      editPriceSaleDisplay = '';
      editPromotionSalePercentageDisplay = '';
      editPromotionPriceSaleDisplay = '';
    }

    if (!flags.supportsRent) {
      editableProperty.price_rent = null;
      editableProperty.promotional_rent_price = null;
      editableProperty.promotional_rent_percentage = null;
      editPriceRentDisplay = '';
      editPromotionRentPercentageDisplay = '';
      editPromotionPriceRentDisplay = '';
    }

    editableProperty.price =
      flags.supportsSale && !flags.supportsRent
        ? editableProperty.price_sale
        : flags.supportsRent && !flags.supportsSale
          ? editableProperty.price_rent
          : null;

    refreshPromotionPreviewDisplays();
  }

  function handleSalePriceInput(event: Event) {
    const target = event.target as HTMLInputElement;
    editPriceSaleDisplay = formatPropertyPriceInput(target.value, SALE_PROPERTY_PRICE_MAX);
    if (editableProperty) {
      editableProperty.price_sale = parsePropertyPriceInput(
        editPriceSaleDisplay,
        SALE_PROPERTY_PRICE_MAX
      );
      editableProperty.price = editableProperty.price_sale ?? editableProperty.price;
      refreshPromotionPreviewDisplays();
    }
  }

  function handleRentPriceInput(event: Event) {
    const target = event.target as HTMLInputElement;
    editPriceRentDisplay = formatPropertyPriceInput(target.value, RENT_PROPERTY_PRICE_MAX);
    if (editableProperty) {
      editableProperty.price_rent = parsePropertyPriceInput(
        editPriceRentDisplay,
        RENT_PROPERTY_PRICE_MAX
      );
      editableProperty.price = editableProperty.price_rent ?? editableProperty.price;
      refreshPromotionPreviewDisplays();
    }
  }

  function handleSalePromotionInput(event: Event) {
    const target = event.target as HTMLInputElement;
    editPromotionSalePercentageDisplay = formatPromotionPercentageInput(target.value);
    refreshPromotionPreviewDisplays();
  }

  function handleRentPromotionInput(event: Event) {
    const target = event.target as HTMLInputElement;
    editPromotionRentPercentageDisplay = formatPromotionPercentageInput(target.value);
    refreshPromotionPreviewDisplays();
  }
</script>

<div class="space-y-1">
  <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">Finalidade</p>
  {#if isEditMode && editableProperty}
    <div class="flex flex-col gap-2">
      <label class="text-xs text-gray-500 dark:text-gray-400" for="purpose-select">Finalidade</label>
      <select
        id="purpose-select"
        name="purpose"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-500"
        bind:value={editableProperty.purpose}
        on:change={handlePurposeChange}
      >
        <option value="Venda">Venda</option>
        <option value="Aluguel">Aluguel</option>
        <option value="Venda e Aluguel">Venda e Aluguel</option>
      </select>
    </div>

    {@const flags = getPurposeFlags(editableProperty.purpose ?? null)}
    {#if flags.isDual}
      <div class="grid gap-3 md:grid-cols-2">
        <input
          name="price_sale_display"
          maxlength={SALE_PROPERTY_PRICE_INPUT_MAX_LENGTH}
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
          type="text"
          inputmode="numeric"
          bind:value={editPriceSaleDisplay}
          placeholder="Preço de venda"
          on:input={handleSalePriceInput}
        />
        <input
          name="price_rent_display"
          maxlength={RENT_PROPERTY_PRICE_INPUT_MAX_LENGTH}
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
          type="text"
          inputmode="numeric"
          bind:value={editPriceRentDisplay}
          placeholder="Preço do aluguel"
          on:input={handleRentPriceInput}
        />
      </div>
    {:else if flags.supportsRent}
      <input
        name="price_rent_display"
        maxlength={RENT_PROPERTY_PRICE_INPUT_MAX_LENGTH}
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
        type="text"
        inputmode="numeric"
        bind:value={editPriceRentDisplay}
        placeholder="Preço do aluguel"
        on:input={handleRentPriceInput}
      />
    {:else}
      <input
        name="price_sale_display"
        maxlength={SALE_PROPERTY_PRICE_INPUT_MAX_LENGTH}
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
        type="text"
        inputmode="numeric"
        bind:value={editPriceSaleDisplay}
        placeholder="Preço de venda"
        on:input={handleSalePriceInput}
      />
    {/if}

    {#if flags.isDual}
      <div class="mt-2 grid gap-3 md:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Venda)</span>
          <input
            name="promotion_percentage"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
            type="text"
            inputmode="decimal"
            maxlength="6"
            bind:value={editPromotionSalePercentageDisplay}
            placeholder="Ex: 08,5"
            on:input={handleSalePromotionInput}
          />
          <span class="text-xs text-emerald-700 dark:text-emerald-300">
            Valor promocional: {editPromotionPriceSaleDisplay || '-'}
          </span>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Aluguel)</span>
          <input
            name="promotional_rent_percentage"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
            type="text"
            inputmode="decimal"
            maxlength="6"
            bind:value={editPromotionRentPercentageDisplay}
            placeholder="Ex: 12,0"
            on:input={handleRentPromotionInput}
          />
          <span class="text-xs text-emerald-700 dark:text-emerald-300">
            Valor promocional: {editPromotionPriceRentDisplay || '-'}
          </span>
        </label>
      </div>
    {:else if flags.supportsRent}
      <label class="mt-2 flex flex-col gap-1">
        <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Aluguel)</span>
        <input
          name="promotional_rent_percentage"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
          type="text"
          inputmode="decimal"
          maxlength="6"
          bind:value={editPromotionRentPercentageDisplay}
          placeholder="Ex: 12,0"
          on:input={handleRentPromotionInput}
        />
        <span class="text-xs text-emerald-700 dark:text-emerald-300">
          Valor promocional: {editPromotionPriceRentDisplay || '-'}
        </span>
      </label>
    {:else}
      <label class="mt-2 flex flex-col gap-1">
        <span class="text-xs text-gray-500 dark:text-gray-400">% Desconto (Venda)</span>
        <input
          name="promotion_percentage"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
          type="text"
          inputmode="decimal"
          maxlength="6"
          bind:value={editPromotionSalePercentageDisplay}
          placeholder="Ex: 08,5"
          on:input={handleSalePromotionInput}
        />
        <span class="text-xs text-emerald-700 dark:text-emerald-300">
          Valor promocional: {editPromotionPriceSaleDisplay || '-'}
        </span>
      </label>
    {/if}
  {:else}
    <p class="text-base text-gray-800 dark:text-gray-200">{selectedProperty?.purpose ?? '-'} </p>
    <div class="space-y-1">
      {#each resolvePriceLines(selectedProperty ?? {}) as line}
        <p class="text-3xl font-bold text-green-600 dark:text-green-400">
          {line.label}: {formatCurrency(line.value)}
        </p>
      {/each}
      {#if selectedProperty?.promotion_price != null && selectedProperty.promotion_price > 0}
        <p class="text-sm font-semibold text-amber-600 dark:text-amber-300">
          Promoção venda: {formatCurrency(selectedProperty.promotion_price)}
        </p>
      {/if}
      {#if
        selectedProperty?.promotional_rent_price != null &&
        selectedProperty.promotional_rent_price > 0
      }
        <p class="text-sm font-semibold text-amber-600 dark:text-amber-300">
          Promoção aluguel: {formatCurrency(selectedProperty.promotional_rent_price)}
        </p>
      {/if}
    </div>
  {/if}
</div>
