'use client';

// MyOrdersView — "Mis pedidos": los pedidos de la cuenta en sesión (GET /distributor/orders,
// que los busca por cliente: no depende de tener red ni panel).
// Dos lugares la muestran:
//   · `panel`: /distribuidor/pedidos, dentro del panel del distribuidor (con "Volver al panel");
//   · `store`: /mis-pedidos, para la cuenta del público (cliente final), con el encabezado
//     de la tienda y sin nada del panel.

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
  PhoneIcon,
  ShoppingBagIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LinePersonalization } from '@/components/storefront/LinePersonalization';
import { useMyOrders } from '@/hooks/useMyOrders';
import { useMyOrder } from '@/hooks/useOrders';
import { pickupAddressLine } from '@/lib/checkout/pickup-branches';
import { parseOrderDate } from '@/lib/orders/order-date';
import {
  pickupOrderView,
  usesPickupReadyLabel,
  type PickupOrderBranch,
  type PickupOrderView,
} from '@/lib/orders/pickup-progress';
import { personalizationOf } from '@/lib/storefront/personalization';
import { cn } from '@/lib/utils';
import type { MyOrder } from '@/services/distributorApi';

// ===== Helpers de formato =====

// Moneda POR PEDIDO (hay distribuidores en USD): un formateador por código,
// cacheado; sin código (API anterior a la mig 176) se asume MXN.
const currencyFormatters = new Map<string, Intl.NumberFormat>();
function currencyFormatter(code: string | null | undefined): Intl.NumberFormat {
  const currency = (code || 'MXN').toUpperCase();
  let fmt = currencyFormatters.get(currency);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency });
    } catch {
      fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    }
    currencyFormatters.set(currency, fmt);
  }
  return fmt;
}

function formatDate(value: string | null): string {
  // La fecha del pedido llega sin hora ("2026-11-11"): es ESE día, no la medianoche UTC
  // (que en México se veía como el día anterior). Ver lib/orders/order-date.
  const d = parseOrderDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ===== Etiquetas / colores de estado =====

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'info' | 'secondary';

// Las claves (pending/paid/...) son códigos de estado del backend; NO se traducen.
// Solo se traduce la etiqueta visible (status.<clave> / payment.<clave>).
const ORDER_STATUS: Record<string, BadgeVariant> = {
  pending: 'warning',
  confirmed: 'success',
  paid: 'success',
  processing: 'info',
  // Entrega a domicilio lista para envío (Almacén ya la surtió).
  ready: 'info',
  shipped: 'info',
  delivered: 'success',
  completed: 'success',
  cancelled: 'destructive',
};

const PAYMENT_STATUS: Record<
  string,
  { variant: BadgeVariant; Icon: typeof CheckCircleIcon }
> = {
  completed: { variant: 'success', Icon: CheckCircleIcon },
  paid: { variant: 'success', Icon: CheckCircleIcon },
  pending: { variant: 'warning', Icon: ClockIcon },
  partial: { variant: 'info', Icon: ClockIcon },
  failed: { variant: 'destructive', Icon: XCircleIcon },
  refunded: { variant: 'secondary', Icon: ArrowPathIcon },
};

type OrdersT = ReturnType<typeof useTranslations<'distributor.orders'>>;

function orderStatusBadge(order: MyOrder, t: OrdersT) {
  const { status } = order;
  const variant = ORDER_STATUS[status] ?? ('secondary' as const);
  // Etiqueta traducida; si el código es desconocido se muestra tal cual. "Listo" en un
  // pedido para recoger es "Listo para recoger" (la general, "Listo para envío", es de envíos).
  const label = usesPickupReadyLabel(order)
    ? t('pickup.statusReady')
    : ORDER_STATUS[status]
      ? t(`status.${status}` as never)
      : status;
  return <Badge variant={variant}>{label}</Badge>;
}

function paymentBadge(order: MyOrder, t: OrdersT) {
  // Si no hay registro de pago (pedidos migrados), inferimos del estado del pedido.
  const key =
    order.paymentStatus ??
    (['confirmed', 'paid', 'delivered', 'completed', 'shipped'].includes(order.status)
      ? 'completed'
      : 'pending');
  const p = PAYMENT_STATUS[key] ?? PAYMENT_STATUS.pending;
  const labelKey = PAYMENT_STATUS[key] ? key : 'pending';
  const { Icon } = p;
  return (
    <Badge variant={p.variant} className="gap-1">
      <Icon className="h-3.5 w-3.5" />
      {t(`payment.${labelKey}` as never)}
    </Badge>
  );
}

// ===== Página =====

const PAGE_SIZE = 10;

interface MyOrdersViewProps {
  /** Dónde se muestra: dentro del panel del distribuidor o en la tienda (cuenta del público). */
  variant?: 'panel' | 'store';
}

export function MyOrdersView({ variant = 'panel' }: MyOrdersViewProps) {
  const inStore = variant === 'store';
  const t = useTranslations('distributor.orders');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = useMyOrders({
    page,
    limit: PAGE_SIZE,
  });

  const orders = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ClipboardDocumentListIcon className="h-8 lg:h-10 w-8 lg:w-10" />
                <h1 className="text-2xl lg:text-4xl font-bold">{t('title')}</h1>
              </div>
              <p className="text-white/80 text-base lg:text-lg">
                {inStore ? t('subtitleStore') : t('subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!inStore && (
                <Link href="/distribuidor">
                  <Button variant="secondary" size="sm">
                    {t('backToPanel')}
                  </Button>
                </Link>
              )}
              <Link href="/productos">
                <Button variant="secondary" size="sm">
                  <ShoppingBagIcon className="h-4 w-4" />
                  {t('buyProducts')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {isLoading ? (
          <OrdersSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} t={t} />
        ) : orders.length === 0 ? (
          <EmptyState t={t} inStore={inStore} />
        ) : (
          <>
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} t={t} />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm text-gray-600">
                  {t('pagination.pageOf', { page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== Tarjeta de pedido =====
// Dos tipos: pedido de la tienda en línea (`online`) y entrega a domicilio
// capturada por Call Center en el POS (`home_delivery`). Ambos muestran la
// entrega de almacén (sucursal que surte, guía, enviado/entregado) cuando
// existe: las del POS siempre; las de pedidos web desde la mig 176 (se crea al
// confirmarse el pago). Un pedido web para recoger en sucursal no lleva
// domicilio ni guía: "Recoger en…" y, abajo, su seguimiento de 4 pasos con el
// aviso que le toca y la sucursal (PickupOrderSection, 11-nov-2026).

function OrderCard({ order, t }: { order: MyOrder; t: OrdersT }) {
  const home = order.kind === 'home_delivery';
  const pickup = order.deliveryMode === 'pickup' || (!home && order.delivery === 'pickup');
  // Solo pedidos para recoger: en qué paso va y qué se le dice (lib/orders/pickup-progress).
  const pickupView = pickupOrderView(order);
  const showsFulfillment = home || !!order.deliveryStatus;
  const currencyFmt = currencyFormatter(order.currencyCode);
  return (
    <Card className="border border-gray-200 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Izquierda: número, fecha, entrega */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900">
                {home
                  ? t('saleNumber', { number: order.orderNumber })
                  : t('orderNumber', { number: order.orderNumber })}
              </span>
              {orderStatusBadge(order, t)}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {home ? t('kindCallCenter') : t('kindOnline')}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(order.orderDate ?? order.createdAt)}
              {order.itemsCount > 0 && (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1">
                    <CubeIcon className="h-4 w-4" />
                    {t('items', { count: order.itemsCount })}
                  </span>
                </>
              )}
            </p>
            {showsFulfillment ? (
              <div className="mt-1.5 space-y-0.5 text-sm text-gray-600">
                <p className="flex items-center gap-1.5">
                  {pickup ? (
                    <BuildingStorefrontIcon className="h-4 w-4 shrink-0 text-[#3E667D]" />
                  ) : (
                    <TruckIcon className="h-4 w-4 shrink-0 text-[#3E667D]" />
                  )}
                  <span>
                    {pickup
                      ? t('pickupAt', {
                          branch:
                            order.pickupBranchName || order.fulfillBranchName || t('pickupDefaultBranch'),
                        })
                      : t('homeDelivery')}
                    {!pickup && order.fulfillBranchName
                      ? ` · ${t('fulfilledBy', { branch: order.fulfillBranchName })}`
                      : ''}
                  </span>
                </p>
                {!pickup && order.recipientName && (
                  <p className="text-gray-500">{t('recipient', { name: order.recipientName })}</p>
                )}
                {!pickup && order.addressText && <p className="text-gray-500">{order.addressText}</p>}
                {!pickup && order.trackingNumber && (
                  <p className="font-medium text-[#3E667D]">
                    {order.carrier
                      ? t('carrierAndTracking', { carrier: order.carrier, tracking: order.trackingNumber })
                      : t('trackingOnly', { tracking: order.trackingNumber })}
                  </p>
                )}
                {/* Recoger en sucursal: el avance (preparando, listo, entregado) va abajo, en su seguimiento. */}
                {pickup ? null : order.deliveredAt ? (
                  <p className="text-green-700">{t('deliveredOn', { date: formatDate(order.deliveredAt) })}</p>
                ) : order.shippedAt ? (
                  <p className="text-gray-500">{t('shippedOn', { date: formatDate(order.shippedAt) })}</p>
                ) : order.deliveryStatus === 'pending' && order.status !== 'cancelled' ? (
                  <p className="text-gray-500">{t('preparing')}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600">
                {order.delivery === 'pickup' ? (
                  <>
                    <BuildingStorefrontIcon className="h-4 w-4 text-[#3E667D]" />
                    {t('pickupAt', {
                      branch: order.pickupBranchName || t('pickupDefaultBranch'),
                    })}
                  </>
                ) : (
                  <>
                    <TruckIcon className="h-4 w-4 text-[#3E667D]" />
                    {t('homeDelivery')}
                  </>
                )}
              </p>
            )}
          </div>

          {/* Derecha: pago + total */}
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {paymentBadge(order, t)}
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {currencyFmt.format(order.total)}
              </p>
              {order.totalPoints > 0 && (
                <p className="text-xs font-medium text-[#3E667D]">
                  {t('points', {
                    points: order.totalPoints.toLocaleString('es-MX'),
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
        {pickupView && <PickupOrderSection view={pickupView} t={t} />}
        {!home && order.itemsCount > 0 && <OrderItems order={order} t={t} />}
      </CardContent>
    </Card>
  );
}

// ===== Pedido para recoger en sucursal =====
// Seguimiento de 4 pasos (Pagado → Preparando → Listo para recoger → Entregado) con el
// aviso que le toca a cada uno y, mientras se prepara o está listo, la sucursal con su
// dirección, teléfono y mapa. Sin pagar va el aviso de "pendiente de pago" en lugar del
// seguimiento; cancelado, nada. Qué paso va y qué se dice lo decide lib/orders/pickup-progress.

const PICKUP_LINK =
  'inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-[#3E667D] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

function PickupOrderSection({ view, t }: { view: PickupOrderView; t: OrdersT }) {
  if (view.stage === 'cancelled') return null;

  if (view.stage === 'unpaid') {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <ClockIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">{t('pickup.unpaidTitle')}</p>
          <p>{t('pickup.unpaidBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      <ol aria-label={t('pickup.progress')} className="flex items-start">
        {view.steps.map((step, index) => {
          const reached = step.state !== 'todo';
          // "Entregado" es el final: queda palomeado y es el paso que se resalta.
          const highlighted = step.state === 'current' || (view.stage === 'delivered' && step.key === 'delivered');
          return (
            <li
              key={step.key}
              aria-current={highlighted ? 'step' : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
            >
              {/* Línea que une este paso con el anterior (de centro a centro). */}
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                    reached ? 'bg-[#3E667D]' : 'bg-gray-200',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold',
                  step.state === 'done'
                    ? 'border-[#3E667D] bg-[#3E667D] text-white'
                    : step.state === 'current'
                      ? 'border-[#3E667D] bg-white text-[#3E667D] ring-4 ring-[#C8DDF2]'
                      : 'border-gray-300 bg-white text-gray-400',
                )}
              >
                {step.state === 'done' ? (
                  <CheckIcon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <span aria-hidden="true">{index + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  'mt-1.5 px-0.5 text-[11px] leading-tight sm:text-xs',
                  highlighted ? 'font-semibold text-[#2f5165]' : reached ? 'text-gray-700' : 'text-gray-500',
                )}
              >
                {t(`pickup.steps.${step.key}` as never)}
                <span className="sr-only"> ({t(`pickup.stepState.${step.state}` as never)})</span>
              </span>
            </li>
          );
        })}
      </ol>

      {view.stage === 'preparing' && <p className="text-sm text-gray-600">{t('pickup.preparingNote')}</p>}

      {view.stage === 'ready' && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <CheckCircleIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <p className="font-semibold text-emerald-900">{t('pickup.readyTitle')}</p>
            <p className="text-emerald-900">{t('pickup.readyBody')}</p>
            {view.readyAt && (
              <p className="mt-0.5 text-xs text-emerald-800">{t('pickup.readySince', { date: formatDate(view.readyAt) })}</p>
            )}
          </div>
        </div>
      )}

      {view.stage === 'delivered' && (view.deliveredAt || view.receivedByName) && (
        <div className="text-sm">
          {view.deliveredAt && (
            <p className="font-medium text-green-700">{t('pickupDelivered', { date: formatDate(view.deliveredAt) })}</p>
          )}
          {view.receivedByName && <p className="text-gray-600">{t('pickup.receivedBy', { name: view.receivedByName })}</p>}
        </div>
      )}

      {view.branch && <PickupBranchInfo branch={view.branch} t={t} />}
    </div>
  );
}

function PickupBranchInfo({ branch, t }: { branch: PickupOrderBranch; t: OrdersT }) {
  const address = pickupAddressLine(branch, (code) => t('pickup.zip', { code }));
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <p className="flex items-start gap-2 font-medium text-gray-900">
        <BuildingStorefrontIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#3E667D]" />
        <span className="min-w-0 break-words">{branch.name}</span>
      </p>
      {address && <p className="mt-0.5 break-words pl-6 text-gray-600">{address}</p>}
      {(branch.phone || branch.mapUrl) && (
        <div className="flex flex-wrap gap-x-6 pl-6">
          {branch.phone &&
            (branch.phoneHref ? (
              <a
                href={branch.phoneHref}
                aria-label={t('pickup.callBranch', { phone: branch.phone })}
                className={PICKUP_LINK}
              >
                <PhoneIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {branch.phone}
              </a>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-1.5 text-gray-700">
                <PhoneIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#3E667D]" />
                {branch.phone}
              </span>
            ))}
          {branch.mapUrl && (
            <a href={branch.mapUrl} target="_blank" rel="noopener noreferrer" className={PICKUP_LINK}>
              <MapPinIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {t('pickup.viewMap')}
              <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="sr-only">{t('pickup.opensNewTab')}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Artículos del pedido (bajo demanda) =====
// La lista solo trae el conteo; los renglones (nombre, cantidad y su personalización,
// mig 179) se piden al abrir con GET /orders/my-orders/:id. Solo pedidos de la tienda
// en línea: las entregas capturadas en el POS no tienen ese detalle.

function OrderItems({ order, t }: { order: MyOrder; t: OrdersT }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const detail = useMyOrder(open ? order.id : null, { retry: 1 });
  const money = currencyFormatter(order.currencyCode);
  const items = (detail.data?.items ?? []).filter((item) => item.isActive !== false);
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-sm font-medium text-[#3E667D] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
      >
        <ChevronDownIcon aria-hidden="true" className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        {open ? t('itemsHide') : t('itemsShow')}
      </button>
      {open && (
        <div id={panelId}>
          {detail.isLoading ? (
            <div className="space-y-2 py-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : detail.isError ? (
            <p className="text-sm text-red-700">{t('itemsError')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{item.productName || item.productCode || t('itemFallback')}</p>
                    <LinePersonalization text={personalizationOf(item)} />
                    <p className="text-xs text-gray-500">{t('itemQuantity', { count: item.quantity })}</p>
                  </div>
                  <p className="shrink-0 font-medium text-gray-900">{money.format(Number(item.totalPrice) || 0)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Estados (loading / vacío / error) =====

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="w-full space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ t, inStore }: { t: OrdersT; inStore: boolean }) {
  return (
    <Card className="border border-dashed border-gray-300 bg-white">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#3E667D]/10">
          <ClipboardDocumentListIcon className="h-8 w-8 text-[#3E667D]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {t('empty.title')}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          {inStore ? t('empty.bodyStore') : t('empty.body')}
        </p>
        <Link href="/productos" className="mt-6">
          <Button>
            <ShoppingBagIcon className="h-4 w-4" />
            {t('exploreProducts')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry, t }: { onRetry: () => void; t: OrdersT }) {
  return (
    <Card className="border border-red-200 bg-red-50">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <XCircleIcon className="mb-3 h-10 w-10 text-red-400" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('error.title')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('error.body')}
        </p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <ArrowPathIcon className="h-4 w-4" />
          {t('error.retry')}
        </Button>
      </CardContent>
    </Card>
  );
}
