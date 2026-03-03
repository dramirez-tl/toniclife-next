'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { useFacturamaCfdis } from '@/hooks/useBilling';
import type { FacturamaCfdiItem } from '@/services/billing.service';
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// ================================
// Helpers
// ================================

const formatCurrency = (amount: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
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
  N: 'Nómina',
};

const CFDI_TYPE_STYLES: Record<string, string> = {
  I: 'bg-blue-100 text-blue-700',
  E: 'bg-orange-100 text-orange-700',
  P: 'bg-purple-100 text-purple-700',
  T: 'bg-gray-100 text-gray-700',
  N: 'bg-teal-100 text-teal-700',
};

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  active: { label: 'Activa', style: 'bg-green-100 text-green-700' },
  canceled: { label: 'Cancelada', style: 'bg-red-100 text-red-700' },
  pending: { label: 'Pendiente', style: 'bg-yellow-100 text-yellow-700' },
};

const StatusIcon = ({ status }: { status: string }) => {
  const cls = 'h-3 w-3';
  switch (status) {
    case 'active':
      return <CheckCircleIcon className={cls} />;
    case 'canceled':
      return <XCircleIcon className={cls} />;
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
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(getDefaultDateTo);
  const [page, setPage] = useState(0);

  const { data: cfdisData, isLoading, isFetching } = useFacturamaCfdis({
    dateStart: dateFrom,
    dateEnd: dateTo,
    status: 'all',
    page,
  });

  const cfdis = cfdisData?.data ?? [];
  const totalCount = cfdisData?.total ?? 0;

  // Summary
  const totalFacturado = useMemo(
    () => cfdis.reduce((sum, c) => sum + (c.total || 0), 0),
    [cfdis],
  );

  // ================================
  // Table columns
  // ================================

  const columns: DataTableColumn<FacturamaCfdiItem>[] = useMemo(() => [
    {
      key: 'cfdiType',
      header: 'Tipo',
      render: (c) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CFDI_TYPE_STYLES[c.cfdiType] || 'bg-gray-100 text-gray-700'}`}>
          {CFDI_TYPE_LABELS[c.cfdiType] ?? c.cfdiType}
        </span>
      ),
    },
    {
      key: 'folio',
      header: 'Folio',
      sortable: true,
      sortValue: (c) => c.folio || '',
      render: (c) => (
        <div>
          <span className="font-semibold text-[#3E667D]">{c.folio || '—'}</span>
          {c.serie && (
            <span className="ml-1 text-xs text-gray-500">({c.serie})</span>
          )}
        </div>
      ),
    },
    {
      key: 'receiver',
      header: 'Receptor',
      render: (c) => (
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{c.receiverName || '—'}</p>
          <p className="text-xs text-gray-500">{c.receiverRfc || ''}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Monto',
      sortable: true,
      sortValue: (c) => c.total || 0,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <span className="font-semibold text-gray-900">{formatCurrency(c.total, c.currency || 'MXN')}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            {c.currency || 'MXN'}
          </span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      sortable: true,
      sortValue: (c) => c.date || '',
      render: (c) => (
        <span className="text-sm text-gray-700">
          {c.date ? formatDate(c.date) : '—'}
        </span>
      ),
    },
    {
      key: 'uuid',
      header: 'UUID',
      render: (c) => (
        <span className="text-xs text-gray-500 font-mono">
          {c.uuid ? `${c.uuid.substring(0, 8)}...` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (c) => {
        const statusKey = c.status?.toLowerCase() || '';
        const config = STATUS_CONFIG[statusKey];
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config?.style || 'bg-gray-100 text-gray-700'}`}>
            <StatusIcon status={statusKey} />
            {config?.label ?? c.status ?? '—'}
          </span>
        );
      },
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
                CFDIs emitidos directamente desde Facturama
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
                  <p className="text-sm text-gray-600 mb-1">CFDIs en página</p>
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
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-400 ml-auto">
                Facturama muestra máximo 100 CFDIs por página
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={cfdis}
              isLoading={isLoading}
              loadingRows={10}
              getRowKey={(c) => c.id || c.uuid}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No se encontraron CFDIs
                  </h3>
                  <p className="text-sm text-gray-500">
                    Ajusta el rango de fechas para buscar
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* Pagination (Facturama pages: 0-based, 100 per page) */}
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            Página {page + 1} {totalCount === 100 && '(puede haber más páginas)'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || isLoading || isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={totalCount < 100 || isLoading || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
