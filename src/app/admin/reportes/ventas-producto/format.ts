// Formatos de "Ventas por producto" (la tabla y la ventana del detalle de piezas gratis).

export const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  credit: 'Tarjeta de crédito',
  transfer: 'Transferencia',
  deposit: 'Depósito',
  mixed: 'Mixto',
  usd_cash: 'Efectivo USD',
  mercado_pago: 'Mercado Pago',
  promotion: 'Promoción',
  cashback: 'Cashback',
  undefined: 'Por definir',
};

/** YYYY-MM-DD → dd/mm/aaaa. */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatAmount(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUnits(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}
