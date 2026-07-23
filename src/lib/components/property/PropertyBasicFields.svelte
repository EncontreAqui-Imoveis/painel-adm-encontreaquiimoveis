<script lang="ts">
  import type { Broker } from '$lib/types';
  import {
    formatPromotionPercentageInput,
    formatPhoneBr as formatPhoneBrHelper,
  } from '$lib/components/create-property-helpers';
  import {
    RENT_PROPERTY_PRICE_MAX,
    SALE_PROPERTY_PRICE_MAX,
    getPropertyPriceInputMaxLength,
    formatPropertyPriceInput,
  } from '$lib/propertyPriceLimits';

  const propertyTypes = [
    'Casa',
    'Apartamento',
    'Terreno',
    'Flat',
    'Condomínio Fechado',
    'Área rural',
    'Rancho',
    'Galpão / Barracão',
    'Chácara',
    'Imóvel comercial',
    'Área comercial',
    'Cobertura / Penthouse',
    'Cobertura',
    'Sobrado',
    'Kitnet',
    'Sala comercial',
    'Sala Comercial',
    'Loja',
    'Fazenda',
    'Galpão',
    'Empresa',
    'Prédio',
  ];

  const purposes = ['Venda', 'Aluguel', 'Venda e Aluguel'];

  export let title = '';
  export let type = 'Casa';
  export let purpose = 'Venda';
  export let marketStage: 'STANDARD' | 'LAUNCH' = 'STANDARD';
  export let status = 'approved';
  export let ownerName = '';
  export let ownerPhone = '';
  export let brokerId = '';
  export let brokerPhone = '';
  export let brokerQuery = '';
  export let brokerDropdownOpen = false;
  export let brokers: Broker[] = [];
  export let brokersLoading = false;
  export let brokersError: string | null = null;
  export let selectedBroker: Broker | null = null;
  export let onBrokerQueryInput: (value: string) => void = () => {};
  export let onBrokerFocus: () => void = () => {};
  export let onBrokerBlur: () => void = () => {};
  export let onClearBrokerSelection: () => void = () => {};
  export let onSelectBroker: (broker: Broker) => void = () => {};
  export let description = '';
  export let priceSale = '';
  export let priceRent = '';
  export let promotionSalePercentage = '';
  export let promotionRentPercentage = '';
  export let promotionPriceSale = '';
  export let promotionPriceRent = '';

  const SALE_PRICE_MAX_LENGTH = getPropertyPriceInputMaxLength(SALE_PROPERTY_PRICE_MAX);
  const RENT_PRICE_MAX_LENGTH = getPropertyPriceInputMaxLength(RENT_PROPERTY_PRICE_MAX);

  $: if (purpose === 'Venda' && promotionRentPercentage) {
    promotionRentPercentage = '';
  }

  $: if (purpose === 'Aluguel' && promotionSalePercentage) {
    promotionSalePercentage = '';
  }
  $: if (!purpose.toLowerCase().includes('vend') && marketStage !== 'STANDARD') {
    marketStage = 'STANDARD';
  }
</script>

<div class="space-y-6">
  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Título *
      <input
        id="create-property-title"
        name="title"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={title}
        placeholder="Ex: Casa no Canaã 2"
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Tipo *
      <select
        id="create-property-type"
        name="type"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={type}
      >
        {#each propertyTypes as option}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Finalidade *
      <select
        id="create-property-purpose"
        name="purpose"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={purpose}
      >
        {#each purposes as option}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Status inicial *
      <select
        id="create-property-status"
        name="status"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={status}
      >
        <option value="approved">Aprovado</option>
        <option value="pending_approval">Pendente</option>
      </select>
    </label>
  </div>

  {#if purpose.toLowerCase().includes('vend')}
    <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <input
        id="create-property-market-stage"
        type="checkbox"
        checked={marketStage === 'LAUNCH'}
        on:change={(event) => {
          marketStage = (event.currentTarget as HTMLInputElement).checked ? 'LAUNCH' : 'STANDARD';
        }}
      />
      Este imóvel é um lançamento
    </label>
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Proprietário do imóvel (opcional)
      <input
        id="create-property-owner-name"
        name="owner_name"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={ownerName}
        placeholder="Nome do proprietário"
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Telefone do proprietário (opcional)
      <input
        id="create-property-owner-phone"
        name="owner_phone"
        maxlength="19"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={ownerPhone}
        inputmode="numeric"
        placeholder="+55 (00) 00000-0000"
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          ownerPhone = formatPhoneBrHelper(target.value);
        }}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Corretor responsável
      <div class="relative">
        <input
          id="create-property-broker-query"
          name="broker_query"
          maxlength="120"
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={brokerQuery}
          placeholder="Digite ao menos 2 letras para buscar corretor"
          on:focus={onBrokerFocus}
          on:blur={onBrokerBlur}
          on:input={(event) => {
            const target = event.target as HTMLInputElement;
            onBrokerQueryInput(target.value);
          }}
        />
        {#if brokerDropdownOpen}
          <div class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              class="w-full border-b border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              on:click={onClearBrokerSelection}
            >
              Sem corretor
            </button>
            {#if brokersLoading}
              <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Buscando corretores...</p>
            {:else if brokers.length === 0}
              <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum corretor encontrado.</p>
            {:else}
              {#each brokers as broker}
                <button
                  type="button"
                  class="w-full border-t border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  on:click={() => onSelectBroker(broker)}
                >
                  <span class="block font-medium text-gray-900 dark:text-gray-100">{broker.name}</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">{broker.email} {broker.phone ? `· ${broker.phone}` : ''}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      {#if selectedBroker}
        <span class="text-xs text-emerald-600 dark:text-emerald-400">
          Selecionado: {selectedBroker.name} (ID {selectedBroker.id})
        </span>
      {/if}
      {#if brokersError}
        <span class="text-xs text-red-500 dark:text-red-400">{brokersError}</span>
      {/if}
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Telefone do corretor responsável
      <input
        id="create-property-broker-phone"
        name="broker_phone"
        maxlength="19"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={brokerPhone}
        inputmode="numeric"
        placeholder="+55 (00) 00000-0000"
        disabled={!brokerId}
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          brokerPhone = formatPhoneBrHelper(target.value);
        }}
      />
    </label>
  </div>

  <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
    Descrição *
    <textarea
      id="create-property-description"
      name="description"
      maxlength="5000"
      class="min-h-[110px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      bind:value={description}
      placeholder="Descreva o imóvel"
    ></textarea>
    <span class="text-right text-xs text-gray-500 dark:text-gray-400">{description.length}/5000</span>
  </label>

  <div class="grid gap-4 md:grid-cols-2">
    {#if purpose !== 'Aluguel'}
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Preço de venda *
        <input
          id="create-property-price-sale"
          name="price_sale_display"
          maxlength={SALE_PRICE_MAX_LENGTH}
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={priceSale}
          inputmode="numeric"
          placeholder="R$ 450.000,00"
          on:input={(event) => {
            const target = event.target as HTMLInputElement;
            priceSale = formatPropertyPriceInput(target.value, SALE_PROPERTY_PRICE_MAX);
          }}
        />
      </label>
    {/if}
    {#if purpose !== 'Venda'}
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Preço do aluguel *
        <input
          id="create-property-price-rent"
          name="price_rent_display"
          maxlength={RENT_PRICE_MAX_LENGTH}
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={priceRent}
          inputmode="numeric"
          placeholder="R$ 2.500,00"
          on:input={(event) => {
            const target = event.target as HTMLInputElement;
            priceRent = formatPropertyPriceInput(target.value, RENT_PROPERTY_PRICE_MAX);
          }}
        />
      </label>
    {/if}
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    {#if purpose !== 'Aluguel'}
      <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <label for="create-property-promotion-sale-percentage">% Desconto (Venda)</label>
        <input
          id="create-property-promotion-sale-percentage"
          name="promotion_percentage"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={promotionSalePercentage}
          inputmode="decimal"
          placeholder="Ex: 08,5"
          on:input={(event) => {
            const target = event.target as HTMLInputElement;
            promotionSalePercentage = formatPromotionPercentageInput(target.value);
          }}
        />
        <span class="text-xs text-emerald-700 dark:text-emerald-300">
          Valor promocional (Venda): {promotionPriceSale || '-'}
        </span>
      </div>
    {/if}
    {#if purpose !== 'Venda'}
      <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <label for="create-property-promotion-rent-percentage">% Desconto (Aluguel)</label>
        <input
          id="create-property-promotion-rent-percentage"
          name="promotional_rent_percentage"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={promotionRentPercentage}
          inputmode="decimal"
          placeholder="Ex: 12,0"
          on:input={(event) => {
            const target = event.target as HTMLInputElement;
            promotionRentPercentage = formatPromotionPercentageInput(target.value);
          }}
        />
        <span class="text-xs text-emerald-700 dark:text-emerald-300">
          Valor promocional (Aluguel): {promotionPriceRent || '-'}
        </span>
      </div>
    {/if}
  </div>
</div>
