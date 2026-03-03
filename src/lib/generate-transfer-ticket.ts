// generate-transfer-ticket.ts — PDF document generator for inventory transfers
// Based on generate-pos-ticket.ts pattern, adapted for TransferDto (A4 format)

import type { jsPDF } from 'jspdf';
import type { TransferDto } from '@/types/inventory';

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
    pending_approval: 'Pendiente de Aprobación',
    approved: 'En Tránsito',
    applied: 'Aplicado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

// ================================
// Main generator
// ================================

export async function generateTransferTicketPdf(transfer: TransferDto): Promise<string> {
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
  doc.setDrawColor(62, 102, 125); // #3E667D
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(62, 102, 125);
  doc.text('TRASPASO DE INVENTARIO', MARGIN, y);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(transfer.movementNumber, PAGE_W - MARGIN, y, { align: 'right' });
  y += 4;

  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(8);
  doc.text(`Estado: ${statusLabel(transfer.status)}`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 8;

  doc.setTextColor(0, 0, 0);

  // ----- 3. Transfer Info (two columns) -----
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  const colLeft = MARGIN;
  const colRight = PAGE_W / 2 + 5;
  const labelSize = 7.5;
  const valueSize = 9;
  const rowH = 5;

  // Left column - Branches
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(62, 102, 125);
  doc.text('SUCURSAL ORIGEN', colLeft, y);
  doc.text('SUCURSAL DESTINO', colRight, y);
  y += rowH;

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(valueSize);
  doc.text(transfer.branch.name, colLeft, y);
  doc.text(transfer.destinationBranch.name, colRight, y);
  y += 3.5;

  doc.setFontSize(labelSize);
  doc.setTextColor(130, 130, 130);
  doc.text(`Código: ${transfer.branch.code}`, colLeft, y);
  doc.text(`Código: ${transfer.destinationBranch.code}`, colRight, y);
  y += 7;

  // Date + Requester row
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(62, 102, 125);
  doc.text('FECHA DE SOLICITUD', colLeft, y);
  doc.text('SOLICITADO POR', colRight, y);
  y += rowH;

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(valueSize);
  doc.text(fmtDate(transfer.requestedAt || transfer.createdAt), colLeft, y);
  doc.text(transfer.requestedBy?.name || '—', colRight, y);
  y += 7;

  // Reason
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(62, 102, 125);
  doc.text('MOTIVO', colLeft, y);
  y += rowH;

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(valueSize);
  const reasonLines = doc.splitTextToSize(transfer.reason, CONTENT_W) as string[];
  reasonLines.forEach((line: string) => {
    y = checkPage(doc, y, 4);
    doc.text(line, colLeft, y);
    y += 3.5;
  });
  y += 2;

  if (transfer.notes) {
    doc.setFont(FONT_BODY, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(62, 102, 125);
    doc.text('NOTAS', colLeft, y);
    y += rowH;

    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT_BODY, 'normal');
    doc.setFontSize(valueSize);
    const notesLines = doc.splitTextToSize(transfer.notes, CONTENT_W) as string[];
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
  doc.setTextColor(62, 102, 125);
  doc.text('PRODUCTOS', colLeft, y);
  y += 6;

  // Table header
  const tableLeft = MARGIN;
  const col1 = tableLeft;             // #
  const col2 = tableLeft + 8;         // Código
  const col3 = tableLeft + 38;        // Producto
  const col4 = PAGE_W - MARGIN - 20;  // Cantidad
  const tableRight = PAGE_W - MARGIN;

  y = checkPage(doc, y, 8);
  doc.setFillColor(62, 102, 125);
  doc.rect(tableLeft, y - 4, CONTENT_W, 7, 'F');

  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', col1 + 1, y);
  doc.text('CÓDIGO', col2, y);
  doc.text('PRODUCTO', col3, y);
  doc.text('CANTIDAD', tableRight, y, { align: 'right' });
  y += 5;

  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_MONO, 'normal');
  doc.setFontSize(8);

  let totalQty = 0;
  transfer.items.forEach((item, idx) => {
    const rowNeeded = 6;
    y = checkPage(doc, y, rowNeeded);

    // Alternate row bg
    if (idx % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(tableLeft, y - 3.5, CONTENT_W, rowNeeded, 'F');
    }

    doc.setFont(FONT_MONO, 'normal');
    doc.setFontSize(8);
    doc.text(String(idx + 1), col1 + 1, y);
    doc.text(item.productCode || '—', col2, y);

    // Product name — truncate if too long
    doc.setFont(FONT_BODY, 'normal');
    const maxNameW = col4 - col3 - 5;
    const nameLines = doc.splitTextToSize(item.productName, maxNameW) as string[];
    doc.text(nameLines[0], col3, y);

    doc.setFont(FONT_MONO, 'bold');
    doc.text(String(item.quantity), tableRight, y, { align: 'right' });

    totalQty += item.quantity;

    // If name wraps to a second line
    if (nameLines.length > 1) {
      y += 3.5;
      y = checkPage(doc, y, 4);
      doc.setFont(FONT_BODY, 'normal');
      doc.setFontSize(7);
      doc.text(nameLines[1], col3, y);
    }

    y += 5;
  });

  // Total row
  y = checkPage(doc, y, 8);
  doc.setDrawColor(62, 102, 125);
  doc.setLineWidth(0.5);
  doc.line(tableLeft, y - 2, tableRight, y - 2);
  y += 2;

  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(62, 102, 125);
  doc.text('TOTAL', col3, y);
  doc.text(`${transfer.totalItems} producto${transfer.totalItems !== 1 ? 's' : ''}, ${totalQty} unidades`, tableRight, y, { align: 'right' });
  y += 10;

  // ----- 5. Approval / Application Info -----
  if (transfer.approvedBy || transfer.appliedBy) {
    y = checkPage(doc, y, 20);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    doc.setFont(FONT_BODY, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(62, 102, 125);
    doc.text('HISTORIAL DE APROBACIÓN', colLeft, y);
    y += 7;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    if (transfer.approvedBy) {
      doc.setFont(FONT_BODY, 'bold');
      doc.text('Aprobado por:', colLeft, y);
      doc.setFont(FONT_BODY, 'normal');
      doc.text(`${transfer.approvedBy.name}  —  ${transfer.approvedAt ? fmtDate(transfer.approvedAt) : ''}`, colLeft + 28, y);
      y += 5;
    }

    if (transfer.appliedBy) {
      doc.setFont(FONT_BODY, 'bold');
      doc.text('Aplicado por:', colLeft, y);
      doc.setFont(FONT_BODY, 'normal');
      doc.text(`${transfer.appliedBy.name}  —  ${transfer.appliedAt ? fmtDate(transfer.appliedAt) : ''}`, colLeft + 28, y);
      y += 5;
    }

    if (transfer.rejectedBy) {
      doc.setFont(FONT_BODY, 'bold');
      doc.text(`${transfer.status === 'rejected' ? 'Rechazado' : 'Cancelado'} por:`, colLeft, y);
      doc.setFont(FONT_BODY, 'normal');
      doc.text(`${transfer.rejectedBy.name}  —  ${transfer.rejectedAt ? fmtDate(transfer.rejectedAt) : ''}`, colLeft + 28, y);
      y += 5;
      if (transfer.rejectionReason) {
        doc.text(`Motivo: ${transfer.rejectionReason}`, colLeft + 28, y);
        y += 5;
      }
    }

    y += 5;
  }

  // ----- 6. Signature Lines -----
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

  centerLabel(sig1X, sigWidth, 'Solicitó', sigY + 4);
  centerLabel(sig2X, sigWidth, 'Autorizó', sigY + 4);
  centerLabel(sig3X, sigWidth, 'Recibió', sigY + 4);

  if (transfer.requestedBy) {
    doc.setFontSize(6.5);
    centerLabel(sig1X, sigWidth, transfer.requestedBy.name, sigY + 8);
  }
  if (transfer.approvedBy) {
    doc.setFontSize(6.5);
    centerLabel(sig2X, sigWidth, transfer.approvedBy.name, sigY + 8);
  }

  // ----- 7. Footer -----
  const footerY = PAGE_H - 10;
  doc.setFont(FONT_BODY, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(170, 170, 170);
  doc.text(`Generado el ${fmtDate(new Date())}  |  ${transfer.movementNumber}`, MARGIN, footerY);
  doc.text('Tonic Life — Sistema de Inventarios', PAGE_W - MARGIN, footerY, { align: 'right' });

  // ----- Return blob URL -----
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
