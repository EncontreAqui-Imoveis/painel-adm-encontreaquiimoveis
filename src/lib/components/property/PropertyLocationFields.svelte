<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/apiClient';
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
  type LocationCity = { id: number; name: string; state?: string | null };
  type LocationNeighborhood = { name: string };
  type LocationPage<T> = { data?: T[] };
  const cityCache = new Map<string, LocationCity[]>();
  const bairroCache = new Map<string, string[]>();
  let cities: string[] = [];
  let bairros: string[] = [];
  let citiesLoading = false;
  let bairrosLoading = false;
  let citiesError: string | null = null;
  let bairrosError: string | null = null;
  let cepLookupError: string | null = null;
  let selectedCityId: number | null = null;
  let cityRequest = 0;
  let bairroRequest = 0;
  let cepRequest = 0;
  let cityTimer: ReturnType<typeof setTimeout> | undefined;
  let bairroTimer: ReturnType<typeof setTimeout> | undefined;

  // The persisted address uses city/state/bairro text. Catalog IDs are only for
  // suggestions, never IBGE codes or a prerequisite for typing a neighborhood.
  $: bairroDisabled = !String(city ?? '').trim() || !states.includes(String(state ?? ''));

  function normalizeName(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function resetSuggestions() {
    ++cityRequest;
    ++bairroRequest;
    clearTimeout(cityTimer);
    clearTimeout(bairroTimer);
    selectedCityId = null;
    cities = [];
    bairros = [];
    citiesLoading = false;
    bairrosLoading = false;
    citiesError = null;
    bairrosError = null;
  }

  function scheduleBairroSearch(search: string) {
    clearTimeout(bairroTimer);
    const request = ++bairroRequest;
    const cityId = selectedCityId;
    bairrosLoading = false;
    bairrosError = null;
    if (!cityId) { bairros = []; return; }
    bairroTimer = setTimeout(() => void fetchBairros(cityId, search, request), 300);
  }

  async function fetchBairros(cityId: number, search: string, request: number) {
    const normalizedSearch = normalizeName(search);
    const key = `${cityId}:${normalizedSearch}`;
    bairrosLoading = true;
    try {
      let names = bairroCache.get(key);
      if (!names) {
        const payload = await api.get<LocationPage<LocationNeighborhood> | LocationNeighborhood[]>(
          `/locations/neighborhoods?cityId=${cityId}&search=${encodeURIComponent(normalizedSearch)}&limit=15`
        );
        const records = Array.isArray(payload) ? payload : payload?.data ?? [];
        names = [...new Set(records.map(item => String(item.name ?? '').trim()).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        bairroCache.set(key, names);
      }
      if (request === bairroRequest) bairros = names;
    } catch {
      if (request !== bairroRequest) return;
      bairros = [];
      bairrosError = 'Não foi possível carregar sugestões de bairros. Você pode informar o bairro manualmente.';
    } finally {
      if (request === bairroRequest) bairrosLoading = false;
    }
  }

  function scheduleCitySearch(search: string, immediate = false) {
    resetSuggestions();
    const request = cityRequest;
    const uf = String(state ?? '');
    if (!states.includes(uf)) return;
    if (immediate) void fetchCities(uf, search, request);
    else cityTimer = setTimeout(() => void fetchCities(uf, search, request), 300);
  }

  async function fetchCities(uf: string, search: string, request: number) {
    const normalizedSearch = normalizeName(search);
    const key = `${uf}:${normalizedSearch}`;
    citiesLoading = true;
    try {
      let records = cityCache.get(key);
      if (!records) {
        const payload = await api.get<LocationPage<LocationCity> | LocationCity[]>(
          `/locations/cities?state=${encodeURIComponent(uf)}&search=${encodeURIComponent(normalizedSearch)}&limit=15`
        );
        records = (Array.isArray(payload) ? payload : payload?.data ?? [])
          .filter(item => !item.state || item.state === uf);
        cityCache.set(key, records);
      }
      if (request !== cityRequest || uf !== state || normalizedSearch !== normalizeName(String(city ?? ''))) return;
      cities = records.map(item => item.name);
      const matching = records.find(item => normalizeName(item.name) === normalizeName(String(city ?? '')));
      selectedCityId = matching && Number.isSafeInteger(Number(matching.id)) && Number(matching.id) > 0
        ? Number(matching.id) : null;
      scheduleBairroSearch('');
    } catch {
      if (request !== cityRequest) return;
      citiesError = 'Não foi possível carregar sugestões de cidades.';
    } finally {
      if (request === cityRequest) citiesLoading = false;
    }
  }

  function onStateChange() {
    ++cepRequest;
    cepLookupError = null;
    city = '';
    bairro = '';
    scheduleCitySearch('', true);
  }

  function onCityInput(nextCity: string) {
    ++cepRequest;
    cepLookupError = null;
    bairro = '';
    scheduleCitySearch(nextCity);
  }

  function onBairroInput(nextBairro: string) {
    // A pending CEP must not overwrite a manually edited neighborhood.
    ++cepRequest;
    scheduleBairroSearch(nextBairro);
  }

  async function onCepLookup(value: string) {
    const request = ++cepRequest;
    const digits = onlyDigits(value);
    cepLookupError = null;
    if (semCep || digits.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('CEP indisponível');
      const data = await response.json();
      if (request !== cepRequest || semCep || onlyDigits(String(cep ?? '')) !== digits) return;
      if (data?.erro || !states.includes(String(data?.uf ?? '')) || !String(data?.localidade ?? '').trim()) {
        cepLookupError = 'CEP não encontrado.';
        return;
      }
      state = String(data.uf);
      city = String(data.localidade);
      bairro = String(data.bairro ?? '');
      address = String(data.logradouro ?? '');
      scheduleCitySearch(String(city), true);
    } catch {
      if (request === cepRequest && !semCep && onlyDigits(String(cep ?? '')) === digits) cepLookupError = 'Não foi possível consultar o CEP. Confira o número ou preencha o endereço manualmente.';
    }
  }

  onMount(() => scheduleCitySearch(String(city ?? ''), true));
  onDestroy(() => {
    ++cepRequest;
    resetSuggestions();
  });
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
          onCepLookup(cep);
        }}
      />
      <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          bind:checked={semCep}
          on:change={() => {
            if (semCep) cep = '';
            onCepLookup(String(cep ?? ''));
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
        on:change={() => onStateChange()}
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
        on:input={() => onCityInput(String(city ?? ''))}
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
        disabled={bairroDisabled}
        placeholder={bairroDisabled ? 'Selecione uma cidade primeiro' : bairrosLoading ? 'Carregando bairros...' : 'Digite ou selecione'}
        on:input={() => onBairroInput(String(bairro ?? ''))}
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
