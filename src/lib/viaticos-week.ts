// viaticos-week.ts - Semanas de viáticos (lunes a domingo, como el sistema
// anterior). Todo en fechas 'YYYY-MM-DD' con aritmética UTC: sin desfaces por
// zona horaria.

const DAY_MS = 86_400_000;
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Fecha local de hoy (navegador) como 'YYYY-MM-DD'. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysIso(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * DAY_MS);
}

/** Días entre dos fechas (b - a). */
export function diffDaysIso(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** Lunes de la semana de `iso`. */
export function mondayOf(iso: string): string {
  const dow = new Date(toUtc(iso)).getUTCDay(); // 0 = domingo
  return addDaysIso(iso, dow === 0 ? -6 : 1 - dow);
}

/** Las fechas de un periodo, ambos extremos incluidos. */
export function daysOfRange(start: string, end: string): string[] {
  const n = Math.max(0, diffDaysIso(start, end)) + 1;
  return Array.from({ length: n }, (_, i) => addDaysIso(start, i));
}

export function weekDays(monday: string): string[] {
  return daysOfRange(monday, addDaysIso(monday, 6));
}

/** "Lun" + "13" para encabezados de columna. */
export function dayHeader(iso: string): { weekday: string; day: string; month: string } {
  const d = new Date(toUtc(iso));
  return {
    weekday: WEEKDAYS_SHORT[d.getUTCDay()],
    day: String(d.getUTCDate()),
    month: MONTHS_SHORT[d.getUTCMonth()],
  };
}

/** "13 – 19 oct 2026" (o "27 oct – 2 nov 2026" si cruza de mes). */
export function rangeLabel(start: string, end: string): string {
  const a = new Date(toUtc(start));
  const b = new Date(toUtc(end));
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const left = sameMonth ? `${a.getUTCDate()}` : `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]}`;
  return `${left} – ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

export function weekLabel(monday: string): string {
  return rangeLabel(monday, addDaysIso(monday, 6));
}
