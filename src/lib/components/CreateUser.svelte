<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import {
    formatCep,
    formatPhoneBr,
    hasValidCreci,
    hasValidPhoneBr,
    isValidEmail,
    onlyDigits,
    sanitizeCreciInput,
    sanitizeDigitsInput,
  } from './create-property-helpers';

  type UserKind = 'client' | 'broker' | 'auxiliary_administrative';

  const states = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS',
    'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC',
    'SE', 'SP', 'TO',
  ];

  let isSubmitting = $state(false);
  let userKind: UserKind = $state('client');
  let brokerStatus = $state('approved');

  let name = $state('');
  let email = $state('');
  let phone = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let creci = $state('');

  let street = $state('');
  let number = $state('');
  let complement = $state('');
  let bairro = $state('');
  let city = $state('');
  let selectedState = $state('GO');
  let cep = $state('');
  let semCep = $state(false);
  let semNumero = $state(false);
  let cities: string[] = $state([]);
  let citiesLoading = $state(false);
  let citiesError: string | null = $state(null);
  let cepLookupError: string | null = $state(null);
  let lastCepLookup = $state('');
  const cityCache: Record<string, string[]> = {};

  let creciFrontFile: File | null = null;
  let creciBackFile: File | null = null;
  let selfieFile: File | null = null;

  function resetForm() {
    name = '';
    email = '';
    phone = '';
    password = '';
    showPassword = false;
    creci = '';
    street = '';
    number = '';
    complement = '';
    bairro = '';
    city = '';
    selectedState = 'GO';
    cep = '';
    semCep = false;
    semNumero = false;
    brokerStatus = 'approved';
    creciFrontFile = null;
    creciBackFile = null;
    selfieFile = null;
    cities = [];
    citiesError = null;
    cepLookupError = null;
    lastCepLookup = '';
  }

  function readFile(event: Event): File | null {
    const target = event.target as HTMLInputElement;
    return target.files && target.files.length > 0 ? target.files[0] : null;
  }

  function validateCommonFields(): string | null {
    if (!name.trim()) return 'Informe o nome.';
    if (!email.trim()) return 'Informe o email.';
    if (!isValidEmail(email)) return 'Informe um email válido (exemplo: nome@dominio.com).';
    if (!hasValidPhoneBr(phone)) return 'Informe telefone no formato +55 (00) 00000-0000.';
    if (!password.trim()) return 'Informe a senha.';
    if (!street.trim()) return 'Informe o endereço.';
    if (!semNumero && !number.trim()) return 'Informe o número.';
    if (!semNumero && !onlyDigits(number)) return 'Número deve conter apenas dígitos.';
    if (!bairro.trim()) return 'Informe o bairro.';
    if (!semCep && !onlyDigits(cep).trim()) return 'Informe o CEP.';
    if (!semCep && onlyDigits(cep).length !== 8) return 'CEP inválido.';
    if (!city.trim()) return 'Informe a cidade.';
    if (!selectedState.trim()) return 'Informe o estado.';
    return null;
  }

  async function fetchCitiesForState(uf: string) {
    if (!uf) {
      cities = [];
      return;
    }
    if (cityCache[uf]) {
      cities = cityCache[uf];
      return;
    }
    citiesLoading = true;
    citiesError = null;
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
      );
      if (!response.ok) throw new Error('Falha ao carregar cidades.');
      const payload = await response.json();
      const names = Array.isArray(payload)
        ? payload.map((item) => String(item?.nome ?? '')).filter(Boolean)
        : [];
      cities = names.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      cityCache[uf] = cities;
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
      citiesError = 'Não foi possível carregar cidades.';
      cities = [];
    } finally {
      citiesLoading = false;
    }
  }

  async function lookupCep(value: string) {
    if (semCep) return;
    const digits = onlyDigits(value);
    if (digits.length !== 8) return;
    if (digits === lastCepLookup) return;
    lastCepLookup = digits;
    cepLookupError = null;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('Falha ao consultar CEP.');
      const data = await response.json();
      if (data?.erro) return;
      if (data?.uf) {
        selectedState = String(data.uf);
        await fetchCitiesForState(selectedState);
      }
      if (data?.logradouro) {
        street = String(data.logradouro);
      }
      if (data?.bairro) {
        bairro = String(data.bairro);
      }
      if (data?.localidade) {
        city = String(data.localidade);
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      cepLookupError = 'CEP não encontrado.';
    }
  }

  async function handleSubmit() {
    const commonError = validateCommonFields();
    if (commonError) {
      toast.error(commonError);
      return;
    }

    isSubmitting = true;
    try {
      const normalizedCep = semCep ? '' : onlyDigits(cep);
      const normalizedNumber = semNumero ? '' : onlyDigits(number);
      if (userKind === 'client' || userKind === 'auxiliary_administrative') {
        await api.post('/admin/users', {
          name: name.trim(),
          email: email.trim(),
          phone: onlyDigits(phone),
          password: password.trim(),
          street: street.trim(),
          number: normalizedNumber,
          complement: complement.trim() || undefined,
          bairro: bairro.trim(),
          city: city.trim(),
          state: selectedState.trim(),
          cep: normalizedCep,
          sem_numero: semNumero ? 1 : 0,
          sem_cep: semCep ? 1 : 0,
          ...(userKind === 'auxiliary_administrative'
            ? { profileType: 'auxiliary_administrative' }
            : {}),
        });
        toast.success(
          userKind === 'auxiliary_administrative'
            ? 'Auxiliar administrativo cadastrado com sucesso.'
            : 'Cliente cadastrado com sucesso.'
        );
        resetForm();
        return;
      }

      if (!hasValidCreci(creci)) {
        toast.error('CRECI deve conter entre 4 e 8 números.');
        return;
      }
      if (!creciFrontFile || !creciBackFile || !selfieFile) {
        toast.error('Envie os 3 documentos: frente do CRECI, verso do CRECI e selfie.');
        return;
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('phone', onlyDigits(phone));
      formData.append('password', password.trim());
      formData.append('creci', onlyDigits(creci));
      formData.append('status', brokerStatus);
      formData.append('street', street.trim());
      formData.append('number', normalizedNumber);
      if (complement.trim()) {
        formData.append('complement', complement.trim());
      }
      formData.append('bairro', bairro.trim());
      formData.append('city', city.trim());
      formData.append('state', selectedState.trim());
      formData.append('cep', normalizedCep);
      formData.append('sem_numero', semNumero ? '1' : '0');
      formData.append('sem_cep', semCep ? '1' : '0');
      formData.append('creciFront', creciFrontFile);
      formData.append('creciBack', creciBackFile);
      formData.append('selfie', selfieFile);

      await api.post('/admin/brokers', formData);
      toast.success('Corretor cadastrado com sucesso.');
      resetForm();
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    fetchCitiesForState(selectedState);
  });
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Cadastrar usuário</h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Selecione o tipo de usuário. Para corretor, CRECI e os 3 documentos são obrigatórios.
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Tipo de usuário *
      <select
        id="create-user-kind"
        name="user_kind"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={userKind}
      >
        <option value="client">Cliente</option>
        <option value="broker">Corretor</option>
        <option value="auxiliary_administrative">Auxiliar Administrativo</option>
      </select>
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Nome *
      <input
        id="create-user-name"
        name="name"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={name}
        placeholder="Nome completo"
      />
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Email *
      <input
        id="create-user-email"
        name="email"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        type="email"
        bind:value={email}
        placeholder="email@dominio.com"
      />
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Telefone *
      <input
        id="create-user-phone"
        name="phone"
        maxlength="19"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={phone}
        inputmode="numeric"
        placeholder="+55 (00) 00000-0000"
        oninput={(event) => {
          const target = event.target as HTMLInputElement;
          phone = formatPhoneBr(target.value);
        }}
      />
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Senha *
      <div class="relative">
        <input
          id="create-user-password"
          name="password"
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          type={showPassword ? 'text' : 'password'}
          bind:value={password}
          placeholder="Senha inicial"
        />
        <button
          type="button"
          class="absolute inset-y-0 right-0 inline-flex items-center px-3 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          onclick={() => (showPassword = !showPassword)}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </label>

    {#if userKind === 'broker'}
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        CRECI *
        <input
          id="create-user-creci"
          name="creci"
          maxlength="25"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={creci}
          inputmode="numeric"
          placeholder="4 a 8 números"
          oninput={(event) => {
            const target = event.target as HTMLInputElement;
            creci = sanitizeCreciInput(target.value);
          }}
        />
      </label>

      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Status inicial do corretor *
        <select
          id="create-user-broker-status"
          name="broker_status"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={brokerStatus}
        >
          <option value="approved">Aprovado</option>
          <option value="pending_verification">Pendente</option>
        </select>
      </label>
    {/if}
  </div>

  <div class="mt-6 grid gap-4 md:grid-cols-2">
    <div class="flex flex-col gap-2">
      <label for="create-user-cep" class="text-sm font-medium text-gray-700 dark:text-gray-300">CEP *</label>
      <input
        id="create-user-cep"
        name="cep"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={cep}
        inputmode="numeric"
        placeholder="00000-000"
        onchange={() => {
          if (!semCep && onlyDigits(cep).length === 8) {
            lookupCep(cep);
          }
        }}
        oninput={(event) => {
          const target = event.target as HTMLInputElement;
          cep = formatCep(target.value);
          if (!semCep && onlyDigits(cep).length === 8) {
            lookupCep(cep);
          }
        }}
      />
      <div class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <input
          id="create-user-sem-cep"
          name="sem_cep"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
          bind:checked={semCep}
          onchange={() => {
            if (semCep) {
              cep = '';
              lastCepLookup = '';
              cepLookupError = null;
            }
          }}
        />
        <label for="create-user-sem-cep">Sem CEP</label>
      </div>
    </div>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Rua *
      <input
        id="create-user-street"
        name="street"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={street}
      />
    </label>
    <div class="flex flex-col gap-2">
      <label for="create-user-number" class="text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
      <input
        id="create-user-number"
        name="number"
        maxlength="25"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={number}
        inputmode="numeric"
        disabled={semNumero}
        oninput={(event) => {
          const target = event.target as HTMLInputElement;
          number = sanitizeDigitsInput(target.value);
        }}
      />
      <div class="inline-flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500">
        <input
          id="create-user-sem-numero"
          name="sem_numero"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
          bind:checked={semNumero}
          onchange={() => {
            if (semNumero) {
              number = '';
            }
          }}
        />
        <label for="create-user-sem-numero">Sem número</label>
      </div>
    </div>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Complemento
      <input
        id="create-user-complement"
        name="complement"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={complement}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Bairro *
      <input
        id="create-user-bairro"
        name="bairro"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={bairro}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">Cidade *
      <input
        id="create-user-city"
        name="city"
        list="cities-list-user"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={city}
        placeholder={citiesLoading ? 'Carregando cidades...' : 'Digite ou selecione'}
      />
      <datalist id="cities-list-user">
        {#each cities as option (option)}
          <option value={option}></option>
        {/each}
      </datalist>
      {#if citiesError}
        <span class="text-xs text-red-500 dark:text-red-400">{citiesError}</span>
      {/if}
      {#if cepLookupError}
        <span class="text-xs text-red-500 dark:text-red-400">{cepLookupError}</span>
      {/if}
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Estado *
      <select
        id="create-user-state"
        name="state"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={selectedState}
        onchange={() => fetchCitiesForState(selectedState)}
      >
        {#each states as uf (uf)}
          <option value={uf}>{uf}</option>
        {/each}
      </select>
    </label>
  </div>

  {#if userKind === 'broker'}
    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Documento CRECI (frente)
        <input
          id="create-user-creci-front"
          name="creci_front"
          type="file"
          accept="image/*"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          onchange={(event) => {
            creciFrontFile = readFile(event);
          }}
        />
      </label>
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Documento CRECI (verso)
        <input
          id="create-user-creci-back"
          name="creci_back"
          type="file"
          accept="image/*"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          onchange={(event) => {
            creciBackFile = readFile(event);
          }}
        />
      </label>
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Selfie
        <input
          id="create-user-selfie"
          name="selfie"
          type="file"
          accept="image/*"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          onchange={(event) => {
            selfieFile = readFile(event);
          }}
        />
      </label>
    </div>
  {/if}

  <div class="mt-6 flex justify-end">
    <button
      type="button"
      class="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      onclick={handleSubmit}
      disabled={isSubmitting}
    >
      {isSubmitting ? 'Salvando...' : 'Cadastrar usuário'}
    </button>
  </div>
</div>
