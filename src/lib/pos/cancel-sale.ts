// cancel-sale.ts - Reglas puras (sin red ni React) de la cancelación de una
// venta de caja desde el admin: quién ve el botón, qué ventas se pueden
// cancelar, cuándo el motivo alcanza y cómo se cuenta el resultado. El API
// (PATCH /pos/sales/:id/cancel, permiso pos:manage) vuelve a validar todo.

export const CANCEL_SALE_PERMISSION = 'pos:manage';
export const CANCEL_REASON_MIN = 10;
export const CANCEL_REASON_MAX = 500;

export type CfdiCancelMotive = '01' | '02' | '03' | '04';

/** Motivos SAT para cancelar la factura de la venta (el 03 es el de siempre). */
export const CFDI_CANCEL_MOTIVES: { value: CfdiCancelMotive; label: string }[] = [
  { value: '03', label: '03 - No se llevó a cabo la operación' },
  { value: '02', label: '02 - Comprobante con errores sin relación' },
  { value: '01', label: '01 - Comprobante con errores con relación' },
  { value: '04', label: '04 - Operación nominativa en factura global' },
];

/**
 * ¿Se le muestra "Cancelar venta"? Mismo criterio que el API y que la pantalla
 * de Punto de Venta: súper administrador o el permiso pos:manage (Operaciones,
 * CEDEAS y administración).
 */
export function canCancelSales(
  roles: readonly string[] | null | undefined,
  permissions: readonly string[] | null | undefined,
): boolean {
  return (
    (roles ?? []).includes('super_admin') ||
    (permissions ?? []).some((p) => p === CANCEL_SALE_PERMISSION || p === 'pos:*' || p === '*')
  );
}

/** Una venta ya cancelada o reembolsada no se vuelve a cancelar. */
export function saleCanBeCancelled(status: string | null | undefined): boolean {
  return !!status && status !== 'cancelled' && status !== 'refunded';
}

/** Motivo sin espacios de sobra. */
export const cleanCancelReason = (reason: string): string => reason.replace(/\s+/g, ' ').trim();

/** Cuántos caracteres faltan para que el motivo alcance (0 = ya alcanza). */
export const cancelReasonMissing = (reason: string): number =>
  Math.max(0, CANCEL_REASON_MIN - cleanCancelReason(reason).length);

/** Lo que el API cuenta de la factura al cancelar la venta. */
export interface CancelSaleOutcome {
  cfdiCancelled?: boolean;
  cfdiCancellationStatus?: string;
  cfdiCancellationError?: string;
}

/**
 * Aviso al terminar. La venta SIEMPRE quedó cancelada; lo que puede quedar a
 * medias es su factura (el SAT la rechazó o sigue en proceso), y eso se dice.
 */
export function cancelSaleNotice(
  saleNumber: string,
  hadInvoice: boolean,
  outcome: CancelSaleOutcome | null | undefined,
): { tone: 'success' | 'warning'; text: string } {
  const base = `Venta ${saleNumber} cancelada`;
  if (!hadInvoice) return { tone: 'success', text: `${base}.` };
  if (outcome?.cfdiCancellationError) {
    return {
      tone: 'warning',
      text: `${base}, pero su factura NO se pudo cancelar: ${outcome.cfdiCancellationError} Cancélala desde Facturación.`,
    };
  }
  if (outcome?.cfdiCancelled === true) return { tone: 'success', text: `${base} y su factura también.` };
  return {
    tone: 'warning',
    text: `${base}. La cancelación de su factura quedó en proceso ante el SAT${
      outcome?.cfdiCancellationStatus ? ` (${outcome.cfdiCancellationStatus})` : ''
    }: revísala en Facturación.`,
  };
}
