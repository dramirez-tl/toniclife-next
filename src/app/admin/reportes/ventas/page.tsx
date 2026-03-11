'use client';

import { useMemo, Suspense, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useActiveBranches } from '@/hooks/useBranches';
import { useSales, useUpdateSalePaymentMethod } from '@/hooks/usePos';
import { useAppSelector } from '@/store';
import { selectUserRoles } from '@/store';
import type { Sale, SaleQueryParams, PosSaleStatus, PosPaymentMethod } from '@/types/pos';
import { posService } from '@/services/pos.service';
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
} from '@heroicons/react/24/outline';

// ================================
// Helpers
// ================================

const formatCurrency = (amount: number, currencyCode = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function buildCsvRow(sale: Sale): string {
  const cols = [
    sale.saleNumber,
    sale.createdAt ? new Date(sale.createdAt).toLocaleString('es-MX') : '',
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
    sale.cancelledAt ? new Date(sale.cancelledAt).toLocaleString('es-MX') : '',
  ];
  return cols.map(escapeCsv).join(',');
}

const CSV_HEADERS = [
  'No. Venta',
  'Fecha',
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

function downloadCsv(rows: Sale[], filename: string) {
  const lines = [CSV_HEADERS, ...rows.map(buildCsvRow)];
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

function SaleDetailModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  if (!sale) return null;

  const currency = sale.currencyCode || 'MXN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
            <p className="text-sm text-gray-500 mt-1">{formatDate(sale.createdAt)}</p>
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

          {/* Items */}
          {sale.items && sale.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Productos</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Producto</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Cant.</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">P. Unit.</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sale.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-xs text-gray-400">{item.productSku}</p>
                          {item.lotNumber && <p className="text-xs text-gray-400">Lote: {item.lotNumber}</p>}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(item.unitPrice, currency)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal, currency)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <ReceiptPercentIcon className="h-3.5 w-3.5" />
                  Descuento{sale.discountPercent ? ` (${sale.discountPercent}%)` : ''}
                </span>
                <span>-{formatCurrency(sale.discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA</span>
              <span>{formatCurrency(sale.taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2 mt-2">
              <span>Total</span>
              <span className="text-[#3E667D]">{formatCurrency(sale.total, currency)}</span>
            </div>
          </div>

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
                <p className="text-xs text-red-500">{formatDate(sale.cancelledAt)}</p>
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
        <div className="p-4 border-t border-gray-100">
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cerrar
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Editar método de pago</h2>
        <p className="text-sm text-gray-500 mb-5">
          Venta <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
        </p>

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
      </div>
    </div>
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
      const result = await posService.getSales({
        branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
        status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
        paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
        customerNumber: selectedCustomerNumber || undefined,
        fromDate: dateFrom,
        toDate: dateTo,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 5000,
      });
      if (!result.data.length) {
        toast.info('No hay ventas para exportar con los filtros actuales');
        return;
      }
      const filename = `ventas_${dateFrom}_${dateTo}.csv`;
      downloadCsv(result.data, filename);
      toast.success(`${result.data.length} ventas exportadas`);
    } catch {
      toast.error('Error al exportar ventas');
    } finally {
      setIsExporting(false);
    }
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

  const { data: salesData, isLoading, isFetching } = useSales(queryParams);

  const sales = salesData?.data ?? [];
  const totalCount = salesData?.total ?? 0;

  // Summary
  const pageTotalAmount = useMemo(() => sales.reduce((sum: number, s: Sale) => sum + s.total, 0), [sales]);
  const avgTicket = sales.length > 0 ? pageTotalAmount / sales.length : 0;

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
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(sale.createdAt)}</p>
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
  ], [canEditPayment, setDetailSale, setEditingSale]);

  return (
    <>
    <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Ventas</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {isLoading ? '...' : totalCount.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monto Total (página)</p>
                  <p className="text-3xl font-bold text-[#3E667D]">
                    {isLoading ? '...' : formatCurrency(pageTotalAmount)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {isLoading ? '...' : formatCurrency(avgTicket)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3E667D] text-[#3E667D] text-sm font-medium hover:bg-[#3E667D]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {isExporting ? 'Exportando...' : 'Exportar CSV'}
                </button>
              </div>
            </div>

            {/* Date range row */}
            <div className="flex flex-col lg:flex-row gap-4 mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setParams({ dateFrom: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setParams({ dateTo: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                  <input
                    type="text"
                    value={customerNumberInput}
                    onChange={(e) => setCustomerNumberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setParams({ customerNumber: customerNumberInput.trim(), page: '1' });
                    }}
                    placeholder="No. distribuidor / cliente"
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3E667D] focus:border-transparent w-[200px]"
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
                <button
                  type="button"
                  onClick={() => setParams({ customerNumber: customerNumberInput.trim(), page: '1' })}
                  className="px-3 py-2 bg-[#3E667D] text-white text-sm font-medium rounded-lg hover:bg-[#2d4f63] transition-colors"
                >
                  Buscar
                </button>
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
