// inventory-flow-pdf.ts — Informe de inventario del periodo en PDF membretado
// (Sistemas/Diego, 25-nov-2026): "que diga de forma clara y fácil de entender con
// cuánto producto empezamos en cada país, cuántos ingresos extra de producto hubo
// durante el mes, cuántas ventas hubo, cuánto producto quedó en total en el país
// y al final una tabla de ese total repartida entre las diferentes sucursales y
// almacenes… si dicen que me quedaron 75 piezas de un Jimmy Coffee con clave
// 9019, yo pida hacer el conteo final y debo tener eso 75".
//
// Se arma en el navegador (jsPDF) con lo que ya está en pantalla en Reportes ›
// Inventario y Ventas: la zona, el periodo y los productos que se estén viendo.
//   - Hoja 1: el resumen de todos los productos juntos y la tabla producto por
//     producto (empezamos con, entraron, se vendieron, otros, quedan).
//   - Una hoja por producto: las mismas cinco cifras y dónde deben estar las
//     piezas que quedaron, sucursal por sucursal, con un recuadro para anotar el
//     conteo físico.
//
// Solo usa letras de la fuente estándar del PDF (Latin-1): nada de "−", "→" ni
// comillas tipográficas, que saldrían como símbolos raros.

import { jsPDF } from 'jspdf';
import type {
  InventoryFlowBranchRow,
  InventoryFlowGroup,
  InventoryFlowProductRow,
  InventoryFlowResponse,
} from '@/types/reports';
import { generatedAtLabel, shortDate } from './inventory-flow';

type Rgb = [number, number, number];
const TEAL: Rgb = [62, 102, 125]; // #3E667D
const TEAL_DARK: Rgb = [47, 81, 101];
const SKY: Rgb = [232, 240, 246];
const LINE: Rgb = [205, 214, 220];
const TEXT: Rgb = [33, 37, 41];
const MUTED: Rgb = [105, 113, 120];
const WHITE: Rgb = [255, 255, 255];

/** Carta, en milímetros. */
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_TOP = 31;
const BODY_BOTTOM = PAGE_H - 17;

export interface InventoryFlowPdfLogo {
  /** PNG en data URL. */
  dataUrl: string;
  /** Ancho entre alto de la imagen. */
  ratio: number;
}

export interface InventoryFlowPdfOptions {
  /** Productos a incluir (los que se ven en pantalla). Sin él, todos los del reporte. */
  products?: readonly InventoryFlowProductRow[];
  logo?: InventoryFlowPdfLogo | null;
}

// ---------------------------------------------------------------------------
// Reglas puras (con pruebas)
// ---------------------------------------------------------------------------

/** 12345.5 → "12,345.5" · -61 → "-61" (guion normal: es lo que trae la fuente del PDF). */
export function pdfPieces(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return '0';
  const text = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return n < 0 ? `-${text}` : text;
}

/** "Otros movimientos" siempre dice si suma o resta: +136 · -61 · 0. */
export function pdfSigned(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return '0';
  return n > 0 ? `+${pdfPieces(n)}` : pdfPieces(n);
}

export interface InventoryFlowPdfTotals {
  products: number;
  opening: number;
  entries: number;
  sales: number;
  other: number;
  closing: number;
  closingGeneral: number;
  closingWarehouses: number;
  closingStores: number;
  closingTransit: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Suma de los productos que van en el informe (pueden ser menos que los del reporte si se filtró). */
export function pdfTotals(products: readonly InventoryFlowProductRow[]): InventoryFlowPdfTotals {
  const t: InventoryFlowPdfTotals = {
    products: products.length,
    opening: 0,
    entries: 0,
    sales: 0,
    other: 0,
    closing: 0,
    closingGeneral: 0,
    closingWarehouses: 0,
    closingStores: 0,
    closingTransit: 0,
  };
  for (const p of products) {
    t.opening += p.opening.total;
    t.entries += p.entries;
    t.sales += p.sales;
    t.other += p.other;
    t.closing += p.closing.total;
    t.closingGeneral += p.closing.general;
    t.closingWarehouses += p.closing.warehouses;
    t.closingStores += p.closing.stores;
    t.closingTransit += p.closing.transit;
  }
  (Object.keys(t) as (keyof InventoryFlowPdfTotals)[]).forEach((k) => {
    t[k] = round(t[k]);
  });
  return t;
}

export const PDF_GROUP_TITLE: Record<InventoryFlowGroup, string> = {
  general: 'ALMACÉN GENERAL',
  warehouse: 'OTROS ALMACENES',
  store: 'TIENDAS',
};

export type InventoryFlowCountRow =
  | { kind: 'group'; title: string; pieces: number }
  | { kind: 'branch'; code: string; name: string; pieces: number };

/**
 * Renglones de "dónde deben estar las piezas": solo las sucursales y almacenes a
 * los que les quedaron piezas, agrupados (almacén general, otros almacenes,
 * tiendas) con el total de cada grupo. Quien no aparece debe tener 0.
 */
export function countRows(product: Pick<InventoryFlowProductRow, 'branches'>): InventoryFlowCountRow[] {
  const out: InventoryFlowCountRow[] = [];
  const groups: InventoryFlowGroup[] = ['general', 'warehouse', 'store'];
  for (const group of groups) {
    const rows = product.branches.filter((b: InventoryFlowBranchRow) => b.group === group && b.closing !== 0);
    if (rows.length === 0) continue;
    out.push({
      kind: 'group',
      title: PDF_GROUP_TITLE[group],
      pieces: round(rows.reduce((s, b) => s + b.closing, 0)),
    });
    for (const b of rows) out.push({ kind: 'branch', code: b.code, name: b.name, pieces: b.closing });
  }
  return out;
}

/** Lo que debe salir en el conteo físico (lo que está en sucursales y almacenes; lo que va en camino no se cuenta en ninguna). */
export function countable(product: Pick<InventoryFlowProductRow, 'closing'>): number {
  return round(product.closing.total - product.closing.transit);
}

/** Las cinco cifras de un producto o del total, ya con su signo. */
export function flowFigures(
  f: { opening: number; entries: number; sales: number; other: number; closing: number },
  inProgress: boolean,
): { sign: string; label: string; value: string }[] {
  return [
    { sign: '', label: 'Empezamos con', value: pdfPieces(f.opening) },
    { sign: '+', label: 'Entraron', value: pdfPieces(f.entries) },
    { sign: '-', label: 'Se vendieron', value: pdfPieces(f.sales) },
    { sign: f.other < 0 ? '-' : '+', label: 'Otros movimientos', value: pdfPieces(Math.abs(f.other)) },
    { sign: '=', label: inProgress ? 'Quedan hoy' : 'Quedaron al cierre', value: pdfPieces(f.closing) },
  ];
}

/** "INFORME_INVENTARIO_NOVIEMBRE_2026_MXN_20261130.pdf" */
export function inventoryFlowPdfFilename(
  report: Pick<InventoryFlowResponse, 'period' | 'currency' | 'closingDate'>,
): string {
  const period = report.period.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return `INFORME_INVENTARIO_${period}_${report.currency}_${report.closingDate.replace(/-/g, '')}.pdf`;
}

/**
 * Reparte los renglones de la tabla de conteo en hojas de dos columnas. Una hoja
 * llena lleva `per` renglones por columna; la última se parte en dos mitades
 * parejas. Un título de grupo nunca se queda solo al pie de la columna izquierda.
 */
export function paginateCountRows<T>(
  rows: readonly T[],
  perColumnFirst: number,
  perColumnNext: number,
  isTitle: (row: T) => boolean = () => false,
): T[][][] {
  const pages: T[][][] = [];
  let rest = [...rows];
  let per = Math.max(1, perColumnFirst);
  do {
    const full = rest.length > per * 2;
    let leftCount = full ? per : Math.ceil(Math.min(rest.length, per * 2) / 2);
    if (leftCount > 1 && leftCount < rest.length && isTitle(rest[leftCount - 1])) leftCount -= 1;
    const take = full ? leftCount + per : rest.length;
    const chunk = rest.slice(0, take);
    rest = rest.slice(take);
    pages.push([chunk.slice(0, leftCount), chunk.slice(leftCount)]);
    per = Math.max(1, perColumnNext);
  } while (rest.length > 0);
  return pages;
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

function fit(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}...`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}

function letterhead(doc: jsPDF, report: InventoryFlowResponse, logo?: InventoryFlowPdfLogo | null): void {
  if (logo?.dataUrl && logo.ratio > 0) {
    const w = 38;
    // Con alias el logotipo se guarda una sola vez aunque salga en todas las hojas.
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, 9, w, w / logo.ratio, 'membrete', 'FAST');
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...TEAL_DARK);
    doc.text('toniclife', MARGIN, 17);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL_DARK);
  doc.text('INFORME DE INVENTARIO', PAGE_W - MARGIN, 12.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${report.region} · ${report.period.name}`, PAGE_W - MARGIN, 17.5, { align: 'right' });
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 23, PAGE_W - MARGIN, 23);
}

function footers(doc: jsPDF, report: InventoryFlowResponse): void {
  const pages = doc.getNumberOfPages();
  const stamp = generatedAtLabel(report.generatedAt);
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Tonic Life · Sistemas · Reportes > Inventario y Ventas', MARGIN, PAGE_H - 8);
    if (stamp) doc.text(`Generado el ${stamp} (hora Centro)`, PAGE_W / 2, PAGE_H - 8, { align: 'center' });
    doc.text(`Página ${i} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }
}

/** Las cinco cifras en fila, con su signo entre una y otra. Devuelve la y donde termina. */
function figures(
  doc: jsPDF,
  y: number,
  f: { opening: number; entries: number; sales: number; other: number; closing: number },
  inProgress: boolean,
): number {
  const items = flowFigures(f, inProgress);
  const gap = 7;
  const w = (CONTENT_W - gap * (items.length - 1)) / items.length;
  const h = 19;
  items.forEach((item, i) => {
    const x = MARGIN + i * (w + gap);
    const last = i === items.length - 1;
    doc.setFillColor(...(last ? TEAL : SKY));
    doc.roundedRect(x, y, w, h, 1.6, 1.6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...(last ? WHITE : MUTED));
    doc.text(item.label, x + w / 2, y + 5.6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...(last ? WHITE : TEXT));
    doc.text(item.value, x + w / 2, y + 13.6, { align: 'center' });
    if (i > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...TEAL_DARK);
      doc.text(item.sign, x - gap / 2, y + h / 2 + 1.6, { align: 'center' });
    }
  });
  return y + h;
}

function paragraph(doc: jsPDF, text: string, y: number, size = 9.5, color: Rgb = TEXT): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  doc.text(lines, MARGIN, y);
  return y + lines.length * (size * 0.42);
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL_DARK);
  doc.text(text, MARGIN, y);
  return y + 3;
}

const PRODUCT_COLS = [
  { key: 'rank', title: '#', w: 8, align: 'right' as const },
  { key: 'code', title: 'Clave', w: 18, align: 'left' as const },
  { key: 'name', title: 'Producto', w: 61.9, align: 'left' as const },
  { key: 'opening', title: 'Empezamos con', w: 22, align: 'right' as const },
  { key: 'entries', title: 'Entraron', w: 19, align: 'right' as const },
  { key: 'sales', title: 'Se vendieron', w: 20, align: 'right' as const },
  { key: 'other', title: 'Otros', w: 17, align: 'right' as const },
  { key: 'closing', title: 'Quedan', w: 22, align: 'right' as const },
];

function productTableHeader(doc: jsPDF, y: number, inProgress: boolean): number {
  doc.setFillColor(...TEAL);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  let x = MARGIN;
  for (const c of PRODUCT_COLS) {
    const title = c.key === 'closing' ? (inProgress ? 'Quedan hoy' : 'Quedaron') : c.title;
    doc.text(title, c.align === 'right' ? x + c.w - 1.5 : x + 1.5, y + 4.7, { align: c.align });
    x += c.w;
  }
  return y + 7;
}

function productTableRow(
  doc: jsPDF,
  y: number,
  cells: Record<string, string>,
  opts: { bold?: boolean; fill?: Rgb | null },
): number {
  const h = 6;
  if (opts.fill) {
    doc.setFillColor(...opts.fill);
    doc.rect(MARGIN, y, CONTENT_W, h, 'F');
  }
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT);
  let x = MARGIN;
  for (const c of PRODUCT_COLS) {
    const bold = opts.bold || c.key === 'closing' || c.key === 'code';
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const text = fit(doc, cells[c.key] ?? '', c.w - 3);
    doc.text(text, c.align === 'right' ? x + c.w - 1.5 : x + 1.5, y + 4.1, { align: c.align });
    x += c.w;
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.15);
  doc.line(MARGIN, y + h, PAGE_W - MARGIN, y + h);
  return y + h;
}

/** Columnas de cada mitad de la tabla de conteo: clave, nombre, debe haber, conteo. */
const HALF_GAP = 6;
const HALF_W = (CONTENT_W - HALF_GAP) / 2;
const COUNT_COLS = { code: 11, pieces: 17, box: 17 };
const COUNT_NAME_W = HALF_W - COUNT_COLS.code - COUNT_COLS.pieces - COUNT_COLS.box;
const COUNT_ROW_H = 4.7;
/** Si no caben en una hoja, los renglones se aprietan hasta este alto antes de pasar a otra hoja. */
const COUNT_ROW_MIN_H = 4.1;
const COUNT_HEAD_H = 6;
/** Donde empieza la tabla de conteo en la primera hoja de un producto y donde debe terminar. */
const COUNT_TOP_FIRST = 85;
const COUNT_TOP_NEXT = BODY_TOP + 9;
const COUNT_BOTTOM = BODY_BOTTOM - 16;

/** Alto de renglón para que la tabla de conteo quepa en una hoja de dos columnas, si se puede. */
export function countRowHeight(rows: number): number {
  const available = COUNT_BOTTOM - COUNT_TOP_FIRST - COUNT_HEAD_H;
  const perColumn = Math.ceil(rows / 2);
  if (perColumn * COUNT_ROW_H <= available) return COUNT_ROW_H;
  return Math.max(COUNT_ROW_MIN_H, Math.floor((available / perColumn) * 100) / 100);
}

function countHeader(doc: jsPDF, x: number, y: number): void {
  doc.setFillColor(...TEAL);
  doc.rect(x, y, HALF_W, COUNT_HEAD_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text('Clave', x + 1.2, y + 4);
  doc.text('Sucursal o almacén', x + COUNT_COLS.code + 1.2, y + 4);
  doc.text('Debe haber', x + COUNT_COLS.code + COUNT_NAME_W + COUNT_COLS.pieces - 1.2, y + 4, { align: 'right' });
  doc.text('Conteo', x + HALF_W - COUNT_COLS.box / 2, y + 4, { align: 'center' });
}

function countRow(doc: jsPDF, x: number, y: number, row: InventoryFlowCountRow, h: number): void {
  const piecesX = x + COUNT_COLS.code + COUNT_NAME_W + COUNT_COLS.pieces - 1.2;
  const base = y + h * 0.7;
  const small = h < 4.5;
  if (row.kind === 'group') {
    doc.setFillColor(...SKY);
    doc.rect(x, y, HALF_W, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(small ? 6.7 : 7);
    doc.setTextColor(...TEAL_DARK);
    doc.text(row.title, x + 1.2, base);
    doc.text(pdfPieces(row.pieces), piecesX, base, { align: 'right' });
    return;
  }
  doc.setFontSize(small ? 6.9 : 7.3);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(row.code, x + 1.2, base);
  doc.setTextColor(...TEXT);
  doc.text(fit(doc, row.name, COUNT_NAME_W - 2), x + COUNT_COLS.code + 1.2, base);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfPieces(row.pieces), piecesX, base, { align: 'right' });
  // Recuadro para anotar el conteo físico.
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(x + HALF_W - COUNT_COLS.box + 1, y + 0.4, COUNT_COLS.box - 2, h - 0.8);
  doc.setLineWidth(0.1);
  doc.line(x, y + h, x + HALF_W - COUNT_COLS.box, y + h);
}

function productPage(
  doc: jsPDF,
  report: InventoryFlowResponse,
  product: InventoryFlowProductRow,
  logo: InventoryFlowPdfLogo | null | undefined,
): void {
  const rows = countRows(product);
  const closingWord = report.inProgress ? 'hoy' : 'al cierre';
  const rowH = countRowHeight(rows.length);
  const perFirst = Math.floor((COUNT_BOTTOM - COUNT_TOP_FIRST - COUNT_HEAD_H + 0.01) / rowH);
  const perNext = Math.floor((COUNT_BOTTOM - COUNT_TOP_NEXT - COUNT_HEAD_H + 0.01) / rowH);
  const pages = paginateCountRows(rows, perFirst, perNext, (row) => row.kind === 'group');

  pages.forEach((columns, pageIndex) => {
    doc.addPage();
    letterhead(doc, report, logo);
    let y = BODY_TOP;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...TEXT);
    const title = `${product.rank}. ${product.code} · ${product.name}`;
    doc.text(fit(doc, pageIndex === 0 ? title : `${title} (continúa)`, CONTENT_W), MARGIN, y + 2);
    y += 7;
    if (pageIndex === 0) {
      y = figures(
        doc,
        y,
        {
          opening: product.opening.total,
          entries: product.entries,
          sales: product.sales,
          other: product.other,
          closing: product.closing.total,
        },
        report.inProgress,
      );
      y += 6;
      const transit = product.closing.transit;
      y = paragraph(
        doc,
        `En el conteo físico deben aparecer ${pdfPieces(countable(product))} piezas repartidas como dice la tabla.` +
          (transit !== 0
            ? ` Otras ${pdfPieces(transit)} van en camino entre sucursales (ya salieron de una y todavía no se reciben en otra): no están en ninguna tabla y completan las ${pdfPieces(product.closing.total)} que quedan en el país.`
            : ''),
        y,
        9.5,
      );
      sectionTitle(doc, `Dónde deben estar las piezas ${closingWord}`, COUNT_TOP_FIRST - 3);
      y = COUNT_TOP_FIRST;
    } else {
      y = COUNT_TOP_NEXT;
    }
    if (rows.length === 0) {
      paragraph(doc, 'No quedaron piezas en ninguna sucursal ni almacén.', y + 4, 9.5, MUTED);
    }
    columns.forEach((column, c) => {
      if (column.length === 0) return;
      const x = MARGIN + c * (HALF_W + HALF_GAP);
      countHeader(doc, x, y);
      column.forEach((row, i) => countRow(doc, x, y + COUNT_HEAD_H + i * rowH, row, rowH));
    });
    if (pageIndex === pages.length - 1) {
      const by = BODY_BOTTOM - 13;
      doc.setFillColor(...SKY);
      doc.roundedRect(MARGIN, by, CONTENT_W, 8, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...TEAL_DARK);
      const c = product.closing;
      doc.text(
        `Almacén general ${pdfPieces(c.general)}   ·   Otros almacenes ${pdfPieces(c.warehouses)}   ·   Tiendas ${pdfPieces(c.stores)}   ·   En camino ${pdfPieces(c.transit)}   ·   TOTAL ${pdfPieces(c.total)}`,
        PAGE_W / 2,
        by + 5.2,
        { align: 'center' },
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(
        'Las sucursales y almacenes que no aparecen deben tener 0 piezas.   Contó: ______________________   Fecha: ______________',
        MARGIN,
        BODY_BOTTOM - 1,
      );
    }
  });
}

/** Arma el informe. `options.products` = los productos que se ven en pantalla. */
export function buildInventoryFlowPdf(report: InventoryFlowResponse, options: InventoryFlowPdfOptions = {}): jsPDF {
  const products = [...(options.products ?? report.rows)];
  const logo = options.logo ?? null;
  const totals = pdfTotals(products);
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait', compress: true });
  doc.setProperties({
    title: `Informe de inventario · ${report.region} · ${report.period.name}`,
    author: 'Tonic Life',
  });

  // ---- Hoja 1: resumen ----
  letterhead(doc, report, logo);
  let y = BODY_TOP + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TEXT);
  doc.text(`Inventario de ${report.region} · ${report.period.name}`, MARGIN, y);
  y += 6;
  y = paragraph(
    doc,
    `Del ${shortDate(report.period.startDate)} al ${shortDate(report.period.endDate)}. ` +
      (report.inProgress
        ? `El periodo sigue en curso: lo que "queda" es la existencia al momento de generar este informe (${shortDate(report.closingDate)}).`
        : `Periodo terminado: lo que "quedó" es la existencia al final del ${shortDate(report.closingDate)}.`) +
      ' Todas las cantidades son piezas.',
    y,
    9.5,
    MUTED,
  );
  y += 4;
  const scope =
    products.length === report.rows.length
      ? `Incluye los ${products.length} productos más vendidos del periodo en ${report.region}.`
      : `Incluye ${products.length} de los ${report.rows.length} productos más vendidos del periodo en ${report.region} (los que estaban filtrados en pantalla).`;
  y = sectionTitle(doc, products.length === 1 ? 'En resumen' : `En resumen: los ${products.length} productos juntos`, y + 3);
  y = figures(doc, y + 1, totals, report.inProgress) + 6;
  y = paragraph(
    doc,
    `De las ${pdfPieces(totals.closing)} piezas que ${report.inProgress ? 'quedan' : 'quedaron'}: ` +
      `${pdfPieces(totals.closingGeneral)} están en el almacén general, ${pdfPieces(totals.closingWarehouses)} en otros almacenes, ` +
      `${pdfPieces(totals.closingStores)} en tiendas y ${pdfPieces(totals.closingTransit)} van en camino entre sucursales. ${scope}`,
    y,
  );
  y += 4;

  y = sectionTitle(doc, 'Producto por producto', y + 3);
  y = productTableHeader(doc, y + 1, report.inProgress);
  products.forEach((p, i) => {
    if (y + 6 > BODY_BOTTOM) {
      doc.addPage();
      letterhead(doc, report, logo);
      y = productTableHeader(doc, BODY_TOP, report.inProgress);
    }
    y = productTableRow(
      doc,
      y,
      {
        rank: String(p.rank),
        code: p.code,
        name: p.name,
        opening: pdfPieces(p.opening.total),
        entries: pdfPieces(p.entries),
        sales: pdfPieces(p.sales),
        other: pdfSigned(p.other),
        closing: pdfPieces(p.closing.total),
      },
      { fill: i % 2 === 1 ? [247, 249, 251] : null },
    );
  });
  if (products.length > 1) {
    if (y + 6 > BODY_BOTTOM) {
      doc.addPage();
      letterhead(doc, report, logo);
      y = productTableHeader(doc, BODY_TOP, report.inProgress);
    }
    y = productTableRow(
      doc,
      y,
      {
        rank: '',
        code: 'TOTAL',
        name: `${products.length} productos`,
        opening: pdfPieces(totals.opening),
        entries: pdfPieces(totals.entries),
        sales: pdfPieces(totals.sales),
        other: pdfSigned(totals.other),
        closing: pdfPieces(totals.closing),
      },
      { bold: true, fill: SKY },
    );
  }

  const notes = [
    'Empezamos con: las piezas que había al iniciar el primer día del periodo, sumando almacenes, tiendas y lo que iba en camino.',
    'Entraron: producción y compras recibidas en almacén durante el periodo.',
    'Se vendieron: piezas que salieron por venta en caja y en la tienda en línea, menos las que regresaron por cancelación. Cuenta también las que salieron dentro de un kit o como regalo de una promoción.',
    'Otros movimientos: ajustes, mermas, caducidad, devoluciones al almacén, conteos físicos y faltantes de traspaso. Con signo + suman y con signo - restan.',
    `${report.inProgress ? 'Quedan' : 'Quedaron'} = Empezamos con + Entraron - Se vendieron +/- Otros movimientos. Es lo que debe aparecer en el conteo físico, sucursal por sucursal (hojas siguientes).`,
  ];
  const notesHeight = 9 + notes.length * 9;
  if (y + notesHeight > BODY_BOTTOM) {
    doc.addPage();
    letterhead(doc, report, logo);
    y = BODY_TOP;
  }
  y = sectionTitle(doc, 'Cómo leerlo', y + 8);
  y += 2;
  for (const note of notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(note, CONTENT_W - 4) as string[];
    doc.text('·', MARGIN, y);
    doc.text(lines, MARGIN + 3, y);
    y += lines.length * 3.7 + 1.2;
  }

  // ---- Una hoja por producto ----
  for (const p of products) productPage(doc, report, p, logo);

  footers(doc, report);
  return doc;
}

// ---------------------------------------------------------------------------
// Solo navegador: membrete y descarga
// ---------------------------------------------------------------------------

/** Logotipo en tinta oscura, recortado al texto (el archivo trae mucho margen). */
const LOGO_URL = '/images/logo/png/logo-text-dark.png';
const LOGO_CROP = { x: 100, y: 512, w: 1080, h: 256 };
const LOGO_TIMEOUT_MS = 4000;

/** Carga el logotipo para el membrete; si no se puede, el informe sale con el nombre en texto. */
export async function loadLetterheadLogo(): Promise<InventoryFlowPdfLogo | null> {
  try {
    if (typeof document === 'undefined') return null;
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('logo'));
      setTimeout(() => reject(new Error('logo: tiempo agotado')), LOGO_TIMEOUT_MS);
    });
    image.src = LOGO_URL;
    await loaded;
    const canvas = document.createElement('canvas');
    const scale = 720 / LOGO_CROP.w;
    canvas.width = Math.round(LOGO_CROP.w * scale);
    canvas.height = Math.round(LOGO_CROP.h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Fondo blanco: sin transparencia el PDF pesa menos y se imprime igual.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, LOGO_CROP.x, LOGO_CROP.y, LOGO_CROP.w, LOGO_CROP.h, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), ratio: LOGO_CROP.w / LOGO_CROP.h };
  } catch {
    return null;
  }
}

/** Genera y descarga el informe de lo que se ve en pantalla. */
export async function downloadInventoryFlowPdf(
  report: InventoryFlowResponse,
  products?: readonly InventoryFlowProductRow[],
): Promise<void> {
  const logo = await loadLetterheadLogo();
  const doc = buildInventoryFlowPdf(report, { products, logo });
  doc.save(inventoryFlowPdfFilename(report));
}
