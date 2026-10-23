'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth';
import { useDashboardKPIs } from '@/hooks/useReports';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { isBranchScopedUser } from '@/lib/branch-scope';
import { ScopedReportsLanding } from '@/components/admin/reports/ScopedReportsLanding';
import {
  UserGroupIcon,
  UserPlusIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
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

/** Tipo de cambio a MXN: 2 decimales (USD/GTQ) y hasta 4 cuando es muy chico (COP). */
const formatRate = (rate: number) =>
  rate.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: rate < 1 ? 4 : 2,
  });

/** "SEPTIEMBRE 2026" → "Sep 2026" para las etiquetas de comparación. */
const shortPeriod = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const [mes, anio] = name.trim().split(/\s+/);
  if (!mes) return null;
  const m = mes.charAt(0).toUpperCase() + mes.slice(1, 3).toLowerCase();
  return anio ? `${m} ${anio}` : m;
};

/** % de cambio a 1 decimal; null cuando no hay base contra qué comparar. */
const growthPct = (current: number, base: number | null | undefined): number | null =>
  base == null || base <= 0 ? null : Math.round(((current - base) / base) * 1000) / 10;

/** Chip "↑ 5.5% vs Sep 2026" (o "sin dato de Oct 2025"); el valor base va en el tooltip. */
function Comparison({
  pct,
  label,
  base,
  isCurrency,
}: {
  pct: number | null;
  label: string;
  base: number | null | undefined;
  isCurrency?: boolean;
}) {
  if (pct == null) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
        title={`No hay dato de ${label} para comparar`}
      >
        sin dato de {label}
      </span>
    );
  }
  const positive = pct >= 0;
  const baseText =
    base != null
      ? `${label}: ${isCurrency ? '$' : ''}${base.toLocaleString('es-MX', { maximumFractionDigits: isCurrency ? 2 : 0 })}`
      : undefined;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
      )}
      title={baseText}
    >
      {positive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
      {Math.abs(pct)}%
      <span className="font-normal opacity-80">vs {label}</span>
    </span>
  );
}

export default function AdminDashboard() {
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [countryCode, setCountryCode] = useState('MX'); // por defecto México
  // Sesión acotada por sucursal (CEDEAS Supervisor): los KPIs son globales y
  // el API los niega; se muestra la portada de sus reportes.
  const branchScoped = isBranchScopedUser(useAppSelector(selectUser));
  const { data: kpis, isLoading, error, isFetching } = useDashboardKPIs(periodId, {
    enabled: !branchScoped,
  });
  const handleRefresh = () => window.location.reload();

  if (branchScoped) {
    return <ScopedReportsLanding title="Panel Principal" />;
  }

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

  // Comparativos: vs periodo anterior y vs mismo periodo del año pasado (el
  // API manda los valores base; el % se calcula aquí para que "sin base" sea
  // null y no 0). Nuevos inscritos (23-oct-2026, en lugar de Colaboradores):
  // altas de distribuidores del periodo por país; sin país elegido, el total.
  const prevLabel = shortPeriod(kpis?.comparison?.prevPeriodName) ?? 'periodo anterior';
  const yoyLabel = shortPeriod(kpis?.comparison?.lastYearPeriodName) ?? 'año pasado';
  const countrySuffix = selectedCountry ? ` · ${selectedCountry.name}` : '';
  const newAll = kpis?.newDistributors;
  const stats: {
    title: string;
    value: number;
    prev: number | null | undefined;
    lastYear: number | null | undefined;
    icon: typeof UserGroupIcon;
    isCurrency: boolean;
    currencyCode?: string;
    secondary?: string;
  }[] = [
    {
      title: `Nuevos inscritos${countrySuffix}`,
      value: selectedCountry?.newDistributors ?? newAll?.current ?? 0,
      prev: selectedCountry ? selectedCountry.prevNewDistributors : newAll?.prev,
      lastYear: selectedCountry ? selectedCountry.lastYearNewDistributors : newAll?.lastYear,
      icon: UserPlusIcon,
      isCurrency: false,
      secondary:
        newAll && selectedCountry && newAll.current !== selectedCountry.newDistributors
          ? `Altas del periodo con kit pagado · ${newAll.current.toLocaleString('es-MX')} en todos los países`
          : 'Altas del periodo con kit pagado',
    },
    {
      title: `Ventas del Periodo${countrySuffix}`,
      value: selectedCountry?.orders ?? kpis?.totalOrders ?? 0,
      prev: selectedCountry?.prevOrders,
      lastYear: selectedCountry?.lastYearOrders,
      icon: ShoppingBagIcon,
      isCurrency: false,
      secondary: 'Tickets de sucursal + pedidos en línea',
    },
    {
      title: `Ingresos del Periodo${countrySuffix}`,
      value: selectedCountry?.revenue ?? kpis?.totalRevenue ?? 0,
      prev: selectedCountry?.prevRevenue,
      lastYear: selectedCountry?.lastYearRevenue,
      icon: CurrencyDollarIcon,
      isCurrency: true,
      currencyCode: selectedCountry?.currencyCode ?? undefined,
    },
    {
      title: `Distribuidores con compra${countrySuffix}`,
      value: selectedCountry?.buyers ?? kpis?.activeDistributors ?? 0,
      prev: selectedCountry?.prevBuyers,
      lastYear: selectedCountry?.lastYearBuyers,
      icon: UsersIcon,
      isCurrency: false,
      secondary:
        selectedCountry?.activeDistributors != null
          ? `${selectedCountry.activeDistributors.toLocaleString('es-MX')} activos con kit en el país`
          : undefined,
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
            Resumen del periodo de negocio por país
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Matriz mig 120: Jurídico y RRHH ven el panel SIN la opción de
              reportes (no tienen reports:read). fallback <></> = ocultar. */}
          <PermissionGuard permissions={['reports:read', 'reports:*']} fallback={<></>}>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/admin/reportes">
                <EyeIcon className="h-4 w-4" />
                Ver reportes
              </Link>
            </Button>
          </PermissionGuard>
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

        {/* Ingresos por país (desglose + selector; por defecto México). Debajo de
            cada moneda distinta de MXN, su tasa congelada del periodo y el
            equivalente en pesos; al final, el consolidado en MXN (misma tasa
            que Ventas por Sucursal). */}
        {countries.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium text-muted-foreground">Ingresos por país</span>
              {kpis?.fx && (
                <span className="text-xs text-muted-foreground/70">
                  Tasa congelada del periodo {kpis.fx.periodName}
                </span>
              )}
            </div>
            {/* Rejilla uniforme: todas las tarjetas miden lo mismo (3 renglones:
                país + moneda, importe, equivalencia) y el consolidado es una
                tarjeta más al final; en móvil ocupa la fila completa. */}
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]">
              {countries.map((c) => {
                const active = selectedCountry?.countryId === c.countryId;
                const foreign = !!c.currencyCode && c.currencyCode !== 'MXN';
                const hasRate = foreign && !!c.rateToMxn && c.revenueMxn != null;
                return (
                  <button
                    key={c.countryId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCountryCode(c.code)}
                    className={cn(
                      'flex min-h-[7.5rem] flex-col justify-between gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-foreground/30 hover:bg-muted/40',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{c.name}</span>
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
                        {c.currencyCode ?? '—'}
                      </span>
                    </span>
                    <span className="text-lg font-semibold leading-tight tabular-nums text-foreground">
                      ${c.revenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </span>
                    {/* Comparativos del país, en su moneda (23-oct-2026). */}
                    <span className="flex flex-wrap gap-1">
                      <Comparison
                        pct={growthPct(c.revenue, c.prevRevenue)}
                        label={prevLabel}
                        base={c.prevRevenue}
                        isCurrency
                      />
                      <Comparison
                        pct={growthPct(c.revenue, c.lastYearRevenue)}
                        label={yoyLabel}
                        base={c.lastYearRevenue}
                        isCurrency
                      />
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {!foreign ? (
                        'Moneda base'
                      ) : hasRate ? (
                        <>
                          1 {c.currencyCode} = {formatRate(c.rateToMxn as number)} MXN
                          <br />
                          <span className="tabular-nums">
                            ≈ ${(c.revenueMxn as number).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-600">Sin tipo de cambio en el periodo</span>
                      )}
                    </span>
                  </button>
                );
              })}
              {kpis?.fx && (
                <div
                  className="col-span-full flex min-h-[7.5rem] flex-col justify-between gap-1 rounded-lg bg-[#3E667D] px-3 py-2.5 text-white sm:col-span-2 xl:col-span-1"
                  title={`Convertido con la tasa congelada del periodo ${kpis.fx.periodName}; los comparativos usan esa misma tasa`}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/70">
                    <GlobeAltIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Total consolidado</span>
                    <span className="ml-auto shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/90">
                      MXN
                    </span>
                  </span>
                  <span className="text-lg font-semibold leading-tight tabular-nums">
                    ${kpis.fx.totalMxn.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {/* Comparativos del consolidado, con la tasa del periodo actual. */}
                  <span className="flex flex-wrap gap-1">
                    <Comparison
                      pct={growthPct(kpis.fx.totalMxn, kpis.fx.prevTotalMxn)}
                      label={prevLabel}
                      base={kpis.fx.prevTotalMxn}
                      isCurrency
                    />
                    <Comparison
                      pct={growthPct(kpis.fx.totalMxn, kpis.fx.lastYearTotalMxn)}
                      label={yoyLabel}
                      base={kpis.fx.lastYearTotalMxn}
                      isCurrency
                    />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug text-white/70">
                    {countries.length} países · tasa del periodo
                    {kpis.fx.missing.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                        sin tasa: {kpis.fx.missing.join(', ')}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="flex flex-col gap-0 p-5 transition-shadow duration-200 hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mb-1 text-sm text-muted-foreground">{stat.title}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {stat.isCurrency ? '$' : ''}
              {stat.value.toLocaleString('es-MX')}
              {stat.isCurrency && stat.currencyCode ? (
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  {stat.currencyCode}
                </span>
              ) : null}
            </p>
            {/* Comparativos: periodo anterior y mismo periodo del año pasado */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Comparison
                pct={growthPct(stat.value, stat.prev)}
                label={prevLabel}
                base={stat.prev}
                isCurrency={stat.isCurrency}
              />
              <Comparison
                pct={growthPct(stat.value, stat.lastYear)}
                label={yoyLabel}
                base={stat.lastYear}
                isCurrency={stat.isCurrency}
              />
            </div>
            {stat.secondary && (
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground/70">{stat.secondary}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Pedidos recientes, productos más vendidos y actividad reciente se
          quitaron del panel (23-oct-2026): el negocio quiere solo los KPIs del
          periodo por país con sus comparativos; el detalle vive en Reportes. */}
    </div>
  );
}
