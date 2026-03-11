// generate-movement-ticket.ts — PDF document generator for inventory movements (entries/exits)
// Based on generate-transfer-ticket.ts pattern, adapted for MovementDto (A4 format)

import type { jsPDF } from 'jspdf';
import type { MovementDto } from '@/types/inventory';
import { MovementType } from '@/types/inventory';

// ================================
// Constants
// ================================

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP_MARGIN = 15;
const BOTTOM_MARGIN = 20;
const FONT_BODY = 'helvetica';
const FONT_MONO = 'courier';

const COMPANY = {
  name: 'TONIC WORLD CENTER S.A. DE C.V.',
  rfc: 'TWC-140715-8R6',
  address: 'BOSQUES DE DURAZNOS No. 65, BOSQUES DE LAS LOMAS, CP 11700, MIGUEL HIDALGO, CDMX.',
};

const REASON_LABELS: Record<string, string> = {
  purchase: 'Compra a proveedor',
  return_from_customer: 'Devolucion de cliente',
  initial_stock: 'Stock inicial',
  production: 'Produccion',
  found: 'Producto encontrado',
  sale: 'Venta',
  return_to_supplier: 'Devolucion a proveedor',
  loss: 'Perdida',
  expiration: 'Caducidad',
  damage: 'Dano/Merma',
  adjustment: 'Ajuste',
};

// ================================
// Helpers
// ================================

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - BOTTOM_MARGIN) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return y;
}

function fmtDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    pending_approval: 'Pendiente de Aprobacion',
    approved: 'Aprobado',
    applied: 'Aplicado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

// ================================
// Main generator
// ================================

export async function generateMovementTicketPdf(movement: MovementDto): Promise<string> {
  const { jsPDF: JsPDF } = await import('jspdf');

  let LOGO_BASE64: string | null = null;
  try {
    const logoModule = await import('./logo-base64');
    LOGO_BASE64 = logoModule.LOGO_BASE64;
  } catch {
    // logo not available
  }

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = TOP_MARGIN;

  const isEntry = movement.movementType === MovementType.ENTRY;
  const docTitle = isEntry ? 'ENTRADA DE INVENTARIO' : 'SALIDA DE INVENTARIO';

  // ----- 1. Logo + Company Header -----
  if (LOGO_BASE64) {
    try {
      const logoW = 40;
      const logoH = 20;
      doc.addImage(LOGO_BASE64, 'PNG', MARGIN, y, logoW, logoH);
      y += 2;
    } catch {
      // skip
    }
  }

  // Company info right-aligned
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(9);
  doc.text(COMPANY.name, PAGE_W - MARGIN, y + 4, { align: 'right' });
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(7.5);
  doc.text(`RFC: ${COMPANY.rfc}`, PAGE_W - MARGIN, y + 9, { align: 'right' });
  const addrLines = doc.splitTextToSize(COMPANY.address, 100) as string[];
  addrLines.forEach((line: string, i: number) => {
    doc.text(line, PAGE_W - MARGIN, y + 13 + i * 3.5, { align: 'right' });
  });

  y += 24;

  // ----- 2. Title -----
  const accentColor: [number, number, number] = isEntry ? [34, 139, 34] : [200, 80, 50]; // green for entry, red-ish for exit
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...accentColor);
  doc.text(docTitle, MARGIN, y);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(movement.movementNumber, PAGE_W - MARGIN, y, { align: 'right' });
  y += 4;

  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(8);
  doc.text(`Estado: ${statusLabel(movement.status)}`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 8;

  doc.setTextColor(0, 0, 0);

  // ----- 3. Movement Info (two columns) -----
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  const colLeft = MARGIN;
  const colRight = PAGE_W / 2 + 5;
  const rowH = 5;
  const valueSize = 9;

  // Row 1: Branch + Reason
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...accentColor);
  doc.text('SUCURSAL', colLeft, y);
  doc.text('MOTIVO', colRight, y);
  y += rowH;

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(valueSize);
  doc.text(movement.branchName, colLeft, y);

  // Wrap MOTIVO text to avoid overflowing the right edge of the page
  const motivoMaxW = PAGE_W - MARGIN - colRight;
  const motivoText = REASON_LABELS[movement.reason] || movement.reason;
  const motivoLines = doc.splitTextToSize(motivoText, motivoMaxW) as string[];
  doc.text(motivoLines, colRight, y);
  y += Math.max(7, motivoLines.length * 4.5);

  // Row 2: Date + Requester
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...accentColor);
  doc.text('FECHA DE SOLICITUD', colLeft, y);
  doc.text('SOLICITADO POR', colRight, y);
  y += rowH;

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(valueSize);
  doc.text(fmtDate(movement.createdAt), colLeft, y);
  doc.text(movement.requestedBy?.name || '\u2014', colRight, y);
  y += 7;

  // Reference number (if exists)
  if (movement.referenceNumber) {
    doc.setFont(FONT_BODY, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...accentColor);
    doc.text('NO. REFERENCIA', colLeft, y);
    y += rowH;

    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT_BODY, 'normal');
    doc.setFontSize(valueSize);
    doc.text(movement.referenceNumber, colLeft, y);
    y += 7;
  }

  // Notes
  if (movement.notes) {
    doc.setFont(FONT_BODY, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...accentColor);
    doc.text('NOTAS', colLeft, y);
    y += rowH;

    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT_BODY, 'normal');
    doc.setFontSize(valueSize);
    const notesLines = doc.splitTextToSize(movement.notes, CONTENT_W) as string[];
    notesLines.forEach((line: string) => {
      y = checkPage(doc, y, 4);
      doc.text(line, colLeft, y);
      y += 3.5;
    });
    y += 2;
  }

  y += 2;

  // ----- 4. Products Table -----
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.text('PRODUCTOS', colLeft, y);
  y += 6;

  // Table header
  const tableLeft = MARGIN;
  const col1 = tableLeft;             // #
  const col2 = tableLeft + 6;         // Codigo
  const col3 = tableLeft + 30;        // Producto
  const col4 = tableLeft + 98;        // Cantidad
  const col5 = tableLeft + 120;       // Lote
  const col6 = tableLeft + 155;       // CAD
  const tableRight = PAGE_W - MARGIN;

  y = checkPage(doc, y, 8);
  doc.setFillColor(...accentColor);
  doc.rect(tableLeft, y - 4, CONTENT_W, 7, 'F');

  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('#', col1 + 1, y);
  doc.text('CODIGO', col2, y);
  doc.text('PRODUCTO', col3, y);
  doc.text('CANT.', col4, y);
  doc.text('LOTE', col5, y);
  doc.text('CAD', col6, y);
  y += 5;

  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_MONO, 'normal');
  doc.setFontSize(7.5);

  let totalQty = 0;
  const items = movement.items || [];
  items.forEach((item, idx) => {
    const rowNeeded = 6;
    y = checkPage(doc, y, rowNeeded);

    // Alternate row bg
    if (idx % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(tableLeft, y - 3.5, CONTENT_W, rowNeeded, 'F');
    }

    doc.setFont(FONT_MONO, 'normal');
    doc.setFontSize(7.5);
    doc.text(String(idx + 1), col1 + 1, y);
    doc.text(item.productCode || '\u2014', col2, y);

    // Product name
    doc.setFont(FONT_BODY, 'normal');
    const maxNameW = col4 - col3 - 3;
    const nameLines = doc.splitTextToSize(item.productName, maxNameW) as string[];
    doc.text(nameLines[0], col3, y);

    doc.setFont(FONT_MONO, 'bold');
    doc.text(String(item.quantity), col4, y);

    // Lote / CAD
    doc.setFont(FONT_MONO, 'normal');
    doc.setFontSize(7);
    doc.text(item.lotNumber || '\u2014', col5, y);
    doc.text(item.expirationDate || '\u2014', col6, y);

    totalQty += item.quantity;

    if (nameLines.length > 1) {
      y += 3.5;
      y = checkPage(doc, y, 4);
      doc.setFont(FONT_BODY, 'normal');
      doc.setFontSize(6.5);
      doc.text(nameLines[1], col3, y);
    }

    y += 5;
  });

  // Total row
  y = checkPage(doc, y, 8);
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(tableLeft, y - 2, tableRight, y - 2);
  y += 2;

  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accentColor);
  doc.text('TOTAL', col3, y);
  doc.text(`${items.length} producto${items.length !== 1 ? 's' : ''}, ${totalQty} unidades`, tableRight, y, { align: 'right' });
  y += 10;

  // ----- 5. Signature Lines -----
  y = checkPage(doc, y, 35);
  y += 10;

  const sigWidth = 60;
  const sigY = y + 15;
  const sig1X = MARGIN + 10;
  const sig2X = PAGE_W / 2 - sigWidth / 2;
  const sig3X = PAGE_W - MARGIN - sigWidth - 10;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(sig1X, sigY, sig1X + sigWidth, sigY);
  doc.line(sig2X, sigY, sig2X + sigWidth, sigY);
  doc.line(sig3X, sigY, sig3X + sigWidth, sigY);

  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);

  const centerLabel = (x: number, w: number, text: string, yPos: number) => {
    const tw = doc.getTextWidth(text);
    doc.text(text, x + (w - tw) / 2, yPos);
  };

  centerLabel(sig1X, sigWidth, 'Solicito', sigY + 4);
  centerLabel(sig2X, sigWidth, 'Autorizo', sigY + 4);
  centerLabel(sig3X, sigWidth, isEntry ? 'Recibio' : 'Entrego', sigY + 4);

  if (movement.requestedBy) {
    doc.setFontSize(6.5);
    centerLabel(sig1X, sigWidth, movement.requestedBy.name, sigY + 8);
  }

  // ----- 6. Footer -----
  const footerY = PAGE_H - 10;
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(170, 170, 170);
  doc.text(`Generado el ${fmtDate(new Date())}  |  ${movement.movementNumber}`, MARGIN, footerY);
  doc.text('Tonic Life \u2014 Sistema de Inventarios', PAGE_W - MARGIN, footerY, { align: 'right' });

  // ----- Return blob URL -----
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
