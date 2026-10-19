// delivery-print.ts - Impresión de la hoja de surtido y del ticket de una
// entrega a domicilio (Almacén). Se abre una ventana con HTML propio (sin
// estilos del admin) y se manda a imprimir; la hoja cabe en media carta y el
// ticket en rollo de 80 mm o en carta.

import type { Delivery } from '@/types/deliveries';
import { DELIVERY_STATUS_LABELS } from '@/types/deliveries';

const PAYMENT_LABELS: Record<string, string> = {
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
  undefined: 'Sin definir',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_LABELS[method] ?? method;
}

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

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 16px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #444; }
  .muted { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #ddd; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; font-size: 11px; text-transform: uppercase; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .box { border: 1px solid #ccc; border-radius: 6px; padding: 8px 10px; margin-top: 6px; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .big { font-size: 15px; font-weight: bold; }
  .check { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; vertical-align: middle; }
  .sign { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; font-size: 11px; text-align: center; }
  .sign div { border-top: 1px solid #333; padding-top: 4px; }
  @media print { body { padding: 8px; } @page { margin: 10mm; } }
`;

/** Hoja de surtido: qué sacar del almacén y a dónde va. */
export function buildPickingSheetHtml(d: Delivery, timeZone?: string): string {
  const items = d.items ?? [];
  const rows = items
    .map(
      (it, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td><span class="check"></span></td>
        <td>${esc(it.productSku)}</td>
        <td>${esc(it.productName)}${it.productType === 'kit' || it.productType === 'pack' || it.productType === 'promotional' ? ' <span class="muted">(kit: surtir contenido)</span>' : ''}</td>
        <td class="num big">${esc(it.quantity)}</td>
      </tr>`,
    )
    .join('');
  const units = items.reduce((s, it) => s + it.quantity, 0);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Surtido ${esc(d.saleNumber)}</title><style>${BASE_CSS}</style></head><body>
    <h1>Hoja de surtido · ${esc(d.saleNumber)}</h1>
    <div class="muted">Entrega a domicilio · ${esc(DELIVERY_STATUS_LABELS[d.status] ?? d.status)} · Surte: ${esc(d.fulfillBranchCode)} ${esc(d.fulfillBranchName)} · Impreso ${esc(dateTime(new Date().toISOString(), timeZone))}</div>
    <div class="grid">
      <div class="box">
        <div class="muted">Distribuidor</div>
        <div class="big">${esc(d.customerNumber ?? '')} ${esc(d.customerName ?? '')}</div>
        <div class="muted" style="margin-top:6px">Recibe</div>
        <div><strong>${esc(d.recipientName)}</strong>${d.recipientPhone ? ` · Tel. ${esc(d.recipientPhone)}` : ''}</div>
      </div>
      <div class="box">
        <div class="muted">Enviar a</div>
        <div><strong>${esc(d.addressText)}</strong></div>
        ${d.reference ? `<div class="muted" style="margin-top:4px">Ref.: ${esc(d.reference)}</div>` : ''}
        ${d.notes ? `<div style="margin-top:6px"><span class="muted">Indicaciones de Call Center:</span> ${esc(d.notes)}</div>` : ''}
      </div>
    </div>
    <div class="muted" style="margin-top:8px">Venta ${esc(d.saleNumber)} del ${esc(dateTime(d.saleCreatedAt, timeZone))} · ${esc(paymentMethodLabel(d.paymentMethod))} · ${esc(money(d.saleTotal, d.currencyCode))} · Capturó ${esc(d.requestedByName)} el ${esc(dateTime(d.requestedAt, timeZone))}</div>
    <h2>Productos (${items.length} renglón(es) · ${units} pieza(s))</h2>
    <table>
      <thead><tr><th class="num">#</th><th></th><th>Clave</th><th>Producto</th><th class="num">Cant.</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="muted">Sin renglones</td></tr>'}</tbody>
    </table>
    ${d.warehouseNotes ? `<div class="box"><span class="muted">Observaciones de Almacén:</span> ${esc(d.warehouseNotes)}</div>` : ''}
    <div class="box"><span class="muted">Paquetería:</span> ${esc(d.carrier ?? '____________________')} &nbsp;&nbsp; <span class="muted">Guía:</span> ${esc(d.trackingNumber ?? '____________________')}</div>
    <div class="sign"><div>Surtió</div><div>Revisó</div><div>Empacó</div></div>
  </body></html>`;
}

/** Ticket de la venta (formato de rollo) para anexar al paquete. */
export function buildTicketHtml(d: Delivery, timeZone?: string): string {
  const items = d.items ?? [];
  const rows = items
    .map(
      (it) => `
      <tr><td colspan="3">${esc(it.productName)}<br><span class="muted">${esc(it.productSku)}</span></td></tr>
      <tr><td class="num">${esc(it.quantity)} × ${esc(money(it.unitPrice, d.currencyCode))}</td><td></td><td class="num">${esc(money(it.total, d.currencyCode))}</td></tr>`,
    )
    .join('');
  const css = `
    body { font-family: "Courier New", Courier, monospace; font-size: 12px; margin: 0; padding: 10px; width: 80mm; }
    .c { text-align: center; } .muted { color: #555; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; } td.num { text-align: right; white-space: nowrap; }
    hr { border: 0; border-top: 1px dashed #333; margin: 6px 0; }
    .tot td { font-weight: bold; font-size: 13px; }
    @media print { @page { margin: 4mm; } }
  `;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket ${esc(d.saleNumber)}</title><style>${css}</style></head><body>
    <div class="c"><strong>TONIC LIFE</strong><br>${esc(d.saleBranchName)}</div>
    <hr>
    <div>Folio: <strong>${esc(d.saleNumber)}</strong></div>
    <div>Fecha: ${esc(dateTime(d.saleCreatedAt, timeZone))}</div>
    <div>Cliente: ${esc(d.customerNumber ?? '')} ${esc(d.customerName ?? d.recipientName)}</div>
    <div>Pago: ${esc(paymentMethodLabel(d.paymentMethod))}</div>
    <hr>
    <table>${rows}</table>
    <hr>
    <table class="tot"><tr><td>TOTAL</td><td class="num">${esc(money(d.saleTotal, d.currencyCode))}</td></tr></table>
    <hr>
    <div><strong>ENTREGA A DOMICILIO</strong></div>
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
