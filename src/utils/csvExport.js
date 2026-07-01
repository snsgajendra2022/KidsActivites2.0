/** @param {string} filename @param {Record<string, unknown>[]} rows @param {{ key?: string, label: string, render?: (row: Record<string, unknown>) => string }[]} columns */
export function downloadCsv(filename, rows, columns) {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => {
    const val = c.render ? c.render(row) : row[c.key];
    return escape(val);
  }).join(',')).join('\n');

  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
