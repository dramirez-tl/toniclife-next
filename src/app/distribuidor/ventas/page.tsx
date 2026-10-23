'use client';

// /distribuidor/ventas - "Rendimiento de Ventas" del distribuidor: SOLO sus
// compras personales del periodo (ventas, compras, puntos, detalle por ticket
// y productos más comprados). Las cifras de la red (ventas totales, ventas de
// red, distribución, líderes) se retiraron el 23-oct-2026 a pedido de Sistemas:
// se usaban en contra ("venden millones y yo una parte").

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { localeLanguage } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import { useCurrentPeriod, useCommissionPeriods, periodsUpToCurrent } from '@/hooks/useCommissions';
import { useStorefrontAccess } from '@/hooks/useStorefrontAccess';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { PurchasesList } from './PurchasesList';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

/** 'YYYY-MM-DD' → fecha sin desfase de zona horaria. */
function parseYmd(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Fechas legibles del periodo elegido ("26 sep" → "26 oct 2026"). Los periodos
 * van del 26 al 25: verlas aclara por qué una compra del 26 ya cae en el
 * periodo siguiente.
 */
function formatPeriodDates(
  start: unknown,
  end: unknown,
  locale: string,
): { start: string; end: string } | null {
  if (typeof start !== 'string' || typeof end !== 'string' || !start || !end) return null;
  const fmt = (value: string, withYear: boolean) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    }).format(parseYmd(value));
  return { start: fmt(start, false), end: fmt(end, true) };
}

export default function VentasPage() {
  const t = useTranslations('distributor.sales');
  // Formato de números/fechas según el idioma de la cuenta (no el del navegador).
  const numLocale = localeLanguage(useLocale()) === 'en' ? 'en-US' : 'es-MX';
  // Tienda solo para distribuidores: sin carrito compartido; vender = comprar en la tienda.
  const { membersOnly } = useStorefrontAccess();
  const user = useAppSelector(selectUser);

  // Periodo seleccionado (default: actual). Permite ver periodos pasados.
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const { data: currentPeriodData } = useCurrentPeriod();
  const { data: periodsData } = useCommissionPeriods();
  useEffect(() => {
    if (currentPeriodData?.id && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriodData.id);
    }
  }, [currentPeriodData, selectedPeriodId]);
  const periodsArray = Array.isArray(periodsData)
    ? periodsData
    : (periodsData as any)?.data ?? [];
  const sortedPeriods = [...periodsArray].sort((a: any, b: any) => {
    const ad = String(a?.startDate ?? a?.start_date ?? '');
    const bd = String(b?.startDate ?? b?.start_date ?? '');
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);
    return (
      Number(b?.periodNumber ?? b?.period_number ?? 0) -
      Number(a?.periodNumber ?? a?.period_number ?? 0)
    );
  });
  const isCurrentSelected =
    !!currentPeriodData?.id && selectedPeriodId === currentPeriodData.id;
  const selectedPeriod = sortedPeriods.find((p) => p?.id === selectedPeriodId);
  const periodDates = formatPeriodDates(
    selectedPeriod?.startDate ?? selectedPeriod?.start_date,
    selectedPeriod?.endDate ?? selectedPeriod?.end_date,
    numLocale,
  );

  // Periodo actual => SIN periodId: la clave queda
  // ['distributor','dashboard','current'], la misma que usan sidebar/topnav,
  // así no se dispara un segundo GET /distributor/dashboard?periodId=<uuid>
  // (ni un isRefreshing) cuando useCurrentPeriod resuelve. Solo un periodo
  // pasado viaja con su uuid. Misma normalización que el home.
  const dashboardPeriodId = isCurrentSelected
    ? undefined
    : selectedPeriodId || undefined;

  const {
    salesSummary,
    points,
    isLoading,
    isRefreshing,
    isError,
    error,
    refetch,
  } = useDistributorDashboard(dashboardPeriodId);

  const currencyCode = user?.currencyCode || 'MXN';
  const isUsd = currencyCode === 'USD';
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(isUsd ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  const fmtPts = (n: number) => Math.round(n).toLocaleString(numLocale);

  const personal = salesSummary?.personalSales || 0;
  const orderCount = salesSummary?.orderCount || 0;
  const avgOrder = orderCount > 0 ? personal / orderCount : 0;
  const products = salesSummary?.topProducts || [];
  const topProductAmount = products.length > 0 ? Math.max(...products.map((product) => product.amount || 0), 0) : 0;
  const hasPurchases = personal > 0 || orderCount > 0;
  const pointsMissing = points
    ? Math.max(0, points.personalPointsRequired - points.personalPoints)
    : 0;

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <ChartBarIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">{t('title')}</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl p-6 shadow-sm">
                <div className="h-8 w-8 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-8 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="border-red-100 shadow-sm">
            <CardContent className="p-8 text-center">
              <ChartBarIcon className="h-12 w-12 mx-auto text-red-300 mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('error.title')}</h2>
              <p className="text-gray-600 mb-5">
                {t('error.body')}
              </p>
              {process.env.NODE_ENV === 'development' && error instanceof Error && (
                <p className="text-xs text-gray-400 mb-4 break-all">{error.message}</p>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="default"
                  onClick={handleRefresh}
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  {t('error.retry')}
                </Button>
                <Link href="/distribuidor">
                  <Button variant="outline">{t('backToPanel')}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t('title')}</h1>
              </div>
              <p className="text-white/80 text-sm sm:text-base lg:text-lg">
                {t('subtitle')}
              </p>
              {/* Selector de periodo (default: actual) */}
              <div className="mt-4 flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 shrink-0 text-white/80" />
                <div className="w-full max-w-[260px]">
                  <SearchableSelect
                    options={periodsUpToCurrent(sortedPeriods).map((p: any) => ({
                      value: p.id,
                      label: `${p.name}${p.isCurrent ? t('periodCurrent') : ''}`,
                    }))}
                    value={selectedPeriodId}
                    onChange={setSelectedPeriodId}
                    placeholder={t('selectPeriod')}
                    showAllOption={false}
                    className="bg-white text-gray-900 hover:bg-white/90 hover:text-gray-900"
                  />
                </div>
                {!isCurrentSelected && selectedPeriodId && (
                  <span className="whitespace-nowrap rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-medium text-amber-100">
                    {t('pastPeriod')}
                  </span>
                )}
                {periodDates && (
                  <span className="whitespace-nowrap rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90">
                    {t('periodDates', periodDates)}
                  </span>
                )}
              </div>
              {isRefreshing && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  {t('refreshing')}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Tienda solo para distribuidores: el carrito compartido está apagado; "vender" = comprar en la tienda */}
              <Link href={membersOnly ? '/productos' : '/distribuidor/compartir-carrito'}>
                <Button className="bg-white text-[#3E667D] hover:bg-white/90 shadow-md shadow-black/10">
                  <ShoppingCartIcon className="h-4 w-4" />
                  {t('sellNow')}
                </Button>
              </Link>
              <button
                onClick={handleRefresh}
                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                title={t('refreshTitle')}
                aria-label={t('refreshAria')}
                disabled={isRefreshing}
              >
                <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/distribuidor">
                <Button variant="secondary">
                  {t('backToPanel')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estado vacío: invita a la primera compra del periodo */}
        {!hasPurchases && (
          <Card className="mb-8">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C8DDF2]/40">
                  <ShoppingCartIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {t('empty.title')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t('empty.body')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!membersOnly && (
                  <Link href="/distribuidor/compartir-carrito">
                    <Button>
                      <ShoppingCartIcon className="h-4 w-4" />
                      {t('empty.shareCart')}
                    </Button>
                  </Link>
                )}
                <Link href="/productos">
                  <Button variant="outline">
                    <ShoppingBagIcon className="h-4 w-4" />
                    {t('empty.goToStore')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Indicadores personales: ventas, compras y puntos del periodo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-[#3E667D] to-[#0A4B94] text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ShoppingBagIcon className="h-8 w-8 text-white/80" />
              </div>
              <p className="text-sm text-white/80 mb-1">{t('stats.personalSales')}</p>
              <p className="text-3xl font-bold flex items-baseline gap-1">
                {formatCurrency(personal)}
                <span className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded">{currencyCode}</span>
              </p>
              <p className="text-xs text-white/70 mt-1">{t('stats.personalSalesHint')}</p>
              <a href="#detalle-compras" className="mt-2 inline-block text-xs font-medium text-white/90 underline-offset-2 hover:underline">
                {t('stats.seeDetail')} ↓
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ChartBarIcon className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{t('stats.personalOrders')}</p>
              <p className="text-3xl font-bold text-gray-900">{orderCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t('stats.averageTicket', { amount: formatCurrency(avgOrder), currency: currencyCode })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <StarIcon className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{t('stats.periodPoints')}</p>
              <p className="text-3xl font-bold text-gray-900">
                {points ? fmtPts(points.personalPoints) : '—'}
                <span className="ml-1 text-sm font-medium text-gray-400">{t('stats.pts')}</span>
              </p>
              {points && (
                <p className={`text-xs mt-1 ${points.isPersonalQualified ? 'text-green-600' : 'text-gray-500'}`}>
                  {points.isPersonalQualified
                    ? t('stats.pointsQualified')
                    : t('stats.pointsMissing', { missing: fmtPts(pointsMissing) })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalle de mis compras: de dónde sale "Ventas Personales" (sucursal, forma de pago, puntos) */}
        <PurchasesList periodId={dashboardPeriodId} currencyCode={currencyCode} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Columna principal: productos más comprados */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{t('topProducts.title')}</h3>
                {products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <div key={product.productId ?? product.productName} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.productName}</p>
                          {/* Solo unidades: los puntos por producto son nominales del ticket y
                              no coinciden con lo acreditado en el periodo cuando hubo ajustes. */}
                          <p className="text-sm text-gray-500">{t('topProducts.units', { count: product.quantity })}</p>
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C8DDF2] rounded-full"
                              style={{
                                width: `${topProductAmount > 0 ? (product.amount / topProductAmount) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#3E667D]">
                            {formatCurrency(product.amount)} <span className="text-[10px] font-semibold text-gray-400">{currencyCode}</span>
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {t('topProducts.percentOfTotal', { percent: personal > 0 ? ((product.amount / personal) * 100).toFixed(1) : '0' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('topProducts.empty')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3E667D] via-[#3E667D] to-[#0A4B94] text-white shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold !text-white">{t('quickActions.title')}</h3>
                  <p className="mt-1 text-xs text-white/75">{t('quickActions.subtitle')}</p>
                </div>

                <div className="space-y-2.5">
                  {!membersOnly && (
                  <Link
                    href="/distribuidor/compartir-carrito"
                    className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8DDF2]/25">
                      <ShoppingCartIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{t('quickActions.shareCartTitle')}</p>
                      <p className="text-[11px] text-white/70">{t('quickActions.shareCartDesc')}</p>
                    </div>
                    <ArrowTrendingUpIcon className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  )}

                  <Link
                    href="/productos"
                    className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8DDF2]/25">
                      <ShoppingBagIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{t('quickActions.registerSaleTitle')}</p>
                      <p className="text-[11px] text-white/70">{t('quickActions.registerSaleDesc')}</p>
                    </div>
                    <ArrowTrendingUpIcon className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    href="/distribuidor/red"
                    className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8DDF2]/25">
                      <UserGroupIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{t('quickActions.myNetworkTitle')}</p>
                      <p className="text-[11px] text-white/70">{t('quickActions.myNetworkDesc')}</p>
                    </div>
                    <ArrowTrendingUpIcon className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    href="/distribuidor/comisiones"
                    className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8DDF2]/25">
                      <CurrencyDollarIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{t('quickActions.viewCommissionsTitle')}</p>
                      <p className="text-[11px] text-white/70">{t('quickActions.viewCommissionsDesc')}</p>
                    </div>
                    <ArrowTrendingUpIcon className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Period Info */}
            {points && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-3">{t('period.title')}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('period.period')}</span>
                      <span className="font-medium text-gray-900">{points.periodName}</span>
                    </div>
                    {periodDates && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">{t('period.dates')}</span>
                        <span className="text-right font-medium text-gray-900">{t('periodDates', periodDates)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('period.daysRemaining')}</span>
                      <span className="font-medium text-gray-900">{points.daysRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('period.personalPoints')}</span>
                      <span className="font-medium text-[#3E667D]">
                        {points.personalPoints.toLocaleString()} / {points.personalPointsRequired.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('period.qualified')}</span>
                      <span className={`font-medium ${points.isPersonalQualified ? 'text-green-600' : 'text-orange-500'}`}>
                        {points.isPersonalQualified ? t('period.qualifiedYes') : t('period.qualifiedPending')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
