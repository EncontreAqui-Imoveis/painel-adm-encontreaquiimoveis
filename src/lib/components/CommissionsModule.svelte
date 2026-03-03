<script lang="ts">
  import { onMount } from 'svelte';
  import { Download, Loader2 } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';

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
    await fetchCommissions();
  });
</script>

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
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if loading}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando dados de comissões...
            </td>
          </tr>
        {:else if error}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </td>
          </tr>
        {:else if transactions.length === 0}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
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
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
