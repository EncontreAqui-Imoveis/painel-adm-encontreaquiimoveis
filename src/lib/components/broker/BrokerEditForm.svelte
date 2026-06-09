<script lang="ts">
  import { formatCep, onlyDigits } from '$lib/components/create-property-helpers';

  type BrokerForm = {
    name: string;
    email: string;
    phone: string;
    street: string;
    number: string;
    complement: string;
    bairro: string;
    city: string;
    state: string;
    cep: string;
    creci: string;
    semCep: boolean;
    semNumero: boolean;
  };

  export let brokerForm: BrokerForm;
  export let lookupCep: (value: string) => void | Promise<void>;
  export let cepLookupError: string | null = null;
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Nome</span>
    <input bind:value={brokerForm.name} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Email</span>
    <input bind:value={brokerForm.email} type="email" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Telefone</span>
    <input bind:value={brokerForm.phone} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CRECI</span>
    <input bind:value={brokerForm.creci} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{brokerForm.semCep ? 'CEP (opcional)' : 'CEP'}</span>
    <input
      bind:value={brokerForm.cep}
      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"
      inputmode="numeric"
      disabled={brokerForm.semCep}
      on:input={(event) => {
        const target = event.target as HTMLInputElement;
        brokerForm = {
          ...brokerForm,
          cep: formatCep(target.value),
        };
        void lookupCep(target.value);
      }}
    />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cidade</span>
    <input bind:value={brokerForm.city} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Estado</span>
    <input bind:value={brokerForm.state} maxlength="2" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm uppercase text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="inline-flex items-center gap-2 self-end text-xs text-gray-500 dark:text-gray-400">
    <input
      type="checkbox"
      bind:checked={brokerForm.semCep}
      on:change={() => {
        if (brokerForm.semCep) {
          brokerForm = { ...brokerForm, cep: '' };
        }
      }}
    />
    Sem CEP
  </label>
  <label class="space-y-1 sm:col-span-2">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Rua</span>
    <input bind:value={brokerForm.street} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{brokerForm.semNumero ? 'Número (opcional)' : 'Número'}</span>
    <input
      bind:value={brokerForm.number}
      inputmode="numeric"
      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"
      disabled={brokerForm.semNumero}
      on:input={(event) => {
        const target = event.target as HTMLInputElement;
        brokerForm = { ...brokerForm, number: onlyDigits(target.value) };
      }}
    />
  </label>
  <label class="space-y-1">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Complemento</span>
    <input bind:value={brokerForm.complement} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  <label class="inline-flex items-center gap-2 self-end text-xs text-gray-500 dark:text-gray-400">
    <input
      type="checkbox"
      bind:checked={brokerForm.semNumero}
      on:change={() => {
        if (brokerForm.semNumero) {
          brokerForm = { ...brokerForm, number: '' };
        }
      }}
    />
    Sem número
  </label>
  <label class="space-y-1 sm:col-span-2">
    <span class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Bairro</span>
    <input bind:value={brokerForm.bairro} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
  </label>
  {#if cepLookupError}
    <p class="sm:col-span-2 text-xs text-red-500 dark:text-red-400">{cepLookupError}</p>
  {/if}
</div>
