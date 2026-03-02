'use client';

import { useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { useSales } from '@/hooks/usePos';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import type { Sale, SaleQueryParams, PosSaleStatus, PosPaymentMethod } from '@/types/pos';

// ================================
// Helpers
// ================================

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function getDefaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split('T')[0];
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
  mixed: 'Mixto',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completada', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  refunded: { label: 'Reembolsada', className: 'bg-yellow-100 text-yellow-700' },
  partial_refund: { label: 'Reembolso parcial', className: 'bg-orange-100 text-orange-700' },
  pending: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
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
  });

  const selectedBranch = get('branch');
  const selectedStatus = get('status');
  const selectedPaymentMethod = get('paymentMethod');
  const dateFrom = get('dateFrom') || getDefaultDateFrom();
  const dateTo = get('dateTo') || getDefaultDateTo();
  const page = getNumber('page') || 1;
  const limit = 25;

  const { data: branches } = useActiveBranches();

  const queryParams = useMemo<SaleQueryParams>(() => ({
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
    status: selectedStatus !== 'all' ? (selectedStatus as PosSaleStatus) : undefined,
    paymentMethod: selectedPaymentMethod !== 'all' ? (selectedPaymentMethod as PosPaymentMethod) : undefined,
    fromDate: dateFrom,
    toDate: dateTo,
    page,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [selectedBranch, selectedStatus, selectedPaymentMethod, dateFrom, dateTo, page, limit]);

  const { data: salesData, isLoading } = useSales(queryParams);

  const sales = salesData?.data ?? [];
  const totalCount = salesData?.total ?? 0;
  const totalPages = salesData?.totalPages ?? 1;

  // Summary from current page data
  const pageTotalAmount = useMemo(() => sales.reduce((sum: number, s: Sale) => sum + s.total, 0), [sales]);
  const avgTicket = sales.length > 0 ? pageTotalAmount / sales.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/reportes"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ventas POS</h1>
            <p className="mt-1 text-sm text-gray-500">
              Ventas de punto de venta de todas las sucursales
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date range */}
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setParams({ dateFrom: e.target.value })}
                className="rounded-md border-gray-300 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
              <span className="text-gray-500">a</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setParams({ dateTo: e.target.value })}
                className="rounded-md border-gray-300 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            {/* Branch */}
            <div className="flex items-center space-x-2">
              <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
              <SearchableSelect
                options={(branches ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                }))}
                value={selectedBranch}
                onChange={(val) => setParams({ branch: val })}
                allLabel="Todas las sucursales"
                allValue="all"
              />
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <SearchableSelect
                options={STATUS_OPTIONS}
                value={selectedStatus}
                onChange={(val) => setParams({ status: val })}
                allLabel="Todos los estados"
                allValue="all"
              />
            </div>

            {/* Payment method */}
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
              <SearchableSelect
                options={PAYMENT_OPTIONS}
                value={selectedPaymentMethod}
                onChange={(val) => setParams({ paymentMethod: val })}
                allLabel="Todos los métodos"
                allValue="all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-teal-100 p-3">
                <ShoppingCartIcon className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Ventas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : totalCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Monto (esta página)</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : formatCurrency(pageTotalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ticket Promedio</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : formatCurrency(avgTicket)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Ventas</h3>
          <span className="text-sm text-gray-500">
            {totalCount} resultado{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay ventas para los filtros seleccionados
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    No. Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Método de Pago
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sales.map((sale: Sale) => {
                  const statusCfg = STATUS_CONFIG[sale.status] ?? { label: sale.status, className: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-teal-700">
                        {sale.saleNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {sale.branchName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {sale.customerName
                          ? sale.customerNumber
                            ? `${sale.customerName} (#${sale.customerNumber})`
                            : sale.customerName
                          : <span className="text-gray-400">Público general</span>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {sale.sellerName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(sale.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages} ({totalCount} ventas)
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setParams({ page: String(page - 1) })}
                disabled={page <= 1}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Anterior
              </button>
              <button
                onClick={() => setParams({ page: String(page + 1) })}
                disabled={page >= totalPages}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
