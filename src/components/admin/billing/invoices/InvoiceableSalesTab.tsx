'use client';

// Pestaña "Ventas por facturar" (`GET /billing/invoiceable-sales`, §7.3):
// tickets/pedidos nativos MX/FN completados de UNA sucursal (el API exige
// `branchId`; sin sucursal no se consulta) y un día, con el cliente y su
// preparación fiscal. Acciones:
//  - Facturar → ConfirmDialog con receptor y forma/método derivados →
//    `POST /billing/invoices { posSaleId | orderId }`.
//  - Cliente sin datos fiscales listos → CustomerFiscalDialog (Fase 1) y refresco.
//  - En global → flujo §5.3.7 (nominativa + cancelar global 04 + reexpedir) con
//    `acknowledgeGlobal: true`.
//  - Ver factura / Ver intento / Ver global.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useCreateInvoice, useInvoiceableSales } from '@/hooks/useBilling';
import type { useQueryFilters } from '@/hooks/useQueryFilters';
import { useQueryClient } from '@tanstack/react-query';
import { billingKeys } from '@/hooks/useBilling';
import {
  billingErrorInvoiceId,
  billingErrorMessage,
  isBillingErrorCode,
  isBillingFlowDisabled,
} from '@/lib/billing-error';
import {
  CUSTOMER_ISSUE_INFO,
  formatCurrency,
  getPaymentFormName,
  type InvoiceableSale,
  type InvoiceableSalesQuery,
  type InvoiceableStatus,
} from '@/types/billing';
import {
  INVOICEABLE_STATUS_INFO,
  INVOICEABLE_STATUS_OPTIONS,
  PAYMENT_METHOD_LABELS,
  RETRYABLE_INVOICEABLE_BLOCKERS,
  invoiceableBlockerCode,
  invoiceableBlockerText,
} from './labels';
import { useBranchTimezone, formatIsoDate } from './useBranchTimezone';
import { useCustomerFiscalEditor } from './useCustomerFiscalEditor';

type Filters = ReturnType<typeof useQueryFilters>;

const STATUS_VALUES = new Set<string>(INVOICEABLE_STATUS_OPTIONS.map((o) => o.value));

export function InvoiceableSalesTab({
  filters,
  canManage,
  onFlowDisabled,
}: {
  filters: Filters;
  canManage: boolean;
  onFlowDisabled?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { get, getNumber, setParams } = filters;
  const branchId = get('branchId');
  const date = get('date');
  const statusParam = get('vstatus');
  const status = STATUS_VALUES.has(statusParam) ? (statusParam as InvoiceableStatus) : undefined;
  const search = get('search');
  const onlyFiscalReady = get('ready') === '1';
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 25;

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

  // El API exige la sucursal (§7.3 es por sucursal y día): sin ella no se consulta.
  const query: InvoiceableSalesQuery | null = useMemo(
    () =>
      branchId
        ? {
            branchId,
            date: date || undefined,
            status,
            search: search || undefined,
            onlyFiscalReady: onlyFiscalReady || undefined,
            page,
            limit,
          }
        : null,
    [branchId, date, status, search, onlyFiscalReady, page, limit],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useInvoiceableSales(query);
  const { branches } = useBranchTimezone();
  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name, hint: b.code })),
    [branches],
  );

  const createInvoice = useCreateInvoice();
  const fiscalEditor = useCustomerFiscalEditor(() => {
    queryClient.invalidateQueries({ queryKey: billingKeys.invoiceableSales() });
  });

  const [target, setTarget] = useState<InvoiceableSale | null>(null);
  const [globalTarget, setGlobalTarget] = useState<InvoiceableSale | null>(null);
  const [inlineError, setInlineError] = useState<{ text: string; invoiceId: string | null } | null>(null);

  // Sin sucursal no hay consulta: no arrastrar filas de la sucursal anterior (keepPreviousData).
  const rows = branchId ? (data?.data ?? []) : [];
  const total = branchId ? (data?.total ?? 0) : 0;

  const sourceBody = (sale: InvoiceableSale) =>
    sale.kind === 'order' ? { orderId: sale.id } : { posSaleId: sale.id };

  const invoiceSale = async (sale: InvoiceableSale, acknowledgeGlobal: boolean) => {
    setInlineError(null);
    try {
      const invoice = await createInvoice.mutateAsync({ ...sourceBody(sale), acknowledgeGlobal: acknowledgeGlobal || undefined });
      setTarget(null);
      setGlobalTarget(null);
      router.push(`/admin/facturacion/${invoice.id}`);
    } catch (err) {
      if (isBillingFlowDisabled(err)) onFlowDisabled?.();
      if (isBillingErrorCode(err, 'CFDI_IN_GLOBAL') && !acknowledgeGlobal) {
        setTarget(null);
        setGlobalTarget(sale);
        return;
      }
      setInlineError({
        text: `${sale.folio}: ${billingErrorMessage(err, 'No se pudo facturar')}`,
        invoiceId: billingErrorInvoiceId(err),
      });
    }
  };

  // "Limpiar filtros" conserva la sucursal: sin ella la pestaña no consulta nada.
  const hasFilters = Boolean(date || status || search || onlyFiscalReady);
  const resetFilters = () => {
    setSearchInput('');
    setParams({ date: null, vstatus: null, search: null, ready: null, page: null });
  };

  const columns: DataTableColumn<InvoiceableSale>[] = [
    {
      key: 'folio',
      header: 'Folio',
      render: (s) => (
        <div>
          <p className="font-mono text-sm font-semibold text-gray-900">{s.folio}</p>
          <p className="text-xs text-gray-500">
            {s.kind === 'order' ? 'Pedido' : 'Ticket'} · {s.branchName}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha local',
      render: (s) => (
        <span className="whitespace-nowrap text-sm text-gray-700">
          {formatIsoDate(s.localDate)} {s.localTime}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (s) => (
        <div className="min-w-[200px]">
          <p className="text-sm font-medium text-gray-900">
            {s.customerName ?? 'Sin cliente'}
            {s.customerCode && <span className="ml-1 font-mono text-xs text-gray-500">#{s.customerCode}</span>}
          </p>
          <p className="font-mono text-xs text-gray-600">{s.customerRfc ?? 'Sin RFC'}</p>
          {s.fiscalReady ? (
            <Badge variant="success" className="mt-1">Datos fiscales listos</Badge>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {(s.fiscalIssues ?? []).length === 0 ? (
                <Badge variant="warning">Sin datos fiscales</Badge>
              ) : (
                s.fiscalIssues.map((issue) => (
                  <Badge key={issue} variant="warning" title={CUSTOMER_ISSUE_INFO[issue]?.why}>
                    {CUSTOMER_ISSUE_INFO[issue]?.label ?? issue}
                  </Badge>
                ))
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Forma de pago',
      render: (s) => (
        <div className="text-sm">
          {s.paymentFormCode ? (
            <p className="text-gray-900">
              {s.paymentFormCode} · {getPaymentFormName(s.paymentFormCode)}
            </p>
          ) : (
            <p className="text-amber-700">No resoluble</p>
          )}
          <p className="text-xs text-gray-500">{s.paymentMethodCode ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (s) => <span className="font-semibold text-gray-900">{formatCurrency(s.total)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (s) => {
        const info = INVOICEABLE_STATUS_INFO[s.invoiceStatus];
        return (
          <div className="space-y-1">
            <Badge variant={info?.badge ?? 'secondary'}>{info?.label ?? s.invoiceStatus}</Badge>
            {s.invoiceStatus === 'en_global' && s.globalFolio && (
              <p className="text-xs text-gray-600">Global {s.globalFolio}</p>
            )}
            {s.reason && <p className="max-w-[220px] text-xs text-gray-500">{s.reason}</p>}
            {(s.blockers ?? []).length > 0 && (
              <ul className="list-disc pl-4 text-xs">
                {s.blockers.map((b, i) => (
                  <li
                    key={i}
                    className={
                      RETRYABLE_INVOICEABLE_BLOCKERS.has(invoiceableBlockerCode(b)) ? 'text-amber-700' : 'text-red-700'
                    }
                  >
                    {invoiceableBlockerText(b)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (s) => {
        const codes = (s.blockers ?? []).map(invoiceableBlockerCode);
        // Un intento `pending`/`error` NO bloquea: el POST reutiliza esa fila y la re-timbra.
        const isRetry = codes.some((c) => RETRYABLE_INVOICEABLE_BLOCKERS.has(c));
        const blocked = codes.some((c) => !RETRYABLE_INVOICEABLE_BLOCKERS.has(c));
        return (
          <div className="flex flex-col items-end gap-1">
            {s.invoiceId && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/facturacion/${s.invoiceId}`}>
                  {s.invoiceStatus === 'nominativa' ? 'Ver factura' : 'Ver intento'}
                </Link>
              </Button>
            )}
            {s.invoiceStatus === 'en_global' && s.globalInvoiceId && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/facturacion/${s.globalInvoiceId}`}>Ver global</Link>
              </Button>
            )}
            {canManage && (s.invoiceStatus === 'sin_factura' || s.invoiceStatus === 'en_global') && (
              s.fiscalReady ? (
                <Button
                  size="sm"
                  disabled={blocked || createInvoice.isPending}
                  title={blocked ? 'Corrige los bloqueadores antes de facturar' : undefined}
                  onClick={() => (s.invoiceStatus === 'en_global' ? setGlobalTarget(s) : setTarget(s))}
                >
                  {isRetry ? 'Reintentar' : s.invoiceStatus === 'en_global' ? 'Facturar (ya en global)' : 'Facturar'}
                </Button>
              ) : s.customerId ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={fiscalEditor.isLoading}
                  onClick={() =>
                    void fiscalEditor.openFor({
                      customerId: s.customerId as string,
                      rfc: s.customerRfc,
                      code: s.customerCode,
                      name: s.customerName,
                    })
                  }
                >
                  {fiscalEditor.isLoading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Capturar datos fiscales
                </Button>
              ) : (
                <span className="text-xs text-gray-500">Sin cliente: no se puede facturar</span>
              )
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">
              Ventas nativas completadas con total mayor a cero, por sucursal. Elige la sucursal; sin fecha se muestra su día de hoy.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2 text-gray-600" onClick={() => void refetch()} disabled={isFetching || !branchId}>
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
              <Label className="text-xs text-muted-foreground" htmlFor="vs-branch">Sucursal</Label>
              <SearchableSelect
                id="vs-branch"
                options={branchOptions}
                value={branchId}
                onChange={(v) => setParams({ branchId: v, page: null })}
                showAllOption={false}
                placeholder="Elige una sucursal"
              />
            </div>
            <div className="lg:col-span-2">
              <Label className="text-xs text-muted-foreground" htmlFor="vs-date">Día (zona de la sucursal)</Label>
              <Input id="vs-date" type="date" value={date} onChange={(e) => setParams({ date: e.target.value })} />
            </div>
            <div className="lg:col-span-2">
              <Label className="text-xs text-muted-foreground" htmlFor="vs-status">Estado</Label>
              <SearchableSelect
                id="vs-status"
                options={INVOICEABLE_STATUS_OPTIONS}
                value={status ?? ''}
                onChange={(v) => setParams({ vstatus: v })}
                allLabel="Todos"
              />
            </div>
            <div className="lg:col-span-4">
              <Label htmlFor="vs-search" className="text-xs text-muted-foreground">Cliente / RFC / folio</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                <Input
                  id="vs-search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Nombre, número o RFC del cliente, folio"
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 lg:col-span-12">
              <Checkbox id="vs-ready" checked={onlyFiscalReady} onCheckedChange={(v) => setParams({ ready: v === true ? '1' : null })} />
              <Label htmlFor="vs-ready" className="text-sm font-normal">Solo clientes con datos fiscales listos</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {inlineError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <span>{inlineError.text}</span>
          <div className="flex gap-2">
            {inlineError.invoiceId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/facturacion/${inlineError.invoiceId}`}>Ver factura</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setInlineError(null)}>Cerrar</Button>
          </div>
        </div>
      )}

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Ventas por facturar</h2>
            <p className="text-sm text-gray-600">{total} en total</p>
          </div>
          {!branchId ? (
            <div className="py-10 text-center" role="status">
              <BuildingStorefrontIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" aria-hidden />
              <h3 className="mb-2 text-xl font-bold text-gray-900">Elige una sucursal</h3>
              <p className="text-gray-600">
                Las ventas por facturar se consultan por sucursal y día. Elige la sucursal en el filtro de arriba.
              </p>
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
              <ExclamationTriangleIcon className="mx-auto mb-3 h-10 w-10 text-red-500" aria-hidden />
              <h3 className="mb-1 text-base font-bold text-red-900">No se pudieron cargar las ventas</h3>
              <p className="text-sm text-red-700">{billingErrorMessage(error, 'Error al consultar las ventas por facturar')}</p>
              <Button variant="outline" className="mt-4" onClick={() => void refetch()}>Reintentar</Button>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows}
                isLoading={isLoading && !data}
                getRowKey={(s) => `${s.kind}:${s.id}`}
                minWidthClassName="min-w-[1080px]"
                emptyState={
                  <div className="py-2 text-center">
                    <DocumentTextIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" aria-hidden />
                    <h3 className="mb-2 text-xl font-bold text-gray-900">No hay ventas por facturar</h3>
                    <p className="text-gray-600">
                      Solo aparecen ventas nativas de sucursales de México con facturación en v2 arrancada.
                    </p>
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

      {/* Confirmación de factura nominativa */}
      {target && (
        <ConfirmDialog
          open={!!target}
          onOpenChange={(open) => {
            if (!open) setTarget(null);
          }}
          title={`${(target.blockers ?? []).some((b) => RETRYABLE_INVOICEABLE_BLOCKERS.has(invoiceableBlockerCode(b))) ? 'Reintentar la factura del' : 'Facturar'} ${target.kind === 'order' ? 'pedido' : 'ticket'} ${target.folio}`}
          description="Se timbrará 1 CFDI de ingreso con los datos fiscales actuales del cliente. Revisa el receptor antes de confirmar."
          confirmLabel="Timbrar factura"
          isPending={createInvoice.isPending}
          onConfirm={() => invoiceSale(target, false)}
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-gray-50 p-3 text-sm">
            <dt className="text-gray-500">Receptor</dt>
            <dd className="font-medium text-gray-900">{target.customerName ?? '—'}</dd>
            <dt className="text-gray-500">RFC</dt>
            <dd className="font-mono">{target.customerRfc ?? '—'}</dd>
            <dt className="text-gray-500">Forma de pago</dt>
            <dd>{target.paymentFormCode ? `${target.paymentFormCode} · ${getPaymentFormName(target.paymentFormCode)}` : 'No resoluble'}</dd>
            <dt className="text-gray-500">Método</dt>
            <dd>{target.paymentMethodCode ? PAYMENT_METHOD_LABELS[target.paymentMethodCode] ?? target.paymentMethodCode : '—'}</dd>
            <dt className="text-gray-500">Total</dt>
            <dd className="font-semibold">{formatCurrency(target.total)}</dd>
          </dl>
        </ConfirmDialog>
      )}

      {/* Ticket que ya está en una global viva (§5.3.7) */}
      {globalTarget && (
        <ConfirmDialog
          open={!!globalTarget}
          onOpenChange={(open) => {
            if (!open) setGlobalTarget(null);
          }}
          title={`${globalTarget.folio} ya está en la factura global ${globalTarget.globalFolio ?? ''}`}
          description="Facturarlo de forma nominativa exige tres pasos. Confirma solo si Contabilidad lo autoriza."
          confirmLabel="Entiendo, facturar nominativa"
          confirmText="FACTURAR"
          destructive
          isPending={createInvoice.isPending}
          onConfirm={() => invoiceSale(globalTarget, true)}
        >
          <ol className="list-decimal space-y-1 pl-5">
            <li>Se timbra la factura nominativa del ticket y se libera de la global.</li>
            <li>La global queda marcada &quot;por reexpedir&quot;: hay que cancelarla con el motivo 04.</li>
            <li>Desde el detalle de la global se reexpide sin los tickets facturados (relación 04).</li>
          </ol>
        </ConfirmDialog>
      )}

      {fiscalEditor.dialog}
    </div>
  );
}
