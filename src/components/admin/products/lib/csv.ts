// csv.ts — CSV seguro para Excel: celdas entre comillas y fórmulas neutralizadas
// (patrón de los formularios públicos: una celda que empieza con = + - @ TAB o CR
// se antepone con apóstrofo para que la hoja de cálculo no la ejecute).

export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '""';
  let text = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  // BOM para que Excel respete UTF-8.
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(csv: string, fileName: string): void {
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), fileName);
}

/** Fecha local YYYY-MM-DD solo para NOMBRES de archivo (no es fecha de negocio). */
export function fileDateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
