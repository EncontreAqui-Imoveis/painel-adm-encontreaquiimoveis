<script lang="ts">
  import { Loader2, X } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import type {
    NegotiationItem,
    PaymentBreakdown,
    RentalProposalTerms,
    ResponsibleOption,
  } from "$lib/components/negotiations/negotiationRequestsHelpers";

  export let showDetailModal = false;
  export let selectedProposal: NegotiationItem | null = null;
  export let canManageContractWorkflow = false;
  export let isApproveBusy: () => boolean;
  export let closeDetailModal: () => void;

  export let formatDate: (value?: string | null) => string;
  export let formatCurrency: (value?: number | null) => string;
  export let readClientName: (proposal: NegotiationItem | null) => string;
  export let readClientCpf: (proposal: NegotiationItem | null) => string;
  export let paymentLines: (
    payment?: PaymentBreakdown | null,
  ) => Array<{ label: string; value: number }>;
  export let isRentalProposal: (
    proposal: NegotiationItem | null | undefined,
  ) => boolean;
  export let rentalTermsLines: (
    terms?: RentalProposalTerms | null,
  ) => Array<{ label: string; value: string }>;
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
  export let responsibleSearchQuery = "";
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
  export let saveResponsiblesSelection: (
    proposalId: string,
    silent?: boolean,
  ) => void | Promise<boolean>;
  export let hasResponsiblesInconsistentState: (
    proposalId?: string | null,
  ) => boolean;
  export let hasResponsibleChanges: () => boolean;
  export let openEditProposalModal: () => void;
  export let proposalInlineEditMode = false;
  export let proposalClientName = "";
  export let proposalClientCpf = "";
  export let proposalValidityDays = "10";
  export let proposalTotalValueInput = "";
  export let proposalCashInput = "";
  export let proposalCashUnit: "reais" | "percent" = "reais";
  export let proposalTradeInInput = "";
  export let proposalTradeInUnit: "reais" | "percent" = "reais";
  export let proposalFinancingInput = "";
  export let proposalFinancingUnit: "reais" | "percent" = "reais";
  export let proposalOthersInput = "";
  export let proposalOthersUnit: "reais" | "percent" = "reais";
  export let proposalRentalTerms: RentalProposalTerms = {};
  export let formatCpf: (value: string | null | undefined) => string;
  export let normalizeProposalFieldValue: (
    field: "dinheiro" | "permuta" | "financiamento" | "outros",
    rawValue: string,
    unit: "reais" | "percent",
  ) => void;
  export let updateProposalTotalValue: (value: string) => void;
  export let prepareProposalFieldEditing: (
    field: "total" | "dinheiro" | "permuta" | "financiamento" | "outros",
  ) => void;
  export let commitProposalTotalValue: () => void;
  export let commitProposalField: (
    field: "dinheiro" | "permuta" | "financiamento" | "outros",
    unit: "reais" | "percent",
  ) => void;
  export let switchProposalFieldUnit: (
    field: "dinheiro" | "permuta" | "financiamento" | "outros",
    nextUnit: "reais" | "percent",
  ) => void;
  export let submitGeneratedProposal: () => void | Promise<void>;
  export let cancelProposalInlineEdit: () => void;
  export let generateProposalSubmitting = false;
  export let generateProposalError = "";
  export let draftPdfDisplayName: () => string;
  export let viewDraftPdf: () => void;
  export let deleteDraftPdf: () => void;

  export let rejectReason = "";
  export let rejectSelected: () => void;
  export let approveSelected: () => void;
  export let hasSignedProposalDocument: (
    proposal: NegotiationItem | null,
  ) => boolean;

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
    <div
      class="my-auto flex w-full max-w-2xl flex-col rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 sm:max-h-[90vh]"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Análise da proposta
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {selectedProposal.propertyCode
              ? `${selectedProposal.propertyCode}`
              : 'Código indisponível'}
            {#if selectedProposal.propertyTitle}
              - {selectedProposal.propertyTitle}
            {/if}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          title="Fechar modal"
          className="px-2"
          on:click={() => closeDetailModal()}
          disabled={isApproveBusy()}
        >
          <X class="h-4 w-4" />
        </Button>
      </div>

      <div
        class="min-h-0 max-h-[min(70vh,32rem)] flex-1 overflow-y-auto pr-1 sm:max-h-[min(65vh,40rem)]"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <div
            class="rounded-md border border-gray-200 p-3 dark:border-gray-700"
          >
            <p
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
            >
              {isRentalProposal(selectedProposal)
                ? "Locatário / Proponente"
                : "Comprador / Proponente"}
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {readClientName(selectedProposal)}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {readClientCpf(selectedProposal)}
            </p>
          </div>
          <div
            class="rounded-md border border-gray-200 p-3 dark:border-gray-700"
          >
            <p
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
            >
              Validade
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formatDate(selectedProposal.validityDate)}
            </p>
          </div>
        </div>

        <div
          class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700"
        >
          {#if isRentalProposal(selectedProposal)}
            <p
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
            >
              Condições de locação
            </p>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              {#each rentalTermsLines(selectedProposal.rentalTerms) as item (item.label)}
                <div
                  class="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <span class="font-semibold">{item.label}:</span>
                  {item.value}
                </div>
              {/each}
            </div>
          {:else}
            <p
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
            >
              Condições de pagamento
            </p>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              {#each paymentLines(selectedProposal.payment) as item (item.label)}
                <div
                  class="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <span class="font-semibold">{item.label}:</span>
                  {formatCurrency(item.value)}
                </div>
              {/each}
            </div>
            <p
              class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              Valor total: {formatCurrency(selectedProposal.value)}
            </p>
          {/if}
        </div>

        <div
          class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700"
        >
          <p
            class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
          >
            PDF assinado
          </p>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {#if hasSignedProposalDocument(selectedProposal)}
              PDF assinado anexado.
            {:else if selectedProposal.status?.toUpperCase?.() === "PROPOSAL_SIGNED" || selectedProposal.internalStatus?.toUpperCase?.() === "PROPOSAL_SIGNED"}
              PDF assinado ausente.
            {:else}
              Nenhum PDF assinado anexado.
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {#if hasSignedProposalDocument(selectedProposal)}
              Você pode visualizar, excluir ou substituir.
            {:else if selectedProposal.status?.toUpperCase?.() === "PROPOSAL_SIGNED" || selectedProposal.internalStatus?.toUpperCase?.() === "PROPOSAL_SIGNED"}
              Reenvie o PDF para manter a proposta assinada ativa.
            {:else}
              Envie um PDF assinado para habilitar a aprovação.
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {signedPdfDisplayName()}
          </p>

          {#if requiresSignedPdf()}
            <p
              class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
            >
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
                disabled={uploadingSignedPdf ||
                  deletingSignedPdf ||
                  processingAction}
                on:click={() => signedPdfFileInput?.click()}
              >
                {#if uploadingSignedPdf}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {hasSignedProposalDocument(selectedProposal)
                  ? "Substituir PDF"
                  : "Enviar PDF"}
              </Button>
            </div>
            {#if uploadingSignedPdf}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enviando PDF assinado...
              </p>
            {/if}
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            {#if hasSignedProposalDocument(selectedProposal)}
              <Button
                variant="outline"
                on:click={deleteSignedPdf}
                disabled={deletingSignedPdf ||
                  uploadingSignedPdf ||
                  processingAction}
              >
                {#if deletingSignedPdf}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Excluir PDF
              </Button>
            {/if}
            <Button
              variant="outline"
              on:click={viewSignedPdf}
              disabled={viewingPdf ||
                uploadingSignedPdf ||
                deletingSignedPdf ||
                !hasSignedProposalDocument(selectedProposal)}
            >
              {#if viewingPdf}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Visualizar PDF Assinado
            </Button>
          </div>
        </div>

        <div
          class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700"
        >
          <p
            class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
          >
            Minuta
          </p>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {#if selectedProposal.draftDocumentId != null}
              Minuta gerada e pronta para download.
            {:else}
              Nenhuma minuta gerada ainda.
            {/if}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {draftPdfDisplayName()}
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            {#if selectedProposal.draftDocumentId != null}
              <Button
                variant="outline"
                on:click={viewDraftPdf}
                disabled={generateProposalSubmitting}
              >
                Visualizar minuta
              </Button>
              <Button
                variant="outline"
                on:click={deleteDraftPdf}
                disabled={generateProposalSubmitting ||
                  deletingSignedPdf ||
                  uploadingSignedPdf ||
                  processingAction}
              >
                Excluir minuta
              </Button>
            {/if}
            {#if proposalInlineEditMode}
              <Button
                className="bg-amber-500 text-black hover:bg-amber-400"
                on:click={submitGeneratedProposal}
                disabled={generateProposalSubmitting || !selectedProposal}
              >
                {#if generateProposalSubmitting}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {selectedProposal.draftDocumentId != null
                  ? "Refazer minuta"
                  : "Gerar minuta"}
              </Button>
            {/if}
          </div>
        </div>

        {#if proposalInlineEditMode}
          <div
            class="mt-4 rounded-md border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
          >
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <p
                  class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                >
                  Editar dados da proposta
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Ajuste os campos permitidos sem sair deste modal. A minuta usa
                  estes dados.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                on:click={cancelProposalInlineEdit}
                disabled={generateProposalSubmitting}
              >
                Cancelar edição
              </Button>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <label class="space-y-1">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >Nome do proponente</span
                >
                <input
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  bind:value={proposalClientName}
                  placeholder="Nome completo"
                  disabled={generateProposalSubmitting}
                />
              </label>
              {#if isRentalProposal(selectedProposal)}
                <label class="space-y-1">
                  <span
                    class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                    >Aluguel mensal</span
                  >
                  <input
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    value={proposalRentalTerms.monthlyRent ?? ""}
                    inputmode="decimal"
                    placeholder="0,00"
                    on:input={(event) => {
                      const value = Number(
                        String(
                          (event.currentTarget as HTMLInputElement).value,
                        ).replace(",", "."),
                      );
                      proposalRentalTerms = {
                        ...proposalRentalTerms,
                        monthlyRent: Number.isFinite(value) ? value : null,
                      };
                    }}
                    disabled={generateProposalSubmitting}
                  />
                </label>
                <label class="space-y-1">
                  <span
                    class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                    >Garantia</span
                  >
                  <select
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    value={proposalRentalTerms.guaranteeType ?? ""}
                    on:change={(event) =>
                      (proposalRentalTerms = {
                        ...proposalRentalTerms,
                        guaranteeType:
                          (event.currentTarget as HTMLSelectElement).value ||
                          null,
                      })}
                    disabled={generateProposalSubmitting}
                  >
                    <option value="">Selecione</option>
                    <option value="CAUCAO">Caução</option>
                    <option value="FIADOR">Fiador</option>
                    <option value="SEGURO_FIANCA">Seguro-fiança</option>
                    <option value="OUTRA">Outra</option>
                  </select>
                </label>
                <label class="space-y-1">
                  <span
                    class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                    >Prazo (meses)</span
                  >
                  <input
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    value={proposalRentalTerms.leaseTermMonths ?? ""}
                    inputmode="numeric"
                    on:input={(event) => {
                      const value = Number(
                        (event.currentTarget as HTMLInputElement).value,
                      );
                      proposalRentalTerms = {
                        ...proposalRentalTerms,
                        leaseTermMonths:
                          Number.isInteger(value) && value > 0 ? value : null,
                      };
                    }}
                    disabled={generateProposalSubmitting}
                  />
                </label>
              {/if}
              <label class="space-y-1">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >CPF</span
                >
                <input
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  bind:value={proposalClientCpf}
                  inputmode="numeric"
                  placeholder="Somente números ou com máscara"
                  on:input={(event) => {
                    const input =
                      event.currentTarget as HTMLInputElement | null;
                    proposalClientCpf = formatCpf(input?.value ?? "");
                  }}
                  disabled={generateProposalSubmitting}
                />
              </label>
              <label class="space-y-1">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >Validade</span
                >
                <input
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  value={proposalValidityDays}
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  on:input={(event) => {
                    const input =
                      event.currentTarget as HTMLInputElement | null;
                    proposalValidityDays = String(input?.value ?? "").replace(
                      /[^\d]/g,
                      "",
                    );
                  }}
                  disabled={generateProposalSubmitting}
                />
              </label>
              <label class="space-y-1">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >Valor da proposta</span
                >
                <div class="relative">
                  <input
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-14 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    value={proposalTotalValueInput}
                    inputmode="decimal"
                    placeholder="0,00"
                    on:focus={() => prepareProposalFieldEditing("total")}
                    on:input={(event) => {
                      const input =
                        event.currentTarget as HTMLInputElement | null;
                      updateProposalTotalValue(input?.value ?? "");
                    }}
                    on:blur={commitProposalTotalValue}
                    disabled={generateProposalSubmitting}
                  />
                  <span
                    class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400"
                  >
                    R$
                  </span>
                </div>
              </label>
              <label class="space-y-1">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >Dinheiro</span
                >
                <div class="grid grid-cols-[1fr_auto] gap-2">
                  <div class="relative">
                    <input
                      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-14 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      value={proposalCashInput}
                      inputmode="decimal"
                      placeholder="0,00"
                      on:focus={() => prepareProposalFieldEditing("dinheiro")}
                      on:input={(event) => {
                        const input =
                          event.currentTarget as HTMLInputElement | null;
                        normalizeProposalFieldValue(
                          "dinheiro",
                          input?.value ?? "",
                          proposalCashUnit,
                        );
                      }}
                      on:blur={() =>
                        commitProposalField("dinheiro", proposalCashUnit)}
                      disabled={generateProposalSubmitting}
                    />
                    <span
                      class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {proposalCashUnit === "reais" ? "R$" : "%"}
                    </span>
                  </div>
                  <select
                    value={proposalCashUnit}
                    class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    on:change={(event) => {
                      const input =
                        event.currentTarget as HTMLSelectElement | null;
                      switchProposalFieldUnit(
                        "dinheiro",
                        (input?.value ?? "reais") as "reais" | "percent",
                      );
                    }}
                    disabled={generateProposalSubmitting}
                  >
                    <option value="reais">R$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </label>
              <label class="space-y-1">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >Permuta</span
                >
                <div class="grid grid-cols-[1fr_auto] gap-2">
                  <div class="relative">
                    <input
                      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-14 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      value={proposalTradeInInput}
                      inputmode="decimal"
                      placeholder="0,00"
                      on:focus={() => prepareProposalFieldEditing("permuta")}
                      on:input={(event) => {
                        const input =
                          event.currentTarget as HTMLInputElement | null;
                        normalizeProposalFieldValue(
                          "permuta",
                          input?.value ?? "",
                          proposalTradeInUnit,
                        );
                      }}
                      on:blur={() =>
                        commitProposalField("permuta", proposalTradeInUnit)}
                      disabled={generateProposalSubmitting}
                    />
                    <span
                      class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {proposalTradeInUnit === "reais" ? "R$" : "%"}
                    </span>
                  </div>
                  <select
                    value={proposalTradeInUnit}
                    class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    on:change={(event) => {
                      const input =
                        event.currentTarget as HTMLSelectElement | null;
                      switchProposalFieldUnit(
                        "permuta",
                        (input?.value ?? "reais") as "reais" | "percent",
                      );
                    }}
                    disabled={generateProposalSubmitting}
                  >
                    <option value="reais">R$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </label>
              <label class="space-y-1">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >Financiamento</span
                >
                <div class="grid grid-cols-[1fr_auto] gap-2">
                  <div class="relative">
                    <input
                      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-14 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      value={proposalFinancingInput}
                      inputmode="decimal"
                      placeholder="0,00"
                      on:focus={() =>
                        prepareProposalFieldEditing("financiamento")}
                      on:input={(event) => {
                        const input =
                          event.currentTarget as HTMLInputElement | null;
                        normalizeProposalFieldValue(
                          "financiamento",
                          input?.value ?? "",
                          proposalFinancingUnit,
                        );
                      }}
                      on:blur={() =>
                        commitProposalField(
                          "financiamento",
                          proposalFinancingUnit,
                        )}
                      disabled={generateProposalSubmitting}
                    />
                    <span
                      class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {proposalFinancingUnit === "reais" ? "R$" : "%"}
                    </span>
                  </div>
                  <select
                    value={proposalFinancingUnit}
                    class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    on:change={(event) => {
                      const input =
                        event.currentTarget as HTMLSelectElement | null;
                      switchProposalFieldUnit(
                        "financiamento",
                        (input?.value ?? "reais") as "reais" | "percent",
                      );
                    }}
                    disabled={generateProposalSubmitting}
                  >
                    <option value="reais">R$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </label>
              <label class="space-y-1 md:col-span-2">
                <span
                  class="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >Outros</span
                >
                <div class="grid grid-cols-[1fr_auto] gap-2">
                  <div class="relative">
                    <input
                      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-14 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      value={proposalOthersInput}
                      inputmode="decimal"
                      placeholder="0,00"
                      on:focus={() => prepareProposalFieldEditing("outros")}
                      on:input={(event) => {
                        const input =
                          event.currentTarget as HTMLInputElement | null;
                        normalizeProposalFieldValue(
                          "outros",
                          input?.value ?? "",
                          proposalOthersUnit,
                        );
                      }}
                      on:blur={() =>
                        commitProposalField("outros", proposalOthersUnit)}
                      disabled={generateProposalSubmitting}
                    />
                    <span
                      class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {proposalOthersUnit === "reais" ? "R$" : "%"}
                    </span>
                  </div>
                  <select
                    value={proposalOthersUnit}
                    class="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    on:change={(event) => {
                      const input =
                        event.currentTarget as HTMLSelectElement | null;
                      switchProposalFieldUnit(
                        "outros",
                        (input?.value ?? "reais") as "reais" | "percent",
                      );
                    }}
                    disabled={generateProposalSubmitting}
                  >
                    <option value="reais">R$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </label>
            </div>

            <p class="text-xs text-gray-600 dark:text-gray-300">
              Clique no campo para editar; a formatação final volta ao sair do
              campo.
            </p>

            {#if generateProposalError}
              <p
                class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                {generateProposalError}
              </p>
            {/if}

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                on:click={submitGeneratedProposal}
                disabled={generateProposalSubmitting || !selectedProposal}
              >
                {#if generateProposalSubmitting}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {selectedProposal.draftDocumentId != null
                  ? "Refazer minuta"
                  : "Gerar minuta"}
              </Button>
            </div>
          </div>
        {/if}

        <div
          class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700"
        >
          <p
            class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
          >
            Corretor responsável pelo contrato
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Selecione explicitamente até 5 corretores. Cada responsável indicado
            terá acesso operacional aos dois lados do contrato: vendedor e
            comprador.
          </p>
          <p
            class="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          >
            Acesso aos dois lados
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
                <div
                  class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
                >
                  {#if responsibleSearchQuery.trim().length < 2}
                    <p
                      class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      Digite ao menos 2 letras para buscar.
                    </p>
                  {:else if searchingResponsibles}
                    <p
                      class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      Buscando responsáveis...
                    </p>
                  {:else if responsibleOptions.length === 0}
                    <p
                      class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      Nenhum responsável encontrado.
                    </p>
                  {:else}
                    {#each responsibleOptions as option (`${option.id}`)}
                      <button
                        type="button"
                        class="flex w-full items-center justify-between border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
                        on:click={() => addResponsible(option)}
                      >
                        <span>{option.name}</span>
                        {#if option.email}
                          <span class="text-xs text-gray-500 dark:text-gray-400"
                            >{option.email}</span
                          >
                        {/if}
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>

            {#if responsiblesLoading}
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Carregando responsáveis...
              </p>
            {/if}
            {#if responsiblesLoadError}
              <div
                class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
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
                    disabled={responsiblesLoading ||
                      savingResponsibles ||
                      processingAction}
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
                  <span
                    class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
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
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Nenhum responsável selecionado.
              </p>
            {/if}

            <p class="text-xs text-gray-500 dark:text-gray-400">
              {selectedResponsibles.length}/5 responsáveis selecionados.
            </p>
            {#if responsibleError}
              <p class="text-xs font-medium text-red-600 dark:text-red-400">
                {responsibleError}
              </p>
            {/if}
            <div>
              <Button
                size="sm"
                variant="outline"
                on:click={() =>
                  selectedProposal &&
                  saveResponsiblesSelection(selectedProposal.id)}
                disabled={savingResponsibles ||
                  responsiblesLoading ||
                  hasResponsiblesInconsistentState(
                    selectedProposal?.id ?? null,
                  ) ||
                  !hasResponsibleChanges()}
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

      <div
        class="mt-5 flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
      >
        <p
          class="order-last text-left text-sm text-gray-500 dark:text-gray-400 sm:order-first sm:mr-auto sm:max-w-md"
        >
          {#if !hasSignedProposalDocument(selectedProposal) && (selectedProposal.status?.toUpperCase?.() === "PROPOSAL_SIGNED" || selectedProposal.internalStatus?.toUpperCase?.() === "PROPOSAL_SIGNED")}
            O PDF foi removido. Reenvie para manter a proposta assinada ativa.
          {:else if !hasSignedProposalDocument(selectedProposal) || requiresSignedPdf()}
            Anexe o PDF assinado para aprovar ou rejeitar esta proposta.
          {/if}
        </p>
        <div class="flex flex-wrap items-center justify-end gap-2">
          {#if canManageContractWorkflow && !proposalInlineEditMode && !hasSignedProposalDocument(selectedProposal)}
            <Button
              variant="outline"
              on:click={openEditProposalModal}
              disabled={isApproveBusy()}
              title="Editar valores e gerar nova minuta"
            >
              Editar Proposta
            </Button>
          {/if}
          {#if canManageContractWorkflow && proposalInlineEditMode}
            <Button
              variant="outline"
              on:click={cancelProposalInlineEdit}
              disabled={generateProposalSubmitting}
            >
              Cancelar edição
            </Button>
          {/if}
          {#if canManageContractWorkflow}
            <Button
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              on:click={rejectSelected}
              disabled={isApproveBusy() ||
                !hasSignedProposalDocument(selectedProposal) ||
                requiresSignedPdf()}
              title={!hasSignedProposalDocument(selectedProposal) ||
              requiresSignedPdf()
                ? "Exija PDF assinado anexado"
                : "Rejeitar proposta com motivo abaixo"}
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
              disabled={isApproveBusy() ||
                requiresSignedPdf() ||
                !hasSignedProposalDocument(selectedProposal)}
              title={requiresSignedPdf()
                ? "Anexe o PDF assinado"
                : "Aprovar e seguir para contratos"}
            >
              {#if processingAction || savingResponsibles}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Aprovar
            </Button>
          {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Perfil de apoio: aprovação e rejeição ficam disponíveis apenas para o administrador.
            </p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
