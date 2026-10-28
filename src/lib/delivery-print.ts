// delivery-print.ts - Impresión de la hoja de surtido y del ticket de una
// entrega a domicilio (Almacén). Se abre una ventana con HTML propio (sin
// estilos del admin) y se manda a imprimir; la hoja cabe en media carta y el
// ticket en rollo de 80 mm o en carta.
//
// Tamaño de letra: la ventana no hereda la preferencia del admin, así que el
// llamador pasa `fontScale` (Preferencias → tamaño de letra, 1 = normal) y todo
// el texto se multiplica por esa escala (--s en el CSS). Precios: la hoja de
// surtido y el ticket muestran precio unitario e importe por renglón. El ticket
// va TODO en negritas y lista las piezas de cada kit una por línea (formato del
// ticket de almacén del sistema anterior).

//
// Desde la mig 176 (28-oct-2026) también se imprimen PEDIDOS WEB: el título dice
// "Pedido web TL…", la caja "Distribuidor" pasa a "Comprador" y, si es para
// recoger en sucursal, "Enviar a" pasa a "Entregar en mostrador".

import type { Delivery } from '@/types/deliveries';
import { DELIVERY_MODE_LABELS, DELIVERY_STATUS_LABELS } from '@/types/deliveries';
import { deliveryDocLabel, deliveryModeOf, paymentMethodLabel } from '@/lib/deliveries/actions';

// Compatibilidad: el nombre vivía aquí; ahora la regla está en lib/deliveries/actions.
export { paymentMethodLabel } from '@/lib/deliveries/actions';

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(
      value,
    );
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function dateTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

/** Escala segura (1 si viene algo raro). */
function scaleOf(fontScale?: number): number {
  return typeof fontScale === 'number' && Number.isFinite(fontScale) && fontScale >= 1 && fontScale <= 2
    ? fontScale
    : 1;
}

/** Todos los tamaños en px × la escala del usuario (--s). */
const baseCss = (scale: number) => `
  :root { --s: ${scale}; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 16px; font-size: calc(13px * var(--s)); }
  h1 { font-size: calc(19px * var(--s)); margin: 0 0 2px; }
  h2 { font-size: calc(13px * var(--s)); margin: 14px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #444; }
  .muted { color: #666; font-size: calc(12px * var(--s)); }
  table { width: 100%; border-collapse: collapse; font-size: calc(13px * var(--s)); }
  th, td { border-bottom: 1px solid #ddd; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; font-size: calc(11px * var(--s)); text-transform: uppercase; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .box { border: 1px solid #ccc; border-radius: 6px; padding: 8px 10px; margin-top: 6px; font-size: calc(13px * var(--s)); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .big { font-size: calc(16px * var(--s)); font-weight: bold; }
  .check { display: inline-block; width: calc(14px * var(--s)); height: calc(14px * var(--s)); border: 1px solid #333; vertical-align: middle; }
  .check.small { width: calc(11px * var(--s)); height: calc(11px * var(--s)); }
  tr.comp td { background: #fafafa; font-size: calc(11px * var(--s)); padding-top: 3px; padding-bottom: 3px; }
  tfoot td { font-weight: bold; background: #f7f7f7; }
  .sign { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; font-size: calc(11px * var(--s)); text-align: center; }
  .sign div { border-top: 1px solid #333; padding-top: 4px; }
  @media print { body { padding: 8px; } @page { margin: 10mm; } }
`;

/** Hoja de surtido: qué sacar del almacén y a dónde va. En un envío consolidado
 *  (varias ventas, un paquete) junta los productos de todas las ventas y
 *  desglosa cada producto por venta/distribuidor. Con una sola venta lleva
 *  precio unitario e importe por renglón y el total de la venta. */
export function buildPickingSheetHtml(d: Delivery, timeZone?: string, fontScale?: number): string {
  const consolidated = !!d.shipmentItems && !!d.shipmentDeliveries && d.shipmentDeliveries.length > 1;
  const items = consolidated
    ? (d.shipmentItems ?? []).map((it) => ({
        productSku: it.productSku,
        productName: it.productName,
        productType: it.productType,
        quantity: it.quantity,
        components: it.components,
        perSale: it.perSale,
        unitPrice: null as number | null,
        total: null as number | null,
      }))
    : (d.items ?? []).map((it) => ({
        productSku: it.productSku,
        productName: it.productName,
        productType: it.productType,
        quantity: it.quantity,
        components: it.components,
        perSale: [] as { saleNumber: string; customerNumber: string | null; quantity: number }[],
        unitPrice: it.unitPrice as number | null,
        total: it.total as number | null,
      }));
  // Precios solo cuando es una venta (en el consolidado cada venta trae su total abajo).
  const withPrices = !consolidated;
  const cols = withPrices ? 7 : 5;
  const rows = items
    .map((it, i) => {
      const comps = it.components ?? [];
      const isKit = it.productType === 'kit' || it.productType === 'pack' || it.productType === 'promotional';
      const perSale = it.perSale.length
        ? `<br><span class="muted">${esc(it.perSale.map((p) => `${p.saleNumber}${p.customerNumber ? ` (#${p.customerNumber})` : ''}: ${p.quantity}`).join(' · '))}</span>`
        : '';
      const priceCells = withPrices
        ? `<td class="num">${esc(money(it.unitPrice ?? 0, d.currencyCode))}</td><td class="num">${esc(money(it.total ?? 0, d.currencyCode))}</td>`
        : '';
      const main = `
      <tr>
        <td class="num">${i + 1}</td>
        <td><span class="check"></span></td>
        <td>${esc(it.productSku)}</td>
        <td>${esc(it.productName)}${isKit ? ` <span class="muted">(${comps.length ? 'contiene:' : 'kit sin composición cargada'})</span>` : ''}${perSale}</td>
        <td class="num big">${esc(it.quantity)}</td>${priceCells}
      </tr>`;
      // Contenido del kit / promo: una línea por pieza con su cantidad TOTAL.
      const children = comps
        .map(
          (c) => `
      <tr class="comp">
        <td></td>
        <td><span class="check small"></span></td>
        <td class="muted">${esc(c.sku ?? '')}</td>
        <td>↳ ${esc(c.name)} <span class="muted">(${esc(c.quantityPerUnit)} × ${esc(it.quantity)})</span></td>
        <td class="num">${esc(c.quantityTotal)}</td>${withPrices ? '<td></td><td></td>' : ''}
      </tr>`,
        )
        .join('');
      return main + children;
    })
    .join('');
  const units = items.reduce((s, it) => s + it.quantity, 0);
  const sales = consolidated ? (d.shipmentDeliveries ?? []) : [];
  const isOrder = d.kind === 'order';
  const pickup = deliveryModeOf(d) === 'pickup';
  const title = consolidated ? `Envío consolidado · ${sales.length} ventas` : deliveryDocLabel(d);
  const distributorBox = consolidated
    ? `<div class="muted">Ventas en este paquete</div>
       <table style="margin-top:4px"><tbody>${sales
         .map(
           (s) =>
             `<tr><td>${esc(s.saleNumber)}</td><td>${esc(s.customerNumber ?? '')} ${esc(s.customerName ?? '')}</td><td class="num">${esc(s.itemsUnits)} pza(s)</td><td class="num">${esc(money(s.saleTotal, d.currencyCode))}</td></tr>`,
         )
         .join('')}</tbody></table>`
    : `<div class="muted">${isOrder ? 'Comprador' : 'Distribuidor'}</div>
       <div class="big">${esc(d.customerNumber ?? '')} ${esc(d.customerName ?? d.recipientName)}</div>`;
  const foot = withPrices
    ? `<tfoot><tr><td colspan="4" class="num">${items.length} renglón(es)</td><td class="num">${units} pza(s)</td><td class="num">Total</td><td class="num">${esc(money(d.saleTotal, d.currencyCode))}</td></tr></tfoot>`
    : `<tfoot><tr><td colspan="4" class="num">${items.length} renglón(es)</td><td class="num">${units} pza(s)</td></tr></tfoot>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Surtido ${esc(title)}</title><style>${baseCss(scaleOf(fontScale))}</style></head><body>
    <h1>Hoja de surtido · ${esc(title)}</h1>
    <div class="muted">${esc(DELIVERY_MODE_LABELS[deliveryModeOf(d)])} · ${esc(DELIVERY_STATUS_LABELS[d.status] ?? d.status)} · ${pickup ? 'Entrega en mostrador' : 'Surte'}: ${esc(d.fulfillBranchCode)} ${esc(d.fulfillBranchName)} · Impreso ${esc(dateTime(new Date().toISOString(), timeZone))}</div>
    <div class="grid">
      <div class="box">
        ${distributorBox}
        <div class="muted" style="margin-top:6px">Recibe</div>
        <div><strong>${esc(d.recipientName)}</strong>${d.recipientPhone ? ` · Tel. ${esc(d.recipientPhone)}` : ''}</div>
      </div>
      <div class="box">
        <div class="muted">${pickup ? 'Entregar en mostrador' : 'Enviar a'}</div>
        <div><strong>${esc(d.addressText)}</strong></div>
        ${d.reference ? `<div class="muted" style="margin-top:4px">Ref.: ${esc(d.reference)}</div>` : ''}
        ${d.notes ? `<div style="margin-top:6px"><span class="muted">${isOrder ? 'Indicaciones del comprador' : 'Indicaciones de Call Center'}:</span> ${esc(d.notes)}</div>` : ''}
      </div>
    </div>
    <div class="muted" style="margin-top:8px">${
      consolidated
        ? `${sales.length} ventas · ${esc(money(sales.reduce((s, x) => s + x.saleTotal, 0), d.currencyCode))} en total`
        : `${esc(deliveryDocLabel(d))} del ${esc(dateTime(d.saleCreatedAt, timeZone))} · ${esc(paymentMethodLabel(d.paymentMethod))} · ${esc(money(d.saleTotal, d.currencyCode))}`
    } · Capturó ${esc(d.requestedByName ?? (isOrder ? 'Tienda en línea' : 'Call Center'))} el ${esc(dateTime(d.requestedAt, timeZone))}</div>
    <h2>Productos (${items.length} renglón(es) · ${units} pieza(s))</h2>
    <table>
      <thead><tr><th class="num">#</th><th></th><th>Clave</th><th>Producto</th><th class="num">Cant.</th>${withPrices ? '<th class="num">P. unit.</th><th class="num">Importe</th>' : ''}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${cols}" class="muted">Sin renglones</td></tr>`}</tbody>
      ${foot}
    </table>
    ${d.warehouseNotes ? `<div class="box"><span class="muted">Observaciones de Almacén:</span> ${esc(d.warehouseNotes)}</div>` : ''}
    ${
      pickup
        ? `<div class="box"><span class="muted">Recibió en mostrador (nombre y firma):</span> ____________________________________ &nbsp;&nbsp; <span class="muted">Fecha:</span> ______________</div>`
        : `<div class="box"><span class="muted">Paquetería:</span> ${esc(d.carrier ?? '____________________')} &nbsp;&nbsp; <span class="muted">Guía:</span> ${esc(d.trackingNumber ?? '____________________')}</div>`
    }
    <div class="sign"><div>Surtió</div><div>Revisó</div><div>${pickup ? 'Entregó' : 'Empacó'}</div></div>
  </body></html>`;
}

/** Ticket de la venta (formato de rollo) para anexar al paquete, con el mismo
 *  detalle que el ticket de almacén del sistema anterior (21-oct-2026, pedido de
 *  Almacén): columnas CLAVE · CANT · PRECIO · TOTAL, el nombre del producto en
 *  su renglón y, en kits/paquetes/promos, UNA LÍNEA POR PIEZA ("Cant:N" + casilla
 *  + nombre + clave) para irlas palomeando al surtir. Todo en negritas, con los
 *  tamaños de la versión en negritas (base 13 px, clave 12 px, cantidad 14 px).
 *  Sin lote: el POS no registra el lote al vender (pos_sale_items.lot_number
 *  siempre vacío), así que no hay un lote confiable que imprimir. */
export function buildTicketHtml(d: Delivery, timeZone?: string, fontScale?: number): string {
  const items = d.items ?? [];
  const rows = items
    .map((it) => {
      const comps = it.components ?? [];
      const children = comps
        .map(
          (c) =>
            `<tr><td colspan="4" class="comp">Cant:${esc(c.quantityTotal)} <span class="check"></span> ${esc(c.name)}${c.sku ? ` <span class="sku">(${esc(c.sku)})</span>` : ''}</td></tr>`,
        )
        .join('');
      // Clave, cantidad, precio y total en un renglón (como el ticket anterior);
      // el nombre completo abajo. Sin piezas, la casilla va en el producto.
      return `
      <tr class="line"><td class="sku">${esc(it.productSku)}</td><td class="num qty">${esc(it.quantity)}</td><td class="num">${esc(money(it.unitPrice, d.currencyCode))}</td><td class="num">${esc(money(it.total, d.currencyCode))}</td></tr>
      <tr><td colspan="4" class="name">${comps.length ? '' : '<span class="check"></span> '}${esc(it.productName)}</td></tr>
      ${children}`;
    })
    .join('');
  const scale = scaleOf(fontScale);
  const css = `
    :root { --s: ${scale}; }
    body { font-family: "Courier New", Courier, monospace; font-weight: bold; font-size: calc(13px * var(--s)); margin: 0; padding: 10px; width: 80mm; color: #000; }
    .c { text-align: center; } .muted { color: #444; font-size: calc(11px * var(--s)); }
    table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; } td.num { text-align: right; white-space: nowrap; }
    tr.line td { padding-top: 6px; }
    td.name { padding-top: 0; }
    td.comp { font-size: calc(12px * var(--s)); padding: 1px 0 1px calc(8px * var(--s)); }
    .sku { font-size: calc(12px * var(--s)); letter-spacing: .02em; }
    .qty { font-size: calc(14px * var(--s)); }
    .check { display: inline-block; width: calc(10px * var(--s)); height: calc(10px * var(--s)); border: 1px solid #000; vertical-align: middle; }
    th { font-size: calc(11px * var(--s)); text-align: right; padding: 0 0 2px; border-bottom: 1px dashed #333; }
    th.l { text-align: left; }
    hr { border: 0; border-top: 1px dashed #333; margin: 6px 0; }
    .tot td { font-size: calc(15px * var(--s)); }
    @media print { @page { margin: 4mm; } }
  `;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket ${esc(d.saleNumber)}</title><style>${css}</style></head><body>
    <div class="c">TONIC LIFE<br>${esc(d.saleBranchName)}</div>
    <hr>
    <div>Folio: ${esc(d.saleNumber)}</div>
    <div>Fecha: ${esc(dateTime(d.saleCreatedAt, timeZone))}</div>
    <div>Cliente: ${esc(d.customerNumber ?? '')} ${esc(d.customerName ?? d.recipientName)}</div>
    <div>Pago: ${esc(paymentMethodLabel(d.paymentMethod))}</div>
    <hr>
    <table>
      <thead><tr><th class="l">CLAVE</th><th>CANT</th><th>PRECIO</th><th>TOTAL</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <hr>
    <table class="tot"><tr><td>TOTAL</td><td class="num">${esc(money(d.saleTotal, d.currencyCode))}</td></tr></table>
    <hr>
    <div>${deliveryModeOf(d) === 'pickup' ? 'RECOGER EN SUCURSAL' : 'ENTREGA A DOMICILIO'}${d.kind === 'order' ? ' · PEDIDO WEB' : ''}</div>
    <div>Recibe: ${esc(d.recipientName)}${d.recipientPhone ? ` · ${esc(d.recipientPhone)}` : ''}</div>
    <div>${esc(d.addressText)}</div>
    ${d.reference ? `<div class="muted">Ref.: ${esc(d.reference)}</div>` : ''}
    ${d.carrier || d.trackingNumber ? `<div>${esc(d.carrier ?? '')} ${d.trackingNumber ? `· Guía ${esc(d.trackingNumber)}` : ''}</div>` : ''}
    <hr>
    <div class="c muted">Gracias por su compra</div>
  </body></html>`;
}

/** Abre el HTML en una ventana nueva y lanza el diálogo de impresión. */
export function printHtml(html: string): boolean {
  const w = window.open('', '_blank', 'width=900,height=720');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  // Dar tiempo a que pinte antes de imprimir (Chrome imprime en blanco si no).
  setTimeout(() => {
    try {
      w.print();
    } catch {
      // el usuario puede imprimir desde la ventana
    }
  }, 250);
  return true;
}
