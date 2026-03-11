'use client';

import { useMemo, Suspense, useState, useCallback } from 'react';
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
};

const PAYMENT_BADGE_STYLES: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  transfer: 'bg-purple-100 text-purple-700',
  credit: 'bg-orange-100 text-orange-700',
  mixed: 'bg-teal-100 text-teal-700',
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
  { value: 'mixed', label: 'Mixto' },
];

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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Editar método de pago</h2>
        <p className="text-sm text-gray-500 mb-5">
          Venta <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
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
    page: '1',
    limit: '20',
  });

  const userRoles = useAppSelector(selectUserRoles);
  const canEditPayment = userRoles.some((r) => r === 'admin' || r === 'super_admin');

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const { mutate: updatePaymentMethod, isPending: isUpdating } = useUpdateSalePaymentMethod();

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

  const selectedBranch = get('branch');
  const selectedStatus = get('status');
  const selectedPaymentMethod = get('paymentMethod');
  const dateFrom = get('dateFrom') || getDefaultDateFrom();
  const dateTo = get('dateTo') || getDefaultDateTo();
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const { data: branches = [] } = useActiveBranches();

  const queryParams = useMemo<SaleQueryParams>(() => ({
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
    status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
    paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
    fromDate: dateFrom,
    toDate: dateTo,
    page: currentPage,
    limit: pageSize,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [selectedBranch, selectedStatus, selectedPaymentMethod, dateFrom, dateTo, currentPage, pageSize]);

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
        <div>
          <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(sale.createdAt)}</p>
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
  ], [canEditPayment, setEditingSale]);

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
            <div className="flex flex-col lg:flex-row gap-4">
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
