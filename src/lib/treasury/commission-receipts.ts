// commission-receipts.ts - Reglas puras (sin red ni React) de la vista "Pagos y
// recibos" de Tesorería › Comisiones: en qué situación está cada pago, qué se
// puede timbrar, cómo se filtra y qué se le dice a quien timbra.
//
// Contexto (26-nov-2026): las comisiones de asimilados se depositaron FUERA de
// los lotes de dispersión y su pago se registró aparte para poder emitir el
// recibo de nómina. Por eso en el embudo siguen como "Calculada": la etapa del
// flujo de dispersión no cambia; aquí se ve lo que de verdad pasó con cada una.

import { matchesSearch } from '@/lib/treasury/payroll-receiver';
import type {
  CommissionReceiptRow,
  CommissionReceiptStampResult,
  CommissionReceiptsList,
} from '@/types/commission-receipts';

/** Situación del recibo de una comisión. */
export type ReceiptBucket =
  /** Recibo timbrado. */
  | 'stamped'
  /** El timbrado está en curso. */
  | 'in_progress'
  /** El SAT o el PAC rechazó el último intento. */
  | 'rejected'
  /** Pagada, pero al distribuidor le faltan datos para timbrar. */
  | 'missing_data'
  /** Pagada y con datos completos: lista para timbrar. */
  | 'ready'
  /** Sin pago registrado. */
  | 'unpaid';

export function receiptBucket(row: CommissionReceiptRow): ReceiptBucket {
  if (!row.payment || !row.voucher) return 'unpaid';
  const v = row.voucher;
  if (v.status === 'stamped') return 'stamped';
  if (v.status === 'in_progress') return 'in_progress';
  if (v.status === 'error') return 'rejected';
  if (v.issues.length > 0) return 'missing_data';
  return 'ready';
}

/** ¿Se puede mandar a timbrar ahora? Pagada, sin recibo vivo y con los datos completos. */
export function canStampReceipt(row: CommissionReceiptRow): boolean {
  const bucket = receiptBucket(row);
  return (bucket === 'ready' || bucket === 'rejected') && (row.voucher?.issues.length ?? 0) === 0;
}

/** "Timbrar" la primera vez; "Reintentar" después de un rechazo. */
export const stampLabel = (row: CommissionReceiptRow): string => (receiptBucket(row) === 'rejected' ? 'Reintentar' : 'Timbrar');

// ---------------- Filtros (viven en la URL: ?recibo=) ----------------

export const RECEIPT_FILTERS = ['todas', 'con_recibo', 'listas', 'faltan_datos', 'rechazadas', 'sin_pago'] as const;
export type ReceiptFilter = (typeof RECEIPT_FILTERS)[number];

export const RECEIPT_FILTER_LABEL: Record<ReceiptFilter, string> = {
  todas: 'Todas',
  con_recibo: 'Con recibo',
  listas: 'Listas para timbrar',
  faltan_datos: 'Faltan datos',
  rechazadas: 'Rechazó el SAT',
  sin_pago: 'Sin pago registrado',
};

export const isReceiptFilter = (value: string): value is ReceiptFilter => (RECEIPT_FILTERS as readonly string[]).includes(value);

const FILTER_BUCKETS: Record<Exclude<ReceiptFilter, 'todas'>, ReceiptBucket> = {
  con_recibo: 'stamped',
  listas: 'ready',
  faltan_datos: 'missing_data',
  rechazadas: 'rejected',
  sin_pago: 'unpaid',
};

export function matchesReceiptFilter(row: CommissionReceiptRow, filter: ReceiptFilter): boolean {
  return filter === 'todas' || receiptBucket(row) === FILTER_BUCKETS[filter];
}

/** Por número o nombre del distribuidor, referencia del pago o folio fiscal del recibo. */
export function receiptRowMatches(query: string, row: CommissionReceiptRow): boolean {
  return matchesSearch(query, [row.customerNumber, row.customerName, row.payment?.reference, row.voucher?.uuid]);
}

export type ReceiptCounts = Record<ReceiptFilter, number> & {
  /** Con pago registrado (con o sin recibo). */
  pagadas: number;
  /** Timbrándose en este momento. */
  en_proceso: number;
};

export function receiptCounts(rows: readonly CommissionReceiptRow[]): ReceiptCounts {
  const counts: ReceiptCounts = {
    todas: rows.length,
    con_recibo: 0,
    listas: 0,
    faltan_datos: 0,
    rechazadas: 0,
    sin_pago: 0,
    pagadas: 0,
    en_proceso: 0,
  };
  for (const row of rows) {
    const bucket = receiptBucket(row);
    if (bucket !== 'unpaid') counts.pagadas++;
    if (bucket === 'stamped') counts.con_recibo++;
    else if (bucket === 'ready') counts.listas++;
    else if (bucket === 'missing_data') counts.faltan_datos++;
    else if (bucket === 'rejected') counts.rechazadas++;
    else if (bucket === 'in_progress') counts.en_proceso++;
    else counts.sin_pago++;
  }
  return counts;
}

/** Importes que se enseñan: los congelados del pago si ya se registró; si no, los calculados. */
export function receiptAmounts(row: CommissionReceiptRow): { subtotal: number; isr: number; total: number } {
  return row.payment
    ? { subtotal: row.payment.subtotal, isr: row.payment.isr, total: row.payment.total }
    : { subtotal: row.subtotal, isr: row.isr, total: row.total };
}

// ---------------- Timbrado ----------------

/** ¿El intento dejó el recibo timbrado? */
export const stampSucceeded = (result: CommissionReceiptStampResult): boolean => result.status === 'stamped' || result.status === 'sent';

/** Aviso tras un intento de timbrado. */
export function stampNotice(who: string, result: CommissionReceiptStampResult): { tone: 'success' | 'error' | 'info'; text: string } {
  if (stampSucceeded(result)) return { tone: 'success', text: `Recibo de nómina timbrado para ${who}.` };
  if (result.status === 'error') {
    return { tone: 'error', text: `El SAT rechazó el recibo de ${who}: ${result.error ?? 'sin detalle'}` };
  }
  return { tone: 'info', text: `El recibo de ${who} quedó en proceso (${result.status}); actualiza en unos segundos.` };
}

/** La lista con el resultado de un intento ya aplicado al renglón de ese pago (sin esperar a recargarla). */
export function applyStampResult(
  list: CommissionReceiptsList | undefined,
  paymentId: string,
  result: CommissionReceiptStampResult,
): CommissionReceiptsList | undefined {
  if (!list) return list;
  let touched = false;
  const rows = list.rows.map((row) => {
    if (row.payment?.id !== paymentId || !row.voucher) return row;
    touched = true;
    const ok = stampSucceeded(result);
    return {
      ...row,
      voucher: {
        ...row.voucher,
        status: ok ? ('stamped' as const) : result.status === 'error' ? ('error' as const) : ('in_progress' as const),
        invoiceId: result.invoiceId,
        uuid: result.uuid ?? row.voucher.uuid,
        error: ok ? null : (result.error ?? row.voucher.error),
        issues: ok ? [] : row.voucher.issues,
      },
    };
  });
  return touched ? { ...list, rows } : list;
}

/** Tras tantos rechazos seguidos se detiene la tanda: suele ser un problema general, no de cada distribuidor. */
export const MAX_CONSECUTIVE_REJECTIONS = 3;

export interface StampBatchOutcome {
  ok: number;
  failed: number;
  /** Los que ya no se intentaron porque la tanda se detuvo. */
  pending: number;
  stoppedEarly: boolean;
}

export function stampBatchSummary(o: StampBatchOutcome): { tone: 'success' | 'warning' | 'error'; text: string } {
  const done = `${o.ok} ${o.ok === 1 ? 'recibo timbrado' : 'recibos timbrados'}`;
  if (o.failed === 0) return { tone: 'success', text: `${done}.` };
  const failed = `${o.failed} ${o.failed === 1 ? 'rechazado' : 'rechazados'}`;
  if (o.stoppedEarly) {
    return {
      tone: 'error',
      text: `Se detuvo tras ${MAX_CONSECUTIVE_REJECTIONS} rechazos seguidos: ${done}, ${failed} y ${o.pending} sin intentar. Revisa el motivo antes de seguir.`,
    };
  }
  return { tone: 'warning', text: `${done} y ${failed}. Corrige los datos de los rechazados y vuelve a intentar.` };
}
