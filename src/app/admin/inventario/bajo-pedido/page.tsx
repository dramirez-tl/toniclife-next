'use client';

// Bajo pedido (elaboración): pedidos web pagados que traen al menos un producto
// BAJO PEDIDO (products.fulfillment_mode = 'made_to_order', mig 182). Nacen en
// Entregas con estado "En elaboración"; aquí quien los elabora ve QUÉ hacer
// (producto, talla/color en el nombre, texto a estampar, cantidad), imprime la
// orden y los marca elaborados: la entrega pasa a "Pendiente de surtir" y sigue
// el flujo normal de Inventario › Entregas a domicilio (listo → enviado →
// entregado). Un pedido bajo pedido NO se cancela desde aquí (Pedidos lo hace
// en cascada).

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { selectUserPermissions } from '@/store/slices/authSlice';
import { PermissionGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { useActiveBranches } from '@/hooks/useBranches';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useDeliveries, useDelivery, useUpdateDeliveryStatus } from '@/hooks/useDeliveries';
import type { Delivery, DeliveryItem, DeliveryQuery } from '@/types/deliveries';
import { buildPickingSheetHtml, printHtml } from '@/lib/delivery-print';
import { deliveryDocLabel, deliveryModeOf } from '@/lib/deliveries/actions';
import { currentFontScale } from '@/lib/preferences';
import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatDateTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

/** Días naturales desde que se pagó (para ver qué urge). */
function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 86_400_000) : 0;
}

/** Líneas que hay que ELABORAR (bajo pedido); con un API anterior no marca ninguna. */
function madeToOrderLines(items: DeliveryItem[] | undefined): DeliveryItem[] {
  return (items ?? []).filter((i) => i.madeToOrder === true);
}

export default function BajoPedidoPage() {
  return (
    <PermissionGuard permissions={['orders:read', 'inventory:read', 'inventory']}>
      <Suspense>
        <BajoPedidoContent />
      </Suspense>
    </PermissionGuard>
  );
}

function BajoPedidoContent() {
  const permissions = useSelector(selectUserPermissions);
  // Marcar elaborado: mismos permisos que mover una entrega (orders:update /
  // inventory:update). El API además exige rol de almacén/administración.
  const canAct = permissions.some(
    (p) => p === 'orders:update' || p === 'inventory:update' || p === 'orders:*' || p === 'inventory:*' || p === '*',
  );

  const { get, getNumber, setParams } = useQueryFilters({ branch: 'all', page: '1', limit: '50' });
  const branchFilter = get('branch');
  const search = get('search');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 50;
  const [searchInput, setSearchInput] = useState(search);

  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` })),
    [branches],
  );
  const timeZone = useMemo(() => {
    if (branchFilter && branchFilter !== 'all') {
      return branches?.find((b) => b.id === branchFilter)?.timezone || DEFAULT_TIMEZONE;
    }
    return DEFAULT_TIMEZONE;
  }, [branches, branchFilter]);

  // Solo pedidos web "En elaboración": el estado existe únicamente para ellos.
  const query: DeliveryQuery = useMemo(
    () => ({
      branchId: branchFilter && branchFilter !== 'all' ? branchFilter : undefined,
      status: 'production',
      kind: 'order',
      search: search || undefined,
      page,
      limit,
    }),
    [branchFilter, search, page, limit],
  );
  const { data, isLoading, isFetching, refetch } = useDeliveries(query);
  const pendingCount = data?.counts?.production ?? null;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [toProduce, setToProduce] = useState<Delivery | null>(null);

  const columns: DataTableColumn<Delivery>[] = useMemo(
    () => [
      {
        key: 'order',
        header: 'Pedido web',
        render: (d) => (
          <div>
            <button
              type="button"
              className="font-mono font-semibold text-[#3E667D] hover:underline"
              onClick={() => setDetailId(d.id)}
            >
              {d.saleNumber}
            </button>
            <p className="text-xs text-gray-500">Pagado {formatDateTime(d.saleCreatedAt, timeZone)}</p>
            <p className="text-xs text-gray-700">{formatMoney(d.saleTotal, d.currencyCode)}</p>
          </div>
        ),
      },
      {
        key: 'buyer',
        header: 'Comprador · recibe',
        render: (d) => (
          <div>
            <p className="font-medium text-gray-900">
              {d.customerNumber ? <span className="font-mono">{d.customerNumber} </span> : null}
              {d.customerName ?? d.recipientName}
            </p>
            <p className="text-xs text-gray-600">
              Recibe: {d.recipientName}
              {d.recipientPhone ? ` · ${d.recipientPhone}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'destination',
        header: 'Entrega',
        render: (d) => (
          <div className="max-w-xs">
            <p className="text-sm text-gray-800">
              {deliveryModeOf(d) === 'pickup' ? 'Recoger en sucursal' : 'Envío a domicilio'} ·{' '}
              {d.fulfillBranchCode} {d.fulfillBranchName}
            </p>
            {deliveryModeOf(d) === 'shipping' ? (
              <p className="line-clamp-2 text-xs text-gray-600">{d.addressText}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'items',
        header: 'Piezas',
        render: (d) => (
          <div>
            <p className="text-lg font-semibold text-gray-900">{d.itemsUnits}</p>
            <p className="text-xs text-gray-500">{d.itemsCount} renglón(es)</p>
            {d.notes ? <p className="mt-1 line-clamp-2 text-xs text-amber-800">Comprador: {d.notes}</p> : null}
          </div>
        ),
      },
      {
        key: 'waiting',
        header: 'En espera',
        render: (d) => {
          const days = daysSince(d.requestedAt);
          return (
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                days >= 5 ? 'bg-red-100 text-red-800' : days >= 2 ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {days === 0 ? 'Hoy' : days === 1 ? '1 día' : `${days} días`}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (d) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              title="Ver qué elaborar"
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
              onClick={() => setDetailId(d.id)}
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            {canAct ? (
              <button
                type="button"
                title="Marcar elaborado (pasa a surtido)"
                className="rounded-md p-2 text-purple-700 hover:bg-purple-50"
                onClick={() => setToProduce(d)}
              >
                <WrenchScrewdriverIcon className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [canAct, timeZone],
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="rounded-2xl bg-gradient-to-r from-[#2f5165] to-[#3E667D] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Bajo pedido</h1>
            <p className="mt-1 max-w-3xl text-sm text-white/85">
              Pedidos web pagados con productos que se elaboran al recibir la compra (playeras personalizadas y
              otros souvenirs marcados &quot;Bajo pedido&quot; en su ficha). Elabóralos y márcalos aquí: pasan a{' '}
              <Link href="/admin/inventario/entregas" className="font-medium underline">
                Entregas a domicilio
              </Link>{' '}
              como pendientes de surtir. Se actualiza solo cada minuto.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5165] shadow-sm transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#3E667D] bg-[#3E667D] px-3 py-1 text-sm text-white">
          En elaboración{pendingCount !== null ? ` (${pendingCount})` : ''}
        </span>
        <Link
          href="/admin/inventario/entregas?tab=pending&kind=order"
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          Ver pedidos web pendientes de surtir
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-6">
        <div className="md:col-span-3">
          <Label htmlFor="mto-search">Buscar</Label>
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ search: searchInput.trim(), page: '1' });
            }}
          >
            <Input
              id="mto-search"
              placeholder="Folio (TL…), número de distribuidor, quien recibe"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline" aria-label="Buscar">
              <MagnifyingGlassIcon className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="mto-branch">Sucursal que surte</Label>
          <SearchableSelect
            id="mto-branch"
            className="mt-1"
            options={branchOptions}
            value={branchFilter && branchFilter !== 'all' ? branchFilter : ''}
            onChange={(v) => setParams({ branch: v || 'all', page: '1' })}
            showAllOption
            allLabel="Todas"
            allValue=""
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto px-2 pt-2">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            getRowKey={(d) => d.id}
            isLoading={isLoading}
            emptyMessage="No hay pedidos en elaboración. Los pedidos web con productos bajo pedido aparecen aquí en cuanto se pagan."
            minWidthClassName="min-w-[1000px]"
          />
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <DataTablePagination
            currentPage={page}
            pageSize={limit}
            totalItems={data?.total ?? 0}
            onPageChange={(p) => setParams({ page: String(p) })}
            onPageSizeChange={(s) => setParams({ limit: String(s), page: '1' })}
            pageSizeOptions={[20, 50, 100, 200]}
            isLoading={isFetching}
          />
        </div>
      </div>

      <ProductionDetailDialog
        id={detailId}
        timeZone={timeZone}
        canAct={canAct}
        onClose={() => setDetailId(null)}
        onProduce={(d) => {
          setDetailId(null);
          setToProduce(d);
        }}
      />
      {toProduce ? <ProduceDialog key={toProduce.id} delivery={toProduce} onClose={() => setToProduce(null)} /> : null}
    </div>
  );
}

// ================================
// Detalle: qué elaborar + orden impresa
// ================================

function ProductionDetailDialog({
  id,
  timeZone,
  canAct,
  onClose,
  onProduce,
}: {
  id: string | null;
  timeZone: string;
  canAct: boolean;
  onClose: () => void;
  onProduce: (d: Delivery) => void;
}) {
  const { data: d, isLoading } = useDelivery(id);
  const toMake = madeToOrderLines(d?.items);
  const fromStock = (d?.items ?? []).filter((i) => i.madeToOrder !== true);

  const print = () => {
    if (!d) return;
    const html = buildPickingSheetHtml(d, timeZone, currentFontScale());
    if (!printHtml(html)) toast.error('El navegador bloqueó la ventana de impresión');
  };

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {d ? deliveryDocLabel(d) : 'Pedido'}
            {d ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                <WrenchScrewdriverIcon className="h-3 w-3" />
                {d.statusLabel}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {d
              ? `${d.customerNumber ? `${d.customerNumber} · ` : ''}${d.customerName ?? d.recipientName} · pagado ${formatDateTime(
                  d.saleCreatedAt,
                  timeZone,
                )} · ${deliveryModeOf(d) === 'pickup' ? 'entrega en mostrador' : 'surte'} ${d.fulfillBranchCode} ${d.fulfillBranchName}`
              : 'Cargando…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !d ? (
          <p className="py-6 text-center text-sm text-gray-500">Cargando el pedido…</p>
        ) : (
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Qué elaborar{toMake.length > 0 ? ` (${toMake.length} renglón(es))` : ''}
              </h3>
              {toMake.length === 0 ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  El API no marcó renglones bajo pedido en este pedido; revisa la lista completa de abajo.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-purple-200">
                  {toMake.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 bg-purple-50/40 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{i.productName}</p>
                        <p className="font-mono text-xs text-gray-500">{i.productSku}</p>
                        {i.personalization ? (
                          <p className="mt-2 rounded-md border border-purple-300 bg-white px-3 py-2 text-sm">
                            <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                              Texto a estampar
                            </span>
                            <br />
                            <span className="text-lg font-semibold text-gray-900">{i.personalization}</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{i.quantity}</p>
                        <p className="text-xs text-gray-500">pza(s)</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {fromStock.length > 0 ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  De existencias (Almacén lo surte después, no se elabora)
                </h3>
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {fromStock.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700">
                      <span>
                        {i.productName} <span className="font-mono text-xs text-gray-500">{i.productSku}</span>
                        {i.personalization ? ` · ${i.personalization}` : ''}
                      </span>
                      <span className="font-semibold">{i.quantity}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <h3 className="mb-1 font-semibold text-gray-900">Entrega</h3>
                <p className="text-gray-800">{d.recipientName}</p>
                {d.recipientPhone ? <p className="text-gray-600">{d.recipientPhone}</p> : null}
                <p className="text-gray-600">{d.addressText}</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-gray-900">Indicaciones</h3>
                {d.notes ? <p className="text-amber-800">Comprador: {d.notes}</p> : null}
                {d.warehouseNotes ? <p className="text-gray-700">Almacén: {d.warehouseNotes}</p> : null}
                {!d.notes && !d.warehouseNotes ? <p className="text-gray-500">Sin indicaciones.</p> : null}
                <p className="mt-2 text-xs text-gray-500">Pedido pagado el {formatDateTime(d.requestedAt, timeZone)}.</p>
              </div>
            </section>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-start">
          <Button type="button" variant="outline" onClick={print} disabled={!d}>
            <PrinterIcon className="mr-1 h-4 w-4" /> Imprimir orden
          </Button>
          {d && canAct && d.status === 'production' ? (
            <Button type="button" onClick={() => onProduce(d)}>
              <WrenchScrewdriverIcon className="mr-1 h-4 w-4" /> Marcar elaborado
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ================================
// Marcar elaborado → pasa a surtido
// ================================

function ProduceDialog({ delivery, onClose }: { delivery: Delivery; onClose: () => void }) {
  const updateStatus = useUpdateDeliveryStatus();
  const [notes, setNotes] = useState('');
  const busy = updateStatus.isPending;

  const submit = async () => {
    try {
      await updateStatus.mutateAsync({
        id: delivery.id,
        payload: { status: 'pending', ...(notes.trim() ? { warehouseNotes: notes.trim() } : {}) },
      });
      toast.success(`${deliveryDocLabel(delivery)} elaborado: ya está en Entregas a domicilio como pendiente de surtir`);
      onClose();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'No se pudo marcar el pedido como elaborado');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar elaborado</DialogTitle>
          <DialogDescription>
            {deliveryDocLabel(delivery)} · {delivery.recipientName} · {delivery.itemsUnits} pza(s). La entrega pasa a
            &quot;Pendiente de surtir&quot; y Almacén recibe el aviso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="mto-notes">Observaciones para Almacén (opcional)</Label>
          <Textarea
            id="mto-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            placeholder="Ej. va en la caja chica junto con la taza"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            <WrenchScrewdriverIcon className="mr-1 h-4 w-4" /> {busy ? 'Guardando…' : 'Elaborado, pasa a surtido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
