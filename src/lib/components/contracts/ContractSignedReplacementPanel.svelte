<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { signedReplacementError, type SignedReplacementDeclaration } from './contractSignedReplacement';
  export let file: File | null = null;
  export let canDeclareEquivalence = false;
  export let disabled = false;
  export let onSubmit: (declaration: SignedReplacementDeclaration) => Promise<void> = async () => {};
  let replacementReason = '';
  let choice = '';
  $: if (!canDeclareEquivalence && choice === 'equivalent') choice = '';
  $: declaration = choice === 'equivalent' && canDeclareEquivalence
    ? { replacementReason, equivalenceDeclared: true as const }
    : choice === 'unchanged' ? { replacementReason, contractContentUnchanged: true as const } : undefined;
  $: validationError = signedReplacementError(file, declaration);
  function submit() {
    if (disabled || !declaration || signedReplacementError(file, declaration)) return;
    void onSubmit(declaration);
  }
</script>

<section aria-label="Substituição do PDF assinado" class="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-200">
  <p>O PDF anterior e seu histórico serão preservados. Selecione um novo PDF completo, com as duas assinaturas.</p>
  <label class="block">
    Justificativa da substituição
    <textarea bind:value={replacementReason} disabled={disabled} required rows="3"
      class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"></textarea>
  </label>
  <fieldset disabled={disabled} class="space-y-2">
    <legend class="mb-2 font-medium">Declaração sobre o novo PDF</legend>
    {#if canDeclareEquivalence}
      <label class="flex items-start gap-2">
        <input type="radio" bind:group={choice} value="equivalent" class="mt-1 accent-emerald-600" />
        <span>Declaro equivalência: o conteúdo contratual e as assinaturas permanecem os mesmos; apenas a digitalização ou qualidade mudou. Preservar somente confirmações válidas.</span>
      </label>
    {/if}
    <label class="flex items-start gap-2">
      <input type="radio" bind:group={choice} value="unchanged" class="mt-1 accent-emerald-600" />
      <span>Declaro que o conteúdo contratual permanece inalterado, sem equivalência. As assinaturas precisarão de nova conferência e confirmação.</span>
    </label>
    <label class="flex items-start gap-2">
      <input type="radio" bind:group={choice} value="changed" class="mt-1 accent-emerald-600" />
      <span>O conteúdo contratual mudou.</span>
    </label>
  </fieldset>
  {#if choice === 'changed'}
    <p role="alert" class="text-amber-700 dark:text-amber-300">Alterações de conteúdo exigem uma nova revisão da minuta, novos consentimentos e assinaturas. Não é possível usar esta substituição.</p>
  {:else if validationError}
    <p class="text-xs text-gray-600 dark:text-gray-300">{validationError}</p>
  {/if}
  <Button size="sm" on:click={submit} disabled={disabled || !!validationError || !declaration}>
    {disabled ? 'Aguarde…' : 'Substituir PDF assinado'}
  </Button>
</section>
