<script lang="ts">
  import PasswordInput from '../../../src/lib/components/PasswordInput.svelte';
  export let submit: () => void;
  let first = '', second = '';
</script>
<form on:submit|preventDefault={submit}>
  <label>Primeira<PasswordInput id="first" visibilityLabel="primeira senha" bind:value={first} minlength={14} autocomplete="new-password" /></label>
  <label>Segunda<PasswordInput id="second" visibilityLabel="segunda senha" bind:value={second} /></label>
</form>
