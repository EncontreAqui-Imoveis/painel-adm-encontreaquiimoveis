<script lang="ts">
  import { Loader2, X } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import type { NegotiationItem, PaymentBreakdown, ResponsibleOption } from '$lib/components/negotiations/negotiationRequestsHelpers';

  export let showDetailModal = false;
  export let selectedProposal: NegotiationItem | null = null;
  export let isApproveBusy: () => boolean;
  export let closeDetailModal: () => void;

  export let formatDate: (value?: string | null) => string;
  export let formatCurrency: (value?: number | null) => string;
  export let readClientName: (proposal: NegotiationItem | null) => string;
  export let readClientCpf: (proposal: NegotiationItem | null) => string;
  export let paymentLines: (payment?: PaymentBreakdown | null) => Array<{ label: string; value: number }>;
  export let signedPdfDisplayName: () => string;
  export let requiresSignedPdf: () => boolean;

  export let uploadingSignedPdf = false;
  export let deletingSignedPdf = false;
  export let viewingPdf = false;
  export let processingAction = false;
  export let signedPdfInputRenderKey = 0;
  export let handleSignedPdfChange: (event: Event) => void;
  export let deleteSignedPdf: () => void;
  export let viewSignedPdf: () => void;

  export let responsibleDropdownOpen = false;
  export let responsibleSearchQuery = '';
  export let searchingResponsibles = false;
  export let responsibleOptions: ResponsibleOption[] = [];
  export let responsiblesLoading = false;
  export let responsiblesLoadError: string | null = null;
  export let selectedResponsibles: ResponsibleOption[] = [];
  export let responsibleError: string | null = null;
  export let savingResponsibles = false;
  export let openResponsibleDropdown: () => void;
  export let scheduleCloseResponsibleDropdown: () => void;
  export let onResponsibleSearchInput: (event: Event) => void;
  export let addResponsible: (option: ResponsibleOption) => void;
  export let fetchResponsibles: (proposalId: string) => void | Promise<void>;
  export let removeResponsible: (responsibleId: number) => void;
  export let saveResponsiblesSelection: (proposalId: string, silent?: boolean) => void | Promise<boolean>;
  export let hasResponsiblesInconsistentState: (proposalId?: string | null) => boolean;
  export let hasResponsibleChanges: () => boolean;
  export let responsiblesBlockApproval: (proposal: NegotiationItem | null) => boolean;

  export let rejectReason = '';
  export let rejectSelected: () => void;
  export let approveSelected: () => void;

  let signedPdfFileInput: HTMLInputElement | null = null;
</script>

{#if showDetailModal && selectedProposal}
  <div
    class="fixed inset-0 z-[60] flex max-h-dvh items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeDetailModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="my-auto flex w-full max-w-2xl flex-col rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 sm:max-h-[90vh]">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Análise da proposta</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedProposal.propertyCode
              ? `${selectedProposal.propertyCode}`
              : `#${selectedProposal.propertyId}`}
            {#if selectedProposal.propertyTitle}
              - {selectedProposal.propertyTitle}
            {/if}
          </p>
        </div>
        <Button variant="outline" size="sm" title="Fechar modal" className="px-2" on:click={() => closeDetailModal()} disabled={isApproveBusy()}>
          <X class="h-4 w-4" />
        </Button>
      </div>

      <div class="min-h-0 max-h-[min(70vh,32rem)] flex-1 overflow-y-auto pr-1 sm:max-h-[min(65vh,40rem)]">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Comprador / Proponente</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">{readClientName(selectedProposal)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{readClientCpf(selectedProposal)}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Validade</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formatDate(selectedProposal.validityDate)}
            </p>
          </div>
        </div>

        <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Condições de pagamento</p>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            {#each paymentLines(selectedProposal.payment) as item (item.label)}
              <div class="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <span class="font-semibold">{item.label}:</span> {formatCurrency(item.value)}
              </div>
            {/each}
          </div>
          <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Valor total: {formatCurrency(selectedProposal.value)}
          </p>
        </div>

        <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">PDF assinado</p>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {#if selectedProposal.signedDocumentId != null}
              PDF assinado anexado.
            {:else}
              Nenhum PDF assinado anexado.
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {#if selectedProposal.signedDocumentId != null}
              Você pode visualizar, excluir ou substituir.
            {:else}
              Envie um PDF assinado para habilitar a aprovação.
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {signedPdfDisplayName()}
          </p>

          {#if requiresSignedPdf()}
            <p class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              Para aprovar, é obrigatório anexar um PDF assinado.
            </p>
          {/if}

          <div class="mt-3">
            <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
              O envio inicia automaticamente ao selecionar o arquivo.
            </p>
            {#key signedPdfInputRenderKey}
              <input
                bind:this={signedPdfFileInput}
                type="file"
                accept="application/pdf"
                on:change={handleSignedPdfChange}
                class="sr-only"
              />
            {/key}
            <div class="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploadingSignedPdf || deletingSignedPdf || processingAction}
                on:click={() => signedPdfFileInput?.click()}
              >
                {#if uploadingSignedPdf}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {selectedProposal?.signedDocumentId != null ? 'Substituir PDF' : 'Enviar PDF'}
              </Button>
            </div>
            {#if uploadingSignedPdf}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Enviando PDF assinado...</p>
            {/if}
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              on:click={deleteSignedPdf}
              disabled={deletingSignedPdf || uploadingSignedPdf || processingAction || selectedProposal.signedDocumentId == null}
            >
              {#if deletingSignedPdf}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Excluir PDF
            </Button>
            <Button
              variant="outline"
              on:click={viewSignedPdf}
              disabled={viewingPdf || uploadingSignedPdf || deletingSignedPdf || selectedProposal.signedDocumentId == null}
            >
              {#if viewingPdf}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Visualizar PDF Assinado
            </Button>
          </div>
        </div>

        <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Responsável por acompanhar o processo
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Selecione até 5 pessoas para acompanhar esta proposta.
          </p>

          <div class="mt-3 space-y-2">
            <div class="relative">
              <input
                type="text"
                value={responsibleSearchQuery}
                on:focus={openResponsibleDropdown}
                on:blur={scheduleCloseResponsibleDropdown}
                on:input={onResponsibleSearchInput}
                placeholder="Digite ao menos 2 letras para buscar responsável"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                disabled={responsiblesLoading || savingResponsibles}
              />

              {#if responsibleDropdownOpen}
                <div class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {#if responsibleSearchQuery.trim().length < 2}
                    <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      Digite ao menos 2 letras para buscar.
                    </p>
                  {:else if searchingResponsibles}
                    <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Buscando responsáveis...</p>
                  {:else if responsibleOptions.length === 0}
                    <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum responsável encontrado.</p>
                  {:else}
                    {#each responsibleOptions as option (`${option.id}`)}
                      <button
                        type="button"
                        class="flex w-full items-center justify-between border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
                        on:click={() => addResponsible(option)}
                      >
                        <span>{option.name}</span>
                        {#if option.email}
                          <span class="text-xs text-gray-500 dark:text-gray-400">{option.email}</span>
                        {/if}
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>

            {#if responsiblesLoading}
              <p class="text-xs text-gray-500 dark:text-gray-400">Carregando responsáveis...</p>
            {/if}
            {#if responsiblesLoadError}
              <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <p>{responsiblesLoadError}</p>
                {#if selectedProposal}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    on:click={() => {
                      const p = selectedProposal;
                      if (p) void fetchResponsibles(p.id);
                    }}
                    disabled={responsiblesLoading || savingResponsibles || processingAction}
                  >
                    {#if responsiblesLoading}
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {/if}
                    Tentar novamente
                  </Button>
                {/if}
              </div>
            {/if}

            {#if selectedResponsibles.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each selectedResponsibles as responsible (responsible.id)}
                  <span class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {responsible.name}
                    <button
                      type="button"
                      aria-label={`Remover ${responsible.name}`}
                      class="text-gray-500 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-300"
                      on:click={() => removeResponsible(responsible.id)}
                      disabled={savingResponsibles}
                    >
                      ×
                    </button>
                  </span>
                {/each}
              </div>
            {:else}
              <p class="text-xs text-gray-500 dark:text-gray-400">Nenhum responsável selecionado.</p>
            {/if}

            <p class="text-xs text-gray-500 dark:text-gray-400">
              {selectedResponsibles.length}/5 responsáveis selecionados.
            </p>
            {#if responsibleError}
              <p class="text-xs font-medium text-red-600 dark:text-red-400">{responsibleError}</p>
            {/if}
            <div>
              <Button
                size="sm"
                variant="outline"
                on:click={() => selectedProposal && saveResponsiblesSelection(selectedProposal.id)}
                disabled={savingResponsibles || responsiblesLoading || hasResponsiblesInconsistentState(selectedProposal?.id ?? null) || !hasResponsibleChanges()}
              >
                {#if savingResponsibles}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Salvar responsáveis
              </Button>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <label
            for="reject-reason"
            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Motivo da rejeição (obrigatório para rejeitar)
          </label>
          <textarea
            id="reject-reason"
            bind:value={rejectReason}
            maxlength="500"
            rows={4}
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            placeholder="Descreva o motivo da rejeição..."
          ></textarea>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <p class="order-last text-left text-sm text-gray-500 dark:text-gray-400 sm:order-first sm:mr-auto sm:max-w-md">
          {#if !selectedProposal.signedDocumentId || requiresSignedPdf()}
            Anexe o PDF assinado para aprovar ou rejeitar esta proposta.
          {:else if responsiblesBlockApproval(selectedProposal)}
            Valide/corrija o carregamento dos responsáveis para aprovar. Rejeitar ainda pode ser usado.
          {/if}
        </p>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="destructive"
            className="bg-red-600 text-white hover:bg-red-700"
            on:click={rejectSelected}
            disabled={isApproveBusy() || !selectedProposal.signedDocumentId || requiresSignedPdf()}
            title={!selectedProposal.signedDocumentId || requiresSignedPdf() ? 'Exija PDF assinado anexado' : 'Rejeitar proposta com motivo abaixo'}
          >
            {#if processingAction}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Rejeitar
          </Button>
          <Button
            variant="outline"
            className="bg-green-600 text-white hover:bg-green-700"
            on:click={approveSelected}
            disabled={isApproveBusy() || requiresSignedPdf() || hasResponsiblesInconsistentState(selectedProposal?.id ?? null) || responsiblesBlockApproval(selectedProposal) || !selectedProposal.signedDocumentId}
            title={requiresSignedPdf() ? 'Anexe o PDF assinado' : hasResponsiblesInconsistentState(selectedProposal?.id ?? null) || responsiblesBlockApproval(selectedProposal) ? 'Corrija responsáveis' : 'Aprovar e seguir para contratos'}
          >
            {#if processingAction || savingResponsibles}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Aprovar
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
