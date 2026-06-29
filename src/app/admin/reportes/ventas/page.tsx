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
import { useSales, useSale, useUpdateSalePaymentMethod } from '@/hooks/usePos';
import { useAppSelector } from '@/store';
import { selectUserRoles } from '@/store';
import type { Sale, SaleItem, SaleQueryParams, PosSaleStatus, PosPaymentMethod } from '@/types/pos';
import { posService } from '@/services/pos.service';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel, resolveTimeZone } from '@/lib/timezone-utils';
import { toast } from 'sonner';
import {
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  FunnelIcon,
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
} from '@heroicons/react/24/outline';

// ================================
// Helpers
// ================================

const formatCurrency = (amount: number, currencyCode = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);

const formatDate = (dateStr: string, timezone: string = DEFAULT_TIMEZONE) =>
  new Date(dateStr).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: resolveTimeZone(timezone),
  });

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split('T')[0];
}

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
function printSaleTicket(sale: Sale, branchTz: string) {
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
        ? `<hr /><div class="row"><span>Puntos de la venta</span><span class="b">+${esc(Number(sale.accumulatedPoints).toLocaleString('es-MX'))}</span></div>${
            sale.pointsBalanceAfter != null
              ? `<div class="row muted"><span>Saldo del periodo</span><span>${esc(Number(sale.pointsBalanceBefore ?? 0).toLocaleString('es-MX'))} → ${esc(Number(sale.pointsBalanceAfter).toLocaleString('es-MX'))}</span></div>`
              : ''
          }`
        : ''
    }
    <hr />
    <div class="c">¡Gracias por su compra!</div>
    <div class="c muted" style="font-size:10px">Reimpreso ${esc(new Date().toLocaleString('es-MX'))}</div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 150); };</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=380,height=680');
  if (!w) {
    toast.error('Permite las ventanas emergentes para imprimir el ticket');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function SaleDetailModal({ sale, onClose, branchTz = DEFAULT_TIMEZONE }: { sale: Sale | null; onClose: () => void; branchTz?: string }) {
  // El row de la lista no trae items ni puntos; al abrir, traemos el detalle
  // completo (GET /pos/sales/:id). Mientras carga se usa el row de la lista.
  const { data: detail } = useSale(sale?.id ?? '', !!sale?.id);
  if (!sale) return null;

  const view = detail ?? sale;
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
      header: 'Puntos',
      headerClassName: 'text-right px-3 py-2.5 text-xs font-medium text-gray-500',
      cellClassName: 'px-3 py-3 text-right text-gray-700',
      render: (item) =>
        item.points != null
          ? Number(item.points).toLocaleString('es-MX')
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
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden"
      >
        <DialogTitle className="sr-only">Detalle de venta {sale.saleNumber}</DialogTitle>
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
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
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
              </div>
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

          {/* Puntos generados por la venta (MLM) */}
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
                  +{Number(view.accumulatedPoints).toLocaleString('es-MX')}
                </span>
              </div>
              {view.pointsBalanceAfter != null && (
                <div className="mt-3 flex items-center justify-between border-t border-[#a7c1e2]/60 pt-3 text-sm">
                  <span className="text-gray-600">Saldo del periodo</span>
                  <span className="font-medium text-gray-900">
                    {Number(view.pointsBalanceBefore ?? 0).toLocaleString('es-MX')}
                    <span className="mx-1.5 text-gray-400">→</span>
                    <span className="text-[#3E667D] font-bold">
                      {Number(view.pointsBalanceAfter).toLocaleString('es-MX')}
                    </span>
                  </span>
                </div>
              )}
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => printSaleTicket(view, branchTz)}
            disabled={!view.items || view.items.length === 0}
          >
            <PrinterIcon className="h-4 w-4" />
            Imprimir ticket
          </Button>
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
    status: 'all',
    paymentMethod: 'all',
    customerNumber: '',
    page: '1',
    limit: '20',
  });

  const userRoles = useAppSelector(selectUserRoles);
  const canEditPayment = userRoles.some((r) => r === 'admin' || r === 'super_admin');

  const selectedBranch = get('branch');
  const selectedStatus = get('status');
  const selectedPaymentMethod = get('paymentMethod');
  const selectedCustomerNumber = get('customerNumber');
  const dateFrom = get('dateFrom') || getDefaultDateFrom();
  const dateTo = get('dateTo') || getDefaultDateTo();
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [customerNumberInput, setCustomerNumberInput] = useState(selectedCustomerNumber);

  // Sync input when URL param changes externally (e.g. navigating with ?customerNumber=...)
  useEffect(() => { setCustomerNumberInput(selectedCustomerNumber); }, [selectedCustomerNumber]);
  const { mutate: updatePaymentMethod, isPending: isUpdating } = useUpdateSalePaymentMethod();

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const baseParams = {
        branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
        status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
        paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
        customerNumber: selectedCustomerNumber || undefined,
        fromDate: dateFrom,
        toDate: dateTo,
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
      const filename = `ventas_${dateFrom}_${dateTo}.csv`;
      downloadCsv(all, filename, (name) => branches.find(b => b.name === name)?.timezone || DEFAULT_TIMEZONE);
      toast.success(`${all.length} ventas exportadas`);
    } catch {
      toast.error('Error al exportar ventas');
    } finally {
      setIsExporting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, selectedStatus, selectedPaymentMethod, selectedCustomerNumber, dateFrom, dateTo]);

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
    status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
    paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
    customerNumber: selectedCustomerNumber || undefined,
    fromDate: dateFrom,
    toDate: dateTo,
    page: currentPage,
    limit: pageSize,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [selectedBranch, selectedStatus, selectedPaymentMethod, selectedCustomerNumber, dateFrom, dateTo, currentPage, pageSize]);

  // Query separado para stats — mismos filtros, sin paginación
  const statsQueryParams = useMemo<SaleQueryParams>(() => ({
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
    status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
    paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
    customerNumber: selectedCustomerNumber || undefined,
    fromDate: dateFrom,
    toDate: dateTo,
    page: 1,
    limit: 5000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [selectedBranch, selectedStatus, selectedPaymentMethod, selectedCustomerNumber, dateFrom, dateTo]);

  const { data: salesData, isLoading, isFetching } = useSales(queryParams);
  const { data: statsData, isLoading: isStatsLoading } = useSales(statsQueryParams);

  const sales = salesData?.data ?? [];
  const allFilteredSales = statsData?.data ?? [];
  const totalCount = salesData?.total ?? 0;

  // Summary stats — calculados sobre TODOS los resultados del filtro (no solo la página actual)
  const pageStats = useMemo(() => {
    const activeSales = allFilteredSales.filter(s => s.status !== 'cancelled' && s.status !== 'refunded');
    const cancelledSales = allFilteredSales.filter(s => s.status === 'cancelled' || s.status === 'refunded');

    // Totales activos por moneda
    const totals: Record<string, number> = {};
    for (const s of activeSales) {
      const c = s.currencyCode || 'MXN';
      totals[c] = (totals[c] || 0) + s.total;
    }

    // Totales cancelados por moneda
    const cancelledTotals: Record<string, number> = {};
    for (const s of cancelledSales) {
      const c = s.currencyCode || 'MXN';
      cancelledTotals[c] = (cancelledTotals[c] || 0) + s.total;
    }

    // Ticket promedio MXN activo
    const mxnActive = activeSales.filter(s => (s.currencyCode || 'MXN') === 'MXN');
    const avgTicketMXN = mxnActive.length > 0 ? (totals['MXN'] || 0) / mxnActive.length : 0;

    // Monedas presentes (primero MXN, luego el resto)
    const allCurrencies = Array.from(
      new Set([...Object.keys(totals), ...Object.keys(cancelledTotals)])
    ).sort((a, b) => (a === 'MXN' ? -1 : b === 'MXN' ? 1 : a.localeCompare(b)));

    return {
      totals,
      cancelledTotals,
      activeCount: activeSales.length,
      cancelledCount: cancelledSales.length,
      avgTicketMXN,
      currencies: allCurrencies,
    };
  }, [allFilteredSales]);

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
            title="Ver detalle"
            onClick={() => setDetailSale(sale)}
            className="mt-0.5 p-1 rounded hover:bg-[#3E667D]/10 text-gray-400 hover:text-[#3E667D] transition-colors flex-shrink-0"
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
  ], [canEditPayment, setDetailSale, setEditingSale, branches]);

  return (
    <>
    <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} branchTz={branches.find(b => b.name === detailSale?.branchName)?.timezone || DEFAULT_TIMEZONE} />
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
                Ventas de punto de venta de todas las sucursales
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
        {/* Stats Cards — Fila 1: conteos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Ventas</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {isLoading ? '...' : totalCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">en el período</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ShoppingCartIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completadas</p>
                  <p className="text-3xl font-bold text-green-600">
                    {isStatsLoading ? '...' : pageStats.activeCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">en filtros actuales</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Canceladas</p>
                  <p className="text-3xl font-bold text-red-500">
                    {isStatsLoading ? '...' : pageStats.cancelledCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">en filtros actuales</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {isStatsLoading ? '...' : formatCurrency(pageStats.avgTicketMXN, 'MXN')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">MXN · completadas</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards — Fila 2: montos por moneda */}
        {!isStatsLoading && pageStats.currencies.length > 0 && (
          <div className={`grid gap-4 mb-8 ${pageStats.currencies.length === 1 ? 'grid-cols-1 max-w-sm' : pageStats.currencies.length === 2 ? 'grid-cols-2 max-w-xl' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {pageStats.currencies.map((currency) => {
              const active = pageStats.totals[currency] || 0;
              const cancelled = pageStats.cancelledTotals[currency] || 0;
              return (
                <Card key={currency} className="border-l-4 border-l-[#3E667D]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Ventas {currency}
                        </p>
                        <p className="text-2xl font-bold text-[#3E667D] truncate">
                          {formatCurrency(active, currency)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {pageStats.activeCount} completadas en filtros
                        </p>
                        {cancelled > 0 && (
                          <p className="text-xs text-red-400 mt-0.5">
                            {formatCurrency(cancelled, currency)} cancelado
                          </p>
                        )}
                      </div>
                      <div className="w-10 h-10 bg-[#3E667D]/10 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                        <CurrencyDollarIcon className="h-5 w-5 text-[#3E667D]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {isStatsLoading && <div className="h-24 mb-8" />}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
              {/* Branch */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <SearchableSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={selectedBranch}
                  onChange={(val) => setParams({ branch: val })}
                  placeholder="Buscar sucursal..."
                  allLabel="Todas las Sucursales"
                  allValue="all"
                  className="w-[220px]"
                />
              </div>

              {/* Status */}
              <SearchableSelect
                options={STATUS_OPTIONS}
                value={selectedStatus}
                onChange={(val) => setParams({ status: val })}
                allLabel="Todos los Estados"
                allValue="all"
              />

              {/* Payment Method */}
              <SearchableSelect
                options={PAYMENT_OPTIONS}
                value={selectedPaymentMethod}
                onChange={(val) => setParams({ paymentMethod: val })}
                allLabel="Todos los Métodos"
                allValue="all"
              />

              {/* Export CSV */}
              <div className="lg:ml-auto">
                <Button variant="outline" onClick={handleExportCsv} disabled={isExporting}>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {isExporting ? 'Exportando...' : 'Exportar CSV'}
                </Button>
              </div>
            </div>

            {/* Date range row */}
            <div className="flex flex-col lg:flex-row gap-4 mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setParams({ dateFrom: e.target.value })}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setParams({ dateTo: e.target.value })}
                  className="w-auto"
                />
              </div>
              {(get('dateFrom') || get('dateTo')) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500"
                  onClick={() => setParams({ dateFrom: null, dateTo: null })}
                >
                  Limpiar fechas
                </Button>
              )}

              {/* Customer number filter */}
              <div className="flex items-center gap-2 lg:ml-auto">
                <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="relative">
                  <Input
                    type="text"
                    value={customerNumberInput}
                    onChange={(e) => setCustomerNumberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setParams({ customerNumber: customerNumberInput.trim(), page: '1' });
                    }}
                    placeholder="No. distribuidor / cliente"
                    className="w-[200px] pr-8"
                  />
                  {customerNumberInput && (
                    <button
                      type="button"
                      onClick={() => { setCustomerNumberInput(''); setParams({ customerNumber: '', page: '1' }); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={() => setParams({ customerNumber: customerNumberInput.trim(), page: '1' })}
                >
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={sales}
              isLoading={isLoading}
              loadingRows={pageSize > 10 ? 10 : pageSize}
              getRowKey={(sale) => sale.id}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="text-center py-12">
                  <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No se encontraron ventas
                  </h3>
                  <p className="text-sm text-gray-500">
                    Intenta ajustar los filtros o el rango de fechas
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
