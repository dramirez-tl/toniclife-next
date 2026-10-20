'use client';

// Pestaña "Facturama (PAC)": lo que el PAC devuelve en el rango, tal cual
// (100 por página). Sirve de cruce contra el reporte de conciliación, que
// sale de nuestra base. Antes era toda la página de Reporte Folios.

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { useFacturamaCfdis } from '@/hooks/useBilling';
import { billingErrorMessage } from '@/lib/billing-error';
import type { FacturamaCfdiItem } from '@/services/billing.service';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const formatCurrency = (amount: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

const CFDI_TYPE_LABELS: Record<string, string> = { I: 'Ingreso', E: 'Egreso', P: 'Pago', T: 'Traslado', N: 'Nómina' };
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

export function FacturamaCfdisTab({
  dateFrom,
  dateTo,
  page,
  onPageChange,
}: {
  dateFrom: string;
  dateTo: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { data: cfdisData, isLoading, isFetching, isError, error, refetch } = useFacturamaCfdis({
    dateStart: dateFrom,
    dateEnd: dateTo,
    status: 'all',
    page,
  });
  const cfdis = useMemo(() => cfdisData?.data ?? [], [cfdisData]);
  const totalCount = cfdisData?.total ?? 0;
  const totalFacturado = useMemo(() => cfdis.reduce((sum, c) => sum + (c.total || 0), 0), [cfdis]);

  const columns: DataTableColumn<FacturamaCfdiItem>[] = useMemo(
    () => [
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
            {c.serie && <span className="ml-1 text-xs text-gray-500">({c.serie})</span>}
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
        render: (c) => <span className="font-semibold text-gray-900">{formatCurrency(c.total, c.currency || 'MXN')}</span>,
      },
      {
        key: 'date',
        header: 'Fecha',
        sortable: true,
        sortValue: (c) => c.date || '',
        render: (c) => <span className="text-sm text-gray-700">{c.date ? formatDate(c.date) : '—'}</span>,
      },
      {
        key: 'uuid',
        header: 'UUID',
        render: (c) => <span className="text-xs text-gray-500 font-mono">{c.uuid || '—'}</span>,
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
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-600 mb-1">CFDIs en esta página del PAC</p>
            <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : totalCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-600 mb-1">Total en esta página</p>
            <p className="text-2xl font-bold text-[#3E667D]">{isLoading ? '...' : formatCurrency(totalFacturado)}</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-gray-400">Facturama devuelve máximo 100 CFDIs por página; esta pestaña no filtra por sucursal ni forma de pago.</p>
      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <span>{billingErrorMessage(error, 'No se pudieron consultar los CFDI en Facturama')}</span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>Reintentar</Button>
        </div>
      )}
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">No se encontraron CFDIs</h3>
                <p className="text-sm text-gray-500">Ajusta el rango de fechas para buscar</p>
              </div>
            }
          />
        </CardContent>
      </Card>
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-500">Página {page + 1} {totalCount === 100 && '(puede haber más páginas)'}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0 || isLoading || isFetching} onClick={() => onPageChange(Math.max(0, page - 1))}>
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={totalCount < 100 || isLoading || isFetching} onClick={() => onPageChange(page + 1)}>
            Siguiente
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
