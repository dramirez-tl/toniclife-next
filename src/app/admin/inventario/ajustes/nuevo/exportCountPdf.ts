/**
 * Genera el informe en PDF de un conteo físico de inventario (jspdf).
 *
 * Layout limpio multi-página al estilo del reporte interno: header teal,
 * metadatos del conteo, tabla de productos (sistema vs contado vs diferencia)
 * con encabezado repetido por página, y un resumen final.
 */

// jspdf solo como TIPO: el runtime se carga con import() dinámico al exportar
// para no meter la librería al bundle de la página.
import type { jsPDF } from 'jspdf';

const TEAL: [number, number, number] = [62, 102, 125]; // #3E667D
const TEXT: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [110, 110, 110];
const RED: [number, number, number] = [185, 28, 28];
const GREEN: [number, number, number] = [21, 128, 61];
const SKY_LIGHT: [number, number, number] = [232, 240, 250];
const SKY: [number, number, number] = [200, 221, 242];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 15;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const ROW_H = 6.5;

// Columnas: Código, Producto, Sistema, Contado, Diferencia
const COLS = [26, CONTENT_WIDTH - 26 - 24 - 24 - 26, 24, 24, 26];
const COL_ALIGN: ('left' | 'right')[] = ['left', 'left', 'right', 'right', 'right'];
const COL_HEAD = ['Código', 'Producto', 'Sistema', 'Contado', 'Dif.'];

export interface CountPdfItem {
  productCode: string;
  productName: string;
  systemQty: number;
  countedQty: number;
}

export interface CountPdfData {
  branchName: string;
  adjustmentTypeLabel: string;
  notes?: string;
  items: CountPdfItem[];
}

const fmt = (n: number) => n.toLocaleString('es-MX');

export async function exportInventoryCountPdf(
  data: CountPdfData,
): Promise<void> {
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  let y = drawHeader(doc, data);
  y = drawMeta(doc, data, y);
  y = drawItemsTable(doc, data.items, y);
  drawSummary(doc, data.items, y);
  drawFooter(doc);

  doc.save(`conteo_inventario_${slug(data.branchName)}_${dateStamp()}.pdf`);
}

function drawHeader(doc: jsPDF, data: CountPdfData): number {
  const h = 30;
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, PAGE_WIDTH, h, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONTEO FÍSICO DE INVENTARIO', MARGIN_X, 11);

  doc.setFontSize(15);
  doc.text(data.branchName.toUpperCase(), MARGIN_X, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `${data.adjustmentTypeLabel} · Generado: ${new Date().toLocaleString('es-MX')}`,
    MARGIN_X,
    26,
  );

  doc.setTextColor(...TEXT);
  return h + 6;
}

function drawMeta(doc: jsPDF, data: CountPdfData, y: number): number {
  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Notas:', MARGIN_X, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.notes, CONTENT_WIDTH - 18) as string[];
    let ty = y;
    lines.forEach((line) => {
      doc.text(line, MARGIN_X + 16, ty);
      ty += 4.2;
    });
    y = ty + 2;
  }
  return y;
}

function drawTableHeader(doc: jsPDF, y: number): number {
  doc.setFillColor(...TEAL);
  doc.rect(MARGIN_X, y, CONTENT_WIDTH, ROW_H, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let x = MARGIN_X;
  for (let i = 0; i < COL_HEAD.length; i++) {
    cell(doc, COL_HEAD[i], x, y, COLS[i], COL_ALIGN[i]);
    x += COLS[i];
  }
  doc.setTextColor(...TEXT);
  return y + ROW_H;
}

function drawItemsTable(doc: jsPDF, items: CountPdfItem[], startY: number): number {
  let y = drawTableHeader(doc, startY);
  doc.setFontSize(8);

  items.forEach((it, idx) => {
    if (y + ROW_H > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      y = drawTableHeader(doc, MARGIN_X);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(245, 245, 248);
      doc.rect(MARGIN_X, y, CONTENT_WIDTH, ROW_H, 'F');
    }

    const diff = it.countedQty - it.systemQty;
    const values = [
      it.productCode,
      it.productName,
      fmt(it.systemQty),
      fmt(it.countedQty),
      diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${fmt(diff)}`,
    ];

    let x = MARGIN_X;
    for (let i = 0; i < values.length; i++) {
      doc.setFont('helvetica', 'normal');
      if (i === 4 && diff !== 0) {
        doc.setTextColor(...(diff > 0 ? GREEN : RED));
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(...TEXT);
      }
      cell(doc, values[i], x, y, COLS[i], COL_ALIGN[i]);
      x += COLS[i];
    }
    doc.setTextColor(...TEXT);
    y += ROW_H;
  });

  return y + 2;
}

function drawSummary(doc: jsPDF, items: CountPdfItem[], y: number): void {
  const withDiff = items.filter((i) => i.countedQty - i.systemQty !== 0);
  const inc = withDiff
    .filter((i) => i.countedQty - i.systemQty > 0)
    .reduce((s, i) => s + (i.countedQty - i.systemQty), 0);
  const dec = withDiff
    .filter((i) => i.countedQty - i.systemQty < 0)
    .reduce((s, i) => s + Math.abs(i.countedQty - i.systemQty), 0);

  const boxH = 26;
  if (y + boxH > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    y = MARGIN_X;
  }

  doc.setFillColor(...SKY_LIGHT);
  doc.rect(MARGIN_X, y, CONTENT_WIDTH, boxH, 'F');
  doc.setDrawColor(...SKY);
  doc.rect(MARGIN_X, y, CONTENT_WIDTH, boxH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text('RESUMEN DEL CONTEO', MARGIN_X + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT);
  doc.text(`Productos contados: ${fmt(items.length)}`, MARGIN_X + 4, y + 13);
  doc.text(`Productos con diferencia: ${fmt(withDiff.length)}`, MARGIN_X + 4, y + 19);

  doc.setTextColor(...GREEN);
  doc.text(`Incrementos: +${fmt(inc)}`, MARGIN_X + 90, y + 13);
  doc.setTextColor(...RED);
  doc.text(`Decrementos: -${fmt(dec)}`, MARGIN_X + 90, y + 19);
  doc.setTextColor(...TEXT);
}

function drawFooter(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Conteo físico de inventario • Uso interno', PAGE_WIDTH / 2, PAGE_HEIGHT - 8, {
      align: 'center',
    });
    doc.text(`Página ${i} de ${pages}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 8, {
      align: 'right',
    });
  }
  doc.setTextColor(...TEXT);
}

function cell(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  align: 'left' | 'right',
): void {
  const pad = 2;
  const t = truncate(doc, String(text ?? ''), width - pad * 2);
  const tx = align === 'right' ? x + width - pad : x + pad;
  doc.text(t, tx, y + ROW_H / 2 + 1.4, { align });
}

function truncate(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(s + '…') > maxWidth) s = s.slice(0, -1);
  return s + '…';
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
