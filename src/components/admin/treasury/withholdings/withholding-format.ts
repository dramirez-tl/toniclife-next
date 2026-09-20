// withholding-format.ts — Etiquetas y formato de convenios de retención.
//
// Sumas SIEMPRE por moneda (contrato §1.4). Las advertencias y los motivos de
// tope vienen de withholding-cap.lib (API) y aquí solo se traducen.

import type {
  AmountByCurrency,
  Money,
  WithholdingCapReason,
  WithholdingConcept,
  WithholdingEvent,
  WithholdingPreviewWarning,
  WithholdingStatus,
} from '@/types/treasury';
import type { BadgeTone } from '../treasury-format';
import { toNumber } from '../treasury-format';

export const WITHHOLDING_STATUS_LABELS: Record<WithholdingStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  settled: 'Liquidado',
  cancelled: 'Cancelado',
};

export const WITHHOLDING_STATUS_TONES: Record<WithholdingStatus, BadgeTone> = {
  active: 'success',
  paused: 'warning',
  settled: 'info',
  cancelled: 'outline',
};

export const WITHHOLDING_CONCEPT_LABELS: Record<WithholdingConcept, string> = {
  loan: 'Préstamo',
  other: 'Otro concepto',
};

export function withholdingStatusLabel(status: string): string {
  return (WITHHOLDING_STATUS_LABELS as Record<string, string>)[status] ?? status;
}

export function withholdingConceptLabel(concept: string | null | undefined): string {
  if (!concept) return '—';
  return (WITHHOLDING_CONCEPT_LABELS as Record<string, string>)[concept] ?? concept;
}

/** Motivo por el que el abono de un convenio quedó limitado en la fila. */
export const CAP_REASON_LABELS: Record<string, string> = {
  installment: 'abono completo',
  agreement_cap: 'tope del convenio (% del neto)',
  global_cap: 'tope global del periodo (sobre el remanente)',
  remaining: 'neto restante de la fila',
  balance: 'saldo pendiente',
};

export function capReasonLabel(reason: WithholdingCapReason | null | undefined): string | null {
  if (!reason) return null;
  return CAP_REASON_LABELS[reason] ?? reason;
}

export const WITHHOLDING_EVENT_LABELS: Record<string, string> = {
  created: 'Convenio creado',
  updated: 'Convenio editado',
  paused: 'Pausado',
  reactivated: 'Reactivado',
  cancelled: 'Cancelado',
  settled: 'Liquidado',
  note: 'Nota agregada',
  attachment: 'Pagaré adjuntado',
  applied: 'Abono aplicado',
};

export function withholdingEventLabel(event: WithholdingEvent['event']): string {
  return WITHHOLDING_EVENT_LABELS[event] ?? event;
}

export function previewWarningText(warning: string | WithholdingPreviewWarning): string {
  const code = typeof warning === 'string' ? warning : warning.code;
  const detail = typeof warning === 'string' ? null : warning.detail;
  const base =
    code === 'NO_RATE'
      ? 'Convenio sin tipo de cambio del periodo: no se retiene (fail-closed)'
      : code;
  return detail ? `${base} · ${detail}` : base;
}

/** `Record<moneda, importe>` o `[{currency, amount}]` → arreglo ordenado (MXN primero). */
export function normalizeAmountsByCurrency(
  input: Record<string, Money> | AmountByCurrency[] | null | undefined,
): AmountByCurrency[] {
  const list: AmountByCurrency[] = Array.isArray(input)
    ? input.map((x) => ({ currency: x.currency, amount: toNumber(x.amount) }))
    : Object.entries(input ?? {}).map(([currency, amount]) => ({ currency, amount: toNumber(amount) }));
  return list.sort((a, b) => {
    if (a.currency === 'MXN') return -1;
    if (b.currency === 'MXN') return 1;
    return a.currency.localeCompare(b.currency);
  });
}

/** Porcentaje de avance del préstamo (0-100) o null sin total. */
export function loanProgressPct(total: Money | null | undefined, balance: Money | null | undefined): number | null {
  const t = toNumber(total);
  if (t <= 0 || balance === null || balance === undefined) return null;
  const b = toNumber(balance);
  return Math.max(0, Math.min(100, Math.round(((t - b) / t) * 100)));
}

/** Notas append-only: el API guarda `[fecha · Nombre] texto` por línea. */
export function splitNotes(notes: string | null | undefined): string[] {
  if (!notes) return [];
  return notes
    .split(/\r?\n(?=\[)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Nombre de archivo del export de convenios (sin datos personales). */
export function withholdingExportFilename(suffix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `retenciones-${suffix}-${stamp}.csv`;
}
