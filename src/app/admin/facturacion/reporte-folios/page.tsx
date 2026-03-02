'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { useInvoices } from '@/hooks/useBilling';
import type { Invoice, InvoiceQueryDto } from '@/types/billing';
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ================================
// Helpers
// ================================

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num);
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split('T')[0];
}

const CFDI_TYPE_LABELS: Record<string, string> = {
  I: 'Ingreso',
  E: 'Egreso',
  P: 'Pago',
  T: 'Traslado',
};

const CFDI_TYPE_STYLES: Record<string, string> = {
  I: 'bg-blue-100 text-blue-700',
  E: 'bg-orange-100 text-orange-700',
  P: 'bg-purple-100 text-purple-700',
  T: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  stamped: 'Timbrada',
  sent: 'Enviada',
  cancelled: 'Cancelada',
  cancellation_pending: 'Cancel. pendiente',
  error: 'Error',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  stamped: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  cancellation_pending: 'bg-orange-100 text-orange-700',
  error: 'bg-red-100 text-red-700',
};

const StatusIcon = ({ status }: { status: string }) => {
  const cls = 'h-3 w-3';
  switch (status) {
    case 'stamped':
    case 'sent':
      return <CheckCircleIcon className={cls} />;
    case 'cancelled':
      return <XCircleIcon className={cls} />;
    case 'error':
      return <ExclamationTriangleIcon className={cls} />;
    default:
      return <ClockIcon className={cls} />;
  }
};

// ================================
// Page
// ================================

export default function ReporteFoliosPage() {
  return (
    <Suspense>
      <ReporteFoliosContent />
    </Suspense>
  );
}

function ReporteFoliosContent() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(getDefaultDateTo);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: branches = [] } = useActiveBranches();

  const queryParams = useMemo<InvoiceQueryDto>(() => ({
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
    startDate: dateFrom,
    endDate: `${dateTo}T23:59:59`,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  }), [selectedBranch, dateFrom, dateTo, currentPage, pageSize]);

  const { data: invoicesData, isLoading, isFetching } = useInvoices(queryParams);

  const invoices = invoicesData?.data ?? [];
  const totalCount = invoicesData?.total ?? 0;

  // Summary
  const totalFacturado = useMemo(
    () => invoices.reduce((sum: number, inv: Invoice) => sum + parseFloat(inv.total || '0'), 0),
    [invoices],
  );

  // ================================
  // Table columns
  // ================================

  const columns: DataTableColumn<Invoice>[] = useMemo(() => [
    {
      key: 'cfdiType',
      header: 'Tipo',
      render: (inv) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CFDI_TYPE_STYLES[inv.invoiceType] || 'bg-gray-100 text-gray-700'}`}>
          {CFDI_TYPE_LABELS[inv.invoiceType] ?? inv.invoiceType}
        </span>
      ),
    },
    {
      key: 'folio',
      header: 'Folio',
      sortable: true,
      sortValue: (inv) => inv.folio || '',
      render: (inv) => (
        <div>
          <span className="font-semibold text-[#3E667D]">{inv.folio || inv.uuid?.substring(0, 8) || '—'}</span>
          {inv.series && (
            <span className="ml-1 text-xs text-gray-500">({inv.series})</span>
          )}
        </div>
      ),
    },
    {
      key: 'receiver',
      header: 'Receptor',
      render: (inv) => (
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{inv.receiverName}</p>
          <p className="text-xs text-gray-500">{inv.receiverRfc}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Monto',
      sortable: true,
      sortValue: (inv) => parseFloat(inv.total || '0'),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1.5">
          <span className="font-semibold text-gray-900">{formatCurrency(inv.total)}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            {inv.currency || 'MXN'}
          </span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      sortable: true,
      sortValue: (inv) => inv.stampedAt || inv.createdAt,
      render: (inv) => (
        <span className="text-sm text-gray-700">
          {formatDate(inv.stampedAt || inv.createdAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (inv) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-700'}`}>
          <StatusIcon status={inv.status} />
          {STATUS_LABELS[inv.status] ?? inv.status}
        </span>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <DocumentTextIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Reporte Facturama - Folios</h1>
              </div>
              <p className="text-white/80 text-lg">
                Folios de facturas emitidas por sucursal
              </p>
            </div>
            <Link href="/admin/facturacion">
              <Button variant="secondary">Volver a Facturación</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Facturas</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {isLoading ? '...' : totalCount.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Facturado (página)</p>
                  <p className="text-3xl font-bold text-[#3E667D]">
                    {isLoading ? '...' : formatCurrency(totalFacturado)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
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
                <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                <SearchableSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={selectedBranch}
                  onChange={(val) => { setSelectedBranch(val); setCurrentPage(1); }}
                  placeholder="Buscar sucursal..."
                  allLabel="Todas las Sucursales"
                  allValue="all"
                  className="w-[220px]"
                />
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={invoices}
              isLoading={isLoading}
              loadingRows={10}
              getRowKey={(inv) => inv.id}
              minWidthClassName="min-w-[800px]"
              emptyState={
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No se encontraron facturas
                  </h3>
                  <p className="text-sm text-gray-500">
                    Ajusta los filtros o el rango de fechas
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
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          pageSizeOptions={[20, 50, 100]}
        />
      </div>
    </div>
  );
}
