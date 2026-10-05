<script lang="ts">
  import { Loader2 } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    contractSideLabel,
    isAwaitingDocumentResubmission,
  } from "$lib/components/contracts/contractsDisplayHelpers";
  import type {
    ContractItem,
    ContractApprovalStatus,
  } from "$lib/components/contracts/types";

  export let contract: ContractItem | null = null;
  export let approvalLockReasons: string[] = [];
  export let sellerLockReasons: string[] = [];
  export let buyerLockReasons: string[] = [];
  export let isReadyToApprove = false;
  export let evaluatingSide: "seller" | "buyer" | null = null;
  export let evaluatingSideAction: ContractApprovalStatus | null = null;
  export let sellerApprovalDisabled = false;
  export let buyerApprovalDisabled = false;
  export let isDoubleEndedDeal: (value: ContractItem | null) => boolean = () =>
    false;
  export let getSideApprovalUiState: (
    value?: ContractApprovalStatus | null,
  ) => string = () => "pending";
  export let evaluateContractSide: (
    side: "seller" | "buyer",
    action: "APPROVED" | "APPROVED_WITH_RES" | "REJECTED" | "PENDING",
  ) => void = () => {};
  export let requestSideRestart: (side: "seller" | "buyer") => void = () => {};

  $: effectiveSellerDisabled = sellerApprovalDisabled || sellerLockReasons.length > 0 || evaluatingSide === "seller";
  $: effectiveBuyerDisabled = buyerApprovalDisabled || buyerLockReasons.length > 0 || evaluatingSide === "buyer";
  $: allLockReasons = approvalLockReasons.length > 0 ? approvalLockReasons : [...sellerLockReasons, ...buyerLockReasons];
  $: sellerAwaitingResubmission = isAwaitingDocumentResubmission(contract, "seller");
  $: buyerAwaitingResubmission = isAwaitingDocumentResubmission(contract, "buyer");
  $: sellerIsEvaluating = evaluatingSide === "seller";
  $: buyerIsEvaluating = evaluatingSide === "buyer";
  $: sellerIsApproving = sellerIsEvaluating && evaluatingSideAction === "APPROVED";
  $: buyerIsApproving = buyerIsEvaluating && evaluatingSideAction === "APPROVED";
  $: sellerIsApprovingWithRemarks = sellerIsEvaluating && evaluatingSideAction === "APPROVED_WITH_RES";
  $: buyerIsApprovingWithRemarks = buyerIsEvaluating && evaluatingSideAction === "APPROVED_WITH_RES";
  $: sellerIsRejecting = sellerIsEvaluating && evaluatingSideAction === "REJECTED";
  $: buyerIsRejecting = buyerIsEvaluating && evaluatingSideAction === "REJECTED";
</script>

<div
  class="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700"
>
  {#if allLockReasons.length > 0}
    <div
      class="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p class="text-sm font-medium text-amber-800 dark:text-amber-300">
        Aprovação bloqueada.
      </p>
      <ul
        class="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-300"
      >
        {#each allLockReasons as reason}
          <li>{reason}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div>
    <p
      class="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
    >
      Avaliação {contractSideLabel(contract, "seller")}
    </p>
    {#if sellerAwaitingResubmission}
      <p class="-mt-1 mb-2 text-xs text-amber-700 dark:text-amber-300">
        Aguardando reenvio de documentos
      </p>
    {/if}
    <div class="flex flex-wrap gap-2">
      {#if getSideApprovalUiState(contract?.sellerApprovalStatus) === "pending"}
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 disabled:hover:bg-gray-400"
          on:click={() => evaluateContractSide("seller", "APPROVED")}
          disabled={effectiveSellerDisabled}
          title={sellerLockReasons.length > 0
            ? sellerLockReasons.join(" | ")
            : undefined}
        >
          {#if sellerIsApproving}<Loader2 class="mr-2 h-4 w-4 animate-spin" />Aprovando…{:else}Aprovar<span class="sr-only"> {contractSideLabel(contract, "seller").toLocaleLowerCase("pt-BR")}</span>{/if}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
          on:click={() => evaluateContractSide("seller", "APPROVED_WITH_RES")}
          disabled={sellerIsEvaluating}
        >
          {#if sellerIsApprovingWithRemarks}<Loader2 class="mr-2 h-4 w-4 animate-spin" />Aprovando…{:else}Aprovar com observação<span class="sr-only"> {contractSideLabel(contract, "seller").toLocaleLowerCase("pt-BR")}</span>{/if}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          on:click={() => evaluateContractSide("seller", "REJECTED")}
          disabled={sellerIsEvaluating}
        >
          {#if sellerIsRejecting}<Loader2 class="mr-2 h-4 w-4 animate-spin" />Rejeitando…{:else}Rejeitar{/if}
        </Button>
      {:else if getSideApprovalUiState(contract?.sellerApprovalStatus) === "approved"}
        <Button
          size="sm"
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
          on:click={() => requestSideRestart("seller")}
        >
          Reiniciar
        </Button>
      {:else if getSideApprovalUiState(contract?.sellerApprovalStatus) === "rejected"}
        <Button
          size="sm"
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
          on:click={() => requestSideRestart("seller")}
        >
          Reiniciar
        </Button>
      {:else}
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 disabled:hover:bg-gray-400"
          on:click={() => evaluateContractSide("seller", "APPROVED")}
          disabled={sellerApprovalDisabled}
          title={!isReadyToApprove
            ? approvalLockReasons.join(" | ")
            : undefined}
        >
          Aprovar<span class="sr-only"> {contractSideLabel(contract, "seller").toLocaleLowerCase("pt-BR")}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
          on:click={() => evaluateContractSide("seller", "APPROVED_WITH_RES")}
        >
          Aprovar com observação<span class="sr-only"> {contractSideLabel(contract, "seller").toLocaleLowerCase("pt-BR")}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
          on:click={() => requestSideRestart("seller")}
        >
          Reiniciar
        </Button>
      {/if}
    </div>
  </div>

  {#if !isDoubleEndedDeal(contract)}
    <div>
      <p
        class="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
      >
      Avaliação {contractSideLabel(contract, "buyer")}
    </p>
      {#if buyerAwaitingResubmission}
        <p class="-mt-1 mb-2 text-xs text-amber-700 dark:text-amber-300">
          Aguardando reenvio de documentos
        </p>
      {/if}
      <div class="flex flex-wrap gap-2">
        {#if getSideApprovalUiState(contract?.buyerApprovalStatus) === "pending"}
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 disabled:hover:bg-gray-400"
            on:click={() => evaluateContractSide("buyer", "APPROVED")}
            disabled={effectiveBuyerDisabled}
            title={buyerLockReasons.length > 0
              ? buyerLockReasons.join(" | ")
              : undefined}
          >
            {#if buyerIsApproving}<Loader2 class="mr-2 h-4 w-4 animate-spin" />Aprovando…{:else}Aprovar<span class="sr-only"> {contractSideLabel(contract, "buyer").toLocaleLowerCase("pt-BR")}</span>{/if}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
            on:click={() => evaluateContractSide("buyer", "APPROVED_WITH_RES")}
            disabled={buyerIsEvaluating}
          >
            {#if buyerIsApprovingWithRemarks}<Loader2 class="mr-2 h-4 w-4 animate-spin" />Aprovando…{:else}Aprovar com observação<span class="sr-only"> {contractSideLabel(contract, "buyer").toLocaleLowerCase("pt-BR")}</span>{/if}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            on:click={() => evaluateContractSide("buyer", "REJECTED")}
            disabled={buyerIsEvaluating}
          >
            {#if buyerIsRejecting}<Loader2 class="mr-2 h-4 w-4 animate-spin" />Rejeitando…{:else}Rejeitar{/if}
          </Button>
        {:else if getSideApprovalUiState(contract?.buyerApprovalStatus) === "approved"}
          <Button
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
            on:click={() => requestSideRestart("buyer")}
          >
            Reiniciar
          </Button>
        {:else if getSideApprovalUiState(contract?.buyerApprovalStatus) === "rejected"}
          <Button
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
            on:click={() => requestSideRestart("buyer")}
          >
            Reiniciar
          </Button>
        {:else}
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 disabled:hover:bg-gray-400"
            on:click={() => evaluateContractSide("buyer", "APPROVED")}
            disabled={effectiveBuyerDisabled}
            title={buyerLockReasons.length > 0
              ? buyerLockReasons.join(" | ")
              : undefined}
          >
            Aprovar<span class="sr-only"> {contractSideLabel(contract, "buyer").toLocaleLowerCase("pt-BR")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
            on:click={() => evaluateContractSide("buyer", "APPROVED_WITH_RES")}
          >
            Aprovar com observação<span class="sr-only"> {contractSideLabel(contract, "buyer").toLocaleLowerCase("pt-BR")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
            on:click={() => requestSideRestart("buyer")}
          >
            Reiniciar
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</div>
