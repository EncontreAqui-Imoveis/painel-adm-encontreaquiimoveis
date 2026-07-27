<script lang="ts">
    import { requestAdminLogin } from './adminSessionService';
    import { reportObservedError } from './observability';
    import { readErrorContext } from './httpError';
    import { setAdminSession } from './sessionState';
    import Logo from './Logo.svelte';
    
    let email = '';
    let password = '';
    let error = '';
    let isLoading = false;

    async function handleLogin() {
        isLoading = true;
        error = '';

        if (!email || !password) {
            error = 'Por favor, preencha email e senha.';
            isLoading = false;
            return;
        }

        try {
            const response = await requestAdminLogin(email, password);

            if (!response.ok) {
                const errorContext = await readErrorContext(response);
                console.error('Erro no login:', {
                    status: errorContext.status,
                    requestId: errorContext.requestId,
                    message: errorContext.message,
                });
                reportObservedError(new Error(errorContext.message || 'Erro no login'), {
                    module: 'admin-login',
                    status: errorContext.status,
                    requestId: errorContext.requestId,
                    url: '/admin/login',
                    message: errorContext.message,
                });
                if (response.status === 401) {
                    error = 'Email ou senha incorretos.';
                } else {
                    error = 'Erro ao fazer login. Tente novamente.';
                }
                return;
            }

            const data = await response.json();
            if (typeof data?.token !== 'string' || data.token.trim().length === 0) {
                error = 'Login concluído sem token de sessão válido.';
                return;
            }
            if (typeof window !== 'undefined') {
                if (window.location.hash) {
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
            setAdminSession(data.token, data.admin);
            
        } catch (err) {
            error = 'Erro de conexão. Verifique sua internet.';
            reportObservedError(err, {
                module: 'admin-login',
                url: '/admin/login',
                message: 'Erro de conexão. Verifique sua internet.',
            });
            console.error('Erro no login:', err);
        } finally {
            isLoading = false;
        }
    }

    function handleKeypress(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleLogin();
        }
    }
</script>

<div class="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
    <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-r from-green-200/20 to-blue-200/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-blue-200/20 to-green-200/20 rounded-full blur-3xl"></div>
    </div>
    
    <div class="w-full max-w-sm rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl shadow-black/20 z-10 overflow-hidden border border-white/20">
        <div class="p-8 md:p-10 space-y-6">
            <div class="flex justify-center">
                <Logo className="w-20 h-20" />
            </div>
            <div class="text-center">
                <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Encontre Aqui Imóveis</h2>
                <p class="mt-1 text-gray-500 dark:text-gray-400">Dashboard Administrativo</p>
            </div>
            <form on:submit|preventDefault={handleLogin} class="space-y-6">
                <div>
                    <label class="sr-only" for="email">Email</label>
                    <input 
                        type="email" 
                        id="email" 
                        required 
                        maxlength="120"
                        placeholder="Email"
                        bind:value={email}
                        on:keypress={handleKeypress}
                        class="w-full px-4 py-3 text-gray-800 bg-gray-100/80 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700/80 dark:text-white transition-all placeholder-gray-500 dark:placeholder-gray-400"
                    />
                </div>
                <div>
                    <label class="sr-only" for="password">Senha</label>
                    <input 
                        type="password" 
                        id="password" 
                        required 
                        maxlength="256"
                        placeholder="Senha"
                        bind:value={password}
                        on:keypress={handleKeypress}
                        class="w-full px-4 py-3 text-gray-800 bg-gray-100/80 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700/80 dark:text-white transition-all placeholder-gray-500 dark:placeholder-gray-400"
                    />
                </div>
                {#if error}
                    <p
                        role="status"
                        aria-live="polite"
                        class="text-sm text-center text-red-500 dark:text-red-400 font-medium px-4 py-2 bg-red-50/50 dark:bg-red-900/20 rounded-lg"
                    >
                        {error}
                    </p>
                {/if}
                
                <button 
                    type="submit" 
                    disabled={isLoading}
                    aria-busy={isLoading}
                    class="w-full px-4 py-3 font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all transform hover:scale-105 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
                >
                    {#if isLoading}
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        A entrar...
                    {:else}
                        Entrar
                    {/if}
                </button>
            </form>
        </div>
        
        <div class="relative h-20">
            <div class="absolute bottom-0 left-0 w-full h-full overflow-hidden">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" class="w-full h-full">
                    <path d="M-5.58,53.48 C149.99,150.00 349.20,-49.98 503.66,53.48 L500.00,150.00 L0.00,150.00 Z" 
                          class="fill-current text-green-600/30 dark:text-green-700/40"></path>
                    <path d="M-2.22,83.98 C149.99,100.00 271.49,-49.98 503.66,83.98 L500.00,150.00 L0.00,150.00 Z" 
                          class="fill-current text-green-500/40 dark:text-green-600/50"></path>
                </svg>
            </div>
        </div>
    </div>
</div>

<style>
    :global(.dark) input {
        color-scheme: dark;
    }
</style>
