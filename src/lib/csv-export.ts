// csv-export.ts - Helper compartido para exportar reportes a CSV desde el cliente.
// Los reportes ya vienen agregados del backend; el CSV se arma en el front.

type CsvCell = string | number | null | undefined;

const BOM = String.fromCharCode(0xfeff); // BOM UTF-8 para que Excel respete acentos

/** Escapa una celda CSV (comillas, comas, saltos de linea). */
function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Construye el contenido CSV (con BOM UTF-8 para Excel) a partir de encabezados
 * y filas. No descarga; util para componer.
 */
export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return BOM + lines.join('\r\n');
}

/** Dispara la descarga de un CSV en el navegador. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Atajo: arma y descarga un CSV. */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: CsvCell[][],
): void {
  downloadCsv(filename, buildCsv(headers, rows));
}

/** Sello de fecha YYYY-MM-DD para nombres de archivo. */
export function csvDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
