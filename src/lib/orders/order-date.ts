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
