// generate-corte-dia-pdf.ts — PDF generator for Corte del Día
import type { jsPDF } from 'jspdf';
import type { DailySalesSummary, Sale } from '@/types/pos';
import { PosSaleStatus } from '@/types/pos';
import { formatDateLocal, formatTimeLocal, DEFAULT_TIMEZONE } from '@/lib/timezone-utils';

const PAGE_W = 80;
const PAGE_H = 200;
const MARGIN = 4;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP_MARGIN = 6;
const BOTTOM_MARGIN = 6;
const FONT_BODY = 'helvetica';
const FONT_MONO = 'courier';

const PAYMENT_LABELS: { key: keyof DailySalesSummary; label: string }[] = [
  { key: 'totalCash', label: 'Efectivo' },
  { key: 'totalCard', label: 'T. Débito' },
  { key: 'totalCredit', label: 'T. Crédito' },
  { key: 'totalTransfer', label: 'Transferencia' },
  { key: 'totalMercadoPago', label: 'MercadoPago' },
  { key: 'totalCashback', label: 'Cashback/Vale' },
  { key: 'totalPromotion', label: 'Promociones' },
  { key: 'totalUsdCash', label: 'Dólares (USD)' },
  { key: 'totalMixed', label: 'Pago Mixto' },
];

const STATUS_LABEL: Record<string, string> = {
  [PosSaleStatus.COMPLETED]: 'Completada',
  [PosSaleStatus.CANCELLED]: 'Cancelada',
  [PosSaleStatus.REFUNDED]: 'Devuelta',
  [PosSaleStatus.PENDING]: 'Pendiente',
  [PosSaleStatus.PARTIAL_REFUND]: 'Dev. Parcial',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'T. Débito',
  credit: 'T. Crédito',
  transfer: 'Transferencia',
  mercado_pago: 'MercadoPago',
  cashback: 'Cashback',
  promotion: 'Promoción',
  usd_cash: 'USD',
  mixed: 'Mixto',
};

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - BOTTOM_MARGIN) {
    doc.addPage([PAGE_W, PAGE_H]);
    return TOP_MARGIN;
  }
  return y;
}

function lh(doc: jsPDF): number {
  return doc.getLineHeight() / doc.internal.scaleFactor;
}

function centerText(doc: jsPDF, text: string, y: number): number {
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  for (const line of lines) {
    y = checkPage(doc, y, lh(doc));
    const w = doc.getTextWidth(line);
    doc.text(line, (PAGE_W - w) / 2, y);
    y += lh(doc);
  }
  return y;
}

function leftText(doc: jsPDF, text: string, y: number): number {
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  for (const line of lines) {
    y = checkPage(doc, y, lh(doc));
    doc.text(line, MARGIN, y);
    y += lh(doc);
  }
  return y;
}

function rowLR(doc: jsPDF, left: string, right: string, y: number): number {
  y = checkPage(doc, y, lh(doc));
  const rw = doc.getTextWidth(right);
  doc.text(left, MARGIN, y);
  doc.text(right, PAGE_W - MARGIN - rw, y);
  return y + lh(doc);
}

function drawSeparator(doc: jsPDF, y: number): number {
  y += 1.5;
  y = checkPage(doc, y, 5);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 3.5;
}

function fmt(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

export async function generateCorteDiaPdf(
  summary: DailySalesSummary,
  sales: Sale[],
  branchName: string,
  date: string,
  timezone: string = DEFAULT_TIMEZONE,
): Promise<string> {
  const { jsPDF: JsPDF } = await import('jspdf');

  let LOGO_BASE64: string | null = null;
  try {
    const logoModule = await import('./logo-base64');
    LOGO_BASE64 = logoModule.LOGO_BASE64;
  } catch {
    // logo not available
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: timezone,
  });

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W, PAGE_H] });

  let y = TOP_MARGIN;

  // Logo
  if (LOGO_BASE64) {
    try {
      const logoW = 36, logoH = 18;
      doc.addImage(LOGO_BASE64, 'PNG', (PAGE_W - logoW) / 2, y, logoW, logoH);
      y += logoH + 1;
    } catch { y += 2; }
  } else {
    y += 2;
  }

  // Header
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(9);
  y = centerText(doc, 'CORTE DEL DÍA', y);
  doc.setFontSize(7);
  y = centerText(doc, branchName, y);
  y = centerText(doc, displayDate.replace(/^\w/, (c) => c.toUpperCase()), y);

  // Ventas completadas
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(7);
  y = leftText(doc, 'VENTAS COMPLETADAS', y);
  doc.setFont(FONT_MONO, 'bold');
  doc.setFontSize(6.5);
  y = rowLR(doc, 'Total ventas', String(summary.totalSales), y);
  y = rowLR(doc, 'Monto total', fmt(summary.totalAmount), y);
  y = rowLR(doc, 'Ticket promedio', fmt(summary.averageTicket), y);
  y = rowLR(doc, 'Productos vendidos', String(summary.itemsSold), y);

  // Canceladas
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(7);
  y = leftText(doc, 'CANCELADAS / DEVOLUCIONES', y);
  doc.setFont(FONT_MONO, 'bold');
  doc.setFontSize(6.5);
  y = rowLR(doc, 'Cantidad', String(summary.refundsCount), y);
  y = rowLR(doc, 'Monto cancelado', fmt(summary.totalRefunds), y);

  // Por método de pago
  const paymentRows = PAYMENT_LABELS.filter(({ key }) => (summary[key] as number) > 0);
  if (paymentRows.length > 0) {
    y = drawSeparator(doc, y);
    doc.setFont(FONT_BODY, 'bold');
    doc.setFontSize(7);
    y = leftText(doc, 'POR MÉTODO DE PAGO', y);
    doc.setFont(FONT_MONO, 'bold');
    doc.setFontSize(6.5);
    for (const { key, label } of paymentRows) {
      y = rowLR(doc, label, fmt(summary[key] as number), y);
    }
  }

  // Detalle de ventas
  if (sales.length > 0) {
    y = drawSeparator(doc, y);
    doc.setFont(FONT_BODY, 'bold');
    doc.setFontSize(7);
    y = leftText(doc, `DETALLE DE VENTAS (${sales.length})`, y);
    y += 1;

    for (const s of sales) {
      const isCancelled = s.status === PosSaleStatus.CANCELLED || s.status === PosSaleStatus.REFUNDED;
      const fecha = formatDateLocal(s.createdAt, timezone, 'es-MX');
      const hora = formatTimeLocal(s.createdAt, timezone);
      const status = STATUS_LABEL[s.status] ?? s.status;
      const method = PAYMENT_METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod;
      const totalStr = fmt(s.total);

      y = checkPage(doc, y, lh(doc) * 2 + 3);

      // Line 1: folio (bold) + monto (right, bold)
      doc.setFont(FONT_MONO, 'bold');
      doc.setFontSize(6.5);
      const folioText = isCancelled ? `[CANC] ${s.saleNumber}` : s.saleNumber;
      doc.text(folioText, MARGIN, y);
      const tw = doc.getTextWidth(totalStr);
      doc.text(totalStr, PAGE_W - MARGIN - tw, y);
      y += lh(doc);

      // Line 2: fecha/hora · estatus · método
      doc.setFont(FONT_MONO, 'bold');
      doc.setFontSize(6);
      doc.text(`${fecha} ${hora}  ${status}  ${method}`, MARGIN, y);
      y += lh(doc) + 1.5;
    }
  }

  // Footer
  y = drawSeparator(doc, y);
  doc.setFont(FONT_BODY, 'bold');
  doc.setFontSize(6);
  y = centerText(doc, '*** Fin del corte ***', y);

  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
