'use client';

import { useMemo, Suspense, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useActiveBranches } from '@/hooks/useBranches';
import { useSales, useSalesStats, useSale, useUpdateSalePaymentMethod } from '@/hooks/usePos';
import { useAppSelector } from '@/store';
import { selectUserRoles } from '@/store';
import type { Sale, SaleEnrollment, SaleItem, SaleQueryParams, PosSaleStatus, PosPaymentMethod } from '@/types/pos';
import { posService } from '@/services/pos.service';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel, resolveTimeZone } from '@/lib/timezone-utils';
import { toast } from 'sonner';
import {
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  EyeIcon,
  XMarkIcon,
  UserIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  PrinterIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import type { SalesStatsTerminalRow } from '@/types/pos';

// ================================
// Terminal (licencia POS) que cobró la venta
// ================================

const SIN_TERMINAL_LABEL = 'Sin terminal (call center / corporativo)';

/** Nombre legible de una terminal: su etiqueta o el final de la clave. */
function terminalDisplayName(r: {
  posLicenseId: string | null;
  label: string | null;
  licenseKey: string | null;
}): string {
  if (!r.posLicenseId) return SIN_TERMINAL_LABEL;
  if (r.label?.trim()) return r.label.trim();
  return r.licenseKey ? `Terminal ${r.licenseKey.slice(-9)}` : 'Terminal';
}

/** Texto de la columna/CSV "Terminal" de una venta. */
function saleTerminalName(sale: Sale): string {
  if (sale.saleNumber?.startsWith('M-')) return 'Migrada';
  if (!sale.posLicenseId) return SIN_TERMINAL_LABEL;
  return terminalDisplayName({
    posLicenseId: sale.posLicenseId,
    label: sale.posLicenseLabel ?? null,
    licenseKey: sale.posLicenseKey ?? null,
  });
}

/** Une las filas por terminal (el API agrupa además por moneda). */
function mergeTerminalRows(rows: SalesStatsTerminalRow[]): SalesStatsTerminalRow[] {
  const byId = new Map<string, SalesStatsTerminalRow>();
  for (const r of rows) {
    const key = r.posLicenseId ?? 'none';
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, { ...r });
    } else {
      prev.count += r.count;
      prev.total += r.total;
      prev.cancelledCount += r.cancelledCount;
    }
  }
  return [...byId.values()].filter((r) => r.count > 0 || r.cancelledCount > 0);
}

function TerminalCell({ sale }: { sale: Sale }) {
  if (sale.saleNumber?.startsWith('M-')) {
    return <span className="text-xs text-gray-400">Migrada</span>;
  }
  if (!sale.posLicenseId) {
    return (
      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
        Call center / corporativo
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5" title={sale.posLicenseKey}>
      <ComputerDesktopIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-900">{saleTerminalName(sale)}</span>
    </div>
  );
}

// ================================
// Helpers
// ================================

const formatCurrency = (amount: number, currencyCode = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);

/** Puntos de la venta = suma de puntos × cantidad de sus renglones. OJO: `accumulatedPoints`
 *  del API es el SALDO del periodo después de la venta, no los puntos de la venta. */
const salePointsOf = (sale: Sale): number =>
  (sale.items ?? []).reduce((s, it) => s + (Number(it.points) || 0) * (Number(it.quantity) || 0), 0);

const formatDate = (dateStr: string, timezone: string = DEFAULT_TIMEZONE) =>
  new Date(dateStr).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: resolveTimeZone(timezone),
  });

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
  mixed: 'Mixto',
  cashback: 'Cashback',
  promotion: 'Promoción',
  mercado_pago: 'Mercado Pago',
  usd_cash: 'Pago en Dólares',
  undefined: 'Sin Definir',
};

const PAYMENT_BADGE_STYLES: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  transfer: 'bg-purple-100 text-purple-700',
  credit: 'bg-orange-100 text-orange-700',
  mixed: 'bg-teal-100 text-teal-700',
  cashback: 'bg-cyan-100 text-cyan-700',
  promotion: 'bg-pink-100 text-pink-700',
  mercado_pago: 'bg-sky-100 text-sky-700',
  usd_cash: 'bg-emerald-100 text-emerald-700',
  undefined: 'bg-gray-100 text-gray-500',
};

const PaymentIcon = ({ method }: { method: string }) => {
  const cls = 'h-3 w-3';
  switch (method) {
    case 'cash': return <BanknotesIcon className={cls} />;
    case 'card': return <CreditCardIcon className={cls} />;
    case 'transfer': return <ArrowsRightLeftIcon className={cls} />;
    default: return <CurrencyDollarIcon className={cls} />;
  }
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  partial_refund: 'Reemb. parcial',
  pending: 'Pendiente',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-yellow-100 text-yellow-700',
  partial_refund: 'bg-orange-100 text-orange-700',
  pending: 'bg-gray-100 text-gray-600',
};

const StatusIcon = ({ status }: { status: string }) => {
  const cls = 'h-3 w-3';
  switch (status) {
    case 'completed': return <CheckCircleIcon className={cls} />;
    case 'cancelled': return <XCircleIcon className={cls} />;
    default: return <ClockIcon className={cls} />;
  }
};

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'refunded', label: 'Reembolsada' },
  { value: 'pending', label: 'Pendiente' },
];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit', label: 'Crédito' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'promotion', label: 'Promoción' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'usd_cash', label: 'Pago en Dólares' },
  { value: 'undefined', label: 'Sin Definir' },
];

// ================================
// CSV Export
// ================================

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(sale: Sale, timezone: string = DEFAULT_TIMEZONE): string {
  const tz = resolveTimeZone(timezone);
  const cols = [
    sale.saleNumber,
    sale.createdAt ? new Date(sale.createdAt).toLocaleString('es-MX', { timeZone: tz }) : '',
    getTimezoneShortLabel(timezone),
    sale.branchName,
    sale.cashRegisterName,
    saleTerminalName(sale),
    sale.sellerName,
    sale.customerName ?? 'Público general',
    sale.customerNumber ?? '',
    sale.customerRfc ?? '',
    STATUS_LABELS[sale.status] ?? sale.status,
    PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod,
    sale.subtotal,
    sale.discountAmount,
    sale.discountPercent ?? '',
    sale.discountReason ?? '',
    sale.taxAmount,
    sale.total,
    sale.currencyCode ?? 'MXN',
    sale.items?.length ?? sale.itemsCount ?? '',
    sale.requiresInvoice ? 'Sí' : 'No',
    sale.invoiceUuid ? 'Sí' : 'No',
    sale.invoiceUuid ?? '',
    sale.notes ?? '',
    sale.cancellationReason ?? '',
    sale.cancelledByName ?? '',
    sale.cancelledAt ? new Date(sale.cancelledAt).toLocaleString('es-MX', { timeZone: tz }) : '',
  ];
  return cols.map(escapeCsv).join(',');
}

const CSV_HEADERS = [
  'No. Venta',
  'Fecha',
  'Zona Horaria',
  'Sucursal',
  'Caja',
  'Terminal',
  'Vendedor',
  'Cliente',
  'No. Cliente',
  'RFC',
  'Estado',
  'Método de Pago',
  'Subtotal',
  'Descuento',
  '% Descuento',
  'Motivo Descuento',
  'IVA',
  'Total',
  'Moneda',
  'No. Productos',
  'Requiere Factura',
  'Timbrada',
  'UUID Factura',
  'Notas',
  'Motivo Cancelación',
  'Cancelada por',
  'Fecha Cancelación',
].join(',');

function downloadCsv(rows: Sale[], filename: string, getBranchTz: (branchName: string) => string) {
  const lines = [CSV_HEADERS, ...rows.map(s => buildCsvRow(s, getBranchTz(s.branchName)))];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ================================
// Sale Detail Modal
// ================================

/**
 * Reimpresión del ticket POS desde el admin: abre una ventana imprimible con el
 * formato de ticket térmico (no es comprobante fiscal). Usa los datos del detalle
 * de la venta (items, totales, pagos, puntos).
 */
/**
 * HTML del ticket de la venta (80 mm, monoespaciado). Lo usan la vista previa
 * en línea (sin auto-impresión) y "Imprimir / PDF" (abre la ventana de
 * impresión del navegador, donde se elige la impresora o "Guardar como PDF").
 */
function buildSaleTicketHtml(sale: Sale, branchTz: string, opts: { autoPrint: boolean }): string {
  const currency = sale.currencyCode || 'MXN';
  const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"]/g, (ch) =>
      ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
    );
  const money = (n: number) => esc(formatCurrency(n, currency));
  const dateStr = (() => {
    try {
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: branchTz || 'America/Mexico_City',
      }).format(new Date(sale.createdAt));
    } catch {
      return new Date(sale.createdAt).toLocaleString('es-MX');
    }
  })();

  const itemsHtml = (sale.items ?? [])
    .map(
      (it) => `
      <div class="it">
        <div class="it-name">${esc(it.productName)}</div>
        <div class="it-line"><span>${esc(it.quantity)} x ${money(it.unitPrice)}</span><span>${money(it.total)}</span></div>
      </div>`,
    )
    .join('');

  const paymentsHtml = (sale.payments ?? [])
    .map(
      (p) =>
        `<div class="row"><span>${esc(PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod)}</span><span>${money(p.amount)}</span></div>`,
    )
    .join('');

  const cash = (sale.payments ?? []).reduce(
    (s, p) => s + (p.amountReceived ?? 0),
    0,
  );
  const change = (sale.payments ?? []).reduce(
    (s, p) => s + (p.changeGiven ?? 0),
    0,
  );
  const taxLabel = currency === 'USD' ? 'Sales tax' : 'IVA';

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" />
  <title>Ticket ${esc(sale.saleNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { width: 80mm; margin: 0 auto; padding: 8px 10px; font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .lg { font-size: 14px; }
    .muted { color: #444; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .it { margin-bottom: 4px; }
    .it-name { }
    .it-line { display: flex; justify-content: space-between; gap: 8px; }
    .tot { font-size: 14px; }
    .reprint { border: 1px solid #000; padding: 2px 6px; display: inline-block; margin-top: 4px; font-size: 10px; }
  </style></head><body>
    <div class="c b lg">TONIC LIFE</div>
    <div class="c">${esc(sale.branchName ?? '')}</div>
    <div class="c reprint">REIMPRESIÓN · No es comprobante fiscal</div>
    <hr />
    <div class="row"><span class="muted">Folio</span><span class="b">${esc(sale.saleNumber)}</span></div>
    <div class="row"><span class="muted">Fecha</span><span>${esc(dateStr)}</span></div>
    <div class="row"><span class="muted">Cliente</span><span>${esc(sale.customerName || 'Público general')}${sale.customerNumber ? ' #' + esc(sale.customerNumber) : ''}</span></div>
    ${sale.sellerName ? `<div class="row"><span class="muted">Atendió</span><span>${esc(sale.sellerName)}</span></div>` : ''}
    <hr />
    ${itemsHtml || '<div class="muted">(sin productos)</div>'}
    <hr />
    <div class="row"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
    ${sale.discountAmount > 0 ? `<div class="row"><span>Descuento</span><span>-${money(sale.discountAmount)}</span></div>` : ''}
    <div class="row"><span>${taxLabel}</span><span>${money(sale.taxAmount)}</span></div>
    <div class="row b tot"><span>TOTAL</span><span>${money(sale.total)} ${esc(currency)}</span></div>
    <hr />
    ${paymentsHtml}
    ${cash > 0 ? `<div class="row"><span>Recibido</span><span>${money(cash)}</span></div>` : ''}
    ${change > 0 ? `<div class="row"><span>Cambio</span><span>${money(change)}</span></div>` : ''}
    ${
      sale.accumulatedPoints != null
        ? `<hr /><div class="row"><span>Puntos de la venta</span><span class="b">+${esc(salePointsOf(sale).toLocaleString('es-MX'))}</span></div>${
            sale.pointsBalanceAfter != null
              ? `<div class="row muted"><span>Saldo del periodo</span><span>${esc(Number(sale.pointsBalanceBefore ?? 0).toLocaleString('es-MX'))} → ${esc(Number(sale.pointsBalanceAfter).toLocaleString('es-MX'))}</span></div>`
              : `<div class="row muted"><span>Saldo del periodo tras la venta</span><span>${esc(Number(sale.accumulatedPoints).toLocaleString('es-MX'))}</span></div>`
          }`
        : ''
    }
    <hr />
    <div class="c">¡Gracias por su compra!</div>
    <div class="c muted" style="font-size:10px">Reimpreso ${esc(new Date().toLocaleString('es-MX'))}</div>
    ${opts.autoPrint ? '<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 150); };</script>' : ''}
  </body></html>`;
  return html;
}

/** Abre el ticket en una ventana e imprime (o "Guardar como PDF" desde el diálogo). */
function printSaleTicket(sale: Sale, branchTz: string) {
  const html = buildSaleTicketHtml(sale, branchTz, { autoPrint: true });
  const w = window.open('', '_blank', 'width=380,height=680');
  if (!w) {
    toast.error('Permite las ventanas emergentes para imprimir el ticket');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Celda compacta del resumen (conteos / ticket promedio). */
function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'text-gray-900',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="min-w-0 border-gray-100 px-4 py-3 [&:nth-child(even)]:border-l md:[&:not(:first-child)]:border-l">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        {label}
      </div>
      <p className={`mt-0.5 truncate text-2xl font-bold leading-tight ${tone}`} title={value}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** Etiqueta + control de la barra de filtros (misma altura y ancho en la cuadrícula). */
function FilterField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid min-w-0 gap-1 ${className}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </div>
  );
}

/** Vista previa del ticket (mismo HTML que se imprime) dentro de un iframe aislado. */
function SaleTicketPreview({ sale, branchTz }: { sale: Sale; branchTz: string }) {
  const html = useMemo(() => buildSaleTicketHtml(sale, branchTz, { autoPrint: false }), [sale, branchTz]);
  return (
    <iframe
      title={`Ticket ${sale.saleNumber}`}
      srcDoc={html}
      sandbox=""
      className="h-[560px] w-full rounded-lg border border-gray-200 bg-white shadow-inner"
    />
  );
}

/**
 * Detalle de la venta desplegado EN LÍNEA debajo de su renglón (Contabilidad,
 * 26-oct-2026: sin modal ni otra pantalla), con la vista previa del ticket y
 * el botón para imprimirlo o guardarlo en PDF.
 */
const ENROLLEE_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  pending: { label: 'Pendiente de activar', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  inactive: { label: 'Inactivo', cls: 'bg-gray-100 text-gray-600 ring-gray-400/30' },
  suspended: { label: 'Suspendido', cls: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
};
const KIT_POSITION_LABEL: Record<string, string> = { basic: 'Básico', premium: 'Premium' };

/**
 * Venta con kit de inscripción (27-oct-2026): a quién inscribió ese kit. El
 * inscrito es el cliente de la venta (el cobro del kit lo activa); si el kit
 * se vendió a Público general no inscribe a nadie y se avisa.
 */
function SaleEnrollmentCard({ enrollment, saleDate }: { enrollment: SaleEnrollment; saleDate?: string }) {
  const c = enrollment.customer;
  const kits = enrollment.kits
    .map((k) => `${k.name} (${k.code}${k.kitPosition ? ` · ${KIT_POSITION_LABEL[k.kitPosition] ?? k.kitPosition}` : ''}${k.quantity > 1 ? ` ×${k.quantity}` : ''})`)
    .join(', ');
  if (!c) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-medium text-amber-700 mb-1">Kit de inscripción sin inscrito</p>
        <p className="text-sm text-amber-800">{kits}</p>
        <p className="text-xs text-amber-700 mt-1">
          Se vendió a Público general: no activa a ningún distribuidor ni genera bono de inscripción. Si fue una inscripción real, hay que
          ligarla al nuevo distribuidor (registrarlo y volver a cobrar el kit a su número).
        </p>
      </div>
    );
  }
  const status = ENROLLEE_STATUS[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600 ring-gray-400/30' };
  const sameDay = !!saleDate && !!c.registrationDate && saleDate.slice(0, 10) === c.registrationDate.slice(0, 10);
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-emerald-800">Inscripción con kit · {kits}</p>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.cls}`}>{status.label}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-gray-500">Nuevo inscrito</p>
          <Link
            href={`/admin/distribuidores/${c.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#3E667D] hover:underline"
            title="Ver la ficha (pestaña nueva)"
          >
            <span className="font-mono">{c.customerNumber}</span> {c.fullName}
          </Link>
          <p className="text-xs text-gray-500">
            Alta {c.registrationDate ? c.registrationDate.slice(0, 10).split('-').reverse().join('/') : '—'}
            {sameDay ? ' · el mismo día de la venta' : ''}
            {c.kitType ? ` · kit en ficha: ${KIT_POSITION_LABEL[c.kitType] ?? c.kitType}` : ''}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Patrocinador</p>
          {c.sponsorId ? (
            <Link
              href={`/admin/distribuidores/${c.sponsorId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#3E667D] hover:underline"
              title="Ver la ficha del patrocinador (pestaña nueva)"
            >
              <span className="font-mono">{c.sponsorNumber}</span> {c.sponsorName}
            </Link>
          ) : (
            <p className="text-gray-400">Sin patrocinador</p>
          )}
          <p className="text-xs text-gray-500">
            Sucursal de la ficha: {c.branchCode ? `${c.branchCode} · ${c.branchName ?? ''}` : '—'}
            {c.countryCode ? ` (${c.countryCode})` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

function SaleDetailPanel({ sale, onClose, branchTz = DEFAULT_TIMEZONE }: { sale: Sale; onClose: () => void; branchTz?: string }) {
  // El row de la lista no trae items ni puntos; al desplegar, traemos el
  // detalle completo (GET /pos/sales/:id). Mientras carga se usa el row.
  const { data: detail } = useSale(sale.id, !!sale.id);

  const view = detail ?? sale;
  // (salePointsOf: puntos de la venta = suma de puntos × cantidad de sus renglones)
  const currency = view.currencyCode || 'MXN';

  const itemColumns: DataTableColumn<SaleItem>[] = [
    {
      key: 'product',
      header: 'Producto',
      headerClassName: 'text-left px-4 py-2.5 text-xs font-medium text-gray-500',
      cellClassName: 'px-4 py-3',
      render: (item) => (
        <>
          <p className="font-medium text-gray-900">{item.productName}</p>
          <p className="text-xs text-gray-400">{item.productSku}</p>
          {item.lotNumber && <p className="text-xs text-gray-400">Lote: {item.lotNumber}</p>}
        </>
      ),
    },
    {
      key: 'quantity',
      header: 'Cant.',
      headerClassName: 'text-center px-3 py-2.5 text-xs font-medium text-gray-500',
      cellClassName: 'px-3 py-3 text-center text-gray-700',
      render: (item) => item.quantity,
    },
    {
      key: 'unitPrice',
      header: 'P. Unit.',
      headerClassName: 'text-right px-3 py-2.5 text-xs font-medium text-gray-500',
      cellClassName: 'px-3 py-3 text-right text-gray-700',
      render: (item) => formatCurrency(item.unitPrice, currency),
    },
    {
      key: 'points',
      // pos_sale_items.points es POR UNIDAD (igual que P. Unit.): se muestra
      // el total de la línea (pts × cantidad) para no confundir con qty > 1.
      header: 'Puntos',
      headerClassName: 'text-right px-3 py-2.5 text-xs font-medium text-gray-500',
      cellClassName: 'px-3 py-3 text-right text-gray-700',
      render: (item) =>
        item.points != null
          ? (Number(item.points) * (Number(item.quantity) || 1)).toLocaleString('es-MX')
          : '—',
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-right px-4 py-2.5 text-xs font-medium text-gray-500',
      cellClassName: 'px-4 py-3 text-right font-medium text-gray-900',
      render: (item) => formatCurrency(item.total, currency),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#3E667D]/20 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{sale.saleNumber}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[sale.status] || 'bg-gray-100 text-gray-700'}`}>
                <StatusIcon status={sale.status} />
                {STATUS_LABELS[sale.status] ?? sale.status}
              </span>
              {sale.requiresInvoice && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <DocumentTextIcon className="h-3 w-3" />
                  Factura
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{formatDate(sale.createdAt, branchTz)}<span className="text-gray-400"> · {getTimezoneShortLabel(branchTz)}</span></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Plegar"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo: detalle a la izquierda, ticket a la derecha */}
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Sucursal / Caja</p>
              <p className="font-medium text-gray-900 text-sm">{sale.branchName}</p>
              <p className="text-xs text-gray-500">{sale.cashRegisterName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Vendedor</p>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <p className="font-medium text-gray-900 text-sm">{sale.sellerName}</p>
                {/* Canal de captura: terminal de la sucursal (firma con su
                    licencia) vs cuenta personal (modo staff / call center). */}
                {sale.saleNumber?.startsWith('M-') ? (
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                    Migrada
                  </span>
                ) : sale.capturedVia === 'usuario' ? (
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                    Call center / corporativo
                  </span>
                ) : sale.capturedVia === 'terminal' ? (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                    Terminal de sucursal
                  </span>
                ) : null}
              </div>
              {/* Terminal (licencia) que cobró: separa cajas en sucursales con varias. */}
              {sale.capturedVia === 'terminal' && sale.posLicenseId && (
                <p className="text-xs text-gray-500 mt-1" title={sale.posLicenseKey}>
                  Terminal: {saleTerminalName(sale)}
                </p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Cliente</p>
              {sale.customerName ? (
                <>
                  <p className="font-medium text-gray-900 text-sm">{sale.customerName}</p>
                  {sale.customerNumber && <p className="text-xs text-gray-500">#{sale.customerNumber}</p>}
                  {sale.customerRfc && <p className="text-xs text-gray-500">RFC: {sale.customerRfc}</p>}
                </>
              ) : (
                <p className="text-sm text-gray-400">Público general</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Pago</p>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_BADGE_STYLES[sale.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                <PaymentIcon method={sale.paymentMethod} />
                {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
              </span>
            </div>
          </div>

          {/* Kit de inscripción: a quién inscribió (o aviso si fue a Público general) */}
          {view.enrollment && <SaleEnrollmentCard enrollment={view.enrollment} saleDate={view.createdAt} />}

          {/* Items (ticket) */}
          {view.items && view.items.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Productos</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <DataTable<SaleItem>
                  columns={itemColumns}
                  data={view.items}
                  getRowKey={(item, i) => String(item.id ?? i)}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Cargando productos…</p>
          )}

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(view.subtotal, currency)}</span>
            </div>
            {view.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <ReceiptPercentIcon className="h-3.5 w-3.5" />
                  Descuento{view.discountPercent ? ` (${view.discountPercent}%)` : ''}
                </span>
                <span>-{formatCurrency(view.discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>{currency === 'USD' ? 'Sales tax' : 'IVA'}</span>
              <span>{formatCurrency(view.taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2 mt-2">
              <span>Total</span>
              <span className="text-[#3E667D]">{formatCurrency(view.total, currency)}</span>
            </div>
          </div>

          {/* Puntos generados por la venta (MLM). OJO: accumulatedPoints es el
              SALDO del periodo después de la venta (no los puntos de la venta);
              los puntos de la venta salen de sus renglones (puntos × cantidad). */}
          {view.accumulatedPoints != null && (
            <div className="rounded-xl border border-[#a7c1e2] bg-[#C8DDF2]/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-[#3E667D]" />
                  <div>
                    <p className="text-sm font-semibold text-[#2f5165]">Puntos de la venta</p>
                    <p className="text-xs text-gray-500">
                      Se acreditan al periodo del distribuidor{sale.customerName ? '' : ' (solo ventas con cliente distribuidor)'}.
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-[#3E667D]">
                  +{salePointsOf(view).toLocaleString('es-MX')}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#a7c1e2]/60 pt-3 text-sm">
                <span className="text-gray-600">Saldo del periodo tras la venta</span>
                <span className="font-medium text-gray-900">
                  {view.pointsBalanceAfter != null ? (
                    <>
                      {Number(view.pointsBalanceBefore ?? 0).toLocaleString('es-MX')}
                      <span className="mx-1.5 text-gray-400">→</span>
                      <span className="text-[#3E667D] font-bold">
                        {Number(view.pointsBalanceAfter).toLocaleString('es-MX')}
                      </span>
                    </>
                  ) : (
                    <span className="text-[#3E667D] font-bold">
                      {Number(view.accumulatedPoints).toLocaleString('es-MX')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Invoice info */}
          {sale.invoiceUuid && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-700 mb-1">Factura timbrada</p>
              <p className="text-xs text-blue-600 font-mono break-all">{sale.invoiceUuid}</p>
            </div>
          )}

          {/* Cancellation info */}
          {sale.status === 'cancelled' && (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs font-medium text-red-700 mb-1">Motivo de cancelación</p>
              <p className="text-sm text-red-600">{sale.cancellationReason || 'Sin motivo registrado'}</p>
              {sale.cancelledByName && (
                <p className="text-xs text-red-500 mt-1">Por: {sale.cancelledByName}</p>
              )}
              {sale.cancelledAt && (
                <p className="text-xs text-red-500">{formatDate(sale.cancelledAt, branchTz)}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="text-xs font-medium text-yellow-700 mb-1">Notas</p>
              <p className="text-sm text-yellow-800">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Ticket: vista previa + imprimir / PDF */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Ticket</h3>
            <span className="text-xs text-gray-400">Vista previa · reimpresión</span>
          </div>
          {view.items && view.items.length > 0 ? (
            <SaleTicketPreview sale={view} branchTz={branchTz} />
          ) : (
            <div className="flex h-[560px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
              Cargando ticket…
            </div>
          )}
          <Button
            className="w-full"
            onClick={() => printSaleTicket(view, branchTz)}
            disabled={!view.items || view.items.length === 0}
            title="Abre el diálogo de impresión: elige la impresora o 'Guardar como PDF'"
          >
            <PrinterIcon className="h-4 w-4" />
            Imprimir / guardar PDF
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Plegar detalle
          </Button>
        </div>
        </div>
    </div>
  );
}

// ================================
// Edit Payment Method Modal
// ================================

interface EditPaymentModalProps {
  sale: Sale | null;
  onClose: () => void;
  onConfirm: (paymentMethod: string) => void;
  isPending: boolean;
}

function EditPaymentModal({ sale, onClose, onConfirm, isPending }: EditPaymentModalProps) {
  const [selected, setSelected] = useState(sale?.paymentMethod ?? 'cash');

  if (!sale) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle>Editar método de pago</DialogTitle>
        <DialogDescription>
          Venta <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
        </DialogDescription>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                selected === opt.value
                  ? 'border-[#3E667D] bg-[#3E667D]/5 text-[#3E667D]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selected === opt.value ? 'bg-[#3E667D]' : 'bg-gray-300'}`} />
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={() => onConfirm(selected)}
            disabled={isPending || selected === sale.paymentMethod}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ================================
// Page
// ================================

export default function VentasReportesPage() {
  return (
    <Suspense>
      <VentasReportesContent />
    </Suspense>
  );
}

function VentasReportesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    branch: 'all',
    terminal: 'all',
    status: 'all',
    paymentMethod: 'all',
    customerNumber: '',
    search: '',
    page: '1',
    limit: '20',
  });

  const userRoles = useAppSelector(selectUserRoles);
  const canEditPayment = userRoles.some((r) => r === 'admin' || r === 'super_admin');

  const selectedBranch = get('branch');
  const selectedStatus = get('status');
  const selectedPaymentMethod = get('paymentMethod');
  const selectedCustomerNumber = get('customerNumber');
  const selectedSearch = get('search');
  // Fechas OPCIONALES (Contabilidad, 26-oct-2026): sin fechas se listan todas
  // las ventas; el buscador por folio no necesita rango.
  const dateFrom = get('dateFrom') || '';
  const dateTo = get('dateTo') || '';
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  // Filtro por terminal (licencia POS): UUID = una caja; 'none' = capturadas
  // sin licencia (call center / corporativo); 'all' = sin filtro. Solo aplica
  // con una sucursal elegida (las etiquetas son por sucursal).
  const selectedTerminal = selectedBranch !== 'all' ? get('terminal') : 'all';
  const terminalFilter = useMemo<Pick<SaleQueryParams, 'posLicenseId' | 'capturedVia'>>(() => {
    if (selectedTerminal === 'none') return { capturedVia: 'usuario' };
    if (selectedTerminal && selectedTerminal !== 'all') return { posLicenseId: selectedTerminal };
    return {};
  }, [selectedTerminal]);

  // Detalle desplegado en línea (varias ventas a la vez).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [customerNumberInput, setCustomerNumberInput] = useState(selectedCustomerNumber);
  const [searchInput, setSearchInput] = useState(selectedSearch);

  // Sync input when URL param changes externally (e.g. navigating with ?customerNumber=...)
  useEffect(() => { setCustomerNumberInput(selectedCustomerNumber); }, [selectedCustomerNumber]);
  useEffect(() => { setSearchInput(selectedSearch); }, [selectedSearch]);
  const applySearch = useCallback(
    (value: string) => setParams({ search: value.trim(), page: '1' }),
    [setParams],
  );
  const { mutate: updatePaymentMethod, isPending: isUpdating } = useUpdateSalePaymentMethod();

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const baseParams = {
        branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
        ...terminalFilter,
        status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
        paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
        customerNumber: selectedCustomerNumber || undefined,
        search: selectedSearch || undefined,
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      // Paginar TODAS las ventas que cumplen el filtro (antes truncaba a 5000).
      const PAGE_SIZE = 500;
      const MAX_PAGES = 200; // backstop 100k filas
      const first = await posService.getSales({ ...baseParams, page: 1, limit: PAGE_SIZE });
      const all: Sale[] = [...first.data];
      const totalPages = first.totalPages ?? 1;
      for (let p = 2; p <= Math.min(totalPages, MAX_PAGES); p++) {
        const res = await posService.getSales({ ...baseParams, page: p, limit: PAGE_SIZE });
        all.push(...res.data);
      }

      if (!all.length) {
        toast.info('No hay ventas para exportar con los filtros actuales');
        return;
      }
      const filename = `ventas_${dateFrom || 'inicio'}_${dateTo || 'hoy'}.csv`;
      downloadCsv(all, filename, (name) => branches.find(b => b.name === name)?.timezone || DEFAULT_TIMEZONE);
      toast.success(`${all.length} ventas exportadas`);
    } catch {
      toast.error('Error al exportar ventas');
    } finally {
      setIsExporting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, terminalFilter, selectedStatus, selectedPaymentMethod, selectedCustomerNumber, selectedSearch, dateFrom, dateTo]);

  const handleEditPaymentConfirm = useCallback(
    (paymentMethod: string) => {
      if (!editingSale) return;
      updatePaymentMethod(
        { id: editingSale.id, paymentMethod },
        {
          onSuccess: () => {
            toast.success(`Método de pago actualizado a "${PAYMENT_LABELS[paymentMethod] ?? paymentMethod}"`);
            setEditingSale(null);
          },
          onError: () => {
            toast.error('No se pudo actualizar el método de pago');
          },
        },
      );
    },
    [editingSale, updatePaymentMethod],
  );

  const { data: branches = [] } = useActiveBranches();

  const queryParams = useMemo<SaleQueryParams>(() => ({
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
    ...terminalFilter,
    status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
    paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
    customerNumber: selectedCustomerNumber || undefined,
    search: selectedSearch || undefined,
    fromDate: dateFrom || undefined,
    toDate: dateTo || undefined,
    page: currentPage,
    limit: pageSize,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [selectedBranch, terminalFilter, selectedStatus, selectedPaymentMethod, selectedCustomerNumber, selectedSearch, dateFrom, dateTo, currentPage, pageSize]);

  // Stats server-side (dictamen 3.3.1): SUM/COUNT por moneda y estado con los
  // MISMOS filtros — antes se bajaban hasta 5000 filas y se sumaban en el
  // cliente, subreportando en silencio cuando el filtro excedía el tope.
  // `breakdownParams` = los mismos filtros SIN el de terminal: alimenta el
  // selector de terminales y la tabla "Ventas por terminal" de la sucursal.
  const breakdownParams = useMemo<SaleQueryParams>(() => ({
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
    status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
    paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
    customerNumber: selectedCustomerNumber || undefined,
    search: selectedSearch || undefined,
    fromDate: dateFrom || undefined,
    toDate: dateTo || undefined,
  }), [selectedBranch, selectedStatus, selectedPaymentMethod, selectedCustomerNumber, selectedSearch, dateFrom, dateTo]);
  const statsQueryParams = useMemo<SaleQueryParams>(
    () => ({ ...breakdownParams, ...terminalFilter }),
    [breakdownParams, terminalFilter],
  );

  const { data: salesData, isLoading, isFetching } = useSales(queryParams);
  const { data: statsData, isLoading: isStatsLoading } = useSalesStats(statsQueryParams);
  const { data: breakdownData } = useSalesStats(breakdownParams, selectedBranch !== 'all');
  const terminalRows = useMemo(
    () => mergeTerminalRows(breakdownData?.byTerminal ?? []),
    [breakdownData],
  );
  const terminalOptions = useMemo(
    () =>
      terminalRows.map((r) => ({
        value: r.posLicenseId ?? 'none',
        label: `${terminalDisplayName(r)} (${r.count.toLocaleString()})`,
      })),
    [terminalRows],
  );

  const sales = salesData?.data ?? [];
  const totalCount = salesData?.total ?? 0;

  // Summary stats — agregados del servidor sobre TODAS las filas del filtro.
  const pageStats = useMemo(() => {
    const rows = statsData?.byCurrencyStatus ?? [];
    const isCancelled = (s: string) => s === 'cancelled' || s === 'refunded';

    const totals: Record<string, number> = {};
    const cancelledTotals: Record<string, number> = {};
    let activeCount = 0;
    let cancelledCount = 0;
    let mxnActiveCount = 0;

    for (const r of rows) {
      const c = r.currencyCode || 'MXN';
      if (isCancelled(r.status)) {
        cancelledTotals[c] = (cancelledTotals[c] || 0) + r.total;
        cancelledCount += r.count;
      } else {
        totals[c] = (totals[c] || 0) + r.total;
        activeCount += r.count;
        if (c === 'MXN') mxnActiveCount += r.count;
      }
    }

    const avgTicketMXN =
      mxnActiveCount > 0 ? (totals['MXN'] || 0) / mxnActiveCount : 0;

    const allCurrencies = Array.from(
      new Set([...Object.keys(totals), ...Object.keys(cancelledTotals)])
    ).sort((a, b) => (a === 'MXN' ? -1 : b === 'MXN' ? 1 : a.localeCompare(b)));

    return {
      totals,
      cancelledTotals,
      activeCount,
      cancelledCount,
      avgTicketMXN,
      currencies: allCurrencies,
    };
  }, [statsData]);

  // ================================
  // Table columns
  // ================================

  const columns: DataTableColumn<Sale>[] = useMemo(() => [
    {
      key: 'saleNumber',
      header: 'No. Venta',
      sortable: true,
      sortValue: (sale) => sale.saleNumber,
      render: (sale) => (
        <div className="flex items-start gap-2">
          <div>
            <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
            {(() => { const tz = branches.find(b => b.name === sale.branchName)?.timezone || DEFAULT_TIMEZONE; return <p className="text-xs text-gray-500 mt-0.5">{formatDate(sale.createdAt, tz)}<span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span></p>; })()}
          </div>
          <button
            type="button"
            title={expandedIds.has(sale.id) ? 'Plegar detalle' : 'Ver detalle'}
            onClick={() => toggleExpanded(sale.id)}
            className={`mt-0.5 p-1 rounded hover:bg-[#3E667D]/10 transition-colors flex-shrink-0 ${expandedIds.has(sale.id) ? 'text-[#3E667D]' : 'text-gray-400 hover:text-[#3E667D]'}`}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Sucursal',
      render: (sale) => (
        <div className="flex items-center gap-2">
          <BuildingStorefrontIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-900">{sale.branchName}</span>
        </div>
      ),
    },
    {
      key: 'terminal',
      header: 'Terminal',
      render: (sale) => <TerminalCell sale={sale} />,
    },
    {
      key: 'customer',
      header: 'Cliente',
      sortable: true,
      sortValue: (sale) => sale.customerName || '',
      render: (sale) =>
        sale.customerName ? (
          <div>
            <p className="font-medium text-gray-900 text-sm">{sale.customerName}</p>
            {sale.customerNumber && (
              <p className="text-xs text-gray-500">#{sale.customerNumber}</p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">Público general</span>
        ),
    },
    {
      key: 'seller',
      header: 'Vendedor',
      render: (sale) => <span className="text-sm text-gray-700">{sale.sellerName}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Pago',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (sale) => (
        <div className="inline-flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_BADGE_STYLES[sale.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
            <PaymentIcon method={sale.paymentMethod} />
            {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
          </span>
          {canEditPayment && sale.status !== 'cancelled' && (
            <button
              type="button"
              title="Editar método de pago"
              onClick={() => setEditingSale(sale)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#3E667D] transition-colors"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      sortValue: (sale) => sale.total,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (sale) => (
        <div className="flex items-center justify-end gap-1.5">
          <span className="font-semibold text-gray-900">{formatCurrency(sale.total, sale.currencyCode)}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            {sale.currencyCode || 'MXN'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (sale) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[sale.status] || 'bg-gray-100 text-gray-700'}`}>
          <StatusIcon status={sale.status} />
          {STATUS_LABELS[sale.status] ?? sale.status}
        </span>
      ),
    },
  ], [canEditPayment, expandedIds, toggleExpanded, setEditingSale, branches]);

  return (
    <>
    {editingSale && (
      <EditPaymentModal
        sale={editingSale}
        onClose={() => setEditingSale(null)}
        onConfirm={handleEditPaymentConfirm}
        isPending={isUpdating}
      />
    )}
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCartIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Ventas POS</h1>
              </div>
              <p className="text-white/80 text-lg">
                Todas las ventas de las sucursales: busca por folio, filtra por fechas si quieres y despliega el detalle con un clic
              </p>
            </div>
            <Link href="/admin/reportes">
              <Button variant="secondary">Volver a Reportes</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resumen compacto (26-oct-2026): conteos y montos por moneda en una sola franja */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-4">
              <StatTile
                label="Total ventas"
                icon={ShoppingCartIcon}
                value={isLoading ? '…' : totalCount.toLocaleString()}
                hint={dateFrom || dateTo ? 'en el rango de fechas' : 'sin fechas = todas'}
              />
              <StatTile
                label="Completadas"
                icon={CheckCircleIcon}
                tone="text-green-600"
                value={isStatsLoading ? '…' : pageStats.activeCount.toLocaleString()}
                hint="con los filtros actuales"
              />
              <StatTile
                label="Canceladas"
                icon={XCircleIcon}
                tone="text-red-500"
                value={isStatsLoading ? '…' : pageStats.cancelledCount.toLocaleString()}
                hint="con los filtros actuales"
              />
              <StatTile
                label="Ticket promedio"
                icon={ChartBarIcon}
                tone="text-purple-600"
                value={isStatsLoading ? '…' : formatCurrency(pageStats.avgTicketMXN, 'MXN')}
                hint="MXN · completadas"
              />
            </div>
            {!isStatsLoading && pageStats.currencies.length > 0 && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5 md:grid-cols-4">
                {pageStats.currencies.map((currency) => {
                  const active = pageStats.totals[currency] || 0;
                  const cancelled = pageStats.cancelledTotals[currency] || 0;
                  return (
                    <div key={currency} className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        <CurrencyDollarIcon className="h-3.5 w-3.5 text-[#3E667D]" />
                        Ventas {currency}
                      </div>
                      <p className="truncate text-base font-semibold text-[#3E667D]" title={formatCurrency(active, currency)}>
                        {formatCurrency(active, currency)}
                      </p>
                      {cancelled > 0 && (
                        <p className="truncate text-[11px] text-red-400">{formatCurrency(cancelled, currency)} cancelado</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="space-y-4 p-4 sm:p-5">
            {/* Buscador por folio (Contabilidad, 26-oct-2026): sin fechas busca en todas las ventas */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applySearch(searchInput);
                  }}
                  placeholder="Buscar por folio (ej. 102-20260928-0006 o 0006)…"
                  aria-label="Buscar por folio"
                  className="pr-8 font-mono"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(''); applySearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Limpiar búsqueda"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={() => applySearch(searchInput)} className="sm:w-auto">
                Buscar folio
              </Button>
            </div>
            {selectedSearch && (
              <p className="-mt-2 text-xs text-gray-500">
                Mostrando folios que contienen <span className="font-mono font-semibold text-gray-700">{selectedSearch}</span>
              </p>
            )}

            {/* Filtros en cuadrícula: cada control en su celda (los selects son w-full y en fila se desbordaban) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FilterField label="Sucursal">
                <SearchableSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={selectedBranch}
                  onChange={(val) => setParams({ branch: val, terminal: null })}
                  placeholder="Buscar sucursal..."
                  allLabel="Todas las sucursales"
                  allValue="all"
                  className="w-full"
                />
              </FilterField>

              {/* Terminal (licencia POS) — solo con una sucursal elegida */}
              {selectedBranch !== 'all' && (
                <FilterField label="Terminal">
                  <SearchableSelect
                    options={terminalOptions}
                    value={selectedTerminal}
                    onChange={(val) => setParams({ terminal: val })}
                    placeholder="Buscar terminal..."
                    allLabel="Todas las terminales"
                    allValue="all"
                    className="w-full"
                  />
                </FilterField>
              )}

              <FilterField label="Estado">
                <SearchableSelect
                  options={STATUS_OPTIONS}
                  value={selectedStatus}
                  onChange={(val) => setParams({ status: val })}
                  allLabel="Todos los estados"
                  allValue="all"
                  className="w-full"
                />
              </FilterField>

              <FilterField label="Método de pago">
                <SearchableSelect
                  options={PAYMENT_OPTIONS}
                  value={selectedPaymentMethod}
                  onChange={(val) => setParams({ paymentMethod: val })}
                  allLabel="Todos los métodos"
                  allValue="all"
                  className="w-full"
                />
              </FilterField>
            </div>

            {/* Fechas (opcionales: vacío = todas las ventas), cliente y exportación */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <FilterField label="Desde" className="w-full sm:w-44">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setParams({ dateFrom: e.target.value || null, page: '1' })}
                />
              </FilterField>
              <FilterField label="Hasta" className="w-full sm:w-44">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setParams({ dateTo: e.target.value || null, page: '1' })}
                />
              </FilterField>
              {dateFrom || dateTo ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start text-gray-500 lg:self-end"
                  onClick={() => setParams({ dateFrom: null, dateTo: null, page: '1' })}
                >
                  Limpiar fechas
                </Button>
              ) : (
                <span className="pb-2 text-xs text-gray-400">Sin fechas se muestran todas las ventas</span>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:ml-auto">
                <FilterField label="No. distribuidor / cliente" className="w-full sm:w-56">
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      value={customerNumberInput}
                      onChange={(e) => setCustomerNumberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setParams({ customerNumber: customerNumberInput.trim(), page: '1' });
                      }}
                      placeholder="Número exacto"
                      className="pl-8 pr-8"
                    />
                    {customerNumberInput && (
                      <button
                        type="button"
                        onClick={() => { setCustomerNumberInput(''); setParams({ customerNumber: '', page: '1' }); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Limpiar número"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </FilterField>
                <div className="flex gap-2">
                  <Button onClick={() => setParams({ customerNumber: customerNumberInput.trim(), page: '1' })}>
                    Buscar
                  </Button>
                  <Button variant="outline" onClick={handleExportCsv} disabled={isExporting}>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {isExporting ? 'Exportando...' : 'Exportar CSV'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ventas por terminal: sucursales con varias cajas separan sus ventas */}
        {selectedBranch !== 'all' && terminalRows.length >= 2 && (
          <Card className="mb-6">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                <ComputerDesktopIcon className="h-5 w-5 text-[#3E667D]" />
                <h2 className="text-sm font-semibold text-gray-900">Ventas por terminal</h2>
                <span className="text-xs text-gray-500">· clic en una fila para filtrar</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-6 py-2 font-medium">Terminal</th>
                    <th className="text-right px-6 py-2 font-medium">Ventas</th>
                    <th className="text-right px-6 py-2 font-medium">Canceladas</th>
                    <th className="text-right px-6 py-2 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {terminalRows.map((r) => {
                    const value = r.posLicenseId ?? 'none';
                    const active = selectedTerminal === value;
                    return (
                      <tr
                        key={value}
                        onClick={() => setParams({ terminal: active ? null : value })}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${active ? 'bg-[#3E667D]/5' : ''}`}
                        title={active ? 'Quitar filtro' : 'Ver solo las ventas de esta terminal'}
                      >
                        <td className="px-6 py-2 font-medium text-gray-900">
                          {terminalDisplayName(r)}
                          {r.licenseKey && (
                            <span className="ml-2 font-mono text-[10px] text-gray-400">{r.licenseKey}</span>
                          )}
                        </td>
                        <td className="px-6 py-2 text-right tabular-nums text-gray-700">{r.count.toLocaleString()}</td>
                        <td className="px-6 py-2 text-right tabular-nums text-red-500">
                          {r.cancelledCount > 0 ? r.cancelledCount.toLocaleString() : ''}
                        </td>
                        <td className="px-6 py-2 text-right tabular-nums font-semibold text-gray-900">
                          {formatCurrency(r.total, r.currencyCode)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Sales Table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
              <span className="text-sm font-medium text-gray-700">Clic en una venta para desplegar su detalle y el ticket</span>
              <span className="text-xs text-gray-400">{totalCount.toLocaleString()} ventas</span>
            </div>
            <DataTable
              columns={columns}
              data={sales}
              isLoading={isLoading}
              loadingRows={pageSize > 10 ? 10 : pageSize}
              getRowKey={(sale) => sale.id}
              minWidthClassName="min-w-[900px]"
              rowClassName={(sale) =>
                `cursor-pointer border-b border-border transition-colors hover:bg-[#3E667D]/[0.04] ${expandedIds.has(sale.id) ? 'bg-[#3E667D]/[0.06]' : ''}`
              }
              onRowClick={(sale) => toggleExpanded(sale.id)}
              renderExpandedRow={(sale) =>
                expandedIds.has(sale.id) ? (
                  <SaleDetailPanel
                    sale={sale}
                    onClose={() => toggleExpanded(sale.id)}
                    branchTz={branches.find((b) => b.name === sale.branchName)?.timezone || DEFAULT_TIMEZONE}
                  />
                ) : null
              }
              emptyState={
                <div className="text-center py-12">
                  <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No se encontraron ventas
                  </h3>
                  <p className="text-sm text-gray-500">
                    Revisa el folio buscado o ajusta los filtros
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* Pagination */}
        <DataTablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalCount}
          isLoading={isLoading || isFetching}
          onPageChange={(p) => setParams({ page: String(p) })}
          onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>
    </div>
    </>
  );
}
