// treasury-format.ts — Formato y etiquetas compartidas de Tesorería.
//
// Resúmenes SIEMPRE por moneda (contrato §1.4): nunca se suma MXN con USD.
// Las fechas 'YYYY-MM-DD' se parsean como locales para evitar el corrimiento
// de un día del DATE serializado a medianoche UTC.

import type {
  BlockerCount,
  CommissionStage,
  Money,
  ReadinessBlocker,
  SummaryByCurrency,
  TimelineEvent,
} from '@/types/treasury';
import type { CommissionRow } from '@/types/treasury';
import { readinessBlockerLabel } from './treasury-error';

const nf = new Intl.NumberFormat('es-MX');

export function toNumber(value: Money | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function formatInt(value: number | null | undefined): string {
  return nf.format(value ?? 0);
}

/**
 * Formatea un importe EN SU MONEDA (Intl con fallback si el código no es ISO,
 * p. ej. filas migradas con 'CO ' o 'GUA').
 */
export function formatMoney(amount: Money | null | undefined, currency?: string | null): string {
  const value = toNumber(amount);
  const code = (currency || 'MXN').trim().toUpperCase();
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: code }).format(value);
  } catch {
    return `${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(value)} ${code}`;
  }
}

/** Porcentaje a partir de una tasa (0.16 → "16 %"; 16 → "16 %"). */
export function formatRate(rate: Money | null | undefined): string {
  if (rate === null || rate === undefined || rate === '') return '—';
  const n = toNumber(rate);
  const pct = n <= 1 ? n * 100 : n;
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(pct)} %`;
}

/** 'YYYY-MM-DD' (o ISO) → "19 sep 2026", parseando la fecha como LOCAL. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** ISO con hora → "19 sep 2026, 14:03". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDateOnly(value);
  return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Rango 26→25 del periodo: "26 ago 2026 — 25 sep 2026". */
export function formatPeriodRange(
  period: { startDate?: string | null; endDate?: string | null } | null | undefined,
): string | null {
  if (!period?.startDate || !period?.endDate) return null;
  return `${formatDateOnly(period.startDate)} — ${formatDateOnly(period.endDate)}`;
}

/** 'YYYY-MM-DD' de hoy en la zona de negocio (CDMX). */
export function todayCdmx(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}

// ── Etapas ────────────────────────────────────────────────────────────────

export const STAGE_LABELS: Record<CommissionStage, string> = {
  estimated: 'Estimada',
  calculated: 'Calculada',
  ready: 'Lista para aprobar',
  approved: 'Aprobada',
  in_dispersion: 'En dispersión',
  paid: 'Pagada',
  reconciled: 'Conciliada',
  cancelled: 'Cancelada',
};

export type BadgeTone =
  | 'default'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'destructive'
  | 'outline';

export const STAGE_TONES: Record<CommissionStage, BadgeTone> = {
  estimated: 'outline',
  calculated: 'secondary',
  ready: 'warning',
  approved: 'info',
  in_dispersion: 'info',
  paid: 'success',
  reconciled: 'success',
  cancelled: 'destructive',
};

/** Orden del embudo (sin cancelled). */
export const STAGE_FUNNEL: readonly CommissionStage[] = [
  'calculated',
  'ready',
  'approved',
  'in_dispersion',
  'paid',
  'reconciled',
];

export const COMMISSION_TYPE_LABELS: Record<string, string> = {
  mlm: 'MLM',
  cedea_bonus: 'CEDEA',
  auto_bonus: 'Auto bono',
  adjustment: 'Ajuste',
};

export const TIMELINE_EVENT_LABELS: Record<string, string> = {
  calculated: 'Calculada',
  approved: 'Aprobada',
  batched: 'Incluida en lote',
  paid: 'Pagada',
  failed: 'Rechazada por el banco',
  reconciled: 'Conciliada',
  cancelled: 'Cancelada',
  restored: 'Restaurada',
};

export function timelineEventLabel(event: TimelineEvent): string {
  return TIMELINE_EVENT_LABELS[event] ?? event;
}

/** Nombre del actor de la línea de tiempo (string, `{name}` o sistema). */
export function actorName(actor: string | { name?: string | null } | null | undefined): string {
  if (!actor) return 'Sistema';
  if (typeof actor === 'string') return actor || 'Sistema';
  return actor.name || 'Sistema';
}

export function blockerCode(blocker: ReadinessBlocker): string {
  return typeof blocker === 'string' ? blocker : blocker.code;
}

export function blockerLabels(blockers: ReadinessBlocker[] | null | undefined): string[] {
  return (blockers ?? []).map((b) => readinessBlockerLabel(b));
}

export function blockerCountLabel(b: BlockerCount): string {
  return `${readinessBlockerLabel(b.code)}: ${formatInt(b.count)}`;
}

// ── Sumas por moneda (nunca mezcladas) ────────────────────────────────────

export interface CurrencyTotal {
  currency: string;
  rows: number;
  net: number;
  toDisperse: number;
}

/** Σ por moneda de un conjunto de filas (para ConfirmDialog de alcance real). */
export function sumRowsByCurrency(rows: CommissionRow[]): CurrencyTotal[] {
  const map = new Map<string, CurrencyTotal>();
  for (const row of rows) {
    const currency = (row.currencyCode || 'MXN').trim().toUpperCase();
    const entry = map.get(currency) ?? { currency, rows: 0, net: 0, toDisperse: 0 };
    const net = toNumber(row.totalAmount);
    const withheld = toNumber(row.companyWithholding?.amount);
    entry.rows += 1;
    entry.net += net;
    entry.toDisperse += Math.max(0, net - withheld);
    map.set(currency, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}

export function currencyTotalsText(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return '—';
  return totals.map((t) => formatMoney(t.net, t.currency)).join(' + ');
}

/** Orden estable de monedas: MXN primero, luego alfabético. */
export function sortByCurrency<T extends { currency: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.currency === 'MXN') return -1;
    if (b.currency === 'MXN') return 1;
    return a.currency.localeCompare(b.currency);
  });
}

export function findCurrency(
  byCurrency: SummaryByCurrency[] | null | undefined,
  currency: string,
): SummaryByCurrency | undefined {
  return (byCurrency ?? []).find((c) => c.currency === currency);
}

/** Quita saltos de línea y neutraliza fórmulas (CWE-1236) en texto de usuario. */
export function csvSafe(v: string | number | null | undefined): string {
  const s = (v ?? '').toString().replace(/[\r\n\t]/g, ' ');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

/** Nombre de archivo del header `Content-Disposition`, o el propuesto. */
export function filenameFromDisposition(
  disposition: string | null | undefined,
  fallback: string,
): string {
  if (!disposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return fallback;
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] ?? fallback;
}
