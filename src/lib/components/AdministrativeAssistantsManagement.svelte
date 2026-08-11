<script lang="ts">
  import { onMount } from 'svelte';
  import { KeyRound, Pencil, Plus, Power, RefreshCw, UserRoundCog } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { toast } from 'svelte-sonner';

  type Assistant = {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    createdAt?: string | null;
    lastLoginAt?: string | null;
  };

  let assistants: Assistant[] = [];
  let isLoading = true;
  let isSaving = false;
  let showInactive = false;
  let editing: Assistant | null = null;
  let form = { name: '', email: '', password: '' };
  let resetPassword = '';

  async function load() {
    isLoading = true;
    try {
      const response = await api.get<{ data?: Assistant[] }>('/admin/assistants', { params: { includeInactive: showInactive } });
      assistants = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      toast.error('Não foi possível carregar os auxiliares administrativos.');
    } finally {
      isLoading = false;
    }
  }

  function startCreate() {
    editing = null;
    form = { name: '', email: '', password: '' };
  }

  function startEdit(assistant: Assistant) {
    editing = assistant;
    form = { name: assistant.name, email: assistant.email, password: '' };
    resetPassword = '';
  }

  async function save() {
    isSaving = true;
    try {
      if (editing) {
        await api.patch(`/admin/assistants/${editing.id}`, { name: form.name, email: form.email });
        toast.success('Auxiliar administrativo atualizado.');
      } else {
        await api.post('/admin/assistants', form);
        toast.success('Auxiliar administrativo criado.');
      }
      startCreate();
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Não foi possível salvar o auxiliar.');
    } finally {
      isSaving = false;
    }
  }

  async function toggleActive(assistant: Assistant) {
    const action = assistant.isActive ? 'desativar' : 'reativar';
    if (!confirm(`Deseja ${action} a conta de ${assistant.name}?`)) return;
    try {
      if (assistant.isActive) {
        const password = prompt('Confirme sua senha administrativa para desativar esta conta.');
        if (!password) return;
        const reauth = await api.post<{ reauthToken: string }>('/admin/reauth', { password });
        await api.delete(`/admin/assistants/${assistant.id}`, { headers: { 'x-admin-reauth': reauth.reauthToken } });
      } else {
        await api.post(`/admin/assistants/${assistant.id}/reactivate`, {});
      }
      toast.success(`Conta ${assistant.isActive ? 'desativada' : 'reativada'}.`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? `Não foi possível ${action} a conta.`);
    }
  }

  async function saveResetPassword() {
    if (!editing || !resetPassword) return;
    const currentPassword = prompt('Confirme sua senha administrativa para redefinir esta senha.');
    if (!currentPassword) return;
    isSaving = true;
    try {
      const reauth = await api.post<{ reauthToken: string }>('/admin/reauth', { password: currentPassword });
      await api.put(`/admin/assistants/${editing.id}/password`, { password: resetPassword }, { headers: { 'x-admin-reauth': reauth.reauthToken } });
      resetPassword = '';
      toast.success('Senha redefinida. As sessões anteriores foram encerradas.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Não foi possível redefinir a senha.');
    } finally {
      isSaving = false;
    }
  }

  onMount(load);
</script>

<section class="mx-auto max-w-6xl space-y-6">
  <header class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white"><UserRoundCog class="h-5 w-5 text-emerald-600" /> Auxiliares administrativos</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Podem revisar, rejeitar e substituir documentos. Não podem excluir entidades ou alterar etapas do contrato.</p>
      </div>
      <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" bind:checked={showInactive} on:change={load} /> Mostrar desativados</label>
    </div>
  </header>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {#if isLoading}
        <p class="p-6 text-sm text-slate-500">Carregando auxiliares...</p>
      {:else if assistants.length === 0}
        <p class="p-6 text-sm text-slate-500">Nenhum auxiliar administrativo cadastrado.</p>
      {:else}
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          {#each assistants as assistant}
            <article class="flex flex-wrap items-center justify-between gap-4 p-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2"><p class="truncate font-semibold text-slate-900 dark:text-white">{assistant.name}</p><span class={`rounded-full px-2 py-0.5 text-xs font-medium ${assistant.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{assistant.isActive ? 'Ativo' : 'Desativado'}</span></div>
                <p class="truncate text-sm text-slate-500">{assistant.email}</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Editar auxiliar" title="Editar" on:click={() => startEdit(assistant)}><Pencil class="h-4 w-4" /></button>
                <button class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={assistant.isActive ? 'Desativar auxiliar' : 'Reativar auxiliar'} title={assistant.isActive ? 'Desativar' : 'Reativar'} on:click={() => toggleActive(assistant)}><Power class="h-4 w-4" /></button>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </div>

    <form class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" on:submit|preventDefault={save}>
      <div class="flex items-center justify-between"><h3 class="font-semibold text-slate-900 dark:text-white">{editing ? 'Editar auxiliar' : 'Novo auxiliar'}</h3>{#if editing}<button type="button" class="text-sm text-slate-600 underline dark:text-slate-300" on:click={startCreate}>Cancelar</button>{/if}</div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Nome<input class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={form.name} required maxlength="160" /></label>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">E-mail<input type="email" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={form.email} required maxlength="254" /></label>
      {#if !editing}<label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Senha inicial<input type="password" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={form.password} required minlength="14" maxlength="128" /><span class="mt-1 block text-xs font-normal text-slate-500">Use entre 14 e 128 caracteres.</span></label>{/if}
      <button class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60" disabled={isSaving}><Plus class="h-4 w-4" />{editing ? 'Salvar edição' : 'Criar auxiliar'}</button>
      {#if editing}
        <div class="border-t border-slate-200 pt-4 dark:border-slate-700"><label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Nova senha<input type="password" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={resetPassword} minlength="14" maxlength="128" /></label><button type="button" class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" disabled={!resetPassword || isSaving} on:click={saveResetPassword}><KeyRound class="h-4 w-4" />Redefinir senha</button></div>
      {/if}
    </form>
  </div>
</section>
