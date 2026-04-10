// generate-order-ticket.ts — PDF ticket generator for orders
// Replicates the layout from docs/VENTA_15279138.pdf

import type { jsPDF } from 'jspdf';
import type { Order } from '@/types/order';

// ================================
// Types
// ================================

export interface TicketBranchConfig {
  ticketName?: string;
  ticketAddress?: string;
  ticketHeader?: string;
  ticketFooter?: string;
  addressPhone?: string;
}

interface TicketOptions {
  branch?: TicketBranchConfig;
}

// ================================
// Constants
// ================================

const PAGE_W = 72; // mm — printable width of POS-80
const PAGE_H = 200; // mm — fixed page height like reference PDF
const MARGIN = 3; // mm
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP_MARGIN = 6;
const BOTTOM_MARGIN = 6;
const FONT_BODY = 'helvetica';
const FONT_MONO = 'courier';

const COMPANY = {
  name: 'TONIC WORLD CENTER S.A. DE C.V.',
  rfc: 'TWC-140715-8R6',
  address: [
    'BOSQUES DE DURAZNOS No. 65',
    'BOSQUES DE LAS LOMAS, CP 11700',
    'MIGUEL HIDALGO, CDMX.',
  ],
};

// ================================
// Helpers
// ================================

/** Check if we need a new page, add one if so, return current y */
function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - BOTTOM_MARGIN) {
    doc.addPage([PAGE_W, PAGE_H]);
    return TOP_MARGIN;
  }
  return y;
}

function centerText(doc: jsPDF, text: string, y: number, fontSize?: number): number {
  if (fontSize) doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  const lh = doc.getLineHeight() / doc.internal.scaleFactor;
  lines.forEach((line: string) => {
    y = checkPage(doc, y, lh);
    const w = doc.getTextWidth(line);
    doc.text(line, (PAGE_W - w) / 2, y);
    y += lh;
  });
  return y;
}

function leftText(doc: jsPDF, text: string, y: number, fontSize?: number): number {
  if (fontSize) doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  const lh = doc.getLineHeight() / doc.internal.scaleFactor;
  lines.forEach((line: string) => {
    y = checkPage(doc, y, lh);
    doc.text(line, MARGIN, y);
    y += lh;
  });
  return y;
}

function drawSeparator(doc: jsPDF, y: number): number {
  y += 1.5;
  y = checkPage(doc, y, 5);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 3.5;
}

function fmtCurrency(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return n.toFixed(2);
}

function fmtDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${hh}:${min}:${ss} ${ampm}`;
}

// ================================
// Main generator
// ================================

export async function generateOrderTicketPdf(order: Order, options?: TicketOptions): Promise<void> {
  const { jsPDF: JsPDF } = await import('jspdf');

  let LOGO_BASE64: string | null = null;
  try {
    const logoModule = await import('./logo-base64');
    LOGO_BASE64 = logoModule.LOGO_BASE64;
  } catch {
    // logo not available
  }

  const branch = options?.branch;

  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W, PAGE_H],
  });

  let y = TOP_MARGIN;

  // ----- 1. Logo -----
  if (LOGO_BASE64) {
    try {
      const logoW = 38;
      const logoH = 8;
      const logoX = (PAGE_W - logoW) / 2;
      doc.addImage(LOGO_BASE64, 'PNG', logoX, y, logoW, logoH);
      y += logoH + 1;
    } catch {
      y += 2;
    }
  } else {
    y += 2;
  }

  // ----- 2. Empresa -----
  y = drawSeparator(doc, y);
  y += 1;
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(8);
  y = centerText(doc, COMPANY.name, y);
  y += 0.5;
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6.5);
  y = centerText(doc, COMPANY.rfc, y);
  for (const line of COMPANY.address) {
    y = centerText(doc, line, y);
  }
  y += 1;

  // ----- 3. Sucursal -----
  y = drawSeparator(doc, y);
  doc.setFontSize(6.5);

  if (branch?.ticketName) {
    doc.setFont(FONT_BODY, 'bold');
    y = centerText(doc, branch.ticketName, y);
    doc.setFont(FONT_BODY, 'normal');
  }
  if (branch?.ticketAddress) {
    const addrLines = branch.ticketAddress.split('\n');
    for (const line of addrLines) {
      y = centerText(doc, line.trim(), y);
    }
  }
  if (branch?.addressPhone) {
    y = centerText(doc, `TELS. ${branch.addressPhone}`, y);
  }

  // ----- 4. Info Pedido -----
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6.5);

  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : 'N/A';
  const customerNum = order.customer?.customerNumber || '';
  y = leftText(doc, `Cliente:${customerNum} ${customerName}`, y);
  y = leftText(doc, `Venta: ${order.orderNumber}`, y);

  // Use createdAt (full timestamp w/ timezone), not orderDate (date-only, causes TZ shift)
  const orderDate = order.createdAt;
  y = leftText(doc, `Fecha: ${fmtDate(orderDate)}    Hora: ${fmtTime(orderDate)}`, y);

  if (order.shippingAddressSnapshot) {
    // Handle both v2 camelCase (street, postalCode) and v1 snake_case (address, zip_code)
    const raw = order.shippingAddressSnapshot as unknown as Record<string, unknown>;
    const street = (raw.street || raw.address || '') as string;
    const extNum = (raw.exteriorNumber || raw.exterior_number || '') as string;
    const neighborhood = (raw.neighborhood || raw.colony || raw.colonia || '') as string;
    const city = (raw.city || '') as string;
    const state = (raw.state || '') as string;
    const postalCode = (raw.postalCode || raw.zip_code || '') as string;

    const parts = [
      street,
      extNum ? `#${extNum}` : '',
      neighborhood ? `- ${neighborhood}` : '',
      city ? `- ${city}` : '',
      state ? `- ${state}` : '',
      postalCode ? `- ${postalCode}` : '',
    ].filter(Boolean);
    y = leftText(doc, parts.join(' '), y);
  }

  // ----- 5. Tabla Productos -----
  y = drawSeparator(doc, y);

  const colClave = MARGIN;
  const colCant = MARGIN + 16;
  const colPrecio = MARGIN + 26;
  const colTotal = PAGE_W - MARGIN;

  doc.setFont(FONT_MONO, 'bold');
  doc.setFontSize(6.5);
  y = checkPage(doc, y, 4);
  doc.text('CLAVE', colClave, y);
  doc.text('CANT', colCant, y);
  doc.text('PRECIO', colPrecio, y);
  const hdrTotalW = doc.getTextWidth('TOTAL');
  doc.text('TOTAL', colTotal - hdrTotalW, y);
  y += doc.getLineHeight() / doc.internal.scaleFactor;

  doc.setFont(FONT_MONO, 'normal');
  y = leftText(doc, '---------  ---------  ---------  ---------', y);

  doc.setFontSize(6.5);
  for (const item of order.items) {
    const lh = doc.getLineHeight() / doc.internal.scaleFactor;

    // Check if we need space for code line + name line
    y = checkPage(doc, y, lh * 2);

    doc.setFont(FONT_MONO, 'bold');
    const code = item.productCode || item.productSku || item.productId.slice(0, 8);
    const qty = String(item.quantity);
    const price = fmtCurrency(item.unitPrice);
    const total = fmtCurrency(item.totalPrice);

    doc.text(code, colClave, y);
    doc.text(qty, colCant, y);
    doc.text(price, colPrecio, y);
    const totalW = doc.getTextWidth(total);
    doc.text(total, colTotal - totalW, y);
    y += lh;

    doc.setFont(FONT_MONO, 'normal');
    if (item.productName) {
      const nameLines = doc.splitTextToSize(item.productName, CONTENT_W) as string[];
      for (const nl of nameLines) {
        y = checkPage(doc, y, lh);
        doc.text(nl, colClave, y);
        y += lh;
      }
    }
  }

  // ----- 6. Totales -----
  y = drawSeparator(doc, y);
  doc.setFont(FONT_MONO, 'normal');
  doc.setFontSize(6.5);

  const subtotal = parseFloat(order.subtotal);
  const taxAmount = parseFloat(order.taxAmount);
  const shippingAmount = parseFloat(order.shippingAmount);
  const totalAmount = parseFloat(order.total);
  const withoutTax = subtotal - taxAmount > 0 ? subtotal - taxAmount : 0;

  const totalsRows: [string, string][] = [
    ['Costo de envío', fmtCurrency(shippingAmount)],
    ['SUB Total $', fmtCurrency(subtotal)],
    ['IVA/TAX $', fmtCurrency(taxAmount)],
    ['Sin IVA/TAX $', fmtCurrency(withoutTax)],
  ];

  for (const [label, val] of totalsRows) {
    const lh = doc.getLineHeight() / doc.internal.scaleFactor;
    y = checkPage(doc, y, lh);
    const labelW = doc.getTextWidth(label + '  ');
    const valW = doc.getTextWidth(val);
    doc.text(label, colTotal - labelW - valW, y);
    doc.text(val, colTotal - valW, y);
    y += lh;
  }

  doc.setFont(FONT_MONO, 'bold');
  doc.setFontSize(7.5);
  y = checkPage(doc, y, 4);
  const totalLabel = 'TOTAL $';
  const totalVal = fmtCurrency(totalAmount);
  const tLabelW = doc.getTextWidth(totalLabel + '  ');
  const tValW = doc.getTextWidth(totalVal);
  doc.text(totalLabel, colTotal - tLabelW - tValW, y);
  doc.text(totalVal, colTotal - tValW, y);
  y += doc.getLineHeight() / doc.internal.scaleFactor;

  doc.setFont(FONT_MONO, 'normal');
  doc.setFontSize(6.5);
  const currLabel = 'MONEDA';
  const currVal = 'Pesos Mexicanos';
  const cLabelW = doc.getTextWidth(currLabel + '  ');
  const cValW = doc.getTextWidth(currVal);
  doc.text(currLabel, colTotal - cLabelW - cValW, y);
  doc.text(currVal, colTotal - cValW, y);
  y += doc.getLineHeight() / doc.internal.scaleFactor;

  // ----- 7. Datos Pago -----
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(7);
  y = leftText(doc, 'Datos del Pago', y);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6.5);

  y = leftText(doc, `Fecha de Pago: ${fmtDate(orderDate)}`, y);
  y = leftText(doc, 'Moneda de Pago: Pesos Mexicanos', y);
  y = leftText(doc, `Número de Operación: ${order.orderNumber}`, y);
  y = leftText(doc, `Monto: ${fmtCurrency(totalAmount)}`, y);

  // ----- 8. Puntos MLM -----
  y = leftText(doc, `Puntos Ganados: ${order.totalPoints}`, y);
  y = leftText(doc, `Valor Negocio Ganados: ${fmtCurrency(order.totalBusinessValue)}`, y);
  y = leftText(doc, `Puntos Totales: ${order.totalPoints}`, y);
  y = leftText(doc, `Valor Negocio Totales: ${fmtCurrency(order.totalBusinessValue)}`, y);

  // ----- 9. Footer -----
  y += 2;
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(5.5);
  y = centerText(
    doc,
    'TE INVITAMOS A SER PREMIUM Y PARA PERFECCIONAR TU DESARROLLO INSCRIBETE AL SISTEMA EDUCATIVO UNIVERSIDAD TONIC LIFE',
    y,
  );

  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(6);
  y = centerText(doc, 'PAGO HECHO EN UNA SOLA EXHIBICIÓN', y);
  y = centerText(doc, 'ESTE COMPROBANTE NO ES VALIDO', y);
  y = centerText(doc, 'PARA EFECTOS FISCALES', y);

  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6);
  y = centerText(doc, 'https://toniclife.com/', y);
  y = centerText(doc, 'Tel. Callcenter', y);
  y = centerText(doc, '800 832 1852', y);
  y = centerText(doc, '462 626 4304', y);

  y += 3;
  doc.setFont(FONT_BODY, 'italic');
  doc.setFontSize(6.5);
  y = centerText(doc, '"EN TONIC LIFE... CONFIAMOS EN DIOS"', y);

  if (branch?.ticketFooter) {
    y += 2;
    doc.setFont(FONT_BODY, 'normal');
    doc.setFontSize(5.5);
    y = centerText(doc, branch.ticketFooter, y);
  }

  // ----- Preview -----
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
