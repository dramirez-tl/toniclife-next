'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useDashboardKPIs } from '@/hooks/useReports';
import type { RecentOrder } from '@/types/reports';
import {
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowPathIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

/** Formatea el rango de un periodo (YYYY-MM-DD) como "26 abr - 25 may". */
const formatPeriodRange = (start: string, end: string) => {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };
  return `${fmt(start)} - ${fmt(end)}`;
};

type BadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'outline';

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  completed: { label: 'Completado', variant: 'success' },
  delivered: { label: 'Entregado', variant: 'success' },
  paid: { label: 'Pagado', variant: 'success' },
  processing: { label: 'Procesando', variant: 'info' },
  shipped: { label: 'Enviado', variant: 'info' },
  in_transit: { label: 'En tránsito', variant: 'info' },
  pending: { label: 'Pendiente', variant: 'warning' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  refunded: { label: 'Reembolsado', variant: 'destructive' },
};

const getStatusConfig = (status: string) =>
  statusConfig[status] ?? { label: status, variant: 'outline' as BadgeVariant };

export default function AdminDashboard() {
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [countryCode, setCountryCode] = useState('MX'); // por defecto México
  const { data: kpis, isLoading, error, isFetching } = useDashboardKPIs(periodId);
  const handleRefresh = () => window.location.reload();

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Panel Principal</h1>
          <p className="mt-1 text-muted-foreground">Resumen general del sistema</p>
        </div>
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="gap-0 p-5">
              <div className="animate-pulse">
                <div className="mb-4 h-11 w-11 rounded-xl bg-muted" />
                <div className="mb-3 h-3 w-20 rounded bg-muted" />
                <div className="h-7 w-24 rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Panel Principal</h1>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 text-destructive">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <p>Error al cargar los datos del panel principal. Por favor, intenta de nuevo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // País seleccionado (por defecto México) para Pedidos/Ingresos del periodo.
  const countries = kpis?.revenueByCountry ?? [];
  const selectedCountry =
    countries.find((c) => c.code === countryCode) ?? countries[0] ?? null;

  const stats = [
    {
      title: 'Usuarios Totales',
      value: kpis?.totalUsers ?? 0,
      change: kpis?.usersGrowth ?? 0,
      icon: UserGroupIcon,
      isCurrency: false,
      currencyCode: undefined as string | undefined,
    },
    {
      title: `Pedidos del Periodo${selectedCountry ? ` · ${selectedCountry.name}` : ''}`,
      value: selectedCountry?.orders ?? kpis?.totalOrders ?? 0,
      change: selectedCountry?.ordersGrowth ?? kpis?.ordersGrowth ?? 0,
      icon: ShoppingBagIcon,
      isCurrency: false,
      currencyCode: undefined as string | undefined,
    },
    {
      title: `Ingresos del Periodo${selectedCountry ? ` · ${selectedCountry.name}` : ''}`,
      value: selectedCountry?.revenue ?? kpis?.totalRevenue ?? 0,
      change: selectedCountry?.revenueGrowth ?? kpis?.revenueGrowth ?? 0,
      icon: CurrencyDollarIcon,
      isCurrency: true,
      currencyCode: selectedCountry?.currencyCode ?? undefined,
    },
    {
      title: 'Distribuidores Activos',
      value: kpis?.activeDistributors ?? 0,
      change: kpis?.distributorsGrowth ?? 0,
      icon: UsersIcon,
      isCurrency: false,
      currencyCode: undefined as string | undefined,
    },
  ];

  const recentOrdersColumns: DataTableColumn<RecentOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Pedido',
      headerClassName: 'text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider',
      cellClassName: 'py-4 px-6',
      render: (order) => (
        <span className="rounded bg-muted px-2 py-1 font-mono text-sm text-muted-foreground">
          {order.orderNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Cliente',
      headerClassName: 'text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider',
      cellClassName: 'py-4 px-6',
      render: (order) => (
        <p className="text-sm font-medium text-foreground">{order.customerName}</p>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      headerClassName: 'text-right py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider',
      cellClassName: 'py-4 px-6 text-right',
      render: (order) => (
        <p className="text-sm font-semibold text-foreground">
          ${order.amount.toLocaleString('es-MX')}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider',
      cellClassName: 'py-4 px-6 text-center',
      render: (order) => {
        const status = getStatusConfig(order.status);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'date',
      header: 'Fecha',
      headerClassName: 'text-right py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider',
      cellClassName: 'py-4 px-6 text-right',
      render: (order) => (
        <p className="text-sm text-muted-foreground">{formatDate(order.date)}</p>
      ),
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Panel Principal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Resumen general del sistema y actividad reciente
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/reportes">
              <EyeIcon className="h-4 w-4" />
              Ver reportes
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={handleRefresh}
          >
            <ArrowPathIcon className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Toolbar: periodo de negocio (regla 26→25) + ingresos por país */}
      <Card className="mb-6 gap-0 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selector de periodo de negocio */}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDaysIcon className="h-4 w-4 text-primary" />
            <span>Periodo de negocio</span>
            {isFetching && <span className="text-xs text-muted-foreground/70">· actualizando…</span>}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!kpis?.prevPeriodId}
              onClick={() => kpis?.prevPeriodId && setPeriodId(kpis.prevPeriodId)}
              aria-label="Periodo anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="min-w-[170px] text-center">
              <p className="text-sm font-semibold capitalize text-foreground">
                {kpis?.period?.name?.toLowerCase() ?? '—'}
              </p>
              {kpis?.period?.startDate && kpis?.period?.endDate && (
                <p className="text-xs text-muted-foreground">
                  {formatPeriodRange(kpis.period.startDate, kpis.period.endDate)}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!kpis?.nextPeriodId}
              onClick={() => kpis?.nextPeriodId && setPeriodId(kpis.nextPeriodId)}
              aria-label="Periodo siguiente"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            {periodId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setPeriodId(undefined)}
              >
                Actual
              </Button>
            )}
          </div>
        </div>

        {/* Ingresos por país (desglose + selector; por defecto México) */}
        {countries.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="mr-1 text-sm font-medium text-muted-foreground">
              Ingresos por país:
            </span>
            {countries.map((c) => {
              const active = selectedCountry?.countryId === c.countryId;
              return (
                <button
                  key={c.countryId}
                  onClick={() => setCountryCode(c.code)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-foreground/20',
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">{c.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${c.revenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    <span className="ml-1 text-xs text-muted-foreground/70">{c.currencyCode}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const positive = stat.change >= 0;
          return (
            <Card
              key={stat.title}
              className="gap-0 p-5 transition-shadow duration-200 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                    positive
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
                  )}
                >
                  {positive ? (
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(stat.change)}%
                </span>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {stat.isCurrency ? '$' : ''}
                {stat.value.toLocaleString('es-MX')}
                {stat.isCurrency && stat.currencyCode ? (
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    {stat.currencyCode}
                  </span>
                ) : null}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Recent Orders + Top Products */}
        <div className="space-y-6 xl:col-span-2">
          <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <ShoppingBagIcon className="h-4 w-4" />
                </span>
                Pedidos Recientes
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link href="/admin/pedidos">Ver todos</Link>
              </Button>
            </CardHeader>
            <DataTable<RecentOrder>
              columns={recentOrdersColumns}
              data={kpis?.recentOrders ?? []}
              getRowKey={(order) => order.id}
              minWidthClassName="min-w-[640px]"
              emptyState={
                <>
                  <ShoppingBagIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No hay pedidos recientes</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Cuando se registren nuevas ventas aparecerán aquí.
                  </p>
                </>
              }
            />
          </Card>

          {/* Top Products */}
          <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <ChartBarIcon className="h-4 w-4" />
                </span>
                Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {(kpis?.topProducts ?? []).length === 0 ? (
                <div className="py-8 text-center">
                  <ChartBarIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No hay datos de productos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(kpis?.topProducts ?? []).map((product, index, arr) => {
                    const maxSales = arr[0]?.sales ?? 1;
                    const percentage = Math.max((product.sales / maxSales) * 100, 8);
                    return (
                      <div
                        key={product.productId}
                        className="rounded-xl border p-3.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="mb-2 flex items-center gap-4">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold',
                              index === 0
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{product.sales} ventas</p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            ${product.revenue.toLocaleString('es-MX')}
                          </p>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Recent Activity */}
        <div className="space-y-6">
          <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <ClockIcon className="h-4 w-4" />
                </span>
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {(kpis?.recentActivity ?? []).length === 0 ? (
                <div className="py-8 text-center">
                  <ClockIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {(kpis?.recentActivity ?? []).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={cn(
                          'mt-2 h-2 w-2 shrink-0 rounded-full',
                          activity.type === 'user' && 'bg-chart-1',
                          activity.type === 'order' && 'bg-emerald-500',
                          activity.type === 'product' && 'bg-amber-500',
                          activity.type === 'payment' && 'bg-chart-3',
                          !['user', 'order', 'product', 'payment'].includes(activity.type) &&
                            'bg-muted-foreground',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-foreground">{activity.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
