'use client';

// Entregas a domicilio (Almacén): pedidos que Call Center cobra en el POS en
// modo staff con domicilio confirmado. Almacén los surte, los marca listos,
// enviados (paquetería + guía) y entregados; puede ver la orden de surtido y
// el ticket e imprimirlos. Sin fechas, el API muestra desde HOY más todo lo
// que siga abierto (las ventas anteriores al arranque se surtieron en el legacy).

import { Fragment, Suspense, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PrinterIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { selectUserPermissions } from '@/store/slices/authSlice';
import { PermissionGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  useDeliveries,
  useDelivery,
  useUpdateDelivery,
  useUpdateDeliveryStatus,
} from '@/hooks/useDeliveries';
import {
  DELIVERY_STATUS_LABELS,
  type Delivery,
  type DeliveryQuery,
  type DeliveryStatus,
} from '@/types/deliveries';
import {
  buildPickingSheetHtml,
  buildTicketHtml,
  paymentMethodLabel,
  printHtml,
} from '@/lib/delivery-print';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

type Tab = 'open' | DeliveryStatus | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'open', label: 'Abiertas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'ready', label: 'Listas' },
  { key: 'shipped', label: 'Enviadas' },
  { key: 'delivered', label: 'Entregadas' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'all', label: 'Todas' },
];

const STATUS_STYLE: Record<DeliveryStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <ClockIcon className="h-3 w-3" /> },
  ready: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <CheckCircleIcon className="h-3 w-3" /> },
  shipped: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: <TruckIcon className="h-3 w-3" /> },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircleIcon className="h-3 w-3" /> },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <NoSymbolIcon className="h-3 w-3" /> },
};

type ActionType = 'ready' | 'shipped' | 'delivered' | 'cancelled' | 'edit' | 'unready' | 'unship';

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(
      value,
    );
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatDateTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

function StatusBadge({ status, label }: { status: DeliveryStatus; label?: string }) {
  const c = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.icon}
      {label ?? DELIVERY_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function EntregasPage() {
  return (
    <PermissionGuard permissions={['orders:read', 'inventory:read', 'inventory']}>
      <Suspense>
        <EntregasContent />
      </Suspense>
    </PermissionGuard>
  );
}

function EntregasContent() {
  const permissions = useSelector(selectUserPermissions);
  // Cambiar estados: orders:update o inventory:update (Almacén tiene ambos). El
  // API además exige rol de almacén/administración.
  const canAct = permissions.some(
    (p) => p === 'orders:update' || p === 'inventory:update' || p === 'orders:*' || p === 'inventory:*' || p === '*',
  );

  const { get, getNumber, setParams } = useQueryFilters({
    tab: 'open',
    branch: 'all',
    page: '1',
    limit: '50',
  });
  const tab = (get('tab') || 'open') as Tab;
  const branchFilter = get('branch');
  const fromDate = get('from');
  const toDate = get('to');
  const search = get('search');
  const includeUnpaid = get('unpaid') === '1';
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

  const query: DeliveryQuery = useMemo(
    () => ({
      branchId: branchFilter && branchFilter !== 'all' ? branchFilter : undefined,
      status: tab === 'open' ? 'pending,ready,shipped' : tab === 'all' ? undefined : tab,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: search || undefined,
      includeUnpaid: includeUnpaid || undefined,
      page,
      limit,
    }),
    [branchFilter, tab, fromDate, toDate, search, includeUnpaid, page, limit],
  );

  const { data, isLoading, isFetching, refetch } = useDeliveries(query);
  const counts = data?.counts;
  const openCount = (counts?.pending ?? 0) + (counts?.ready ?? 0) + (counts?.shipped ?? 0);
  const countFor = (key: Tab): number | null => {
    if (!counts) return null;
    if (key === 'open') return openCount;
    if (key === 'all') return openCount + counts.delivered + counts.cancelled;
    return counts[key];
  };

  // Detalle (orden + ticket) y acciones.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [action, setAction] = useState<{ type: ActionType; delivery: Delivery } | null>(null);

  const columns: DataTableColumn<Delivery>[] = useMemo(
    () => [
      {
        key: 'sale',
        header: 'Venta',
        render: (d) => (
          <div>
            <button
              type="button"
              className="font-mono font-semibold text-[#3E667D] hover:underline"
              onClick={() => setDetailId(d.id)}
            >
              {d.saleNumber}
            </button>
            <p className="text-xs text-gray-500">
              {formatDateTime(d.saleCreatedAt, timeZone)} · {paymentMethodLabel(d.paymentMethod)}
            </p>
            <p className="text-xs text-gray-700">{formatMoney(d.saleTotal, d.currencyCode)}</p>
            {d.saleStatus !== 'completed' && (
              <p className="text-xs font-medium text-red-600">
                Venta {d.saleStatus === 'pending' ? 'sin cobrar' : d.saleStatus}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Distribuidor · recibe',
        render: (d) => (
          <div className="text-sm">
            <p className="font-medium">
              {d.customerNumber ? <span className="font-mono">{d.customerNumber} </span> : null}
              {d.customerName ?? '—'}
            </p>
            <p className="text-gray-700">
              Recibe: {d.recipientName}
              {d.recipientPhone ? <span className="text-gray-500"> · {d.recipientPhone}</span> : null}
            </p>
          </div>
        ),
      },
      {
        key: 'address',
        header: 'Domicilio',
        cellClassName: 'max-w-xs',
        render: (d) => (
          <div className="text-sm">
            <p>{d.addressText}</p>
            {d.reference ? <p className="text-xs text-gray-500">Ref.: {d.reference}</p> : null}
            {d.notes ? <p className="text-xs text-amber-700">Call Center: {d.notes}</p> : null}
          </div>
        ),
      },
      {
        key: 'items',
        header: 'Piezas',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (d) => (
          <div>
            <p className="font-semibold">{d.itemsUnits}</p>
            <p className="text-xs text-gray-500">{d.itemsCount} renglón(es)</p>
          </div>
        ),
      },
      {
        key: 'requested',
        header: 'Capturó',
        cellClassName: 'text-sm text-gray-600',
        render: (d) => (
          <div>
            <p>{d.requestedByName}</p>
            <p className="text-xs text-gray-500">
              {formatDateTime(d.requestedAt, timeZone)} · {getTimezoneShortLabel(timeZone)}
            </p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (d) => (
          <div className="space-y-1">
            <StatusBadge status={d.status} label={d.statusLabel} />
            {d.status === 'shipped' || d.status === 'delivered' ? (
              <p className="text-xs text-gray-600">
                {d.carrier ?? 'Paquetería s/d'}
                {d.trackingNumber ? ` · ${d.trackingNumber}` : ''}
              </p>
            ) : null}
            {d.status === 'cancelled' && d.cancelReason ? (
              <p className="text-xs text-gray-500">{d.cancelReason}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (d) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon-sm" title="Ver orden y ticket" onClick={() => setDetailId(d.id)}>
              <EyeIcon className="h-4 w-4" />
            </Button>
            {canAct && d.status === 'pending' && d.saleStatus === 'completed' && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-blue-700 hover:bg-blue-50"
                title="Marcar listo para envío"
                onClick={() => setAction({ type: 'ready', delivery: d })}
              >
                <CheckCircleIcon className="h-4 w-4" />
              </Button>
            )}
            {canAct && (d.status === 'pending' || d.status === 'ready') && d.saleStatus === 'completed' && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-indigo-700 hover:bg-indigo-50"
                title="Marcar enviado (paquetería y guía)"
                onClick={() => setAction({ type: 'shipped', delivery: d })}
              >
                <TruckIcon className="h-4 w-4" />
              </Button>
            )}
            {canAct && d.status === 'shipped' && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-green-700 hover:bg-green-50"
                  title="Marcar entregado"
                  onClick={() => setAction({ type: 'delivered', delivery: d })}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Corregir paquetería o guía"
                  onClick={() => setAction({ type: 'edit', delivery: d })}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </Button>
              </>
            )}
            {canAct && (d.status === 'pending' || d.status === 'ready') && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-red-600 hover:bg-red-50"
                title="Cancelar entrega"
                onClick={() => setAction({ type: 'cancelled', delivery: d })}
              >
                <NoSymbolIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canAct, timeZone],
  );

  return (
    <div className="space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      {/* Encabezado (mismo estilo que el resto del admin) */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Entregas a domicilio</h1>
            <p className="mt-1 text-sm text-white/70">
              Pedidos cobrados por Call Center en el POS con domicilio confirmado. Surte, marca listo, enviado
              (con guía) y entregado. Se actualiza solo cada minuto.
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

      {/* Pestañas por estado */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = countFor(t.key);
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setParams({ tab: t.key })}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                active
                  ? 'border-[#3E667D] bg-[#3E667D] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
              {n !== null ? (
                <span className={`ml-1 text-xs ${active ? 'text-white/80' : 'text-gray-500'}`}>({n})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-5">
        <div className="md:col-span-2">
          <Label htmlFor="deliveries-search">Buscar</Label>
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ search: searchInput.trim() });
            }}
          >
            <Input
              id="deliveries-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Folio, número de distribuidor, quien recibe o guía"
            />
            <Button type="submit" variant="outline" size="icon" title="Buscar">
              <MagnifyingGlassIcon className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <div>
          <Label htmlFor="deliveries-branch">Sucursal que surte</Label>
          <SearchableSelect
            id="deliveries-branch"
            className="mt-1"
            options={branchOptions}
            value={branchFilter || 'all'}
            onChange={(v) => setParams({ branch: v })}
            showAllOption
            allValue="all"
            allLabel="Todas"
            placeholder="Todas"
          />
        </div>
        <div>
          <Label htmlFor="deliveries-from">Capturadas desde</Label>
          <Input
            id="deliveries-from"
            type="date"
            className="mt-1"
            value={fromDate}
            onChange={(e) => setParams({ from: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="deliveries-to">Hasta</Label>
          <Input
            id="deliveries-to"
            type="date"
            className="mt-1"
            value={toDate}
            onChange={(e) => setParams({ to: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-5">
          <Checkbox
            id="deliveries-unpaid"
            checked={includeUnpaid}
            onCheckedChange={(v) => setParams({ unpaid: v === true ? '1' : '' })}
          />
          <Label htmlFor="deliveries-unpaid" className="text-sm font-normal text-gray-700">
            Incluir ventas todavía sin cobrar
          </Label>
          <span className="text-xs text-gray-500">
            · Sin fechas se muestran las capturadas hoy y todas las que siguen abiertas.
          </span>
        </div>
      </div>

      {/* Tabla en tarjeta, con aire respecto a las orillas */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto px-2 pt-2">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            getRowKey={(d) => d.id}
            isLoading={isLoading}
            emptyMessage="No hay entregas con estos filtros."
            minWidthClassName="min-w-[1100px]"
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

      <DeliveryDetailDialog
        id={detailId}
        timeZone={timeZone}
        canAct={canAct}
        onClose={() => setDetailId(null)}
        onAction={(type, delivery) => setAction({ type, delivery })}
      />
      {action ? (
        <DeliveryActionDialog
          key={`${action.type}-${action.delivery.id}`}
          action={action}
          onClose={() => setAction(null)}
        />
      ) : null}
    </div>
  );
}

// ================================
// Detalle: orden de surtido + ticket
// ================================

function DeliveryDetailDialog({
  id,
  timeZone,
  canAct,
  onClose,
  onAction,
}: {
  id: string | null;
  timeZone: string;
  canAct: boolean;
  onClose: () => void;
  onAction: (type: ActionType, delivery: Delivery) => void;
}) {
  const { data: d, isLoading } = useDelivery(id);
  const [view, setView] = useState<'order' | 'ticket'>('order');

  const print = (kind: 'order' | 'ticket') => {
    if (!d) return;
    const html = kind === 'order' ? buildPickingSheetHtml(d, timeZone) : buildTicketHtml(d, timeZone);
    if (!printHtml(html)) toast.error('El navegador bloqueó la ventana de impresión; permite ventanas emergentes.');
  };

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Entrega {d?.saleNumber ?? ''}
            {d ? <StatusBadge status={d.status} label={d.statusLabel} /> : null}
          </DialogTitle>
          <DialogDescription>
            {d
              ? `Surte ${d.fulfillBranchCode} ${d.fulfillBranchName} · capturó ${d.requestedByName} el ${formatDateTime(d.requestedAt, timeZone)}`
              : 'Cargando…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !d ? (
          <p className="py-8 text-center text-sm text-gray-500">Cargando…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-gray-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setView('order')}
                  className={`rounded px-3 py-1 text-sm ${view === 'order' ? 'bg-[#3E667D] text-white' : 'text-gray-700'}`}
                >
                  Orden de surtido
                </button>
                <button
                  type="button"
                  onClick={() => setView('ticket')}
                  className={`rounded px-3 py-1 text-sm ${view === 'ticket' ? 'bg-[#3E667D] text-white' : 'text-gray-700'}`}
                >
                  Ticket
                </button>
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => print('order')}>
                  <PrinterIcon className="mr-1 h-4 w-4" /> Imprimir hoja de surtido
                </Button>
                <Button variant="outline" size="sm" onClick={() => print('ticket')}>
                  <PrinterIcon className="mr-1 h-4 w-4" /> Imprimir ticket
                </Button>
              </div>
            </div>

            {view === 'order' ? <OrderView d={d} timeZone={timeZone} /> : <TicketView d={d} timeZone={timeZone} />}

            {d.saleStatus !== 'completed' && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                La venta está {d.saleStatus === 'pending' ? 'sin cobrar' : d.saleStatus}; no se puede surtir.
              </p>
            )}
          </div>
        )}

        {d && canAct ? (
          <DialogFooter className="flex-wrap gap-2 sm:justify-start">
            {d.status === 'pending' && d.saleStatus === 'completed' && (
              <Button onClick={() => onAction('ready', d)}>
                <CheckCircleIcon className="mr-1 h-4 w-4" /> Listo para envío
              </Button>
            )}
            {(d.status === 'pending' || d.status === 'ready') && d.saleStatus === 'completed' && (
              <Button onClick={() => onAction('shipped', d)}>
                <TruckIcon className="mr-1 h-4 w-4" /> Enviado
              </Button>
            )}
            {d.status === 'ready' && (
              <Button variant="outline" onClick={() => onAction('unready', d)}>
                Regresar a pendiente
              </Button>
            )}
            {d.status === 'shipped' && (
              <>
                <Button onClick={() => onAction('delivered', d)}>
                  <CheckCircleIcon className="mr-1 h-4 w-4" /> Entregado
                </Button>
                <Button variant="outline" onClick={() => onAction('edit', d)}>
                  <PencilSquareIcon className="mr-1 h-4 w-4" /> Corregir guía
                </Button>
                <Button variant="outline" onClick={() => onAction('unship', d)}>
                  No se envió (regresar a listo)
                </Button>
              </>
            )}
            {(d.status === 'pending' || d.status === 'ready') && (
              <Button variant="outline" className="text-red-600" onClick={() => onAction('cancelled', d)}>
                <NoSymbolIcon className="mr-1 h-4 w-4" /> Cancelar entrega
              </Button>
            )}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OrderView({ d, timeZone }: { d: Delivery; timeZone: string }) {
  const items = d.items ?? [];
  const units = items.reduce((s, it) => s + it.quantity, 0);
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-3">
          <p className="text-xs uppercase text-gray-500">Distribuidor</p>
          <p className="font-semibold">
            {d.customerNumber ? <span className="font-mono">{d.customerNumber} </span> : null}
            {d.customerName ?? '—'}
          </p>
          <p className="mt-2 text-xs uppercase text-gray-500">Recibe</p>
          <p>
            {d.recipientName}
            {d.recipientPhone ? <span className="text-gray-600"> · Tel. {d.recipientPhone}</span> : null}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 p-3">
          <p className="text-xs uppercase text-gray-500">Enviar a</p>
          <p className="font-medium">{d.addressText}</p>
          {d.reference ? <p className="text-xs text-gray-600">Ref.: {d.reference}</p> : null}
          {d.notes ? (
            <p className="mt-2 text-xs text-amber-700">Indicaciones de Call Center: {d.notes}</p>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-gray-600">
        Venta {d.saleNumber} del {formatDateTime(d.saleCreatedAt, timeZone)} · {paymentMethodLabel(d.paymentMethod)} ·{' '}
        {formatMoney(d.saleTotal, d.currencyCode)}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">Clave</th>
            <th className="py-1 pr-2">Producto</th>
            <th className="py-1 text-right">Cant.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const isKit =
              it.productType === 'kit' || it.productType === 'pack' || it.productType === 'promotional';
            const comps = it.components ?? [];
            return (
              <Fragment key={it.id}>
                <tr className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-gray-500">{i + 1}</td>
                  <td className="py-1 pr-2 font-mono">{it.productSku}</td>
                  <td className="py-1 pr-2">
                    {it.productName}
                    {isKit ? (
                      <span className="ml-1 text-xs text-gray-500">
                        {comps.length ? '(contiene:)' : '(kit sin composición cargada)'}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1 text-right text-base font-semibold">{it.quantity}</td>
                </tr>
                {/* Contenido del kit / promo: piezas con cantidad TOTAL (por unidad × renglón). */}
                {comps.map((c) => (
                  <tr key={`${it.id}-${c.productId}`} className="border-b border-gray-50 bg-gray-50/60 text-xs">
                    <td className="py-0.5 pr-2" />
                    <td className="py-0.5 pr-2 font-mono text-gray-500">{c.sku ?? ''}</td>
                    <td className="py-0.5 pr-2 text-gray-700">
                      ↳ {c.name}
                      <span className="ml-1 text-gray-400">
                        ({c.quantityPerUnit} × {it.quantity})
                      </span>
                    </td>
                    <td className="py-0.5 text-right font-medium text-gray-700">{c.quantityTotal}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-1 text-right text-xs text-gray-500">
              {items.length} renglón(es)
            </td>
            <td className="py-1 text-right font-semibold">{units} pza(s)</td>
          </tr>
        </tfoot>
      </table>
      {(d.carrier || d.trackingNumber || d.warehouseNotes) && (
        <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">
          {d.carrier || d.trackingNumber ? (
            <p>
              Paquetería: {d.carrier ?? '—'} · Guía: {d.trackingNumber ?? '—'}
            </p>
          ) : null}
          {d.warehouseNotes ? <p>Observaciones de Almacén: {d.warehouseNotes}</p> : null}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-500 md:grid-cols-4">
        <p>Listo: {formatDateTime(d.readyAt, timeZone)}{d.readyByName ? ` · ${d.readyByName}` : ''}</p>
        <p>Enviado: {formatDateTime(d.shippedAt, timeZone)}{d.shippedByName ? ` · ${d.shippedByName}` : ''}</p>
        <p>Entregado: {formatDateTime(d.deliveredAt, timeZone)}{d.deliveredByName ? ` · ${d.deliveredByName}` : ''}</p>
        {d.cancelledAt ? (
          <p>
            Cancelado: {formatDateTime(d.cancelledAt, timeZone)}
            {d.cancelledByName ? ` · ${d.cancelledByName}` : ''}
            {d.cancelReason ? ` · ${d.cancelReason}` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TicketView({ d, timeZone }: { d: Delivery; timeZone: string }) {
  const items = d.items ?? [];
  return (
    <div className="mx-auto w-full max-w-sm rounded-md border border-dashed border-gray-300 bg-white p-4 font-mono text-xs text-gray-900">
      <p className="text-center font-bold">TONIC LIFE</p>
      <p className="text-center">{d.saleBranchName}</p>
      <hr className="my-2 border-dashed" />
      <p>
        Folio: <strong>{d.saleNumber}</strong>
      </p>
      <p>Fecha: {formatDateTime(d.saleCreatedAt, timeZone)}</p>
      <p>
        Cliente: {d.customerNumber ?? ''} {d.customerName ?? d.recipientName}
      </p>
      <p>Pago: {paymentMethodLabel(d.paymentMethod)}</p>
      <hr className="my-2 border-dashed" />
      {items.map((it) => (
        <div key={it.id} className="mb-1">
          <p>{it.productName}</p>
          <div className="flex justify-between text-gray-700">
            <span>
              {it.productSku} · {it.quantity} × {formatMoney(it.unitPrice, d.currencyCode)}
            </span>
            <span>{formatMoney(it.total, d.currencyCode)}</span>
          </div>
          {it.components && it.components.length > 0 ? (
            <p className="text-[11px] text-gray-500">
              Incluye:{' '}
              {it.components.map((c) => `${c.quantityTotal} ${c.sku ? `${c.sku} ` : ''}${c.name}`).join(', ')}
            </p>
          ) : null}
        </div>
      ))}
      <hr className="my-2 border-dashed" />
      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{formatMoney(d.saleTotal, d.currencyCode)}</span>
      </div>
      <hr className="my-2 border-dashed" />
      <p className="font-bold">ENTREGA A DOMICILIO</p>
      <p>
        Recibe: {d.recipientName}
        {d.recipientPhone ? ` · ${d.recipientPhone}` : ''}
      </p>
      <p>{d.addressText}</p>
      {d.reference ? <p className="text-gray-600">Ref.: {d.reference}</p> : null}
      {d.carrier || d.trackingNumber ? (
        <p>
          {d.carrier ?? ''}
          {d.trackingNumber ? ` · Guía ${d.trackingNumber}` : ''}
        </p>
      ) : null}
    </div>
  );
}

// ================================
// Acciones: listo / enviado / entregado / cancelar / corregir guía
// ================================

const ACTION_TITLES: Record<ActionType, string> = {
  ready: 'Marcar listo para envío',
  shipped: 'Marcar enviado',
  delivered: 'Marcar entregado',
  cancelled: 'Cancelar entrega',
  edit: 'Corregir paquetería o guía',
  unready: 'Regresar a pendiente',
  unship: 'Regresar a listo (no se envió)',
};

function DeliveryActionDialog({
  action,
  onClose,
}: {
  action: { type: ActionType; delivery: Delivery } | null;
  onClose: () => void;
}) {
  const updateStatus = useUpdateDeliveryStatus();
  const update = useUpdateDelivery();
  const busy = updateStatus.isPending || update.isPending;

  // Formulario reiniciado por acción (key en el padre = tipo + id).
  const [carrier, setCarrier] = useState(action?.delivery.carrier ?? '');
  const [tracking, setTracking] = useState(action?.delivery.trackingNumber ?? '');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  if (!action) return null;
  const { type, delivery } = action;

  const submit = async () => {
    try {
      if (type === 'edit') {
        await update.mutateAsync({
          id: delivery.id,
          payload: {
            carrier: carrier.trim(),
            trackingNumber: tracking.trim(),
            ...(notes.trim() ? { warehouseNotes: notes.trim() } : {}),
          },
        });
        toast.success('Guía actualizada');
      } else {
        const status: DeliveryStatus =
          type === 'unready' ? 'pending' : type === 'unship' ? 'ready' : type;
        if (status === 'cancelled' && !reason.trim()) {
          toast.error('Indica el motivo de la cancelación');
          return;
        }
        await updateStatus.mutateAsync({
          id: delivery.id,
          payload: {
            status,
            ...(type === 'shipped' && carrier.trim() ? { carrier: carrier.trim() } : {}),
            ...(type === 'shipped' && tracking.trim() ? { trackingNumber: tracking.trim() } : {}),
            ...(notes.trim() ? { warehouseNotes: notes.trim() } : {}),
            ...(status === 'cancelled' ? { reason: reason.trim() } : {}),
          },
        });
        toast.success(
          status === 'cancelled'
            ? 'Entrega cancelada'
            : `Entrega ${delivery.saleNumber}: ${DELIVERY_STATUS_LABELS[status].toLowerCase()}`,
        );
      }
      onClose();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'No se pudo actualizar la entrega');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ACTION_TITLES[type]}</DialogTitle>
          <DialogDescription>
            {delivery.saleNumber} · {delivery.recipientName} · {delivery.addressText}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(type === 'shipped' || type === 'edit') && (
            <>
              <div>
                <Label htmlFor="delivery-carrier">Paquetería</Label>
                <Input
                  id="delivery-carrier"
                  className="mt-1"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Estafeta, FedEx, DHL, Paquetexpress…"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="delivery-tracking">Número de guía</Label>
                <Input
                  id="delivery-tracking"
                  className="mt-1"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Opcional; se puede capturar después"
                  maxLength={100}
                />
              </div>
            </>
          )}
          {type === 'cancelled' && (
            <div>
              <Label htmlFor="delivery-reason">Motivo</Label>
              <Textarea
                id="delivery-reason"
                className="mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Obligatorio. Se le avisa a quien capturó la venta."
                maxLength={300}
                rows={3}
              />
            </div>
          )}
          {type !== 'cancelled' && (
            <div>
              <Label htmlFor="delivery-notes">Observaciones de Almacén</Label>
              <Textarea
                id="delivery-notes"
                className="mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
                maxLength={500}
                rows={2}
              />
            </div>
          )}
          {type === 'delivered' && (
            <p className="text-sm text-gray-600">
              Se marcará como entregado al distribuidor; se le avisa a quien capturó la venta.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Volver
          </Button>
          <Button onClick={submit} disabled={busy} className={type === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : ''}>
            {busy ? 'Guardando…' : ACTION_TITLES[type]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
