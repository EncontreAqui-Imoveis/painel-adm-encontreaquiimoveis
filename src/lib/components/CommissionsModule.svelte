<script lang="ts">
  import { onMount } from 'svelte';
  import { Download, Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import {
    COMMISSION_AMOUNT_MAX_LENGTH,
    COMMISSION_CURRENCY_MAX,
    COMMISSION_PERCENT_MAX,
    COMMISSION_PERCENT_MAX_LENGTH,
    convertAmountFieldToPercentage,
    convertPercentageFieldToAmount,
    formatCommissionCurrency,
    formatCommissionPercentageInputValue,
    hasExactSaleSplit,
    parseCommissionMoney,
    parseCommissionPercentage,
    readCommissionValue,
    requiresExactSaleSplit,
    resolveCommissionPropertyLabel,
    type CommissionFieldKey,
    type FinalizeSplitMode,
  } from '$lib/components/commissions/commissionsHelpers';
  import { formatCurrencyInput } from '$lib/components/create-property-helpers';

  type CommissionsSummary = {
    totalVGV: number;
    totalCaptadores: number;
    totalComplementar: number;
    totalVendedores?: number;
    totalPlataforma: number;
  };

  type CommissionsTransaction = {
    contractId: string;
    negotiationId: string;
    propertyId: number;
    propertyTitle?: string | null;
    propertyCode?: string | null;
    propertyPurpose?: string | null;
    capturingBrokerName?: string | null;
    sellingBrokerName?: string | null;
    finalizedAt?: string | null;
    signedProposalDocumentId?: number | string | null;
    signedProposalDocumentSource?: 'negotiation_documents' | null;
    commissionData: {
      valorVenda: number;
      comissaoCaptador: number;
      comissaoVendedor: number;
      taxaPlataforma: number;
    };
  };

  type CommissionsResponse = {
    month?: number;
    year?: number;
    summary?: Partial<CommissionsSummary>;
    transactions?: CommissionsTransaction[];
  };

  const monthOptions = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const now = new Date();
  const currentYear = now.getFullYear();

  let selectedMonth = now.getMonth() + 1;
  let selectedYear = currentYear;
  let loading = true;
  let error: string | null = null;
  let transactions: CommissionsTransaction[] = [];
  let selectedTransaction: CommissionsTransaction | null = null;
  let editModalOpen = false;
  let savingCommissionData = false;
  let deletingCommissionData = false;
  let commissionFieldModes: Record<CommissionFieldKey, FinalizeSplitMode> = {
    comissaoCaptador: 'amount',
    comissaoVendedor: 'amount',
    taxaPlataforma: 'amount',
  };
  let isMobileLayout = false;
  let commissionForm = {
    valorVenda: '',
    comissaoCaptador: '',
    comissaoVendedor: '',
    taxaPlataforma: '',
  };
  let editableCaptadorName = '';
  let editableVendedorName = '';
  let summary: CommissionsSummary = {
    totalVGV: 0,
    totalCaptadores: 0,
    totalComplementar: 0,
    totalPlataforma: 0,
  };
  let signedProposalLoadingByNegotiation: Record<string, boolean> = {};

  const yearOptions = Array.from(
    { length: 8 },
    (_item, index) => currentYear - 4 + index
  );

  const formatCurrency = formatCommissionCurrency;

  function toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return 0;
    return Number(numeric.toFixed(2));
  }
  const commissionFields: Array<{ key: CommissionFieldKey; label: string }> = [
    { key: 'comissaoCaptador', label: 'Comissão Captador' },
    { key: 'comissaoVendedor', label: 'Comissão Complementar' },
    { key: 'taxaPlataforma', label: 'Taxa Encontre Aqui' },
  ];

  function syncIsMobileLayout() {
    if (typeof window === 'undefined') return;
    isMobileLayout = window.innerWidth < 768;
  }

  function formatDate(value?: string | null): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  }

  function propertyLabel(item: CommissionsTransaction): string {
    return resolveCommissionPropertyLabel(item);
  }

  function normalizeDisplayName(value: string | null | undefined): string {
    return String(value ?? '').trim();
  }

  function resolveApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;
    const source = error as {
      requestId?: unknown;
      response?: { data?: Record<string, unknown> };
    };
    const data = source.response?.data ?? {};
    const backendMessage =
      typeof data.error === 'string'
        ? data.error.trim()
        : typeof data.message === 'string'
          ? data.message.trim()
          : '';
    const requestId =
      typeof source.requestId === 'string'
        ? source.requestId.trim()
        : typeof data.requestId === 'string'
          ? data.requestId.trim()
          : typeof data.request_id === 'string'
            ? data.request_id.trim()
            : '';
    if (!backendMessage) return fallback;
    return requestId ? `${backendMessage} (Req: ${requestId})` : backendMessage;
  }

  function canViewSignedProposal(item: CommissionsTransaction): boolean {
    const negotiationId = String(item.negotiationId ?? '').trim();
    return negotiationId.length > 0 && item.signedProposalDocumentId != null;
  }

  function isSignedProposalLoading(item: CommissionsTransaction): boolean {
    const negotiationId = String(item.negotiationId ?? '').trim();
    return Boolean(signedProposalLoadingByNegotiation[negotiationId]);
  }

  async function viewSignedProposal(item: CommissionsTransaction) {
    const negotiationId = String(item.negotiationId ?? '').trim();
    if (!negotiationId) {
      toast.error('Negociação sem identificador para abrir proposta assinada.');
      return;
    }
    signedProposalLoadingByNegotiation = {
      ...signedProposalLoadingByNegotiation,
      [negotiationId]: true,
    };
    try {
      const response = await apiClient.get(
        `/admin/negotiations/${negotiationId}/signed-proposal/download`,
        { responseType: 'blob' }
      );
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error('Erro ao abrir proposta assinada:', error);
      toast.error(resolveApiErrorMessage(error, 'Não foi possível abrir a proposta assinada.'));
    } finally {
      signedProposalLoadingByNegotiation = {
        ...signedProposalLoadingByNegotiation,
        [negotiationId]: false,
      };
    }
  }

  function formatPercentageInput(raw: string, maxValue = COMMISSION_PERCENT_MAX): string {
    return formatCommissionPercentageInputValue(raw, maxValue);
  }

  function handleMoneyInput(field: CommissionFieldKey | 'valorVenda', event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    commissionForm = {
      ...commissionForm,
      [field]: formatCurrencyInput(target.value, COMMISSION_CURRENCY_MAX),
    };
  }

  function handlePercentageInput(
    field: CommissionFieldKey,
    event: Event
  ) {
    const target = event.currentTarget as HTMLInputElement;
    commissionForm = {
      ...commissionForm,
      [field]: formatPercentageInput(target.value, COMMISSION_PERCENT_MAX),
    };
  }

  function switchCommissionFieldMode(field: CommissionFieldKey, mode: FinalizeSplitMode) {
    if (commissionFieldModes[field] === mode) return;
    const saleValue = parseCommissionMoney(commissionForm.valorVenda);
    if (mode === 'percentage') {
      commissionForm = {
        ...commissionForm,
        [field]: convertAmountFieldToPercentage(commissionForm[field], saleValue),
      };
    } else {
      commissionForm = {
        ...commissionForm,
        [field]: convertPercentageFieldToAmount(commissionForm[field], saleValue),
      };
    }
    commissionFieldModes = {
      ...commissionFieldModes,
      [field]: mode,
    };
  }

  function resolveCommissionAmounts() {
    const valorVenda = parseCommissionMoney(commissionForm.valorVenda);
    if (valorVenda == null) return null;
    const resolvedFields = commissionFields.map(({ key }) => {
      if (commissionFieldModes[key] === 'amount') {
        const value = parseCommissionMoney(commissionForm[key], COMMISSION_CURRENCY_MAX);
        return value == null ? null : value;
      }
      const percentage = parseCommissionPercentage(commissionForm[key], COMMISSION_PERCENT_MAX);
      return percentage == null ? null : Number(((valorVenda * percentage) / 100).toFixed(2));
    });
    if (resolvedFields.some((value) => value == null)) return null;
    const [comissaoCaptador, comissaoVendedor, taxaPlataforma] = resolvedFields as number[];
    return {
      valorVenda,
      comissaoCaptador,
      comissaoVendedor,
      taxaPlataforma,
    };
  }

  function openEditModal(item: CommissionsTransaction) {
    selectedTransaction = item;
    editModalOpen = true;
    savingCommissionData = false;
    deletingCommissionData = false;
    commissionFieldModes = {
      comissaoCaptador: 'amount',
      comissaoVendedor: 'amount',
      taxaPlataforma: 'amount',
    };
    commissionForm = {
      valorVenda: readCommissionValue(item.commissionData?.valorVenda),
      comissaoCaptador: readCommissionValue(item.commissionData?.comissaoCaptador),
      comissaoVendedor: readCommissionValue(item.commissionData?.comissaoVendedor),
      taxaPlataforma: readCommissionValue(item.commissionData?.taxaPlataforma),
    };
    editableCaptadorName = normalizeDisplayName(item.capturingBrokerName);
    editableVendedorName = normalizeDisplayName(item.sellingBrokerName);
  }

  function closeEditModal() {
    if (savingCommissionData || deletingCommissionData) return;
    editModalOpen = false;
    selectedTransaction = null;
    editableCaptadorName = '';
    editableVendedorName = '';
  }

  async function saveCommissionData() {
    if (!selectedTransaction) return;
    const resolved = resolveCommissionAmounts();
    if (resolved == null) {
      toast.error('Preencha todos os campos com valores válidos.');
      return;
    }
    if (
      requiresExactSaleSplit(selectedTransaction) &&
      !hasExactSaleSplit(resolved)
    ) {
      toast.error(
        'Na venda, a soma das comissões precisa fechar exatamente o valor do VGV.'
      );
      return;
    }

    savingCommissionData = true;
    try {
      await api.put(`/admin/contracts/${selectedTransaction.contractId}/commission-data`, {
        commission_data: resolved,
      });
      toast.success('VGV atualizado com sucesso.');
      await fetchCommissions();
      closeEditModal();
    } catch (saveError) {
      console.error('Erro ao atualizar VGV:', saveError);
      toast.error(resolveApiErrorMessage(saveError, 'Não foi possível atualizar o VGV.'));
    } finally {
      savingCommissionData = false;
    }
  }

  async function deleteCommissionData(item: CommissionsTransaction) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o VGV do contrato ${item.contractId}?`
    );
    if (!confirmed) return;

    deletingCommissionData = true;
    try {
      await api.delete(`/admin/contracts/${item.contractId}/commission-data`);
      toast.success('VGV excluído com sucesso.');
      await fetchCommissions();
      if (selectedTransaction?.contractId === item.contractId) {
        closeEditModal();
      }
    } catch (deleteError) {
      console.error('Erro ao excluir VGV:', deleteError);
      toast.error(resolveApiErrorMessage(deleteError, 'Não foi possível excluir o VGV.'));
    } finally {
      deletingCommissionData = false;
    }
  }

  function csvEscape(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  function numberCsv(value: unknown): string {
    return toNumber(value).toFixed(2);
  }

  function exportCsv() {
    if (transactions.length === 0) return;

    const headers = [
      'Data',
      'Imóvel',
      'VGV',
      'Captador',
      'Comissao Captador',
      'Comissão Complementar',
      'Receita Encontre Aqui',
    ];

    const rows = transactions.map((item) => {
      const captador = String(item.capturingBrokerName ?? '').trim() || '-';
      return [
        formatDate(item.finalizedAt),
        propertyLabel(item),
        numberCsv(item.commissionData?.valorVenda),
        captador,
        numberCsv(item.commissionData?.comissaoCaptador),
        numberCsv(item.commissionData?.comissaoVendedor),
        numberCsv(item.commissionData?.taxaPlataforma),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(String(cell))).join(';'))
      .join('\n');

    const monthPart = String(selectedMonth).padStart(2, '0');
    const fileName = `comissoes_${monthPart}_${selectedYear}.csv`;
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function fetchCommissions() {
    loading = true;
    error = null;
    try {
      const response = await api.get<CommissionsResponse>(
        `/admin/commissions?month=${selectedMonth}&year=${selectedYear}`
      );

      const payload = response ?? {};
      const summaryPayload = payload.summary ?? {};
      const list = Array.isArray(payload.transactions) ? payload.transactions : [];

      summary = {
        totalVGV: toNumber(summaryPayload.totalVGV),
        totalCaptadores: toNumber(summaryPayload.totalCaptadores),
        totalComplementar: toNumber(summaryPayload.totalVendedores),
        totalPlataforma: toNumber(summaryPayload.totalPlataforma),
      };
      transactions = list.map((item) => {
        const record = item as CommissionsTransaction & {
          signed_proposal_document_id?: number | string | null;
          selling_broker_name?: string | null;
          capturing_broker_name?: string | null;
        };
        return {
          ...record,
          signedProposalDocumentId:
            record.signedProposalDocumentId ?? record.signed_proposal_document_id ?? null,
          capturingBrokerName:
            record.capturingBrokerName ?? record.capturing_broker_name ?? null,
          sellingBrokerName: record.sellingBrokerName ?? record.selling_broker_name ?? null,
        };
      });
    } catch (fetchError) {
      console.error('Erro ao carregar comissões:', fetchError);
      error = 'Não foi possível carregar os dados de comissões.';
      transactions = [];
      summary = {
        totalVGV: 0,
        totalCaptadores: 0,
        totalComplementar: 0,
        totalPlataforma: 0,
      };
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    syncIsMobileLayout();
    await fetchCommissions();
  });
</script>

<svelte:window on:resize={syncIsMobileLayout} />

<div class="space-y-4">
  <div>
    <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
      Comissões (VGV)
    </h2>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Acompanhe o VGV mensal e os repasses por contrato finalizado.
    </p>
  </div>

  <div class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-end md:justify-between">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label class="text-sm text-gray-700 dark:text-gray-200">
        Mês
        <select
          id="commissions-month"
          name="commissions_month"
          bind:value={selectedMonth}
          on:change={fetchCommissions}
          class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
        >
          {#each monthOptions as month}
            <option value={month.value}>{month.label}</option>
          {/each}
        </select>
      </label>
      <label class="text-sm text-gray-700 dark:text-gray-200">
        Ano
        <select
          id="commissions-year"
          name="commissions_year"
          bind:value={selectedYear}
          on:change={fetchCommissions}
          class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
        >
          {#each yearOptions as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="flex items-center gap-2">
      <Button
        className="bg-green-600 text-white hover:bg-green-700"
        on:click={exportCsv}
        disabled={loading || transactions.length === 0}
      >
        <Download class="mr-2 h-4 w-4" />
        Exportar CSV
      </Button>
      <Button variant="outline" on:click={fetchCommissions} disabled={loading}>
        {#if loading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Atualizar
      </Button>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
      <p class="text-xs font-semibold uppercase text-yellow-700 dark:text-yellow-300">VGV Total</p>
      <p class="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-100">
        {formatCurrency(summary.totalVGV)}
      </p>
    </div>
    <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
      <p class="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">Receita Encontre Aqui</p>
      <p class="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
        {formatCurrency(summary.totalPlataforma)}
      </p>
    </div>
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <p class="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">Repasse Captadores</p>
      <p class="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">
        {formatCurrency(summary.totalCaptadores)}
      </p>
    </div>
    <div class="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-900/20">
      <p class="text-xs font-semibold uppercase text-violet-700 dark:text-violet-300">Repasse Complementar</p>
      <p class="mt-2 text-2xl font-bold text-violet-900 dark:text-violet-100">
        {formatCurrency(summary.totalComplementar)}
      </p>
    </div>
  </div>

  {#if isMobileLayout}
  <div class="space-y-3">
    {#if loading}
      <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Carregando dados de comissões...
      </div>
    {:else if error}
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {error}
      </div>
    {:else if transactions.length === 0}
      <div class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Nenhuma transação finalizada para o período selecionado.
      </div>
    {:else}
      {#each transactions as item (item.contractId)}
        <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">{propertyLabel(item)}</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Captador: {item.capturingBrokerName ?? '-'} · Vendedor: {item.sellingBrokerName ?? '-'}
              </p>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Finalizado em {formatDate(item.finalizedAt)}
              </p>
            </div>
            <span class="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
              VGV
            </span>
          </div>
          <dl class="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <div class="flex items-center justify-between gap-3">
              <dt>VGV</dt>
              <dd class="text-right">{formatCurrency(toNumber(item.commissionData?.valorVenda))}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Captador</dt>
              <dd class="text-right">{formatCurrency(toNumber(item.commissionData?.comissaoCaptador))}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Complementar</dt>
              <dd class="text-right">{formatCurrency(toNumber(item.commissionData?.comissaoVendedor))}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Plataforma</dt>
              <dd class="text-right">{formatCurrency(toNumber(item.commissionData?.taxaPlataforma))}</dd>
            </div>
          </dl>
          <div class="mt-4 flex flex-col gap-2">
            {#if canViewSignedProposal(item)}
              <Button variant="outline" on:click={() => viewSignedProposal(item)} disabled={isSignedProposalLoading(item)}>
                {#if isSignedProposalLoading(item)}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Ver proposta assinada
              </Button>
            {/if}
            <Button variant="outline" on:click={() => openEditModal(item)}>
              Editar
            </Button>
            <Button variant="destructive" on:click={() => deleteCommissionData(item)}>
              Excluir
            </Button>
          </div>
        </article>
      {/each}
    {/if}
  </div>
  {:else}
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data Finalização
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Imóvel
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            VGV
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Comissão Captador
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Comissão Complementar
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Receita Plataforma
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ações
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if loading}
          <tr>
            <td colspan="7" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando dados de comissões...
            </td>
          </tr>
        {:else if error}
          <tr>
            <td colspan="7" class="px-6 py-6 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </td>
          </tr>
        {:else if transactions.length === 0}
          <tr>
            <td colspan="7" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma transação finalizada para o período selecionado.
            </td>
          </tr>
        {:else}
          {#each transactions as item (item.contractId)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.finalizedAt)}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-medium">{propertyLabel(item)}</div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Captador: {item.capturingBrokerName ?? '-'}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Vendedor: {item.sellingBrokerName ?? '-'}
                </div>
              </td>
              <td class="px-6 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                {formatCurrency(toNumber(item.commissionData?.valorVenda))}
              </td>
              <td class="px-6 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                {formatCurrency(toNumber(item.commissionData?.comissaoCaptador))}
              </td>
              <td class="px-6 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                {formatCurrency(toNumber(item.commissionData?.comissaoVendedor))}
              </td>
              <td class="px-6 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                {formatCurrency(toNumber(item.commissionData?.taxaPlataforma))}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  {#if canViewSignedProposal(item)}
                    <Button size="sm" variant="outline" on:click={() => viewSignedProposal(item)} disabled={isSignedProposalLoading(item)}>
                      {#if isSignedProposalLoading(item)}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      Ver proposta assinada
                    </Button>
                  {/if}
                  <Button size="sm" variant="outline" on:click={() => openEditModal(item)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" on:click={() => deleteCommissionData(item)}>
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
  {/if}
</div>

{#if editModalOpen && selectedTransaction}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-0 sm:items-start sm:p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeEditModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div
      class="w-full max-w-2xl rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:my-8 sm:rounded-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="commission-edit-title"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 id="commission-edit-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Editar VGV
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {propertyLabel(selectedTransaction)}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={closeEditModal}
          aria-label="Fechar modal"
        >
          ×
        </button>
      </div>

      <div class="space-y-4">
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
                Pessoas do VGV
              </span>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Campos apenas visuais nesta tela.
              </p>
            </div>
          </div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Nome do captador
              <input
                type="text"
                bind:value={editableCaptadorName}
                placeholder="Nome do captador"
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Nome do vendedor
              <input
                type="text"
                bind:value={editableVendedorName}
                placeholder="Nome do vendedor"
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
          </div>
        </div>

        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
                Comissões por campo
              </span>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cada comissão pode ficar em reais ou percentual sem afetar as outras.
              </p>
            </div>
          </div>

          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <label class="text-sm text-gray-700 dark:text-gray-200 md:col-span-2">
              Valor de Venda/Locação (R$)
              <input
                type="text"
                inputmode="decimal"
                value={commissionForm.valorVenda}
                maxlength={COMMISSION_AMOUNT_MAX_LENGTH}
                on:input={(event) => handleMoneyInput('valorVenda', event)}
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>

            {#each commissionFields as field}
              <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{field.label}</p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {commissionFieldModes[field.key] === 'amount'
                        ? 'Valor real em reais.'
                        : 'Percentual sobre o VGV.'}
                    </p>
                  </div>
                  <div class="inline-flex rounded-full bg-slate-200 p-1 text-xs font-semibold dark:bg-slate-800">
                    <button
                      type="button"
                      class={`min-w-12 rounded-full px-3 py-1.5 transition ${
                        commissionFieldModes[field.key] === 'amount'
                          ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-300'
                          : 'bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                      }`}
                      aria-label={`${field.label} em reais`}
                      aria-pressed={commissionFieldModes[field.key] === 'amount'}
                      on:click={() => switchCommissionFieldMode(field.key, 'amount')}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      class={`min-w-12 rounded-full px-3 py-1.5 transition ${
                        commissionFieldModes[field.key] === 'percentage'
                          ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-300'
                          : 'bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                      }`}
                      aria-label={`${field.label} em percentual`}
                      aria-pressed={commissionFieldModes[field.key] === 'percentage'}
                      on:click={() => switchCommissionFieldMode(field.key, 'percentage')}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  inputmode="decimal"
                  value={commissionForm[field.key]}
                  aria-label={field.label}
                  maxlength={commissionFieldModes[field.key] === 'amount'
                    ? COMMISSION_AMOUNT_MAX_LENGTH
                    : COMMISSION_PERCENT_MAX_LENGTH}
                  on:input={(event) =>
                    commissionFieldModes[field.key] === 'amount'
                      ? handleMoneyInput(field.key, event)
                      : handlePercentageInput(field.key, event)}
                  class="mt-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                />
              </div>
            {/each}
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="outline" on:click={closeEditModal} disabled={savingCommissionData || deletingCommissionData}>
            Fechar
          </Button>
          <Button variant="destructive" on:click={() => selectedTransaction && deleteCommissionData(selectedTransaction)} disabled={savingCommissionData || deletingCommissionData}>
            {#if deletingCommissionData}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Excluir
          </Button>
          <Button className="bg-green-600 text-white hover:bg-green-700" on:click={saveCommissionData} disabled={savingCommissionData || deletingCommissionData}>
            {#if savingCommissionData}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
