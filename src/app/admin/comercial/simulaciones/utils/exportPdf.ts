/**
 * Exporta una simulación de rango a PDF usando jspdf.
 *
 * El PDF se genera programáticamente (no es un screenshot del DOM) para
 * obtener un layout limpio, consistente y multi-página. Replica el estilo
 * del reporte interno del Departamento de Sistemas: header con badge del
 * rango, secciones con título teal, tablas con encabezado azul oscuro y
 * resumen final destacado.
 */

import { jsPDF } from 'jspdf';
import type { RankProjectionResponse } from '@/types/simulacion';

// Brand colors (RGB)
const TEAL: [number, number, number] = [62, 102, 125]; // #3E667D
const TEAL_DARK: [number, number, number] = [47, 81, 101]; // #2f5165
const SKY: [number, number, number] = [200, 221, 242]; // #C8DDF2
const SKY_LIGHT: [number, number, number] = [232, 240, 250];
const TEXT: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [110, 110, 110];
const RED: [number, number, number] = [185, 28, 28];
const GREEN: [number, number, number] = [21, 128, 61];

const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN_X = 15;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const fmtNumber = (n: number) => n.toLocaleString('es-MX');
const fmtCurrency = (n: number) =>
  n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  });

/**
 * Genera el PDF a partir del objeto `RankProjectionResponse`.
 */
export function exportReportPdf(report: RankProjectionResponse): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  let y = drawHeader(doc, report);
  y = ensureSpace(doc, y, 20);

  y = drawCurrentSituation(doc, report, y);
  y = ensureSpace(doc, y, 30);

  if (report.legs.length > 0) {
    y = drawLegs(doc, report, y);
    y = ensureSpace(doc, y, 30);
  }

  y = drawRequirements(doc, report, y);
  y = ensureSpace(doc, y, 40);

  if (report.summary.problems.length > 0) {
    y = drawAlertBox(doc, 'PROBLEMA PRINCIPAL', report.summary.problems, RED, y);
    y = ensureSpace(doc, y, 20);
  }
  if (report.summary.opportunities.length > 0) {
    y = drawAlertBox(
      doc,
      'OPORTUNIDAD',
      report.summary.opportunities,
      [180, 130, 30],
      y,
    );
    y = ensureSpace(doc, y, 20);
  }

  y = drawScenario(doc, report, y);
  y = ensureSpace(doc, y, 40);

  y = drawComparison(doc, report, y);
  y = ensureSpace(doc, y, 40);

  if (report.potentialLeaders.length > 0) {
    y = drawPotentialLeaders(doc, report, y);
    y = ensureSpace(doc, y, 40);
  }

  if (report.commissionHistory.length > 0) {
    y = drawCommissionHistory(doc, report, y);
    y = ensureSpace(doc, y, 30);
  }

  y = drawSummary(doc, report, y);
  drawFooter(doc, report);

  const fileName = `simulacion_${slugify(report.distributor.fullName)}_${report.targetRank.code}_${report.periodCode}.pdf`;
  doc.save(fileName);
}

// -----------------------------------------------------------------------------
// Helpers de layout
// -----------------------------------------------------------------------------

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_X;
  }
  return y;
}

function drawHeader(doc: jsPDF, report: RankProjectionResponse): number {
  const h = 32;
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, PAGE_WIDTH, h, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SIMULACIÓN DE RANGO', MARGIN_X, 10);

  // Badge del rango
  const badgeText = `▪ ${report.targetRank.name.toUpperCase()}`;
  doc.setFontSize(11);
  doc.setFillColor(255, 255, 255);
  const badgeWidth = doc.getTextWidth(badgeText) + 6;
  doc.roundedRect(MARGIN_X, 14, badgeWidth, 8, 1, 1, 'FD');
  doc.setTextColor(...TEAL_DARK);
  doc.text(badgeText, MARGIN_X + 3, 19.5);

  // Nombre + #legacy
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${report.distributor.fullName.toUpperCase()} · #${report.distributor.legacyId}`,
    MARGIN_X + badgeWidth + 5,
    20,
  );

  // Periodo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Datos reales: ${report.periodName} (${report.periodCode})`,
    MARGIN_X,
    28,
  );

  doc.setTextColor(...TEXT);
  return h + 6;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(title, MARGIN_X, y);
  doc.setTextColor(...TEXT);
  return y + 5;
}

function drawTable(
  doc: jsPDF,
  startY: number,
  headers: string[],
  rows: string[][],
  options?: {
    columnAligns?: ('left' | 'right' | 'center')[];
    columnWidths?: number[]; // mm; suma debe ser <= CONTENT_WIDTH
    highlightRowIndex?: number;
  },
): number {
  const aligns = options?.columnAligns ?? headers.map(() => 'left' as const);
  const widths =
    options?.columnWidths ??
    Array(headers.length).fill(CONTENT_WIDTH / headers.length);

  const rowHeight = 7;
  let y = startY;

  // Header
  doc.setFillColor(...TEAL);
  doc.rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let x = MARGIN_X;
  for (let i = 0; i < headers.length; i++) {
    drawCellText(doc, headers[i], x, y, widths[i], rowHeight, aligns[i]);
    x += widths[i];
  }
  y += rowHeight;

  // Body
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'normal');
  rows.forEach((row, ri) => {
    y = ensureSpace(doc, y, rowHeight);
    if (options?.highlightRowIndex === ri) {
      doc.setFillColor(...SKY);
      doc.rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
    } else if (ri % 2 === 1) {
      doc.setFillColor(245, 245, 248);
      doc.rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight, 'F');
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    let cx = MARGIN_X;
    for (let i = 0; i < row.length; i++) {
      drawCellText(doc, row[i], cx, y, widths[i], rowHeight, aligns[i]);
      cx += widths[i];
    }
    y += rowHeight;
  });

  return y + 2;
}

function drawCellText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  align: 'left' | 'right' | 'center',
) {
  const padding = 2;
  const t = String(text ?? '');
  const truncated = truncate(doc, t, width - padding * 2);
  let tx: number;
  if (align === 'right') tx = x + width - padding;
  else if (align === 'center') tx = x + width / 2;
  else tx = x + padding;
  doc.text(truncated, tx, y + height / 2 + 1.5, { align });
}

function truncate(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(s + '…') > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

// -----------------------------------------------------------------------------
// Secciones
// -----------------------------------------------------------------------------

function drawCurrentSituation(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  y = drawSectionTitle(doc, 'Situación actual', y);
  const rows: string[][] = [
    ['Rango actual', r.currentSituation.currentRank?.name ?? 'Sin rango'],
    ['Compra personal', `${fmtNumber(r.currentSituation.personalPoints)} pts`],
    [
      'N1 directos / calificados',
      `${r.currentSituation.directDownlinesCount} / ${r.currentSituation.qualifiedFirstLevelCount}`,
    ],
    ['Volumen total de red', fmtCurrency(r.currentSituation.totalNetworkVolume)],
    ['Comisión actual', fmtCurrency(r.currentSituation.currentMonthlyCommission)],
    ['Sucursal', r.distributor.branchName ?? '—'],
  ];
  return drawTable(doc, y, ['Indicador', 'Valor'], rows, {
    columnAligns: ['left', 'left'],
    columnWidths: [70, CONTENT_WIDTH - 70],
  });
}

function drawLegs(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  y = drawSectionTitle(doc, 'Estructura de piernas', y);
  const rows = r.legs.map((leg, i) => [
    `Pierna ${i + 1}`,
    `${leg.headFullName} (#${leg.headLegacyId})`,
    fmtCurrency(leg.totalVolume),
    `${leg.percentOfTotal.toFixed(1)}%`,
    fmtCurrency(leg.cappedVolume),
  ]);
  return drawTable(
    doc,
    y,
    ['#', 'Cabeza de pierna', 'Volumen total', '% del total', 'Cap aplicado'],
    rows,
    {
      columnAligns: ['left', 'left', 'right', 'right', 'right'],
      columnWidths: [15, 75, 35, 25, CONTENT_WIDTH - 150],
    },
  );
}

function drawRequirements(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  y = drawSectionTitle(
    doc,
    `¿Qué necesita para llegar a ${r.targetRank.name}?`,
    y,
  );
  const rows = r.requirements.map((req) => [
    req.label,
    req.required,
    req.current,
    req.gap,
  ]);
  return drawTable(
    doc,
    y,
    ['Requisito', 'Necesita', 'Actualmente', 'Qué falta'],
    rows,
    {
      columnAligns: ['left', 'right', 'right', 'left'],
      columnWidths: [55, 35, 35, CONTENT_WIDTH - 125],
    },
  );
}

function drawAlertBox(
  doc: jsPDF,
  label: string,
  items: string[],
  borderColor: [number, number, number],
  y: number,
): number {
  const padding = 4;
  const lineHeight = 4.5;
  const lines = items.flatMap((it) =>
    doc.splitTextToSize(`• ${it}`, CONTENT_WIDTH - padding * 2 - 30) as string[],
  );
  const labelHeight = 5;
  const boxHeight = padding * 2 + labelHeight + lines.length * lineHeight;

  doc.setFillColor(...borderColor);
  doc.rect(MARGIN_X, y, 2, boxHeight, 'F');
  doc.setFillColor(252, 245, 245);
  doc.rect(MARGIN_X + 2, y, CONTENT_WIDTH - 2, boxHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...borderColor);
  doc.text(label, MARGIN_X + padding + 2, y + padding + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT);
  let ty = y + padding + 2 + labelHeight + 2;
  lines.forEach((line) => {
    doc.text(line, MARGIN_X + padding + 2, ty);
    ty += lineHeight;
  });
  return y + boxHeight + 4;
}

function drawScenario(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  y = drawSectionTitle(doc, `Escenario simulado: llega a ${r.targetRank.name}`, y);

  // Supuestos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Supuestos:', MARGIN_X, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  for (const a of r.scenario.assumptions) {
    const lines = doc.splitTextToSize(`• ${a}`, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      y = ensureSpace(doc, y, 5);
      doc.text(line, MARGIN_X, y);
      y += 4;
    }
  }
  y += 2;

  const rows = r.scenario.commissionBreakdown.map((line) => [
    line.concept,
    line.calculation,
    fmtCurrency(line.amount),
  ]);
  rows.push(['TOTAL ESTIMADO', '', fmtCurrency(r.scenario.totalEstimated)]);

  y = drawTable(doc, y, ['Concepto', 'Cálculo', 'Monto'], rows, {
    columnAligns: ['left', 'left', 'right'],
    columnWidths: [70, 75, CONTENT_WIDTH - 145],
    highlightRowIndex: rows.length - 1,
  });

  if (r.scenario.notes.length > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    for (const note of r.scenario.notes) {
      const lines = doc.splitTextToSize(note, CONTENT_WIDTH) as string[];
      for (const line of lines) {
        y = ensureSpace(doc, y, 4);
        doc.text(line, MARGIN_X, y);
        y += 3.5;
      }
    }
    doc.setTextColor(...TEXT);
  }
  return y;
}

function drawComparison(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  y = drawSectionTitle(doc, 'Comparativo por rango', y);
  const rows = r.rankComparison.map((row) => [
    row.rankName,
    fmtCurrency(row.ml1),
    fmtCurrency(row.ml2),
    fmtCurrency(row.ml3),
    fmtCurrency(row.generations),
    fmtCurrency(row.total),
  ]);
  const targetIdx = r.rankComparison.findIndex((row) => row.isTarget);
  return drawTable(
    doc,
    y,
    ['Rango', 'ML1', 'ML2', 'ML3', 'Generaciones', 'Total'],
    rows,
    {
      columnAligns: ['left', 'right', 'right', 'right', 'right', 'right'],
      columnWidths: [40, 28, 28, 28, 30, CONTENT_WIDTH - 154],
      highlightRowIndex: targetIdx >= 0 ? targetIdx : undefined,
    },
  );
}

function drawPotentialLeaders(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  y = drawSectionTitle(doc, 'Líderes potenciales en la red', y);
  const rows = r.potentialLeaders.slice(0, 10).map((l) => [
    `${l.fullName} (#${l.legacyId})`,
    `N${l.relativeDepth}`,
    fmtNumber(l.personalPoints),
    String(l.qualifiedFirstLevelCount),
    fmtCurrency(l.rollOverCapped),
    l.potentialRankName,
  ]);
  return drawTable(
    doc,
    y,
    ['Líder', 'Prof.', 'Compra pers.', 'N1 calif.', 'Roll over', 'Rango pot.'],
    rows,
    {
      columnAligns: ['left', 'center', 'right', 'center', 'right', 'left'],
      columnWidths: [60, 15, 25, 18, 32, CONTENT_WIDTH - 150],
    },
  );
}

function drawCommissionHistory(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  y = drawSectionTitle(doc, 'Historial de comisiones', y);
  const rows = r.commissionHistory.map((row) => [
    `${row.periodName} (${row.periodCode})`,
    row.rankName ?? '—',
    fmtCurrency(row.totalCommission),
    String(row.recordsCount),
  ]);
  return drawTable(
    doc,
    y,
    ['Periodo', 'Rango', 'Comisión total', 'Registros'],
    rows,
    {
      columnAligns: ['left', 'left', 'right', 'center'],
      columnWidths: [70, 35, 45, CONTENT_WIDTH - 150],
    },
  );
}

function drawSummary(
  doc: jsPDF,
  r: RankProjectionResponse,
  y: number,
): number {
  const padding = 4;
  const lines = doc.splitTextToSize(
    r.summary.headline,
    CONTENT_WIDTH - padding * 2,
  ) as string[];
  const gapLines = r.summary.monthlyGap > 0
    ? (doc.splitTextToSize(
        `Lo que deja en la mesa al mes por no estar en ${r.targetRank.name}: ${fmtCurrency(r.summary.monthlyGap)}.`,
        CONTENT_WIDTH - padding * 2,
      ) as string[])
    : [];

  const totalLines = lines.length + gapLines.length;
  const labelHeight = 6;
  const lineHeight = 4.5;
  const boxHeight = padding * 2 + labelHeight + totalLines * lineHeight;

  y = ensureSpace(doc, y, boxHeight + 5);

  doc.setFillColor(...SKY_LIGHT);
  doc.rect(MARGIN_X, y, CONTENT_WIDTH, boxHeight, 'F');
  doc.setDrawColor(...SKY);
  doc.rect(MARGIN_X, y, CONTENT_WIDTH, boxHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEAL_DARK);
  doc.text('RESUMEN', MARGIN_X + padding, y + padding + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  let ty = y + padding + labelHeight + 2;
  for (const line of lines) {
    doc.text(line, MARGIN_X + padding, ty);
    ty += lineHeight;
  }
  if (gapLines.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    for (const line of gapLines) {
      doc.text(line, MARGIN_X + padding, ty);
      ty += lineHeight;
    }
  }
  doc.setTextColor(...TEXT);
  return y + boxHeight + 4;
}

function drawFooter(doc: jsPDF, r: RankProjectionResponse) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Simulación generada con datos reales del periodo ${r.periodCode} • Uso interno`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 8,
      { align: 'center' },
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      PAGE_WIDTH - MARGIN_X,
      PAGE_HEIGHT - 8,
      { align: 'right' },
    );
  }
  doc.setTextColor(...TEXT);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}
