/**
 * Exporta um array de dados para um arquivo CSV.
 * @param data O array de objetos a ser exportado.
 * @param fileName O nome do arquivo (ex: 'imoveis.csv').
 */
export function exportToCsv(data: any[], fileName: string) {
  if (!data || data.length === 0) {
    console.warn('Nenhum dado para exportar.');
    return;
  }

  const headers = Array.from(
    new Set(data.flatMap((item) => Object.keys(item ?? {}))),
  );

  const escapeCell = (value: unknown) => {
    const normalized = value == null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const rows = [
    headers.map((header) => escapeCell(header)).join(';'),
    ...data.map((item) =>
      headers.map((header) => escapeCell(item?.[header])).join(';'),
    ),
  ];

  const csvContent = `\uFEFF${rows.join('\n')}`;
  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
