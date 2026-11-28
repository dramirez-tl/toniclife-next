// external-settlement.ts - Reglas puras de "Pasar a «Pagada»" las comisiones ya
// depositadas fuera de los lotes de dispersión (Tesorería › Comisiones,
// 28-nov-2026).
//
// El depósito se hizo por fuera y su pago se registró aparte para timbrar el
// recibo; el embudo y el panel del distribuidor siguieron diciendo "Calculada".
// Asentarlas las deja "Pagada" con la fecha del depósito, sin avisos ni
// convenios. Aquí solo se decide qué se le enseña a quien lo va a hacer.

import type { CommissionReceiptRow } from '@/types/commission-receipts';
import type { ExternalSettlementCode, ExternalSettlementResult } from '@/types/external-settlement';

/** ¿Ya cuenta como pagada en el embudo? (undefined = el servidor aún no manda la etapa). */
export const isSettled = (row: Pick<CommissionReceiptRow, 'commissionStatus'>): boolean => row.commissionStatus === 'paid';

export interface SettlementProgress {
  /** ¿El servidor ya informa la etapa de cada comisión? */
  known: boolean;
  /** Con pago registrado. */
  registered: number;
  /** Con pago registrado y ya "Pagada" en el embudo. */
  settled: number;
  /** Con pago registrado y todavía sin pasar a "Pagada". */
  pending: number;
  /** Neto depositado de las pendientes. */
  pendingAmount: number;
}

/** De las comisiones con pago registrado, cuántas ya pasaron a "Pagada" y cuántas faltan. */
export function settlementProgress(rows: readonly CommissionReceiptRow[]): SettlementProgress {
  const paid = rows.filter((r) => r.payment);
  const known = paid.length > 0 && paid.every((r) => typeof r.commissionStatus === 'string');
  if (!known) return { known: false, registered: paid.length, settled: 0, pending: 0, pendingAmount: 0 };
  const pendingRows = paid.filter((r) => !isSettled(r));
  const cents = pendingRows.reduce((acc, r) => acc + Math.round((r.payment?.total ?? 0) * 100), 0);
  return {
    known: true,
    registered: paid.length,
    settled: paid.length - pendingRows.length,
    pending: pendingRows.length,
    pendingAmount: cents / 100,
  };
}

/** Motivos por los que una comisión con pago registrado no se asienta, en palabras de Tesorería. */
export const SETTLEMENT_SKIP_LABEL: Record<Exclude<ExternalSettlementCode, 'ok' | 'already_paid'>, string> = {
  amount_mismatch: 'el importe ya no coincide con lo depositado (se recalculó o se ajustó después)',
  in_dispersion: 'ya está aprobada o dentro de un lote de dispersión',
  cancelled: 'la comisión está cancelada',
  currency: 'no está en pesos',
  not_positive: 'el importe depositado no es mayor a cero',
};

export interface SkippedGroup {
  code: ExternalSettlementCode;
  count: number;
  label: string;
  /** Números de distribuidor (los que mandó el servidor; puede venir recortado). */
  customerNumbers: string[];
}

/** Las que NO se asientan, agrupadas por motivo, de más a menos. */
export function skippedGroups(result: ExternalSettlementResult): SkippedGroup[] {
  return (Object.entries(result.skippedByCode) as Array<[ExternalSettlementCode, number | undefined]>)
    .filter(([code, count]) => code !== 'ok' && code !== 'already_paid' && (count ?? 0) > 0)
    .map(([code, count]) => ({
      code,
      count: count ?? 0,
      label: SETTLEMENT_SKIP_LABEL[code as keyof typeof SETTLEMENT_SKIP_LABEL] ?? 'no cumple las condiciones',
      customerNumbers: result.skipped
        .filter((s) => s.code === code && s.customerNumber)
        .map((s) => s.customerNumber as string),
    }))
    .sort((a, b) => b.count - a.count);
}

export const skippedTotal = (result: ExternalSettlementResult): number => skippedGroups(result).reduce((acc, g) => acc + g.count, 0);

export interface SettlementNotice {
  tone: 'success' | 'warning' | 'info';
  text: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Lo que se le dice a quien acaba de asentar. */
export function settlementNotice(result: ExternalSettlementResult, format: (n: number) => string = String): SettlementNotice {
  const skipped = skippedTotal(result);
  if (result.settled === 0) {
    return { tone: 'info', text: 'No había comisiones por pasar a «Pagada».' };
  }
  const base = `${format(result.settled)} ${plural(result.settled, 'comisión quedó', 'comisiones quedaron')} como «Pagada» con la fecha de su depósito.`;
  if (skipped > 0) {
    return {
      tone: 'warning',
      text: `${base} ${format(skipped)} ${plural(skipped, 'no se pasó', 'no se pasaron')}: revisa el motivo en la lista.`,
    };
  }
  return { tone: 'success', text: base };
}
