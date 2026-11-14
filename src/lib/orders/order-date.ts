// order-date.ts — Fechas de "Mis pedidos" (lógica PURA, 11-nov-2026).
//
// El API manda dos clases de fecha:
//  · la FECHA DE NEGOCIO del pedido, sin hora: "2026-11-11" (el día en que se compró);
//  · INSTANTES con hora y zona: "2026-11-12T16:00:00.000Z" (creado, listo, entregado…).
// `new Date('2026-11-11')` lee la primera como medianoche UTC, que en México todavía es el
// día 10: el pedido salía con la fecha de un día antes. Una fecha sin hora es ESE día, en
// cualquier zona horaria.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha lista para formatear. `null` = vacía o ilegible. */
export function parseOrderDate(value: string | null | undefined): Date | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  const dateOnly = DATE_ONLY.exec(text);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

const BUSINESS_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

/**
 * FECHA DE NEGOCIO de un pedido (columna DATE del API, `orders.order_date`). Llega como
 * "2026-11-13" o, serializada por el API, como "2026-11-13T00:00:00.000Z": las dos son ESE
 * día. Leída como instante, la medianoche UTC se pintaba en México como las 18:00 del día
 * anterior (Admin › Pedidos decía "12 nov, 06:00 p.m." en un pedido hecho el 13).
 * Solo para campos que son fecha de negocio; un instante real va por parseOrderDate.
 */
export function parseBusinessDate(value: string | null | undefined): Date | null {
  const parts = BUSINESS_DATE.exec((value ?? '').trim());
  if (!parts) return null;
  const [year, month, day] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const date = new Date(year, month - 1, day);
  // 2026-02-31 o el mes 13 "se recorren" en vez de fallar: no son una fecha.
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? date : null;
}
