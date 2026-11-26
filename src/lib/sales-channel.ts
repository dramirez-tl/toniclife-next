// CANAL de Reportes › Ventas por Producto (Sistemas, 23-nov-2026: "en ese reporte debe contar todo,
// también lo que se vende en línea y en POS").
//
// El reporte solo sumaba las ventas de caja; las piezas de los pedidos de la tienda en línea no
// aparecían. Ahora trae los dos canales y cada renglón dice de cuál es. El filtro deja ver uno solo
// (por ejemplo "Solo caja" para comparar contra un corte). El API recibe `channel` (pos | online) y
// no recibe nada cuando son los dos. Reglas puras, con pruebas.

export type SaleChannel = 'pos' | 'online';
export type SalesChannelFilter = 'all' | SaleChannel;

export interface SalesChannelOption {
  value: SalesChannelFilter;
  /** Texto corto del botón. */
  label: string;
}

export const SALES_CHANNEL_OPTIONS: readonly SalesChannelOption[] = [
  { value: 'all', label: 'Caja y tienda en línea' },
  { value: 'pos', label: 'Solo caja' },
  { value: 'online', label: 'Solo tienda en línea' },
];

/** Etiqueta del renglón que viene de un pedido de la tienda. */
export const ONLINE_TAG = 'En línea';

/** Lo que viaja al API: nada con los dos canales; `pos` u `online` cuando se eligió uno. */
export function salesChannelParam(filter: SalesChannelFilter | null | undefined): SaleChannel | undefined {
  return filter === 'pos' || filter === 'online' ? filter : undefined;
}

/** true = el renglón es de un pedido de la tienda en línea. Sin canal es de caja (así nació el reporte). */
export function isOnlineLine(line: { channel?: string | null }): boolean {
  return line.channel === 'online';
}

/**
 * Forma de pago de un renglón, en palabras. Los pedidos en línea ya la traen dicha por el API
 * ("Tarjeta en línea (Stripe)", "OXXO (Stripe)"); en caja se traduce el código con `labels`.
 */
export function linePaymentLabel(
  line: { paymentMethod?: string | null; paymentLabel?: string | null },
  labels: Readonly<Record<string, string>>,
): string {
  if (line.paymentLabel) return line.paymentLabel;
  const method = line.paymentMethod ?? '';
  return labels[method] ?? (method || '—');
}

/**
 * Liga del folio a Reportes › Ventas. Una venta de caja se busca por su folio; un pedido en línea
 * vive en el filtro "Stripe (tienda en línea)" de esa pantalla, que también busca por folio.
 */
export function saleFolioHref(line: { saleNumber: string; channel?: string | null }): string {
  const search = `search=${encodeURIComponent(line.saleNumber)}`;
  return isOnlineLine(line) ? `/admin/reportes/ventas?paymentMethod=stripe&${search}` : `/admin/reportes/ventas?${search}`;
}

const POS_COVERAGE = 'Ventas de caja completadas (no canceladas), día y hora locales de la sucursal.';
const ONLINE_COVERAGE =
  'Pedidos de la tienda en línea pagados, en la sucursal que los surte o donde se recogen y en el día en que se pagaron (el mismo de su factura).';

/** Qué cuenta el reporte según el canal elegido (la nota bajo los filtros). */
export function channelCoverageText(filter: SalesChannelFilter | null | undefined): string {
  if (filter === 'pos') return POS_COVERAGE;
  if (filter === 'online') return ONLINE_COVERAGE;
  return `${POS_COVERAGE} ${ONLINE_COVERAGE}`;
}

/** "1 pedido en línea" · "31 pedidos en línea". */
export function onlineOrdersText(count: number): string {
  return `${count} ${count === 1 ? 'pedido en línea' : 'pedidos en línea'}`;
}
