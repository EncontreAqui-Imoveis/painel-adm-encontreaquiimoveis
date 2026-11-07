<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { KeyRound, Pencil, Plus, Power, Trash2, RefreshCw, UserRoundCog } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { toast } from 'svelte-sonner';
  import { adminSession } from '$lib/sessionState';
  import { ADMIN_PASSWORD_MIN_LENGTH, ADMIN_PASSWORD_MAX_BYTES, isAdminPasswordPolicyError, validateNewAdminPassword } from '$lib/adminPasswordPolicy';
  import AdminPasswordConfirmDialog from './AdminPasswordConfirmDialog.svelte';

  type Assistant = {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    createdAt?: string | null;
    lastLoginAt?: string | null;
  };

  $: canManage = $adminSession?.role === 'admin' && $adminSession.capabilities.canManageAdministration === true;

  let loadError = false;
  let loadSequence = 0;
  let assistants: Assistant[] = [];
  let isLoading = true;
  let isSaving = false;
  let showInactive = false;
  let editing: Assistant | null = null;
  let form = { name: '', email: '', password: '' };
  let creationValidationAttempted = false;
  let creationPasswordServerError: string | null = null;
  $: creationPasswordError = creationPasswordServerError ?? validateNewAdminPassword(form.password);
  $: showCreationPasswordError = (creationValidationAttempted || form.password.length > 0) && !!creationPasswordError;
  let resetPassword = '';
  let resetValidationAttempted = false;
  let resetPasswordServerError: string | null = null;
  $: resetPasswordError = resetPasswordServerError ?? validateNewAdminPassword(resetPassword);
  $: showResetPasswordError = (resetValidationAttempted || resetPassword.length > 0) && !!resetPasswordError;
  type PasswordAction = Readonly<{ id: number; name: string; email: string } & (
    { kind: 'reset'; password: string } | { kind: 'deactivate' }
  )>;
  let passwordAction: PasswordAction | null = null;
  let passwordDialogOpen = false;
  let confirmationError: string | null = null;
  let disposed = false;
  $: editorLocked = isSaving || passwordDialogOpen;
  $: if (!passwordDialogOpen) {
    passwordAction = null;
    confirmationError = null;
  }

  function cancelPasswordAction() {
    passwordDialogOpen = false;
    passwordAction = null;
    confirmationError = null;
  }

  async function load() {
    if (!canManage || disposed) return;
    const sequence = ++loadSequence;
    isLoading = true;
    loadError = false;
    try {
      const response = await api.get<{ data?: Assistant[] }>('/admin/assistants', { params: { includeInactive: showInactive } });
      if (!Array.isArray(response.data)) throw new Error('Resposta inválida da lista de auxiliares.');
      if (!disposed && sequence === loadSequence) assistants = response.data;
    } catch (error) {
      if (!disposed && sequence === loadSequence) loadError = true;
    } finally {
      if (!disposed && sequence === loadSequence) isLoading = false;
    }
  }

  function clearEditor() {
    editing = null;
    form = { name: '', email: '', password: '' };
    creationValidationAttempted = false;
    creationPasswordServerError = null;
    resetPassword = '';
    resetValidationAttempted = false;
    resetPasswordServerError = null;
  }

  function startCreate() {
    if (isSaving || !canManage) return;
    cancelPasswordAction();
    clearEditor();
  }

  function startEdit(assistant: Assistant) {
    if (isSaving || !canManage) return;
    cancelPasswordAction();
    editing = assistant;
    form = { name: assistant.name, email: assistant.email, password: '' };
    resetPassword = '';
    resetValidationAttempted = false;
    resetPasswordServerError = null;
  }

  async function save() {
    if (editorLocked || !canManage) return;
    if (!editing) {
      creationValidationAttempted = true;
      if (validateNewAdminPassword(form.password)) return;
    }
    isSaving = true;
    try {
      if (editing) {
        await api.patch(`/admin/assistants/${editing.id}`, { name: form.name, email: form.email });
        toast.success('Auxiliar administrativo atualizado.');
      } else {
        await api.post('/admin/assistants', form);
        toast.success('Auxiliar administrativo criado.');
      }
      clearEditor();
      await load();
    } catch (error: any) {
      if (!editing && isAdminPasswordPolicyError(error?.response?.data?.code)) {
        creationPasswordServerError = error.response.data.error ?? 'Nova senha inválida.';
      } else {
        toast.error(error?.response?.data?.error ?? 'Não foi possível salvar o auxiliar.');
      }
    } finally {
      isSaving = false;
    }
  }

  async function toggleActive(assistant: Assistant) {
    if (editorLocked || !canManage) return;
    if (assistant.id === $adminSession?.id) {
      toast.error('Não é permitido excluir seu próprio acesso.');
      return;
    }
    if (assistant.isActive) {
      passwordAction = Object.freeze({ kind: 'deactivate', id: assistant.id, name: assistant.name, email: assistant.email });
      passwordDialogOpen = true;
      return;
    }
    if (!confirm(`Deseja reativar a conta de ${assistant.name}?`)) return;
    isSaving = true;
    try {
      await api.post(`/admin/assistants/${assistant.id}/reactivate`, {});
      toast.success('Conta reativada.');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Não foi possível reativar a conta.');
    } finally {
      isSaving = false;
    }
  }

  async function saveResetPassword() {
    if (editorLocked || !canManage || !editing) return;
    resetValidationAttempted = true;
    if (validateNewAdminPassword(resetPassword)) return;
    passwordAction = Object.freeze({ kind: 'reset', id: editing.id, name: editing.name, email: editing.email, password: resetPassword });
    passwordDialogOpen = true;
  }

  async function confirmPasswordAction(event: CustomEvent<{ password: string }>) {
    const action = passwordAction;
    if (!action || isSaving || disposed || !canManage) return;
    isSaving = true;
    confirmationError = null;
    try {
      const reauth = await api.post<{ reauthToken: string }>('/admin/reauth', {
        password: event.detail.password,
        ...(action.kind === 'reset' ? { action: 'reset_assistant_password', targetAdminId: action.id } : {}),
      }, { skipErrorToast: true });
      if (disposed || passwordAction !== action || (action.kind === 'reset' && editing?.id !== action.id)) {
        cancelPasswordAction();
        return;
      }
      const options = { headers: { 'x-admin-reauth': reauth.reauthToken }, skipErrorToast: true };
      if (action.kind === 'reset') {
        await api.put(`/admin/assistants/${action.id}/password`, { password: action.password }, options);
      } else {
        await api.delete(`/admin/assistants/${action.id}`, options);
      }
      if (disposed) return;
      cancelPasswordAction();
      if (action.kind === 'reset') {
        resetPassword = '';
        resetValidationAttempted = false;
        resetPasswordServerError = null;
        toast.success('Senha redefinida. As sessões anteriores foram encerradas.');
      } else {
        if (editing?.id === action.id) clearEditor();
        toast.success('Acesso excluído. Conta desativada e sessões revogadas.');
        await load();
      }
    } catch (error: any) {
      if (!disposed && action.kind === 'reset' && isAdminPasswordPolicyError(error?.response?.data?.code)) {
        cancelPasswordAction();
        resetValidationAttempted = true;
        resetPasswordServerError = error.response.data.error ?? 'Nova senha inválida.';
      } else if (!disposed) {
        confirmationError = error?.response?.data?.error ?? 'Não foi possível concluir a confirmação administrativa.';
      }
    } finally {
      isSaving = false;
    }
  }

  onMount(() => { void load(); });
  onDestroy(() => { disposed = true; passwordAction = null; form.password = ''; resetPassword = ''; });
</script>

{#if canManage}
<section class="mx-auto max-w-6xl space-y-6">
  <header class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white"><UserRoundCog class="h-5 w-5 text-emerald-600" /> Auxiliares administrativos</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Podem revisar, rejeitar e substituir documentos. Não podem excluir entidades ou alterar etapas do contrato.</p>
      </div>
      <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" disabled={editorLocked} bind:checked={showInactive} on:change={load} /> Mostrar desativados</label>
    </div>
  </header>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {#if isLoading}
        <p class="p-6 text-sm text-slate-500">Carregando auxiliares...</p>
      {:else if loadError}
        <div role="alert" class="space-y-3 p-6 text-sm text-red-700 dark:text-red-300">
          <p>Não foi possível carregar os auxiliares administrativos. A lista não foi atualizada.</p>
          <button type="button" class="inline-flex items-center gap-2 rounded-lg border px-3 py-2" on:click={load}><RefreshCw class="h-4 w-4" />Tentar novamente</button>
        </div>
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
                <button disabled={editorLocked} class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Editar auxiliar" title="Editar" on:click={() => startEdit(assistant)}><Pencil class="h-4 w-4" /></button>
                <button disabled={editorLocked} class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={assistant.isActive ? `Excluir auxiliar ${assistant.name}` : `Reativar auxiliar ${assistant.name}`} title={assistant.isActive ? 'Excluir acesso (desativar conta)' : 'Reativar'} on:click={() => toggleActive(assistant)}>{#if assistant.isActive}<Trash2 class="h-4 w-4" /><span class="ml-1 text-sm">Excluir</span>{:else}<Power class="h-4 w-4" />{/if}</button>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </div>

    <form class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" on:submit|preventDefault={save}>
      <fieldset disabled={editorLocked} class="contents">
      <div class="flex items-center justify-between"><h3 class="font-semibold text-slate-900 dark:text-white">{editing ? 'Editar auxiliar' : 'Novo auxiliar'}</h3>{#if editing}<button type="button" class="text-sm text-slate-600 underline dark:text-slate-300" on:click={startCreate}>Cancelar</button>{/if}</div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Nome<input class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={form.name} required maxlength="160" /></label>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">E-mail<input type="email" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={form.email} required maxlength="254" /></label>
      {#if !editing}<label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Senha inicial<input type="password" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={form.password} required minlength={ADMIN_PASSWORD_MIN_LENGTH} aria-describedby="assistant-initial-password-feedback" aria-invalid={showCreationPasswordError ? 'true' : undefined} on:input={() => (creationPasswordServerError = null)} /></label>
        <p id="assistant-initial-password-feedback" role={showCreationPasswordError ? 'alert' : undefined} class="mt-1 text-xs" class:text-red-600={showCreationPasswordError} class:text-slate-500={!showCreationPasswordError}>{showCreationPasswordError ? creationPasswordError : `Use pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres e no máximo ${ADMIN_PASSWORD_MAX_BYTES} bytes UTF-8. Acentos e emojis podem ocupar mais de um byte.`}</p>{/if}
      <button class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60" disabled={isSaving}><Plus class="h-4 w-4" />{editing ? 'Salvar edição' : 'Criar auxiliar'}</button>
      {#if editing}
        <div class="border-t border-slate-200 pt-4 dark:border-slate-700">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Nova senha<input type="password" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" bind:value={resetPassword} minlength={ADMIN_PASSWORD_MIN_LENGTH} aria-describedby="assistant-new-password-feedback" aria-invalid={showResetPasswordError ? 'true' : undefined} on:input={() => (resetPasswordServerError = null)} /></label>
          <p id="assistant-new-password-feedback" role={showResetPasswordError ? 'alert' : undefined} class="mt-1 text-xs" class:text-red-600={showResetPasswordError} class:text-slate-500={!showResetPasswordError}>{showResetPasswordError ? resetPasswordError : `Use pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres e no máximo ${ADMIN_PASSWORD_MAX_BYTES} bytes UTF-8. Acentos e emojis podem ocupar mais de um byte.`}</p>
          <button type="button" class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" disabled={isSaving} on:click={saveResetPassword}><KeyRound class="h-4 w-4" />Redefinir senha</button>
        </div>
      {/if}
      </fieldset>
    </form>
  </div>
</section>

<AdminPasswordConfirmDialog
  bind:open={passwordDialogOpen}
  title={passwordAction?.kind === 'deactivate' ? 'Excluir acesso do auxiliar' : 'Redefinir senha do auxiliar'}
  description={passwordAction ? `${passwordAction.name} — ${passwordAction.email} (ID ${passwordAction.id}). ${passwordAction.kind === 'deactivate' ? 'A conta será desativada e o acesso de sessões existentes será bloqueado. Os históricos serão preservados. ' : ''}Confirme com sua senha administrativa.` : ''}
  confirmLabel={passwordAction?.kind === 'deactivate' ? 'Excluir acesso' : 'Confirmar redefinição'}
  isSubmitting={isSaving}
  error={confirmationError}
  on:confirm={confirmPasswordAction}
/>

{:else}
  <p role="alert" class="p-6 text-sm text-slate-600">Você não tem permissão para gerenciar auxiliares administrativos.</p>
{/if}
