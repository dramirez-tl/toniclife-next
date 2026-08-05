/**
 * Genera el "Estado de cuenta de comisiones" de un periodo en PDF (jsPDF),
 * 100% del lado del cliente a partir de los datos ya cargados en la pantalla
 * de Comisiones. No requiere endpoint de backend.
 *
 * Sigue el estilo de marca: header teal, secciones con título, tabla con
 * encabezado oscuro y caja de total destacada.
 */

import { jsPDF } from 'jspdf';
import type { Commission, CommissionSummary } from '@/types/commissions';

const TEAL: [number, number, number] = [62, 102, 125]; // #3E667D
const TEAL_DARK: [number, number, number] = [47, 81, 101];
const SKY_LIGHT: [number, number, number] = [232, 240, 250];
const TEXT: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [110, 110, 110];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const TYPE_LABELS: Record<string, string> = {
  mlm: 'Comisión MLM',
  cedea_bonus: 'Bono CEDEA',
  auto_bonus: 'Bono automático',
  adjustment: 'Ajuste',
};
const STATUS_LABELS: Record<string, string> = {
  calculated: 'Calculada',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
};

export interface CommissionStatementInput {
  distributorName: string;
  distributorCode?: string | null;
  periodName: string;
  currencyCode: string;
  summary: CommissionSummary;
  commissions: Commission[];
  generatedAt: Date;
}

export function generateCommissionStatementPdf(
  input: CommissionStatementInput,
): void {
  const { currencyCode } = input;
  const locale = currencyCode === 'USD' ? 'en-US' : 'es-MX';
  const money = (v: string | number | undefined | null) => {
    const n = typeof v === 'string' ? parseFloat(v) : v ?? 0;
    return (Number.isFinite(n) ? (n as number) : 0).toLocaleString(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    });
  };

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = 0;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, PAGE_WIDTH, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Tonic Life', MARGIN_X, 15);
  doc.setFontSize(13);
  doc.text('Estado de cuenta de comisiones', MARGIN_X, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Generado: ${input.generatedAt.toLocaleString(locale)}`,
    PAGE_WIDTH - MARGIN_X,
    15,
    { align: 'right' },
  );
  doc.text(`Moneda: ${currencyCode}`, PAGE_WIDTH - MARGIN_X, 21, {
    align: 'right',
  });

  y = 44;

  // ── Datos del distribuidor + periodo ────────────────────────────────────
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(input.distributorName || 'Distribuidor', MARGIN_X, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (input.distributorCode) {
    doc.text(`ID: ${input.distributorCode}`, MARGIN_X, y + 5);
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEAL);
  doc.setFontSize(11);
  doc.text(`Periodo: ${input.periodName}`, PAGE_WIDTH - MARGIN_X, y, {
    align: 'right',
  });
  y += 12;

  // ── Resumen del periodo ─────────────────────────────────────────────────
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text('Resumen del periodo', MARGIN_X, y);
  y += 6;

  const s = input.summary;
  const rows: Array<[string, string]> = [
    ['Comisiones MLM', money(s.mlmCommissionsMxn)],
  ];
  if (parseFloat(s.cedeaBonusesMxn || '0') > 0)
    rows.push(['Bonos CEDEA', money(s.cedeaBonusesMxn)]);
  if (parseFloat(s.autoBonusesMxn || '0') > 0)
    rows.push(['Bonos automáticos', money(s.autoBonusesMxn)]);
  // !== 0 (no > 0): un ajuste NEGATIVO también debe listarse — antes quedaba
  // oculto del resumen aunque sí restaba en el neto (trampa del dictamen).
  if (parseFloat(s.adjustmentsMxn || '0') !== 0)
    rows.push(['Ajustes', money(s.adjustmentsMxn)]);
  rows.push(['Subtotal', money(s.totalSubtotalMxn)]);
  if (parseFloat(s.totalRetentions || '0') > 0)
    rows.push(['Retenciones (impuestos)', `- ${money(s.totalRetentions)}`]);
  // Retención por convenio con la empresa (Tesorería) — etiqueta genérica.
  // "(por aplicar)" cuando es proyección al cierre (aún sin pagar).
  if (parseFloat(s.companyWithholdings || '0') > 0)
    rows.push([
      `Retención por convenio con la empresa${s.withholdingsProjected ? ' (por aplicar)' : ''}`,
      `- ${money(s.companyWithholdings)}`,
    ]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setTextColor(...MUTED);
    doc.text(label, MARGIN_X + 2, y);
    doc.setTextColor(...TEXT);
    doc.text(value, PAGE_WIDTH - MARGIN_X - 2, y, { align: 'right' });
    y += 6;
  }

  // Total neto destacado
  y += 1;
  doc.setFillColor(...SKY_LIGHT);
  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL_DARK);
  doc.text('TOTAL NETO', MARGIN_X + 4, y + 8);
  doc.setFontSize(13);
  doc.text(
    `${money(s.netAfterWithholdings ?? s.totalNetMxn)} ${currencyCode}`,
    PAGE_WIDTH - MARGIN_X - 4,
    y + 8,
    { align: 'right' },
  );
  y += 18;

  // ── Detalle de comisiones ───────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text('Detalle', MARGIN_X, y);
  y += 4;

  // Encabezado de tabla
  const cols = [
    { label: 'Tipo', x: MARGIN_X + 2, align: 'left' as const },
    { label: 'Subtotal', x: MARGIN_X + 95, align: 'right' as const },
    { label: 'Retención', x: MARGIN_X + 130, align: 'right' as const },
    { label: 'Neto', x: MARGIN_X + 165, align: 'right' as const },
  ];
  const drawTableHeader = () => {
    doc.setFillColor(...TEAL_DARK);
    doc.rect(MARGIN_X, y, CONTENT_WIDTH, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    for (const c of cols) doc.text(c.label, c.x, y + 5.5, { align: c.align });
    y += 8;
  };
  drawTableHeader();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (input.commissions.length === 0) {
    doc.setTextColor(...MUTED);
    doc.text('Sin comisiones en este periodo.', MARGIN_X + 2, y + 6);
    y += 10;
  } else {
    let stripe = false;
    for (const c of input.commissions) {
      if (y > PAGE_HEIGHT - 25) {
        doc.addPage();
        y = 20;
        drawTableHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      if (stripe) {
        doc.setFillColor(246, 248, 250);
        doc.rect(MARGIN_X, y, CONTENT_WIDTH, 7, 'F');
      }
      stripe = !stripe;
      const retencion =
        (parseFloat(c.isrAmount || '0') || 0) +
        (parseFloat(c.ivaWithholding || '0') || 0) +
        (parseFloat(c.resicoAmount || '0') || 0);
      doc.setTextColor(...TEXT);
      const typeLabel = `${TYPE_LABELS[c.commissionType] || c.commissionType} · ${STATUS_LABELS[c.status] || c.status}`;
      doc.text(typeLabel, cols[0].x, y + 5, { align: 'left' });
      doc.text(money(c.subtotalEarnings), cols[1].x, y + 5, { align: 'right' });
      doc.text(retencion > 0 ? `- ${money(retencion)}` : '—', cols[2].x, y + 5, {
        align: 'right',
      });
      doc.setFont('helvetica', 'bold');
      doc.text(money(c.totalAmount), cols[3].x, y + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 7;
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      'Documento informativo generado por el distribuidor. No es un comprobante fiscal.',
      MARGIN_X,
      PAGE_HEIGHT - 10,
    );
    doc.text(`Página ${i} de ${pageCount}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 10, {
      align: 'right',
    });
  }

  const safePeriod = input.periodName.replace(/[^\w\d]+/g, '-').toLowerCase();
  doc.save(`estado-cuenta-comisiones-${safePeriod}.pdf`);
}
