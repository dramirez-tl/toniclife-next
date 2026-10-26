'use client';

// FreeInvoicesTab - Facturas emitidas desde "Factura sin ticket (captura
// libre)" (26-oct-2026): `GET billing/invoices?manualKind=free` (invoice_type
// manual SIN tickets ligados). Búsqueda, estado, sucursal y fechas viven en la
// URL (useQueryFilters), la paginación es del servidor y las acciones son las
// del listado general (ver, PDF, XML, reenviar por correo). Sustituye a la
// pestaña "Tickets pendientes" de /admin/facturacion/libre.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useInvoices } from '@/hooks/useBilling';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { billingErrorMessage } from '@/lib/billing-error';
import { downloadInvoiceFile } from '@/lib/invoice-download';
import {
  INVOICE_STATUS_CONFIG,
  InvoiceStatus,
  formatCurrency,
  getPaymentFormName,
  type InvoiceListQuery,
  type InvoiceSummary,
} from '@/types/billing';
import { InvoiceStatusBadge } from './invoices/InvoiceBadges';
import { INVOICE_STATUS_OPTIONS } from './invoices/labels';
import { SendInvoiceEmailDialog } from './invoices/SendInvoiceEmailDialog';
import { useBranchTimezone } from './invoices/useBranchTimezone';

const STATUS_VALUES = new Set<string>(Object.values(InvoiceStatus));

export function FreeInvoicesTab({ canManage, onNew }: { canManage: boolean; onNew: () => void }) {
  const { get, getNumber, setParams } = useQueryFilters();
  const search = get('search');
  const statusParam = get('status');
  const status = STATUS_VALUES.has(statusParam) ? (statusParam as InvoiceStatus) : undefined;
  const branchId = get('branchId');
  const startDate = get('startDate');
  const endDate = get('endDate');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 25;

  // Búsqueda con retraso de 400 ms hacia la URL (el servidor filtra).
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const t = window.setTimeout(() => setParams({ search: searchInput.trim() }), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query: InvoiceListQuery = useMemo(
    () => ({
      invoiceType: 'manual',
      manualKind: 'free',
      search: search || undefined,
      status,
      branchId: branchId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit,
      sort: 'stampedAt:desc',
    }),
    [search, status, branchId, startDate, endDate, page, limit],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useInvoices(query);
  const { branches, formatInBranch } = useBranchTimezone();
  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name, hint: b.code })),
    [branches],
  );
  const [emailTarget, setEmailTarget] = useState<InvoiceSummary | null>(null);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const byStatus = data?.stats?.byStatus ?? {};
  const hasFilters = Boolean(search || status || branchId || startDate || endDate);
  const resetFilters = () => {
    setSearchInput('');
    setParams({ search: null, status: null, branchId: null, startDate: null, endDate: null, page: null });
  };

  const columns: DataTableColumn<InvoiceSummary>[] = [
    {
      key: 'folio',
      header: 'Folio',
      render: (inv) => (
        <div className="min-w-[150px]">
          <Link
            href={`/admin/facturacion/${inv.id}`}
            className="font-mono text-sm font-semibold text-[#3E667D] hover:underline"
            title={inv.invoiceNumber ? `Número interno: ${inv.invoiceNumber}` : undefined}
          >
            {inv.folioDisplay}
          </Link>
          {inv.satUuid && (
            <p className="mt-0.5 max-w-[220px] truncate font-mono text-[11px] text-gray-500" title={inv.satUuid}>
              {inv.satUuid}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'receiver',
      header: 'Receptor',
      render: (inv) => (
        <div className="min-w-[180px]">
          <p className="font-mono text-sm text-gray-900">{inv.receiverRfc ?? '—'}</p>
          <p className="max-w-[260px] truncate text-xs text-gray-600" title={inv.receiverName ?? undefined}>
            {inv.receiverName ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Expide',
      render: (inv) => <span className="text-sm text-gray-700">{inv.branchName ?? '—'}</span>,
    },
    {
      key: 'stampedAt',
      header: 'Fecha',
      render: (inv) => (
        <span className="whitespace-nowrap text-sm text-gray-600">
          {inv.stampedAt ? (
            formatInBranch(inv.stampedAt, inv.branchId)
          ) : (
            <span className="text-xs text-gray-400">Creada {formatInBranch(inv.createdAt, inv.branchId)}</span>
          )}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'Pago',
      render: (inv) => (
        <span className="whitespace-nowrap text-sm text-gray-700">
          {inv.paymentMethodCode ?? '—'}
          {inv.paymentFormCode && (
            <span className="ml-1 text-xs text-gray-500">
              · {inv.paymentFormCode} {getPaymentFormName(inv.paymentFormCode)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (inv) => (
        <div>
          <span className="font-semibold text-gray-900">{formatCurrency(inv.total)}</span>
          {inv.paymentMethodCode === 'PPD' && inv.outstandingBalance !== null && (
            <p className="text-xs text-amber-700">Saldo {formatCurrency(inv.outstandingBalance)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (inv) => (
        <div className="flex flex-col items-center gap-1">
          <InvoiceStatusBadge status={inv.providerStatus} satCancellationStatus={inv.satCancellationStatus} />
          {inv.providerStatus === InvoiceStatus.ERROR && inv.providerError && (
            <span className="max-w-[220px] truncate text-[11px] text-red-700" title={inv.providerError}>
              {inv.providerError}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (inv) => {
        const filesReady =
          inv.providerStatus === InvoiceStatus.STAMPED ||
          inv.providerStatus === InvoiceStatus.SENT ||
          inv.providerStatus === InvoiceStatus.CANCEL_PENDING ||
          inv.providerStatus === InvoiceStatus.CANCELLED;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button asChild variant="ghost" size="icon" aria-label={`Ver factura ${inv.folioDisplay}`} title="Ver detalle">
              <Link href={`/admin/facturacion/${inv.id}`}>
                <EyeIcon className="h-5 w-5" />
              </Link>
            </Button>
            {filesReady && inv.satUuid && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Descargar PDF de ${inv.folioDisplay}`}
                  title="Descargar PDF"
                  onClick={() => void downloadInvoiceFile('pdf', inv.id, inv.folioDisplay)}
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  aria-label={`Descargar XML de ${inv.folioDisplay}`}
                  title="Descargar XML"
                  onClick={() => void downloadInvoiceFile('xml', inv.id, inv.folioDisplay)}
                >
                  <DocumentDuplicateIcon className="h-5 w-5" />
                </Button>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Reenviar ${inv.folioDisplay} por correo`}
                    title={inv.emailedAt ? `Enviada el ${formatInBranch(inv.emailedAt, inv.branchId)}` : 'Enviar por correo'}
                    onClick={() => setEmailTarget(inv)}
                  >
                    <EnvelopeIcon className="h-5 w-5" />
                  </Button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Chips de estado (conteos del servidor con los mismos filtros) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Facturas por estado">
        <button
          type="button"
          onClick={() => setParams({ status: null })}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !status ? 'border-[#3E667D] bg-[#3E667D] text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-pressed={!status}
        >
          Todas · {data?.stats?.total ?? total}
        </button>
        {INVOICE_STATUS_OPTIONS.map((opt) => {
          const count = byStatus[opt.value] ?? 0;
          if (count === 0 && status !== opt.value) return null;
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setParams({ status: active ? null : opt.value })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active ? 'border-[#3E667D] bg-[#3E667D] text-white' : `border-transparent ${INVOICE_STATUS_CONFIG[opt.value].color} hover:opacity-80`
              }`}
              aria-pressed={active}
            >
              {opt.label} · {count}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">Búsqueda y filtros</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2 text-gray-600" onClick={() => void refetch()} disabled={isFetching}>
                <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
                {isFetching ? 'Actualizando…' : 'Actualizar'}
              </Button>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
            <div className="lg:col-span-4">
              <Label htmlFor="free-inv-search" className="sr-only">Buscar</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                <Input
                  id="free-inv-search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Serie/folio, UUID, RFC o razón social"
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <SearchableSelect
                aria-label="Estado"
                options={INVOICE_STATUS_OPTIONS}
                value={status ?? ''}
                onChange={(v) => setParams({ status: v })}
                allLabel="Todos los estados"
              />
            </div>
            <div className="lg:col-span-3">
              <SearchableSelect
                aria-label="Sucursal que expide"
                options={branchOptions}
                value={branchId}
                onChange={(v) => setParams({ branchId: v })}
                allLabel="Todas las sucursales"
              />
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="free-inv-start" className="text-xs text-muted-foreground">Desde</Label>
                <Input id="free-inv-start" type="date" value={startDate} max={endDate || undefined} onChange={(e) => setParams({ startDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="free-inv-end" className="text-xs text-muted-foreground">Hasta</Label>
                <Input id="free-inv-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setParams({ endDate: e.target.value })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Facturas sin ticket emitidas</h2>
            <p className="text-sm text-gray-600">{total} en total</p>
          </div>
          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
              <ExclamationTriangleIcon className="mx-auto mb-3 h-10 w-10 text-red-500" aria-hidden />
              <h3 className="mb-1 text-base font-bold text-red-900">No se pudo cargar el listado</h3>
              <p className="text-sm text-red-700">{billingErrorMessage(error, 'Error al consultar las facturas')}</p>
              <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows}
                isLoading={isLoading && !data}
                getRowKey={(inv) => inv.id}
                minWidthClassName="min-w-[1080px]"
                emptyState={
                  <div className="py-2 text-center">
                    <DocumentTextIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" aria-hidden />
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      {hasFilters ? 'Sin resultados' : 'Todavía no hay facturas sin ticket'}
                    </h3>
                    <p className="text-gray-600">
                      {hasFilters
                        ? 'Ninguna factura coincide con los filtros.'
                        : 'Aquí aparecen los CFDI capturados a mano en «Nueva factura sin ticket».'}
                    </p>
                    {hasFilters ? (
                      <Button variant="outline" className="mt-4" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    ) : (
                      <Button className="mt-4 gap-2" onClick={onNew}>
                        <DocumentPlusIcon className="h-4 w-4" />
                        Nueva factura sin ticket
                      </Button>
                    )}
                  </div>
                }
              />
              {total > 0 && (
                <DataTablePagination
                  currentPage={page}
                  pageSize={limit}
                  totalItems={total}
                  isLoading={isLoading || isFetching}
                  onPageChange={(p) => setParams({ page: String(p) })}
                  onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {emailTarget && (
        <SendInvoiceEmailDialog
          open={!!emailTarget}
          onOpenChange={(open) => {
            if (!open) setEmailTarget(null);
          }}
          invoiceId={emailTarget.id}
          folio={emailTarget.folioDisplay}
        />
      )}
    </div>
  );
}
