<script lang="ts">
    import PasswordInput from './components/PasswordInput.svelte';
    import { KeyRound, LogOut, ShieldCheck } from 'lucide-svelte';
    import { api } from './apiClient';
    import { adminSession, setSessionToken } from './sessionState';
    import { toast } from 'svelte-sonner';
    import { ADMIN_PASSWORD_MIN_LENGTH, ADMIN_PASSWORD_MAX_BYTES, isAdminPasswordPolicyError, validateNewAdminPassword } from './adminPasswordPolicy';

    export let pageTitle: string;
    export let onToggleSidebar: () => void = () => {};
    export let onLogout: () => void | Promise<void> = () => {};

    let isProfileOpen = false;
    let profileMenu: HTMLDivElement | null = null;
    let profileButton: HTMLButtonElement | null = null;
    let isPasswordDialogOpen = false;
    let currentPassword = '';
    let newPassword = '';
    let isChangingPassword = false;
    let passwordValidationAttempted = false;
    let currentPasswordError: string | null = null;
    let newPasswordServerError: string | null = null;
    let passwordOperationError: string | null = null;
    let passwordSuccess = '';
    $: newPasswordError = newPasswordServerError ?? validateNewAdminPassword(newPassword);
    $: showNewPasswordError = (passwordValidationAttempted || newPassword.length > 0) && !!newPasswordError;

    $: session = $adminSession;
    $: isDocumentOperator = session?.role === 'document_operator';
    $: roleLabel = isDocumentOperator ? 'Auxiliar administrativo' : 'Administrador';
    $: displayName = session?.name?.trim() || session?.email?.split('@')[0] || 'Conta administrativa';
    $: initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'EA';

    function closeProfileMenu(restoreFocus = false) {
        isProfileOpen = false;
        if (restoreFocus) {
            queueMicrotask(() => profileButton?.focus());
        }
    }

    function handleDocumentClick(event: MouseEvent) {
        if (!isProfileOpen || !profileMenu || !(event.target instanceof Node)) return;
        if (!profileMenu.contains(event.target)) closeProfileMenu();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && isProfileOpen) {
            event.preventDefault();
            closeProfileMenu(true);
        }
    }

    async function handleLogout() {
        closeProfileMenu();
        await onLogout();
    }

    function closePasswordDialog() {
        isPasswordDialogOpen = false;
        currentPassword = '';
        newPassword = '';
        passwordValidationAttempted = false;
        currentPasswordError = null;
        newPasswordServerError = null;
        passwordOperationError = null;
    }

    async function changePassword() {
        if (isChangingPassword) return;
        passwordSuccess = '';
        passwordValidationAttempted = true;
        currentPasswordError = currentPassword.length ? null : 'Informe sua senha atual.';
        newPasswordServerError = null;
        passwordOperationError = null;
        if (currentPasswordError || validateNewAdminPassword(newPassword)) return;
        isChangingPassword = true;
        try {
            const response = await api.put<{ token: string }>('/admin/me/password', { currentPassword, newPassword }, { skipErrorToast: true });
            if (typeof response?.token !== 'string' || !response.token.trim()) {
                passwordOperationError = 'A resposta não confirmou a renovação da sessão. A senha pode ter sido alterada; faça login novamente.';
                return;
            }
            setSessionToken(response.token);
            closePasswordDialog();
            passwordSuccess = 'Senha alterada com sucesso. Use a nova senha no próximo login.';
            toast.success('Senha atualizada.');
        } catch (error: any) {
            const data = error?.response?.data;
            if (data?.code === 'ADMIN_CURRENT_PASSWORD_INVALID') {
                currentPasswordError = data.error ?? 'Senha atual incorreta.';
            } else if (isAdminPasswordPolicyError(data?.code)) {
                newPasswordServerError = data.error ?? 'Nova senha inválida.';
            } else {
                passwordOperationError = data?.error ?? 'Não foi possível atualizar a senha.';
            }
        } finally {
            isChangingPassword = false;
        }
    }
</script>

<svelte:window on:click={handleDocumentClick} on:keydown={handleKeydown} />

<header class="bg-white dark:bg-gray-800 shadow-sm">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <button on:click={onToggleSidebar} class="text-gray-500 dark:text-gray-400 focus:outline-none lg:hidden" aria-label="Abrir menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        
        <h1 class="text-xl md:text-2xl font-semibold text-gray-800 dark:text-white">{pageTitle}</h1>
        
        <div class="relative" bind:this={profileMenu}>
            <button
                bind:this={profileButton}
                type="button"
                class="flex max-w-[15rem] items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:hover:bg-slate-700 dark:focus:ring-offset-gray-800"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                aria-label={`Abrir menu de ${displayName}`}
                on:click={() => (isProfileOpen = !isProfileOpen)}
            >
                <span class={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDocumentOperator ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'}`} aria-hidden="true">
                    {initials}
                </span>
                <span class="min-w-0 hidden sm:block">
                    <span class="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{displayName}</span>
                    <span class={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDocumentOperator ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'}`}>
                        {roleLabel}
                    </span>
                </span>
            </button>

            {#if isProfileOpen}
                <div class="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800" role="menu" aria-label="Menu da conta administrativa">
                    <div class="flex items-start gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
                        <span class={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDocumentOperator ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'}`}>
                            <ShieldCheck class="h-5 w-5" />
                        </span>
                        <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                            {#if session?.email}
                                <p class="truncate text-xs text-slate-500 dark:text-slate-400">{session.email}</p>
                            {/if}
                            <p class={`mt-1 text-xs font-semibold ${isDocumentOperator ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{roleLabel}</p>
                        </div>
                    </div>

                    {#if isDocumentOperator}
                        <div class="space-y-1 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            <p class="font-semibold text-slate-800 dark:text-slate-100">Pode revisar e substituir documentos.</p>
                            <p>Não pode excluir dados, alterar etapas do contrato ou gerenciar contas.</p>
                        </div>
                    {:else}
                        <div class="space-y-1 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            <p class="font-semibold text-slate-800 dark:text-slate-100">Acesso administrativo completo.</p>
                            <p>Gerencia contratos, documentos, etapas e operações administrativas.</p>
                        </div>
                    {/if}

                    <button type="button" role="menuitem" class="mb-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-200 dark:hover:bg-slate-700" on:click={() => { closeProfileMenu(); passwordSuccess = ''; isPasswordDialogOpen = true; }}>
                        <KeyRound class="h-4 w-4" />
                        Alterar minha senha
                    </button>

                    <button type="button" role="menuitem" class="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40" on:click={handleLogout}>
                        <LogOut class="h-4 w-4" />
                        Sair
                    </button>
                </div>
            {/if}
        </div>
    </div>
    {#if passwordSuccess}<p role="status" aria-live="polite" class="container mx-auto px-4 pb-4 text-sm text-emerald-800 dark:text-emerald-200">{passwordSuccess}</p>{/if}
</header>

{#if isPasswordDialogOpen}
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
        <form class="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800" novalidate on:submit|preventDefault={changePassword}>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Alterar minha senha</h2>
            <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">Senha atual<PasswordInput id="own-current-password" visibilityLabel="senha atual" autocomplete="current-password" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white" bind:value={currentPassword} required disabled={isChangingPassword} aria-invalid={currentPasswordError ? 'true' : undefined} aria-describedby={currentPasswordError ? 'own-current-password-feedback' : undefined} on:input={() => (currentPasswordError = null)} /></label>
            {#if currentPasswordError}<p id="own-current-password-feedback" role="alert" class="mt-1 text-xs text-red-600">{currentPasswordError}</p>{/if}
            <label class="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">Nova senha<PasswordInput id="own-new-password" visibilityLabel="nova senha" autocomplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white" bind:value={newPassword} minlength={ADMIN_PASSWORD_MIN_LENGTH} required disabled={isChangingPassword} aria-invalid={showNewPasswordError ? 'true' : undefined} aria-describedby="own-new-password-feedback" on:input={() => (newPasswordServerError = null)} /></label>
            <p id="own-new-password-feedback" role={showNewPasswordError ? 'alert' : undefined} class="mt-1 text-xs" class:text-red-600={showNewPasswordError} class:text-slate-500={!showNewPasswordError}>{showNewPasswordError ? newPasswordError : `Use pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres e no máximo ${ADMIN_PASSWORD_MAX_BYTES} bytes UTF-8. Acentos e emojis podem ocupar mais de um byte.`}</p>
            {#if passwordOperationError}<p role="alert" class="mt-3 text-sm text-red-600">{passwordOperationError}</p>{/if}
            <div class="mt-5 flex justify-end gap-2"><button type="button" class="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700" on:click={closePasswordDialog} disabled={isChangingPassword}>Cancelar</button><button class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60" disabled={isChangingPassword}>{isChangingPassword ? 'Salvando...' : 'Salvar senha'}</button></div>
        </form>
    </div>
{/if}
