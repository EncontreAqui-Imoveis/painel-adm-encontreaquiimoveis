<script lang="ts">
  import { Loader2 } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
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

  $: effectiveSellerDisabled = sellerApprovalDisabled || sellerLockReasons.length > 0 || evaluatingSide === "seller";
  $: effectiveBuyerDisabled = buyerApprovalDisabled || buyerLockReasons.length > 0 || evaluatingSide === "buyer";
  $: allLockReasons = approvalLockReasons.length > 0 ? approvalLockReasons : [...sellerLockReasons, ...buyerLockReasons];
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
      Avaliação Vendedor
    </p>
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
          Aprovar<span class="sr-only"> vendedor</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
          on:click={() => evaluateContractSide("seller", "APPROVED_WITH_RES")}
        >
          Aprovar c/ ressalvas<span class="sr-only"> vendedor</span>
        </Button>
        <Button
          size="sm"
          variant="destructive"
          on:click={() => evaluateContractSide("seller", "REJECTED")}
          disabled={evaluatingSide === "seller"}
        >
          Rejeitar
        </Button>
      {:else if getSideApprovalUiState(contract?.sellerApprovalStatus) === "approved"}
        <Button
          size="sm"
          variant="destructive"
          on:click={() => evaluateContractSide("seller", "REJECTED")}
          disabled={evaluatingSide === "seller"}
        >
          Rejeitar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
          on:click={() => evaluateContractSide("seller", "PENDING")}
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
          Aprovar<span class="sr-only"> vendedor</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
          on:click={() => evaluateContractSide("seller", "APPROVED_WITH_RES")}
        >
          Aprovar c/ ressalvas<span class="sr-only"> vendedor</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
          on:click={() => evaluateContractSide("seller", "PENDING")}
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
        Avaliação Comprador
      </p>
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
            Aprovar<span class="sr-only"> comprador</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
            on:click={() => evaluateContractSide("buyer", "APPROVED_WITH_RES")}
          >
            Aprovar c/ ressalvas<span class="sr-only"> comprador</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            on:click={() => evaluateContractSide("buyer", "REJECTED")}
            disabled={evaluatingSide === "buyer"}
          >
            Rejeitar
          </Button>
        {:else if getSideApprovalUiState(contract?.buyerApprovalStatus) === "approved"}
          <Button
            size="sm"
            variant="destructive"
            on:click={() => evaluateContractSide("buyer", "REJECTED")}
            disabled={evaluatingSide === "buyer"}
          >
            Rejeitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
            on:click={() => evaluateContractSide("buyer", "PENDING")}
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
            Aprovar<span class="sr-only"> comprador</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
            on:click={() => evaluateContractSide("buyer", "APPROVED_WITH_RES")}
          >
            Aprovar c/ ressalvas<span class="sr-only"> comprador</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900/30"
            on:click={() => evaluateContractSide("buyer", "PENDING")}
          >
            Reiniciar
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</div>
