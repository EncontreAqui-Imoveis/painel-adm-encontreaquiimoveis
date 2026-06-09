<script lang="ts">
  import { formatCep, onlyDigits, sanitizeDigitsInput } from '$lib/components/create-property-helpers';

  const states = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO'
  ];

  export let idPrefix = 'create-property';
  export let cep: string | null | undefined = '';
  export let semCep = false;
  export let state: string | null | undefined = 'GO';
  export let city: string | null | undefined = '';
  export let address: string | null | undefined = '';
  export let bairro: string | null | undefined = '';
  export let bairroOptional = false;
  export let numero: string | null | undefined = '';
  export let semNumero = false;
  export let quadra: string | null | undefined = '';
  export let semQuadra = false;
  export let lote: string | null | undefined = '';
  export let semLote = false;
  export let complemento: string | null | undefined = '';
  export let cities: string[] = [];
  export let citiesLoading = false;
  export let citiesError: string | null = null;
  export let bairros: string[] = [];
  export let bairrosLoading = false;
  export let bairrosError: string | null = null;
  export let cepLookupError: string | null = null;
  export let onStateChange: (nextState: string) => void = () => {};
  export let onCepLookup: (cepValue: string) => void = () => {};
</script>

<div class="space-y-6">
  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      {semCep ? 'CEP (opcional)' : 'CEP'}
      <input
        id={`${idPrefix}-cep`}
        name="cep"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900"
        bind:value={cep}
        disabled={semCep}
        placeholder="00000-000"
        inputmode="numeric"
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          cep = formatCep(target.value);
          if (!semCep && onlyDigits(cep).length === 8) {
            onCepLookup(cep);
          }
        }}
      />
      <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          bind:checked={semCep}
          on:change={() => {
            if (semCep) cep = '';
          }}
        />
        Sem CEP
      </label>
      {#if cepLookupError}
        <span class="text-xs text-red-500 dark:text-red-400">{cepLookupError}</span>
      {/if}
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Estado *
      <select
        id={`${idPrefix}-state`}
        name="state"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={state}
        on:change={() => onStateChange(String(state ?? ''))}
      >
        {#each states as uf}
          <option value={uf}>{uf}</option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Cidade *
      <input
        id={`${idPrefix}-city`}
        name="city"
        list={`${idPrefix}-cities-list`}
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={city}
        placeholder={citiesLoading ? 'Carregando cidades...' : 'Digite ou selecione'}
      />
      <datalist id={`${idPrefix}-cities-list`}>
        {#each cities as option}
          <option value={option}></option>
        {/each}
      </datalist>
      {#if citiesError}
        <span class="text-xs text-red-500 dark:text-red-400">{citiesError}</span>
      {/if}
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Endereço *
      <input
        id={`${idPrefix}-address`}
        name="address"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={address}
        placeholder="Rua, avenida, etc."
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      {bairroOptional ? 'Bairro' : 'Bairro *'}
      <input
        id={`${idPrefix}-bairro`}
        name="bairro"
        list={`${idPrefix}-bairros-list`}
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={bairro}
        placeholder={bairrosLoading ? 'Carregando bairros...' : 'Digite ou selecione'}
      />
      <datalist id={`${idPrefix}-bairros-list`}>
        {#each bairros as option}
          <option value={option}></option>
        {/each}
      </datalist>
      {#if bairrosError}
        <span class="text-xs text-red-500 dark:text-red-400">{bairrosError}</span>
      {/if}
    </label>
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <label for={`${idPrefix}-numero-input`}>Número {semNumero ? '(opcional)' : '*'}</label>
      <input
        id={`${idPrefix}-numero-input`}
        name="numero"
        maxlength="25"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900"
        bind:value={numero}
        inputmode="numeric"
        disabled={semNumero}
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          numero = sanitizeDigitsInput(target.value);
        }}
      />
      <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          id={`${idPrefix}-sem-numero`}
          name="sem_numero"
          class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          bind:checked={semNumero}
          on:change={() => {
            if (semNumero) numero = '';
          }}
        />
        Sem número
      </label>
    </div>
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <span>{semQuadra ? 'Quadra (opcional)' : 'Quadra *'}</span>
      <input
        id={`${idPrefix}-quadra`}
        name="quadra"
        maxlength="25"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900"
        bind:value={quadra}
        disabled={semQuadra}
      />
      <label class="inline-flex items-center gap-2 text-xs font-normal text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          bind:checked={semQuadra}
          on:change={() => {
            if (semQuadra) quadra = '';
          }}
        />
        Sem quadra
      </label>
    </div>
    <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      <span>{semLote ? 'Lote (opcional)' : 'Lote *'}</span>
      <input
        id={`${idPrefix}-lote`}
        name="lote"
        maxlength="25"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900"
        bind:value={lote}
        disabled={semLote}
      />
      <label class="inline-flex items-center gap-2 text-xs font-normal text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          bind:checked={semLote}
          on:change={() => {
            if (semLote) lote = '';
          }}
        />
        Sem lote
      </label>
    </div>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Complemento (opcional)
      <input
        id={`${idPrefix}-complemento`}
        name="complemento"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={complemento}
        placeholder="Apartamento, bloco, referência..."
      />
    </label>
  </div>
</div>
