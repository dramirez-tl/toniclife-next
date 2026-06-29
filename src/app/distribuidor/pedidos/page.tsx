'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ClipboardDocumentListIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyOrders } from '@/hooks/useMyOrders';
import type { MyOrder } from '@/services/distributorApi';

// ===== Helpers de formato =====

const currencyFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
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

function orderStatusBadge(status: string, t: OrdersT) {
  const variant = ORDER_STATUS[status] ?? ('secondary' as const);
  // Etiqueta traducida; si el código es desconocido se muestra tal cual.
  const label = ORDER_STATUS[status] ? t(`status.${status}` as never) : status;
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

export default function MisPedidosPage() {
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
                {t('subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary" size="sm">
                  {t('backToPanel')}
                </Button>
              </Link>
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
          <EmptyState t={t} />
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

function OrderCard({ order, t }: { order: MyOrder; t: OrdersT }) {
  return (
    <Card className="border border-gray-200 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Izquierda: número, fecha, entrega */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900">
                {t('orderNumber', { number: order.orderNumber })}
              </span>
              {orderStatusBadge(order.status, t)}
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
      </CardContent>
    </Card>
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

function EmptyState({ t }: { t: OrdersT }) {
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
          {t('empty.body')}
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
