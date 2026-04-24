<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { Loader2, X } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';

  type Audience = 'all' | 'client' | 'broker' | 'favorites';
  type UserItem = {
    id: number;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };

  export let open = false;
  export let propertyId: number | null = null;
  export let propertyTitle = '';
  export let defaultMessage = '';

  const dispatch = createEventDispatcher<{ close: void; sent: { requested: number; success: number; failure: number } }>();

  let audience: Audience = 'favorites';
  let sendToAll = true;
  let message = '';
  let isSubmitting = false;
  let doNotSendNotification = false;
  let loadingUsers = false;
  let usersError: string | null = null;
  let users: UserItem[] = [];
  let filteredUsers: UserItem[] = [];
  let selectedRecipients = new Set<string>();
  let searchTerm = '';
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    void loadUsers();
  });

  $: if (open) {
    message = defaultMessage;
    audience = 'favorites';
    sendToAll = true;
    selectedRecipients = new Set();
    searchTerm = '';
    usersError = null;
    doNotSendNotification = false;
  }

  $: filteredUsers = users.filter((user) => {
    if (audience === 'all' || audience === 'favorites') return true;
    const normalizedRole = String(user.role ?? 'client').trim().toLowerCase();
    return normalizedRole === audience;
  }).filter((user) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      String(user.name ?? '').toLowerCase().includes(term) ||
      String(user.email ?? '').toLowerCase().includes(term)
    );
  });

  async function loadUsers() {
    loadingUsers = true;
    usersError = null;
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '200');
      params.set('includeBrokers', 'true');
      const response = await api.get<{ data?: UserItem[] } | UserItem[]>(
        `/admin/users?${params.toString()}`
      );
      const raw = Array.isArray(response) ? response : response?.data ?? [];
      users = Array.isArray(raw)
        ? raw
            .map((item: any) => ({
              id: Number(item?.id),
              name: typeof item?.name === 'string' ? item.name : null,
              email: typeof item?.email === 'string' ? item.email : null,
              role: typeof item?.role === 'string' ? item.role : null,
            }))
            .filter((item) => Number.isFinite(item.id))
        : [];
    } catch (error) {
      console.error('Erro ao carregar usuários para notificação de promoção:', error);
      users = [];
      usersError = 'Não foi possível carregar usuários.';
    } finally {
      loadingUsers = false;
    }
  }

  function handleSearchInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    searchTerm = input?.value ?? '';
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchTerm = searchTerm.trim();
    }, 200);
  }

  function toggleRecipient(id: number) {
    const key = String(id);
    if (selectedRecipients.has(key)) selectedRecipients.delete(key);
    else selectedRecipients.add(key);
    selectedRecipients = new Set(selectedRecipients);
  }

  function closeModal() {
    if (isSubmitting) return;
    dispatch('close');
  }

  async function submitNotification() {
    if (doNotSendNotification) {
      toast.info('Envio ignorado. Nenhuma notificação será disparada.');
      dispatch('close');
      return;
    }
    if (!propertyId || !Number.isFinite(propertyId)) {
      toast.error('Imóvel inválido para notificação.');
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Mensagem obrigatória.');
      return;
    }
    if (!sendToAll && selectedRecipients.size === 0) {
      toast.error('Selecione ao menos um destinatário ou marque enviar para todos.');
      return;
    }

    isSubmitting = true;
    try {
      const recipientIds = sendToAll
        ? null
        : Array.from(selectedRecipients).map((id) => Number(id)).filter((id) => Number.isFinite(id));
      const payload = {
        message: trimmed,
        recipientIds,
        audience,
        related_entity_type: 'property',
        related_entity_id: propertyId,
      };
      const result = await api.post<{ push?: { requested?: number; success?: number; failure?: number } }>(
        '/admin/notifications/send',
        payload
      );
      const summary = {
        requested: Number(result?.push?.requested ?? 0),
        success: Number(result?.push?.success ?? 0),
        failure: Number(result?.push?.failure ?? 0),
      };
      toast.success('Notificação de promoção enviada.');
      dispatch('sent', summary);
      dispatch('close');
    } catch (error) {
      console.error('Erro ao enviar notificação de promoção:', error);
      const maybeStatus = (error as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
      const maybeMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (maybeStatus === 404 && maybeMessage) {
        toast.error(maybeMessage);
      } else {
        toast.error('Falha ao enviar notificação de promoção.');
      }
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) closeModal();
    }}
    on:keydown={() => {}}
  >
    <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notificação de promoção
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {propertyTitle ? propertyTitle : `Imóvel #${propertyId}`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="px-2" on:click={closeModal} disabled={isSubmitting}>
          <X class="h-4 w-4" />
        </Button>
      </div>

      <div class="space-y-4">
        <div class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Se você enviar por este modal agora, ele não abrirá novamente após salvar edição com promoção ativa.
          Se não enviar agora e salvar imóvel com promoção ativa, o modal abrirá automaticamente após salvar.
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
              bind:checked={sendToAll}
              disabled={isSubmitting}
            />
            Enviar para todos do público selecionado
          </label>
          <div>
            <label for="promotion-audience" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Público</label>
            <select
              id="promotion-audience"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={audience}
              disabled={isSubmitting}
            >
              <option value="favorites">Favoritados deste imóvel</option>
              <option value="all">Todos usuários</option>
              <option value="client">Somente clientes</option>
              <option value="broker">Somente corretores</option>
            </select>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            class="rounded border-gray-300 text-green-600 focus:ring-green-500"
            bind:checked={doNotSendNotification}
            disabled={isSubmitting}
          />
          Não enviar notificação agora
        </label>

        {#if !sendToAll}
          <div class="space-y-2">
            <label for="promotion-recipient-search" class="text-sm font-medium text-gray-700 dark:text-gray-200">Selecionar destinatários</label>
            <input
              id="promotion-recipient-search"
              type="search"
              maxlength="120"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Buscar por nome ou e-mail..."
              bind:value={searchTerm}
              on:input={handleSearchInput}
              disabled={isSubmitting}
            />
            {#if loadingUsers}
              <p class="text-sm text-gray-500 dark:text-gray-400">Carregando usuários...</p>
            {:else if usersError}
              <p class="text-sm text-red-600 dark:text-red-300">{usersError}</p>
            {:else if filteredUsers.length === 0}
              <p class="text-sm text-gray-500 dark:text-gray-400">Nenhum usuário disponível.</p>
            {:else}
              <div class="max-h-44 overflow-y-auto rounded-md border border-gray-200 p-3 dark:border-gray-700">
                {#each filteredUsers as user (user.id)}
                  <label class="mb-2 flex items-center gap-2 text-sm text-gray-700 last:mb-0 dark:text-gray-200">
                    <input
                      type="checkbox"
                      class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      checked={selectedRecipients.has(String(user.id))}
                      on:change={() => toggleRecipient(user.id)}
                      disabled={isSubmitting}
                    />
                    <span>
                      {user.name ?? `Usuário #${user.id}`}
                      {#if user.email} ({user.email}){/if}
                    </span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <div>
          <label for="promotion-message" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Mensagem</label>
          <textarea
            id="promotion-message"
            rows={4}
            maxlength={500}
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={message}
            disabled={isSubmitting}
          ></textarea>
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="outline" on:click={closeModal} disabled={isSubmitting}>Cancelar</Button>
          <Button on:click={submitNotification} disabled={isSubmitting}>
            {#if isSubmitting}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            {doNotSendNotification ? 'Continuar sem enviar' : 'Enviar notificação'}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
