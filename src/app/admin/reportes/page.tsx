'use client';

// Análisis y Reportes (/admin/reportes): panorama del negocio por PERIODOS de
// negocio (los de la tabla commission_periods: hasta sep-2026 del 26 al 25,
// OCTUBRE 2026 hasta el 31 y mes calendario desde nov-2026). El API resuelve la
// ventana por número de periodos (`months`) y consolida POS + pedidos a MXN con
// el tipo de cambio de cada periodo.
//
// 27-oct-2026: rediseño. Arriba el periodo en curso (vs el anterior), luego el
// acumulado de la ventana (vs la ventana anterior), la tendencia con su tabla
// por periodo y los tops (productos, distribuidores, categorías). El error del
// API se muestra tal cual para no adivinar.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusSmallIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ReceiptPercentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAnalytics } from '@/hooks/useReports';
import { PermissionGuard } from '@/components/auth';
import { exportToCsv, csvDateStamp } from '@/lib/csv-export';
import { apiErrorMessage } from '@/lib/api-error';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { isBranchScopedUser } from '@/lib/branch-scope';
import { ScopedReportsLanding } from '@/components/admin/reports/ScopedReportsLanding';
import type { MonthlySalesTrend } from '@/types/reports';

// recharts es pesado y solo corre en cliente: carga diferida con placeholder.
const SalesTrendChart = dynamic(
  () => import('@/components/admin/reports/SalesTrendChart'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[320px]" />,
  },
);

type Metric = 'sales' | 'orders' | 'customers';

const PERIOD_OPTIONS = [
  { value: '3', label: '3 periodos' },
  { value: '6', label: '6 periodos' },
  { value: '7', label: '7 periodos' },
  { value: '12', label: '12 periodos' },
];

const METRIC_OPTIONS: { key: Metric; label: string }[] = [
  { key: 'sales', label: 'Ventas' },
  { key: 'orders', label: 'Documentos' },
  { key: 'customers', label: 'Clientes' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatInt(n: number): string {
  return n.toLocaleString('es-MX');
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Crecimiento % de `cur` contra `prev`; null cuando no hay base de comparación. */
function pct(cur: number, prev: number): number | null {
  if (!(prev > 0)) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/** Etiqueta del punto de la tendencia: nombre del periodo o "Oct 2026". */
function pointLabel(p: MonthlySalesTrend): string {
  return p.periodName ?? `${p.month} ${p.year}`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />;
}

/** Variación con flecha; `null` = sin base de comparación (gris, no rojo). */
function GrowthBadge({
  value,
  title,
  size = 'sm',
}: {
  value: number | null;
  title?: string;
  size?: 'sm' | 'xs';
}) {
  const text = size === 'xs' ? 'text-xs' : 'text-sm';
  const icon = size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  if (value === null) {
    return (
      <span className={`inline-flex items-center gap-1 ${text} font-medium text-gray-400`} title={title ?? 'Sin base de comparación'}>
        <MinusSmallIcon className={icon} />
        s/d
      </span>
    );
  }
  if (value > 0) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 ${text} font-semibold text-emerald-700`} title={title}>
        <ArrowTrendingUpIcon className={icon} />+{value.toFixed(1)}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 ${text} font-semibold text-rose-700`} title={title}>
        <ArrowTrendingDownIcon className={icon} />
        {value.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${text} font-medium text-gray-500`} title={title}>
      <MinusSmallIcon className={icon} />
      0.0%
    </span>
  );
}

function RankBadge({ index }: { index: number }) {
  const tone =
    index === 0
      ? 'bg-amber-100 text-amber-800'
      : index === 1
        ? 'bg-gray-200 text-gray-700'
        : index === 2
          ? 'bg-orange-100 text-orange-700'
          : 'bg-[#3E667D]/10 text-[#3E667D]';
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tone}`}>
      {index + 1}
    </div>
  );
}

function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** Tarjeta de KPI: valor grande, variación y la referencia contra la que se compara. */
function KpiCard({
  icon,
  tone,
  label,
  value,
  growth,
  compare,
  loading,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  growth?: number | null;
  compare?: string;
  loading: boolean;
}) {
  return (
    <Card className="border-gray-200/80 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>{icon}</div>
          {growth !== undefined && !loading && <GrowthBadge value={growth} title={compare} />}
        </div>
        <p className="text-sm text-gray-600">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-32" />
        ) : (
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 tabular-nums">{value}</p>
        )}
        {compare && !loading && <p className="mt-1 text-xs text-gray-400">{compare}</p>}
      </CardContent>
    </Card>
  );
}

export default function ReportesPage() {
  const [periodsKey, setPeriodsKey] = useState('7');
  const months = useMemo(() => Number(periodsKey) || 7, [periodsKey]);
  const [selectedMetric, setSelectedMetric] = useState<Metric>('sales');

  // Sesión acotada por sucursal (CEDEAS Supervisor): la analítica es global y
  // el API la niega; se muestra la portada de sus reportes (months = 0 apaga
  // la consulta).
  const branchScoped = isBranchScopedUser(useAppSelector(selectUser));

  const { data, isLoading, isFetching, isError, error, refetch } = useAnalytics({
    months: branchScoped ? 0 : months,
    limit: 5,
  });

  const salesTrend = useMemo(() => data?.salesTrend ?? [], [data]);
  const topProducts = data?.topProducts ?? [];
  const topDistributors = data?.topDistributors ?? [];
  const categoryPerformance = data?.categoryPerformance ?? [];
  const kpis = data?.kpis;
  const missingRates = kpis?.missingRates ?? [];
  const periodLabel = kpis?.periodLabel ?? '';

  // Periodo en curso = último punto de la tendencia (el API ordena ascendente);
  // se compara contra el punto anterior.
  const latest = salesTrend.length > 0 ? salesTrend[salesTrend.length - 1] : null;
  const previousPoint = salesTrend.length > 1 ? salesTrend[salesTrend.length - 2] : null;
  const latestInProgress = !!latest?.endDate && latest.endDate >= todayLocal();
  const latestTicket = latest && latest.orders > 0 ? Math.round(latest.sales / latest.orders) : 0;
  const previousTicket =
    previousPoint && previousPoint.orders > 0 ? Math.round(previousPoint.sales / previousPoint.orders) : 0;

  // Acumulado de la ventana (N periodos) contra los N anteriores.
  const windowSales = kpis?.currentMonthSales ?? 0;
  const windowOrders = kpis?.currentMonthOrders ?? 0;
  const windowCustomers = kpis?.currentMonthCustomers ?? 0;
  const windowTicket = kpis?.averageOrderValue ?? 0;
  const prevWindowSales = kpis?.previousMonthSales ?? 0;
  const prevWindowOrders = kpis?.previousMonthOrders ?? 0;
  const prevWindowCustomers = kpis?.previousMonthCustomers ?? 0;
  const prevWindowTicket = prevWindowOrders > 0 ? Math.round(prevWindowSales / prevWindowOrders) : 0;

  const errorText = isError ? apiErrorMessage(error, 'El API no respondió.') : '';

  const handleExportReport = (reportType: string) => {
    const stamp = csvDateStamp();
    const empty = () => toast.error('No hay datos para exportar');
    switch (reportType) {
      case 'productos': {
        if (topProducts.length === 0) return empty();
        exportToCsv(
          `top_productos_${stamp}.csv`,
          ['Producto', 'Unidades', 'Ingresos MXN', 'Crecimiento %'],
          topProducts.map((p) => [p.name, p.sales, p.revenue, p.growth]),
        );
        break;
      }
      case 'distribuidores': {
        if (topDistributors.length === 0) return empty();
        exportToCsv(
          `top_distribuidores_${stamp}.csv`,
          ['ID', 'Distribuidor', 'Ventas MXN', 'Documentos', 'Miembros', 'Comisión MXN'],
          topDistributors.map((d) => [d.customerNumber ?? '', d.name, d.sales, d.orders, d.teamSize, d.commission]),
        );
        break;
      }
      case 'categorias': {
        if (categoryPerformance.length === 0) return empty();
        exportToCsv(
          `categorias_${stamp}.csv`,
          ['Categoría', 'Ventas MXN', '% del total', 'Crecimiento %'],
          categoryPerformance.map((c) => [c.category, c.sales, c.percentage, c.growth]),
        );
        break;
      }
      default: {
        if (salesTrend.length === 0) return empty();
        exportToCsv(
          `tendencia_ventas_${stamp}.csv`,
          ['Periodo', 'Inicio', 'Fin', 'Ventas MXN', 'Documentos', 'Clientes', 'Ticket promedio MXN'],
          salesTrend.map((d) => [
            pointLabel(d),
            d.startDate ?? '',
            d.endDate ?? '',
            d.sales,
            d.orders,
            d.customers,
            d.orders > 0 ? Math.round(d.sales / d.orders) : 0,
          ]),
        );
      }
    }
    toast.success('CSV descargado');
  };

  if (branchScoped) {
    return (
      <PermissionGuard permissions={['reports:read', 'reports:*']}>
        <ScopedReportsLanding />
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permissions={['reports:read', 'reports:*']}>
      <div className="min-h-screen bg-gray-50">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <ChartBarIcon className="h-8 w-8" />
                  <h1 className="text-3xl font-bold">Análisis y Reportes</h1>
                </div>
                <p className="text-white/80">
                  Ventas consolidadas a pesos (POS + pedidos) por periodo de negocio
                  {periodLabel ? ` · ${periodLabel}` : ''}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/admin">
                  <Button variant="secondary">Volver al Panel Principal</Button>
                </Link>
                <Button variant="default" onClick={() => handleExportReport('tendencia')}>
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Exportar tendencia
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Barra de control */}
          <Card className="mb-6 border-gray-200/80 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Ventana: últimos</span>
                  <div className="w-44">
                    <SearchableSelect
                      options={PERIOD_OPTIONS}
                      value={periodsKey}
                      onChange={setPeriodsKey}
                      showAllOption={false}
                    />
                  </div>
                  {periodLabel && (
                    <span className="inline-flex items-center rounded-full bg-[#3E667D]/10 px-2.5 py-1 text-xs font-semibold text-[#3E667D]">
                      {periodLabel}
                    </span>
                  )}
                  {isFetching && !isLoading && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> actualizando
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportReport('tendencia')}>
                    Tendencia CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportReport('productos')}>
                    Productos CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportReport('distribuidores')}>
                    Distribuidores CSV
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Periodos de negocio según la tabla de periodos (hasta septiembre 2026 del 26 al 25; OCTUBRE 2026
                hasta el 31; desde noviembre, mes calendario). Las ventas en otra moneda se convierten con el tipo
                de cambio de su periodo.
              </p>
              {missingRates.length > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    Hay ventas en {missingRates.join(', ')} sin tipo de cambio capturado en algún periodo; esos
                    montos no se suman al total en MXN. Captura la tasa en Configuración → Catálogos → Tipos de
                    Cambio.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error del API: se muestra tal cual */}
          {isError && (
            <Card className="mb-6 border-rose-200 bg-rose-50/40">
              <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-rose-400" />
                <p className="font-medium text-gray-800">No pudimos cargar el análisis</p>
                <p className="max-w-xl text-sm text-gray-600">{errorText}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                  <ArrowPathIcon className="h-4 w-4" />
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Periodo en curso */}
          <section className="mb-8">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                {latest ? pointLabel(latest) : 'Periodo'}
                {latestInProgress && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    en curso
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                {latest?.startDate && latest.endDate
                  ? `${formatDateDisplay(latest.startDate)} → ${formatDateDisplay(latest.endDate)} · `
                  : ''}
                {previousPoint ? `comparado con ${pointLabel(previousPoint)}` : 'sin periodo anterior para comparar'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                loading={isLoading}
                icon={<CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />}
                tone="bg-emerald-100"
                label="Ventas del periodo"
                value={formatCurrency(latest?.sales ?? 0)}
                growth={previousPoint ? pct(latest?.sales ?? 0, previousPoint.sales) : null}
                compare={previousPoint ? `${pointLabel(previousPoint)}: ${formatCurrency(previousPoint.sales)}` : undefined}
              />
              <KpiCard
                loading={isLoading}
                icon={<ShoppingBagIcon className="h-5 w-5 text-sky-600" />}
                tone="bg-sky-100"
                label="Documentos (ventas POS + pedidos)"
                value={formatInt(latest?.orders ?? 0)}
                growth={previousPoint ? pct(latest?.orders ?? 0, previousPoint.orders) : null}
                compare={previousPoint ? `${pointLabel(previousPoint)}: ${formatInt(previousPoint.orders)}` : undefined}
              />
              <KpiCard
                loading={isLoading}
                icon={<UserGroupIcon className="h-5 w-5 text-violet-600" />}
                tone="bg-violet-100"
                label="Clientes con compra"
                value={formatInt(latest?.customers ?? 0)}
                growth={previousPoint ? pct(latest?.customers ?? 0, previousPoint.customers) : null}
                compare={previousPoint ? `${pointLabel(previousPoint)}: ${formatInt(previousPoint.customers)}` : undefined}
              />
              <KpiCard
                loading={isLoading}
                icon={<ReceiptPercentIcon className="h-5 w-5 text-amber-600" />}
                tone="bg-amber-100"
                label="Ticket promedio"
                value={formatCurrency(latestTicket)}
                growth={previousPoint ? pct(latestTicket, previousTicket) : null}
                compare={previousPoint ? `${pointLabel(previousPoint)}: ${formatCurrency(previousTicket)}` : undefined}
              />
            </div>
          </section>

          {/* Acumulado de la ventana */}
          <section className="mb-8">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                Acumulado de {months} periodos{periodLabel ? ` · ${periodLabel}` : ''}
              </h2>
              <p className="text-xs text-gray-500">comparado con los {months} periodos anteriores</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                loading={isLoading}
                icon={<CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />}
                tone="bg-emerald-50"
                label="Ventas acumuladas"
                value={formatCurrency(windowSales)}
                growth={pct(windowSales, prevWindowSales)}
                compare={`Antes: ${formatCurrency(prevWindowSales)}`}
              />
              <KpiCard
                loading={isLoading}
                icon={<ShoppingBagIcon className="h-5 w-5 text-sky-600" />}
                tone="bg-sky-50"
                label="Documentos"
                value={formatInt(windowOrders)}
                growth={pct(windowOrders, prevWindowOrders)}
                compare={`Antes: ${formatInt(prevWindowOrders)}`}
              />
              <KpiCard
                loading={isLoading}
                icon={<UserGroupIcon className="h-5 w-5 text-violet-600" />}
                tone="bg-violet-50"
                label="Clientes distintos con compra"
                value={formatInt(windowCustomers)}
                growth={pct(windowCustomers, prevWindowCustomers)}
                compare={`Antes: ${formatInt(prevWindowCustomers)}`}
              />
              <KpiCard
                loading={isLoading}
                icon={<ReceiptPercentIcon className="h-5 w-5 text-amber-600" />}
                tone="bg-amber-50"
                label="Ticket promedio"
                value={formatCurrency(windowTicket)}
                growth={pct(windowTicket, prevWindowTicket)}
                compare={`Antes: ${formatCurrency(prevWindowTicket)}`}
              />
            </div>
          </section>

          {/* Tendencia por periodo */}
          <Card className="mb-8 border-gray-200/80 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                title="Tendencia por periodo"
                hint="Un punto por periodo de negocio; ventas consolidadas en MXN."
                action={
                  <div className="inline-flex rounded-lg bg-gray-100 p-1">
                    {METRIC_OPTIONS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setSelectedMetric(m.key)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          selectedMetric === m.key ? 'bg-white text-[#3E667D] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                }
              />
              {isLoading ? (
                <Skeleton className="h-[320px]" />
              ) : salesTrend.length === 0 ? (
                <div className="py-16 text-center text-gray-500">No hay datos para la ventana seleccionada</div>
              ) : (
                <>
                  <SalesTrendChart data={salesTrend} metric={selectedMetric} />
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          <th className="py-2 pr-4">Periodo</th>
                          <th className="py-2 pr-4 text-right">Ventas MXN</th>
                          <th className="py-2 pr-4 text-right">Documentos</th>
                          <th className="py-2 pr-4 text-right">Clientes</th>
                          <th className="py-2 pr-4 text-right">Ticket promedio</th>
                          <th className="py-2 text-right">vs anterior</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {salesTrend.map((p, i) => {
                          const prev = i > 0 ? salesTrend[i - 1] : null;
                          const isLast = i === salesTrend.length - 1;
                          return (
                            <tr key={`${p.year}-${p.month}-${i}`} className={isLast ? 'bg-[#3E667D]/[0.04] font-medium' : ''}>
                              <td className="py-2 pr-4 text-gray-900">
                                {pointLabel(p)}
                                {p.startDate && p.endDate && (
                                  <span className="ml-2 text-xs font-normal text-gray-400">
                                    {formatDateDisplay(p.startDate)} → {formatDateDisplay(p.endDate)}
                                  </span>
                                )}
                                {isLast && latestInProgress && (
                                  <span className="ml-2 text-xs font-normal text-emerald-700">en curso</span>
                                )}
                              </td>
                              <td className="py-2 pr-4 text-right tabular-nums text-gray-900">{formatCurrency(p.sales)}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-gray-700">{formatInt(p.orders)}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-gray-700">{formatInt(p.customers)}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-gray-700">
                                {formatCurrency(p.orders > 0 ? Math.round(p.sales / p.orders) : 0)}
                              </td>
                              <td className="py-2 text-right">
                                <GrowthBadge size="xs" value={prev ? pct(p.sales, prev.sales) : null} title="Ventas MXN contra el periodo anterior" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* Top productos */}
            <Card className="border-gray-200/80 shadow-sm">
              <CardContent className="p-6">
                <SectionTitle
                  title="Top productos"
                  hint={`Por ingresos MXN en la ventana; crecimiento contra los ${months} periodos anteriores.`}
                  action={
                    <Button variant="ghost" size="sm" onClick={() => handleExportReport('productos')} title="Descargar CSV">
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </Button>
                  }
                />
                {isLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">Sin datos</div>
                ) : (
                  <ol className="divide-y divide-gray-100">
                    {topProducts.map((product, index) => (
                      <li key={product.productId} className="flex items-center gap-4 py-3">
                        <RankBadge index={index} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">
                            <span className="tabular-nums">{formatInt(product.sales)}</span> unidades
                            <span className="mx-2 text-gray-300">·</span>
                            <span className="tabular-nums">{formatCurrency(product.revenue)}</span>
                          </p>
                        </div>
                        <GrowthBadge value={product.growth === 0 ? null : product.growth} title="Ingresos contra la ventana anterior" />
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            {/* Top distribuidores */}
            <Card className="border-gray-200/80 shadow-sm">
              <CardContent className="p-6">
                <SectionTitle
                  title="Top distribuidores"
                  hint="Por compras en MXN (POS + pedidos) en la ventana; la comisión es la calculada en el mismo lapso."
                  action={
                    <Button variant="ghost" size="sm" onClick={() => handleExportReport('distribuidores')} title="Descargar CSV">
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </Button>
                  }
                />
                {isLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                ) : topDistributors.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">Sin datos</div>
                ) : (
                  <ol className="divide-y divide-gray-100">
                    {topDistributors.map((d, index) => (
                      <li key={d.customerId} className="flex items-center gap-4 py-3">
                        <RankBadge index={index} />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/admin/distribuidores/${d.customerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 truncate font-semibold text-gray-900 hover:text-[#3E667D] hover:underline"
                            title="Ver la ficha (pestaña nueva)"
                          >
                            {d.customerNumber && <span className="font-mono text-sm text-gray-500">{d.customerNumber}</span>}
                            {d.name}
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-gray-400" />
                          </Link>
                          <p className="text-sm text-gray-600">
                            <span className="tabular-nums">{formatCurrency(d.sales)}</span>
                            <span className="mx-2 text-gray-300">·</span>
                            <span className="tabular-nums">{formatInt(d.orders)}</span> documentos
                            <span className="mx-2 text-gray-300">·</span>
                            <span className="tabular-nums">{formatInt(d.teamSize)}</span> en su equipo
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-emerald-700">{formatCurrency(d.commission)}</p>
                          <p className="text-xs text-gray-500">comisión</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Categorías */}
          <Card className="border-gray-200/80 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                title="Ventas por categoría"
                hint={`Participación en la ventana y crecimiento contra los ${months} periodos anteriores.`}
                action={
                  <Button variant="ghost" size="sm" onClick={() => handleExportReport('categorias')} title="Descargar CSV">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </Button>
                }
              />
              {isLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : categoryPerformance.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">Sin datos de categorías</div>
              ) : (
                <div className="space-y-4">
                  {categoryPerformance.map((category) => (
                    <div key={category.categoryId || category.category}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{category.category}</span>
                          <GrowthBadge size="xs" value={category.growth === 0 ? null : category.growth} title="Contra la ventana anterior" />
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-gray-900">
                          {formatCurrency(category.sales)}
                          <span className="ml-2 text-xs font-normal text-gray-500">{category.percentage}%</span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2.5 rounded-full bg-gradient-to-r from-[#3E667D] to-[#8FB3C9]"
                          style={{ width: `${Math.min(100, Math.max(category.percentage, 1))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}
