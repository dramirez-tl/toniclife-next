// generate-pos-ticket.ts — PDF ticket generator for POS sales
// Based on generate-order-ticket.ts, adapted for Sale type

import type { jsPDF } from 'jspdf';
import type { Sale } from '@/types/pos';

// ================================
// Types
// ================================

export interface PosTicketBranchConfig {
  ticketName?: string;
  ticketAddress?: string;
  ticketHeader?: string;
  ticketFooter?: string;
  addressPhone?: string;
}

interface PosTicketOptions {
  branch?: PosTicketBranchConfig;
  currencyLabel?: string; // e.g. "Pesos Mexicanos"
}

// ================================
// Constants
// ================================

const PAGE_W = 80; // mm
const PAGE_H = 200; // mm
const MARGIN = 4;
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

function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash': return 'Efectivo';
    case 'card': return 'Tarjeta';
    case 'transfer': return 'Transferencia';
    case 'mixed': return 'Mixto';
    default: return method;
  }
}

// ================================
// Main generator
// ================================

/**
 * Generates a POS sale ticket PDF and returns the blob URL for preview.
 */
export async function generatePosTicketPdf(
  sale: Sale,
  options?: PosTicketOptions,
): Promise<string> {
  const { jsPDF: JsPDF } = await import('jspdf');

  let LOGO_BASE64: string | null = null;
  try {
    const logoModule = await import('./logo-base64');
    LOGO_BASE64 = logoModule.LOGO_BASE64;
  } catch {
    // logo not available
  }

  const branch = options?.branch;
  const currencyLabel = options?.currencyLabel || 'Pesos Mexicanos';

  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W, PAGE_H],
  });

  let y = TOP_MARGIN;

  // ----- 1. Logo -----
  if (LOGO_BASE64) {
    try {
      const logoW = 36;
      const logoH = 18;
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
  } else if (sale.branchName) {
    doc.setFont(FONT_BODY, 'bold');
    y = centerText(doc, sale.branchName, y);
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

  // ----- 4. Info Venta -----
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6.5);

  if (sale.customerName) {
    y = leftText(doc, `Cliente: ${sale.customerName}`, y);
  }
  y = leftText(doc, `Venta: ${sale.saleNumber}`, y);
  y = leftText(doc, `Caja: ${sale.cashRegisterName}`, y);
  y = leftText(doc, `Vendedor: ${sale.sellerName}`, y);

  const saleDate = sale.createdAt;
  y = leftText(doc, `Fecha: ${fmtDate(saleDate)}    Hora: ${fmtTime(saleDate)}`, y);

  // ----- 5. Tabla Productos -----
  y = drawSeparator(doc, y);

  const colClave = MARGIN;
  const colCant = MARGIN + 18;
  const colPrecio = MARGIN + 30;
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
  for (const item of sale.items) {
    const lh = doc.getLineHeight() / doc.internal.scaleFactor;
    y = checkPage(doc, y, lh * 2);

    doc.setFont(FONT_MONO, 'bold');
    const code = item.productSku || item.productId.slice(0, 8);
    const qty = String(item.quantity);
    const price = fmtCurrency(item.unitPrice);
    const total = fmtCurrency(item.total);

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

  const totalsRows: [string, string][] = [
    ['SUB Total $', fmtCurrency(sale.subtotal)],
  ];

  if (sale.discountAmount > 0) {
    const discLabel = sale.discountPercent
      ? `Descuento (${sale.discountPercent}%) $`
      : 'Descuento $';
    totalsRows.push([discLabel, `-${fmtCurrency(sale.discountAmount)}`]);
  }

  totalsRows.push(['IVA/TAX $', fmtCurrency(sale.taxAmount)]);

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
  const totalVal = fmtCurrency(sale.total);
  const tLabelW = doc.getTextWidth(totalLabel + '  ');
  const tValW = doc.getTextWidth(totalVal);
  doc.text(totalLabel, colTotal - tLabelW - tValW, y);
  doc.text(totalVal, colTotal - tValW, y);
  y += doc.getLineHeight() / doc.internal.scaleFactor;

  doc.setFont(FONT_MONO, 'normal');
  doc.setFontSize(6.5);
  const currLabel = 'MONEDA';
  const cLabelW = doc.getTextWidth(currLabel + '  ');
  const cValW = doc.getTextWidth(currencyLabel);
  doc.text(currLabel, colTotal - cLabelW - cValW, y);
  doc.text(currencyLabel, colTotal - cValW, y);
  y += doc.getLineHeight() / doc.internal.scaleFactor;

  // ----- 7. Datos Pago -----
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(7);
  y = leftText(doc, 'Datos del Pago', y);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6.5);

  for (const payment of sale.payments) {
    const methodName = paymentMethodLabel(payment.paymentMethod);
    y = leftText(doc, `${methodName}: $${fmtCurrency(payment.amount)}`, y);
    if (payment.amountReceived && payment.changeGiven && payment.changeGiven > 0) {
      y = leftText(doc, `  Recibido: $${fmtCurrency(payment.amountReceived)}  Cambio: $${fmtCurrency(payment.changeGiven)}`, y);
    }
    if (payment.cardLast4) {
      y = leftText(doc, `  Tarjeta: ****${payment.cardLast4}`, y);
    }
    if (payment.referenceNumber) {
      y = leftText(doc, `  Ref: ${payment.referenceNumber}`, y);
    }
  }

  y = leftText(doc, `Fecha de Pago: ${fmtDate(saleDate)}`, y);
  y = leftText(doc, `No. Operacion: ${sale.saleNumber}`, y);

  // ----- 8. Puntos MLM (if customer) -----
  if (sale.customerId) {
    // Sum points and BV from items
    const totalPoints = sale.items.reduce((sum, item) => {
      // Points are stored as taxRate * quantity in the item but we don't have explicit points in SaleItem
      // For now, we just show what we have. Points come from the cart at POS time.
      return sum;
    }, 0);

    // If the sale has items with points data, show them
    // Note: points are not stored in pos_sale_items yet — this section is future-proof
  }

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
  y = centerText(doc, 'PAGO HECHO EN UNA SOLA EXHIBICION', y);
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

  // ----- Return blob URL for preview -----
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
