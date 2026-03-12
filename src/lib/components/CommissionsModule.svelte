<script lang="ts">
  import { onMount } from 'svelte';
  import { Download, Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import { formatCurrencyInput, parseCurrency } from '$lib/components/create-property-helpers';

  type FinalizeSplitMode = 'amount' | 'percentage';

  type CommissionsSummary = {
    totalVGV: number;
    totalCaptadores: number;
    totalVendedores: number;
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
  let commissionSplitMode: FinalizeSplitMode = 'amount';
  let isMobileLayout = false;
  let commissionForm = {
    valorVenda: '',
    comissaoCaptador: '',
    comissaoVendedor: '',
    taxaPlataforma: '',
  };
  let summary: CommissionsSummary = {
    totalVGV: 0,
    totalCaptadores: 0,
    totalVendedores: 0,
    totalPlataforma: 0,
  };

  const yearOptions = Array.from(
    { length: 8 },
    (_item, index) => currentYear - 4 + index
  );

  const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return 0;
    return Number(numeric.toFixed(2));
  }

  function formatCurrency(value: number): string {
    return brlFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function syncIsMobileLayout() {
    if (typeof window === 'undefined') return;
    isMobileLayout = window.innerWidth < 768;
  }

  function readCommissionValue(value: unknown): string {
    const numeric = toNumber(value);
    if (numeric <= 0) return '';
    return formatCurrencyInput(String(Math.round(numeric * 100)));
  }

  function formatDate(value?: string | null): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  }

  function propertyLabel(item: CommissionsTransaction): string {
    const title = String(item.propertyTitle ?? '').trim();
    const code = String(item.propertyCode ?? '').trim();
    if (code && title) return `${code} - ${title}`;
    if (title) return title;
    if (code) return code;
    return `Imóvel #${item.propertyId}`;
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

  function requiresExactSaleSplit(item: CommissionsTransaction | null): boolean {
    const purpose = String(item?.propertyPurpose ?? '').trim().toLowerCase();
    const isRentalOnly = purpose.includes('alug') && !purpose.includes('venda');
    return !isRentalOnly;
  }

  function parseMoney(value: string): number | null {
    const parsed = parseCurrency(value);
    if (parsed == null || !Number.isFinite(parsed)) return null;
    return Number(parsed.toFixed(2));
  }

  function sanitizePercentageInput(raw: string): string {
    const normalized = String(raw ?? '').replace(/[^\d.,]/g, '').replace(/\./g, ',');
    const [integerPart, ...rest] = normalized.split(',');
    const integer = integerPart.replace(/^0+(?=\d)/, '');
    const decimal = rest.join('').slice(0, 2);
    if (!integer && !decimal) {
      return '';
    }
    const composed = decimal ? `${integer || '0'},${decimal}` : integer || '0';
    const parsed = Number(composed.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      return '';
    }
    const bounded = Math.min(100, Math.max(0, parsed));
    return bounded.toLocaleString('pt-BR', {
      minimumFractionDigits: bounded % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  function parsePercentage(value: string): number | null {
    const normalized = String(value ?? '').replace('%', '').replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
    return Number(parsed.toFixed(2));
  }

  function convertAmountFieldToPercentage(rawAmount: string, saleValue: number | null): string {
    if (saleValue == null || saleValue <= 0) return '';
    const amount = parseMoney(rawAmount);
    if (amount == null) return '';
    const percentage = Number(((amount / saleValue) * 100).toFixed(2));
    return percentage.toLocaleString('pt-BR', {
      minimumFractionDigits: percentage % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  function convertPercentageFieldToAmount(rawPercentage: string, saleValue: number | null): string {
    if (saleValue == null || saleValue <= 0) return '';
    const percentage = parsePercentage(rawPercentage);
    if (percentage == null) return '';
    const amount = Number(((saleValue * percentage) / 100).toFixed(2));
    return formatCurrencyInput(String(Math.round(amount * 100)));
  }

  function handleMoneyInput(
    field: keyof typeof commissionForm,
    event: Event
  ) {
    const target = event.currentTarget as HTMLInputElement;
    commissionForm = {
      ...commissionForm,
      [field]: formatCurrencyInput(target.value),
    };
  }

  function handlePercentageInput(
    field: keyof typeof commissionForm,
    event: Event
  ) {
    const target = event.currentTarget as HTMLInputElement;
    commissionForm = {
      ...commissionForm,
      [field]: sanitizePercentageInput(target.value),
    };
  }

  function switchCommissionSplitMode(mode: FinalizeSplitMode) {
    if (mode === commissionSplitMode) return;
    const saleValue = parseMoney(commissionForm.valorVenda);
    if (mode === 'percentage') {
      commissionForm = {
        ...commissionForm,
        comissaoCaptador: convertAmountFieldToPercentage(commissionForm.comissaoCaptador, saleValue),
        comissaoVendedor: convertAmountFieldToPercentage(commissionForm.comissaoVendedor, saleValue),
        taxaPlataforma: convertAmountFieldToPercentage(commissionForm.taxaPlataforma, saleValue),
      };
    } else {
      commissionForm = {
        ...commissionForm,
        comissaoCaptador: convertPercentageFieldToAmount(commissionForm.comissaoCaptador, saleValue),
        comissaoVendedor: convertPercentageFieldToAmount(commissionForm.comissaoVendedor, saleValue),
        taxaPlataforma: convertPercentageFieldToAmount(commissionForm.taxaPlataforma, saleValue),
      };
    }
    commissionSplitMode = mode;
  }

  function resolveCommissionAmounts() {
    const valorVenda = parseMoney(commissionForm.valorVenda);
    if (valorVenda == null) return null;

    if (commissionSplitMode === 'amount') {
      const comissaoCaptador = parseMoney(commissionForm.comissaoCaptador);
      const comissaoVendedor = parseMoney(commissionForm.comissaoVendedor);
      const taxaPlataforma = parseMoney(commissionForm.taxaPlataforma);
      if (
        comissaoCaptador == null ||
        comissaoVendedor == null ||
        taxaPlataforma == null
      ) {
        return null;
      }
      return {
        valorVenda,
        comissaoCaptador,
        comissaoVendedor,
        taxaPlataforma,
      };
    }

    const percentualCaptador = parsePercentage(commissionForm.comissaoCaptador);
    const percentualVendedor = parsePercentage(commissionForm.comissaoVendedor);
    const percentualPlataforma = parsePercentage(commissionForm.taxaPlataforma);
    if (
      percentualCaptador == null ||
      percentualVendedor == null ||
      percentualPlataforma == null
    ) {
      return null;
    }

    return {
      valorVenda,
      comissaoCaptador: Number(((valorVenda * percentualCaptador) / 100).toFixed(2)),
      comissaoVendedor: Number(((valorVenda * percentualVendedor) / 100).toFixed(2)),
      taxaPlataforma: Number(((valorVenda * percentualPlataforma) / 100).toFixed(2)),
    };
  }

  function hasExactSaleSplit(values: NonNullable<ReturnType<typeof resolveCommissionAmounts>>) {
    const total = Number(
      (
        values.comissaoCaptador +
        values.comissaoVendedor +
        values.taxaPlataforma
      ).toFixed(2)
    );
    return Math.abs(total - values.valorVenda) <= 0.01;
  }

  function openEditModal(item: CommissionsTransaction) {
    selectedTransaction = item;
    editModalOpen = true;
    savingCommissionData = false;
    deletingCommissionData = false;
    commissionSplitMode = 'amount';
    commissionForm = {
      valorVenda: readCommissionValue(item.commissionData?.valorVenda),
      comissaoCaptador: readCommissionValue(item.commissionData?.comissaoCaptador),
      comissaoVendedor: readCommissionValue(item.commissionData?.comissaoVendedor),
      taxaPlataforma: readCommissionValue(item.commissionData?.taxaPlataforma),
    };
  }

  function closeEditModal() {
    if (savingCommissionData || deletingCommissionData) return;
    editModalOpen = false;
    selectedTransaction = null;
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
        commissionSplitMode === 'percentage'
          ? 'Na venda, a soma dos percentuais precisa fechar exatamente 100% do valor.'
          : 'Na venda, a soma dos valores precisa fechar exatamente 100% do valor.'
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
      'Vendedor',
      'Comissao Vendedor',
      'Receita Encontre Aqui',
    ];

    const rows = transactions.map((item) => {
      const captador = String(item.capturingBrokerName ?? '').trim() || '-';
      const vendedor = String(item.sellingBrokerName ?? '').trim() || '-';
      return [
        formatDate(item.finalizedAt),
        propertyLabel(item),
        numberCsv(item.commissionData?.valorVenda),
        captador,
        numberCsv(item.commissionData?.comissaoCaptador),
        vendedor,
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
        totalVendedores: toNumber(summaryPayload.totalVendedores),
        totalPlataforma: toNumber(summaryPayload.totalPlataforma),
      };
      transactions = list;
    } catch (fetchError) {
      console.error('Erro ao carregar comissões:', fetchError);
      error = 'Não foi possível carregar os dados de comissões.';
      transactions = [];
      summary = {
        totalVGV: 0,
        totalCaptadores: 0,
        totalVendedores: 0,
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
      <p class="text-xs font-semibold uppercase text-violet-700 dark:text-violet-300">Repasse Vendedores</p>
      <p class="mt-2 text-2xl font-bold text-violet-900 dark:text-violet-100">
        {formatCurrency(summary.totalVendedores)}
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
              <dt>Vendedor</dt>
              <dd class="text-right">{formatCurrency(toNumber(item.commissionData?.comissaoVendedor))}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Plataforma</dt>
              <dd class="text-right">{formatCurrency(toNumber(item.commissionData?.taxaPlataforma))}</dd>
            </div>
          </dl>
          <div class="mt-4 flex flex-col gap-2">
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
            Comissão Vendedor
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
                {propertyLabel(item)}
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
      <div class="mb-4">
        <h3 id="commission-edit-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Editar VGV
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {propertyLabel(selectedTransaction)}
        </p>
      </div>

      <div class="space-y-4">
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
              Comissões em:
            </span>
            <button
              type="button"
              class={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                commissionSplitMode === 'amount'
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
              on:click={() => switchCommissionSplitMode('amount')}
            >
              Valor real (R$)
            </button>
            <button
              type="button"
              class={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                commissionSplitMode === 'percentage'
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
              on:click={() => switchCommissionSplitMode('percentage')}
            >
              Percentual (%)
            </button>
          </div>
          {#if commissionSplitMode === 'percentage'}
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Os percentuais abaixo serão calculados sobre o valor de venda/locação.
            </p>
          {/if}
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Valor de Venda/Locação (R$)
              <input
                type="text"
                inputmode="decimal"
                value={commissionForm.valorVenda}
                on:input={(event) => handleMoneyInput('valorVenda', event)}
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Comissão Captador {commissionSplitMode === 'amount' ? '(R$)' : '(%)'}
              <input
                type="text"
                inputmode="decimal"
                value={commissionForm.comissaoCaptador}
                on:input={(event) =>
                  commissionSplitMode === 'amount'
                    ? handleMoneyInput('comissaoCaptador', event)
                    : handlePercentageInput('comissaoCaptador', event)}
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Comissão Vendedor {commissionSplitMode === 'amount' ? '(R$)' : '(%)'}
              <input
                type="text"
                inputmode="decimal"
                value={commissionForm.comissaoVendedor}
                on:input={(event) =>
                  commissionSplitMode === 'amount'
                    ? handleMoneyInput('comissaoVendedor', event)
                    : handlePercentageInput('comissaoVendedor', event)}
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Taxa Encontre Aqui {commissionSplitMode === 'amount' ? '(R$)' : '(%)'}
              <input
                type="text"
                inputmode="decimal"
                value={commissionForm.taxaPlataforma}
                on:input={(event) =>
                  commissionSplitMode === 'amount'
                    ? handleMoneyInput('taxaPlataforma', event)
                    : handlePercentageInput('taxaPlataforma', event)}
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
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
