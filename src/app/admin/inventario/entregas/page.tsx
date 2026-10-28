'use client';

// Entregas a domicilio (Almacén): pedidos que Call Center cobra en el POS en
// modo staff con domicilio confirmado y, desde la mig 176 (28-oct-2026), los
// PEDIDOS WEB pagados en línea (badge "Pedido web"; se crean solos al confirmarse
// el pago). Almacén los surte, los marca listos, enviados (paquetería + guía) y
// entregados; un pedido web para RECOGER en sucursal solo se marca "entregado en
// mostrador". Puede ver la orden de surtido y el ticket e imprimirlos. Sin
// fechas, el API muestra desde HOY más todo lo que siga abierto (las ventas
// anteriores al arranque se surtieron en el legacy).

import { Fragment, Suspense, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
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
  DELIVERY_KIND_LABELS,
  DELIVERY_MODE_LABELS,
  DELIVERY_STATUS_LABELS,
  type Delivery,
  type DeliveryKind,
  type DeliveryQuery,
  type DeliveryStatus,
} from '@/types/deliveries';
import { buildPickingSheetHtml, buildTicketHtml, printHtml } from '@/lib/delivery-print';
import {
  DELIVERY_DETAIL_ONLY_ACTIONS,
  availableDeliveryActions,
  deliveryActionTitle,
  deliveryCancelNotice,
  deliveryDocLabel,
  deliveryModeOf,
  deliveryPaymentNotice,
  deliveryPaymentShort,
  paymentMethodLabel,
  type DeliveryAction,
} from '@/lib/deliveries/actions';
import { currentFontScale } from '@/lib/preferences';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

type Tab = 'open' | DeliveryStatus | 'all';

const KIND_OPTIONS: { value: 'all' | DeliveryKind; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pos_sale', label: 'Ventas POS' },
  { value: 'order', label: 'Pedidos web' },
];

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

type ActionType = DeliveryAction;

/** Ícono y color del botón de cada acción en la tabla. */
const ACTION_BUTTON: Record<ActionType, { Icon: typeof CheckCircleIcon; className?: string }> = {
  ready: { Icon: CheckCircleIcon, className: 'text-blue-700 hover:bg-blue-50' },
  shipped: { Icon: TruckIcon, className: 'text-indigo-700 hover:bg-indigo-50' },
  delivered: { Icon: CheckCircleIcon, className: 'text-green-700 hover:bg-green-50' },
  edit: { Icon: PencilSquareIcon },
  unready: { Icon: ArrowUturnLeftIcon },
  unship: { Icon: ArrowUturnLeftIcon },
  cancelled: { Icon: NoSymbolIcon, className: 'text-red-600 hover:bg-red-50' },
};

/** Badges de origen y modo (solo cuando aportan: pedido web / recoger en sucursal). */
function KindBadges({ d }: { d: Pick<Delivery, 'kind' | 'deliveryMode'> }) {
  if (d.kind !== 'order') return null;
  return (
    <span className="mt-0.5 flex flex-wrap gap-1">
      <span className="inline-flex items-center rounded-full bg-[#C8DDF2] px-2 py-0.5 text-[11px] font-medium text-[#2f5165]">
        {DELIVERY_KIND_LABELS.order}
      </span>
      {deliveryModeOf(d) === 'pickup' ? (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {DELIVERY_MODE_LABELS.pickup}
        </span>
      ) : null}
    </span>
  );
}

/** Renglón de la tabla: la primera entrega del envío + todas las que lo comparten en esta vista. */
type DeliveryRowItem = Delivery & { members: Delivery[] };

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
    kind: 'all',
    page: '1',
    limit: '50',
  });
  const tab = (get('tab') || 'open') as Tab;
  const branchFilter = get('branch');
  const kindRaw = get('kind');
  const kindFilter: 'all' | DeliveryKind = kindRaw === 'order' || kindRaw === 'pos_sale' ? kindRaw : 'all';
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
      // Sin kind el API devuelve SOLO ventas POS (fail-closed para la terminal);
      // el admin pide 'all' explícito para ver ventas y pedidos web juntos.
      kind: kindFilter,
      page,
      limit,
    }),
    [branchFilter, tab, fromDate, toDate, search, includeUnpaid, kindFilter, page, limit],
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

  // Envío consolidado: las entregas que comparten clave se muestran como UN
  // renglón (el paquete), con sus ventas listadas. Las acciones aplican a todo
  // el envío (lo hace el API).
  const displayRows: DeliveryRowItem[] = useMemo(() => {
    const byKey = new Map<string, Delivery[]>();
    for (const d of data?.data ?? []) {
      const arr = byKey.get(d.shipmentKey) ?? [];
      arr.push(d);
      byKey.set(d.shipmentKey, arr);
    }
    return [...byKey.values()].map((members) => ({ ...members[0], members }));
  }, [data]);

  const columns: DataTableColumn<DeliveryRowItem>[] = useMemo(
    () => [
      {
        key: 'sale',
        header: 'Venta / Pedido',
        render: (d) =>
          d.members.length > 1 || d.shipmentSize > 1 ? (
            <div>
              <button
                type="button"
                className="font-semibold text-[#3E667D] hover:underline"
                onClick={() => setDetailId(d.id)}
              >
                Envío consolidado · {d.shipmentSize} ventas
              </button>
              <p className="font-mono text-xs text-gray-600">
                {d.members.map((m) => m.saleNumber).join(', ')}
                {d.members.length < d.shipmentSize ? ` (+${d.shipmentSize - d.members.length} fuera de esta vista)` : ''}
              </p>
              <p className="text-xs text-gray-500">{formatDateTime(d.saleCreatedAt, timeZone)}</p>
              <p className="text-xs text-gray-700">
                {formatMoney(
                  d.members.reduce((s, m) => s + m.saleTotal, 0),
                  d.currencyCode,
                )}
              </p>
              {d.members.some((m) => m.saleStatus !== 'completed') && (
                <p className="text-xs font-medium text-red-600">Hay ventas sin cobrar en el envío</p>
              )}
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="font-mono font-semibold text-[#3E667D] hover:underline"
                onClick={() => setDetailId(d.id)}
              >
                {d.saleNumber}
              </button>
              <KindBadges d={d} />
              <p className="text-xs text-gray-500">
                {formatDateTime(d.saleCreatedAt, timeZone)} · {paymentMethodLabel(d.paymentMethod)}
              </p>
              <p className="text-xs text-gray-700">{formatMoney(d.saleTotal, d.currencyCode)}</p>
              {deliveryPaymentShort(d) && (
                <p className="text-xs font-medium text-red-600">{deliveryPaymentShort(d)}</p>
              )}
            </div>
          ),
      },
      {
        key: 'customer',
        header: kindFilter === 'order' ? 'Comprador · recibe' : 'Distribuidor · recibe',
        render: (d) => (
          <div className="text-sm">
            {d.members.length > 1 ? (
              <p className="font-medium" title={d.members.map((m) => `${m.customerNumber ?? ''} ${m.customerName ?? ''}`).join(' · ')}>
                {d.members.length} distribuidores:{' '}
                <span className="font-normal text-gray-600">
                  {d.members.map((m) => m.customerName ?? m.customerNumber ?? '—').join(', ')}
                </span>
              </p>
            ) : (
              <p className="font-medium">
                {d.customerNumber ? <span className="font-mono">{d.customerNumber} </span> : null}
                {d.customerName ?? '—'}
              </p>
            )}
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
            {d.notes ? (
              <p className="text-xs text-amber-700">
                {d.kind === 'order' ? 'Comprador' : 'Call Center'}: {d.notes}
              </p>
            ) : null}
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
            <p className="font-semibold">{d.members.reduce((s, m) => s + m.itemsUnits, 0)}</p>
            <p className="text-xs text-gray-500">{d.members.reduce((s, m) => s + m.itemsCount, 0)} renglón(es)</p>
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
            {d.members.some((m) => m.status !== d.status) && (
              <p className="text-xs text-amber-700">Estados mixtos en el envío; abre el detalle</p>
            )}
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
            {/* Acciones según estado, modo (envío / recoger), cobro y origen (pedido web: sin cancelar);
                las correcciones hacia atrás (regresar a pendiente / no se envió) solo en el detalle. */}
            {availableDeliveryActions(d, canAct)
              .filter((a) => !DELIVERY_DETAIL_ONLY_ACTIONS.includes(a))
              .map((a) => {
                const { Icon, className } = ACTION_BUTTON[a];
                return (
                  <Button
                    key={a}
                    variant="ghost"
                    size="icon-sm"
                    className={className}
                    title={deliveryActionTitle(a, deliveryModeOf(d))}
                    onClick={() => setAction({ type: a, delivery: d })}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
          </div>
        ),
      },
    ],
    [canAct, timeZone, kindFilter],
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
              Pedidos cobrados por Call Center en el POS con domicilio confirmado y pedidos web pagados en
              línea. Surte, marca listo, enviado (con guía) y entregado; los pedidos para recoger en sucursal
              se marcan entregados en mostrador. Se actualiza solo cada minuto.
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
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-6">
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
              placeholder="Folio (venta o pedido TL…), número de distribuidor, quien recibe o guía"
            />
            <Button type="submit" variant="outline" size="icon" title="Buscar">
              <MagnifyingGlassIcon className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <div>
          <Label htmlFor="deliveries-kind">Tipo</Label>
          <SearchableSelect
            id="deliveries-kind"
            className="mt-1"
            options={KIND_OPTIONS}
            value={kindFilter}
            onChange={(v) => setParams({ kind: v === 'all' ? '' : v, page: '1' })}
            showAllOption={false}
            placeholder="Todas"
          />
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
        <div className="flex items-center gap-2 md:col-span-6">
          <Checkbox
            id="deliveries-unpaid"
            checked={includeUnpaid}
            onCheckedChange={(v) => setParams({ unpaid: v === true ? '1' : '' })}
          />
          <Label htmlFor="deliveries-unpaid" className="text-sm font-normal text-gray-700">
            Incluir ventas y pedidos todavía sin cobrar
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
            data={displayRows}
            getRowKey={(d) => d.shipmentKey}
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
    // La ventana de impresión no hereda el tamaño de letra del admin: se manda
    // la preferencia del usuario (Preferencias → tamaño de letra).
    const scale = currentFontScale();
    const html = kind === 'order' ? buildPickingSheetHtml(d, timeZone, scale) : buildTicketHtml(d, timeZone, scale);
    if (!printHtml(html)) toast.error('El navegador bloqueó la ventana de impresión; permite ventanas emergentes.');
  };

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {d ? deliveryDocLabel(d) : 'Entrega'}
            {d ? <StatusBadge status={d.status} label={d.statusLabel} /> : null}
            {d && d.kind === 'order' && deliveryModeOf(d) === 'pickup' ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                {DELIVERY_MODE_LABELS.pickup}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {d
              ? `${deliveryModeOf(d) === 'pickup' ? 'Entrega en mostrador' : 'Surte'} ${d.fulfillBranchCode} ${d.fulfillBranchName} · capturó ${d.requestedByName ?? (d.kind === 'order' ? 'Tienda en línea' : 'Call Center')} el ${formatDateTime(d.requestedAt, timeZone)}`
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

            {deliveryPaymentNotice(d) && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deliveryPaymentNotice(d)}</p>
            )}
            {/* Un pedido web no se cancela desde aquí: quedaría pagado y sin surtido (ver canCancelDelivery). */}
            {deliveryCancelNotice(d) && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{deliveryCancelNotice(d)}</p>
            )}
          </div>
        )}

        {d && canAct ? (
          <DialogFooter className="flex-wrap gap-2 sm:justify-start">
            {/* Botones según estado, modo, cobro y origen (recoger: solo "Entregado en mostrador" / cancelar;
                pedido web: sin "Cancelar entrega"). */}
            {availableDeliveryActions(d, canAct).map((a) => {
              const mode = deliveryModeOf(d);
              if (a === 'ready')
                return (
                  <Button key={a} onClick={() => onAction(a, d)}>
                    <CheckCircleIcon className="mr-1 h-4 w-4" /> Listo para envío
                  </Button>
                );
              if (a === 'shipped')
                return (
                  <Button key={a} onClick={() => onAction(a, d)}>
                    <TruckIcon className="mr-1 h-4 w-4" /> Enviado
                  </Button>
                );
              if (a === 'delivered')
                return (
                  <Button key={a} onClick={() => onAction(a, d)}>
                    <CheckCircleIcon className="mr-1 h-4 w-4" />{' '}
                    {mode === 'pickup' ? 'Entregado en mostrador' : 'Entregado'}
                  </Button>
                );
              if (a === 'edit')
                return (
                  <Button key={a} variant="outline" onClick={() => onAction(a, d)}>
                    <PencilSquareIcon className="mr-1 h-4 w-4" /> Corregir guía
                  </Button>
                );
              if (a === 'cancelled')
                return (
                  <Button key={a} variant="outline" className="text-red-600" onClick={() => onAction(a, d)}>
                    <NoSymbolIcon className="mr-1 h-4 w-4" /> Cancelar entrega
                  </Button>
                );
              return (
                <Button key={a} variant="outline" onClick={() => onAction(a, d)}>
                  {deliveryActionTitle(a, mode)}
                </Button>
              );
            })}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OrderView({ d, timeZone }: { d: Delivery; timeZone: string }) {
  const consolidated = !!d.shipmentItems && !!d.shipmentDeliveries && d.shipmentDeliveries.length > 1;
  const isOrder = d.kind === 'order';
  const pickup = deliveryModeOf(d) === 'pickup';
  const items = d.items ?? [];
  const units = consolidated
    ? (d.shipmentItems ?? []).reduce((s, it) => s + it.quantity, 0)
    : items.reduce((s, it) => s + it.quantity, 0);
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-3">
          <p className="text-xs uppercase text-gray-500">
            {consolidated ? 'Envío consolidado' : isOrder ? 'Comprador' : 'Distribuidor'}
          </p>
          {consolidated ? (
            <ul className="space-y-0.5">
              {d.shipmentDeliveries!.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-mono text-xs text-gray-500">{s.saleNumber}</span>{' '}
                    {s.customerNumber ? <span className="font-mono">{s.customerNumber} </span> : null}
                    {s.customerName ?? '—'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {s.itemsUnits} pza(s) · {formatMoney(s.saleTotal, d.currencyCode)}
                    {s.status !== 'pending' && s.status !== d.status ? ` · ${s.statusLabel}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-semibold">
              {d.customerNumber ? <span className="font-mono">{d.customerNumber} </span> : null}
              {d.customerName ?? '—'}
            </p>
          )}
          <p className="mt-2 text-xs uppercase text-gray-500">Recibe</p>
          <p>
            {d.recipientName}
            {d.recipientPhone ? <span className="text-gray-600"> · Tel. {d.recipientPhone}</span> : null}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 p-3">
          <p className="text-xs uppercase text-gray-500">{pickup ? 'Entregar en mostrador' : 'Enviar a'}</p>
          <p className="font-medium">{d.addressText}</p>
          {d.reference ? <p className="text-xs text-gray-600">Ref.: {d.reference}</p> : null}
          {d.notes ? (
            <p className="mt-2 text-xs text-amber-700">
              {isOrder ? 'Indicaciones del comprador' : 'Indicaciones de Call Center'}: {d.notes}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-gray-600">
        {consolidated
          ? `${d.shipmentDeliveries!.length} ventas en un solo paquete · ${formatMoney(d.shipmentDeliveries!.reduce((s, x) => s + x.saleTotal, 0), d.currencyCode)} en total`
          : `${deliveryDocLabel(d)} del ${formatDateTime(d.saleCreatedAt, timeZone)} · ${paymentMethodLabel(d.paymentMethod)} · ${formatMoney(d.saleTotal, d.currencyCode)}`}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">Clave</th>
            <th className="py-1 pr-2">Producto</th>
            <th className="py-1 text-right">Cant.</th>
            {/* Precio por renglón solo con una venta (en el consolidado cada venta trae su total arriba) */}
            {!consolidated && <th className="py-1 pl-2 text-right">P. unit.</th>}
            {!consolidated && <th className="py-1 pl-2 text-right">Importe</th>}
          </tr>
        </thead>
        <tbody>
          {consolidated &&
            (d.shipmentItems ?? []).map((it, i) => {
              const isKit =
                it.productType === 'kit' || it.productType === 'pack' || it.productType === 'promotional';
              const comps = it.components ?? [];
              return (
                <Fragment key={it.productId}>
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
                      <p className="text-[11px] text-gray-500">
                        {it.perSale.map((p) => `${p.saleNumber}${p.customerNumber ? ` (#${p.customerNumber})` : ''}: ${p.quantity}`).join(' · ')}
                      </p>
                    </td>
                    <td className="py-1 text-right text-base font-semibold">{it.quantity}</td>
                  </tr>
                  {comps.map((c) => (
                    <tr key={`${it.productId}-${c.productId}`} className="border-b border-gray-50 bg-gray-50/60 text-xs">
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
          {!consolidated &&
            items.map((it, i) => {
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
                  <td className="py-1 pl-2 text-right whitespace-nowrap text-gray-700">
                    {formatMoney(it.unitPrice, d.currencyCode)}
                  </td>
                  <td className="py-1 pl-2 text-right whitespace-nowrap font-medium">
                    {formatMoney(it.total, d.currencyCode)}
                  </td>
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
                    <td colSpan={2} />
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200">
            <td colSpan={3} className="py-1 text-right text-xs text-gray-500">
              {consolidated ? (d.shipmentItems ?? []).length : items.length} renglón(es)
            </td>
            <td className="py-1 text-right font-semibold">{units} pza(s)</td>
            {!consolidated && <td className="py-1 pl-2 text-right text-xs uppercase text-gray-500">Total</td>}
            {!consolidated && (
              <td className="py-1 pl-2 text-right text-base font-bold">{formatMoney(d.saleTotal, d.currencyCode)}</td>
            )}
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
      <p className="font-bold">{deliveryModeOf(d) === 'pickup' ? 'RECOGER EN SUCURSAL' : 'ENTREGA A DOMICILIO'}</p>
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
  const isOrder = delivery.kind === 'order';
  const mode = deliveryModeOf(delivery);
  const title = deliveryActionTitle(type, mode);

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
            : `${deliveryDocLabel(delivery)}: ${
                status === 'delivered' && mode === 'pickup'
                  ? 'entregado en mostrador'
                  : DELIVERY_STATUS_LABELS[status].toLowerCase()
              }`,
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {deliveryDocLabel(delivery)} · {delivery.recipientName} · {delivery.addressText}
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
                // Solo ventas POS llegan aquí: a un pedido web nunca se le ofrece "Cancelar entrega".
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
              {mode === 'pickup'
                ? 'Confirma que el comprador recogió su pedido en mostrador; quedará como entregado en Mis pedidos y en el rastreo.'
                : isOrder
                  ? 'Se marcará como entregado al comprador; quedará como entregado en Mis pedidos y en el rastreo del pedido.'
                  : 'Se marcará como entregado al distribuidor; se le avisa a quien capturó la venta.'}
            </p>
          )}
          {type === 'shipped' && isOrder && (
            <p className="text-sm text-gray-600">
              Al comprador le llega un correo con la paquetería y la guía; si la capturas después, se le avisa
              en ese momento.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Volver
          </Button>
          <Button onClick={submit} disabled={busy} className={type === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : ''}>
            {busy ? 'Guardando…' : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
