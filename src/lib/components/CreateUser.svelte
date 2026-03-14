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

  type UserKind = 'client' | 'broker';

  const states = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS',
    'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC',
    'SE', 'SP', 'TO',
  ];

  let isSubmitting = false;
  let userKind: UserKind = 'client';
  let brokerStatus = 'approved';

  let name = '';
  let email = '';
  let phone = '';
  let password = '';
  let showPassword = false;
  let creci = '';

  let street = '';
  let number = '';
  let complement = '';
  let bairro = '';
  let city = '';
  let state = 'GO';
  let cep = '';
  let cities: string[] = [];
  let citiesLoading = false;
  let citiesError: string | null = null;
  let cepLookupError: string | null = null;
  let lastCepLookup = '';
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
    state = 'GO';
    cep = '';
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
    if (!number.trim()) return 'Informe o número.';
    if (!onlyDigits(number)) return 'Número deve conter apenas dígitos.';
    if (!bairro.trim()) return 'Informe o bairro.';
    if (!onlyDigits(cep).trim()) return 'Informe o CEP.';
    if (onlyDigits(cep).length !== 8) return 'CEP inválido.';
    if (!city.trim()) return 'Informe a cidade.';
    if (!state.trim()) return 'Informe o estado.';
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
        state = String(data.uf);
        await fetchCitiesForState(state);
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
      if (userKind === 'client') {
        await api.post('/admin/users', {
          name: name.trim(),
          email: email.trim(),
          phone: onlyDigits(phone),
          password: password.trim(),
          street: street.trim(),
          number: onlyDigits(number),
          complement: complement.trim() || undefined,
          bairro: bairro.trim(),
          city: city.trim(),
          state: state.trim(),
          cep: onlyDigits(cep),
        });
        toast.success('Cliente cadastrado com sucesso.');
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
      formData.append('number', onlyDigits(number));
      if (complement.trim()) {
        formData.append('complement', complement.trim());
      }
      formData.append('bairro', bairro.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('cep', onlyDigits(cep));
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
    fetchCitiesForState(state);
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
        on:input={(event) => {
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
          on:click={() => (showPassword = !showPassword)}
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
          on:input={(event) => {
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
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Endereço *
      <input
        id="create-user-street"
        name="street"
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={street}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Número *
      <input
        id="create-user-number"
        name="number"
        maxlength="25"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={number}
        inputmode="numeric"
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          number = sanitizeDigitsInput(target.value);
        }}
      />
    </label>
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
        maxlength="120"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={bairro}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      CEP *
      <input
        id="create-user-cep"
        name="cep"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={cep}
        inputmode="numeric"
        placeholder="00000-000"
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          cep = formatCep(target.value);
          if (onlyDigits(cep).length === 8) {
            lookupCep(cep);
          }
        }}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Cidade *
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
        {#each cities as option}
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
        bind:value={state}
        on:change={() => fetchCitiesForState(state)}
      >
        {#each states as uf}
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
          on:change={(event) => {
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
          on:change={(event) => {
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
          on:change={(event) => {
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
      on:click={handleSubmit}
      disabled={isSubmitting}
    >
      {isSubmitting ? 'Salvando...' : 'Cadastrar usuário'}
    </button>
  </div>
</div>
