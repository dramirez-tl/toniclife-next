'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function VentasPage() {
  const user = useAppSelector(selectUser);
  const {
    salesSummary,
    topPerformers,
    points,
    isLoading,
    isRefreshing,
    isError,
    error,
    refetch,
  } = useDistributorDashboard();

  const currencyCode = user?.currencyCode || 'MXN';
  const isUsd = currencyCode === 'USD';
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(isUsd ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const CurrencyBadge = ({ className = '' }: { className?: string }) => (
    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 ml-1 ${className}`}>
      {currencyCode}
    </span>
  );

  const personal = salesSummary?.personalSales || 0;
  const team = salesSummary?.teamSales || 0;
  const total = salesSummary?.totalSales || 0;
  const orderCount = salesSummary?.orderCount || 0;
  const avgOrder = orderCount > 0 ? personal / orderCount : 0;
  const personalPercent = total > 0 ? ((personal / total) * 100).toFixed(0) : '0';
  const teamPercent = total > 0 ? ((team / total) * 100).toFixed(0) : '0';
  const products = salesSummary?.topProducts || [];
  const performers = topPerformers || [];
  const topProductAmount = products.length > 0 ? Math.max(...products.map((product) => product.amount || 0), 0) : 0;

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
              <h1 className="text-4xl font-bold">Rendimiento de Ventas</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">No pudimos cargar tus ventas</h2>
              <p className="text-gray-600 mb-5">
                Ocurrió un problema al obtener la información. Intenta nuevamente.
              </p>
              {process.env.NODE_ENV === 'development' && error instanceof Error && (
                <p className="text-xs text-gray-400 mb-4 break-all">{error.message}</p>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="primary"
                  leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                  onClick={handleRefresh}
                >
                  Reintentar
                </Button>
                <Link href="/distribuidor">
                  <Button variant="outline">Volver al Panel Principal</Button>
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
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Rendimiento de Ventas</h1>
              </div>
              <p className="text-white/80 text-sm sm:text-base lg:text-lg">
                {points?.periodName || 'Periodo actual'} &mdash; Analiza tu desempeño y el de tu equipo
              </p>
              {isRefreshing && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  Actualizando datos...
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link href="/productos">
                <Button variant="primary" className="bg-[#3E667D] hover:bg-[#2f5165]">
                  Registrar venta
                </Button>
              </Link>
              <button
                onClick={handleRefresh}
                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                title="Actualizar datos"
                aria-label="Actualizar datos de ventas"
                disabled={isRefreshing}
              >
                <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/distribuidor">
                <Button variant="secondary">
                  Volver al Panel Principal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-white/80" />
              </div>
              <p className="text-sm text-white/80 mb-1">Ventas Totales</p>
              <p className="text-3xl font-bold flex items-baseline gap-1">
                {formatCurrency(total)}
                <span className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded">{currencyCode}</span>
              </p>
              <p className="text-xs text-white/70 mt-1">Personal + Equipo</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ShoppingBagIcon className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas Personales</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(personal)}<CurrencyBadge /></p>
              <p className="text-xs text-gray-500 mt-1">
                {personalPercent}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UserGroupIcon className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas de Equipo</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(team)}<CurrencyBadge /></p>
              <p className="text-xs text-gray-500 mt-1">
                {teamPercent}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ChartBarIcon className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Pedidos Personales</p>
              <p className="text-3xl font-bold text-gray-900">{orderCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                Ticket promedio: {formatCurrency(avgOrder)} {currencyCode}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Products */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Productos Más Vendidos</h3>
                {products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <div key={product.productId} className="flex items-center gap-4">
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
                          <p className="text-sm text-gray-500">{product.quantity} unidades</p>
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
                            {total > 0 ? `${((product.amount / total) * 100).toFixed(1)}% del total` : '0% del total'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay productos vendidos en este periodo</p>
                )}
              </CardContent>
            </Card>

            {/* Sales Breakdown */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Distribución de Ventas</h3>
                <div className="space-y-4">
                  {/* Personal vs Team bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Ventas Personales</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(personal)} <span className="text-[10px] text-gray-400">{currencyCode}</span></span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${total > 0 ? (personal / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Ventas de Equipo</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(team)} <span className="text-[10px] text-gray-400">{currencyCode}</span></span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${total > 0 ? (team / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span className="text-sm text-gray-600">Personal ({personalPercent}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded" />
                      <span className="text-sm text-gray-600">Equipo ({teamPercent}%)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Top Performers */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  Líderes del Mes
                </h3>
                {performers.length > 0 ? (
                  <div className="space-y-3">
                    {performers.map((performer: { id: string; name: string; sales: number }, index: number) => (
                      <div key={performer.id} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {performer.name}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-[#3E667D]">
                          {formatCurrency(performer.sales)} <span className="text-[9px] text-gray-400">{currencyCode}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">
                    Sin datos de líderes en este periodo
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3E667D] via-[#3E667D] to-[#0A4B94] text-white shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold !text-white">Acciones Rápidas</h3>
                  <p className="mt-1 text-xs text-white/75">Atajos para mantener activo tu ritmo comercial</p>
                </div>

                <div className="space-y-2.5">
                  <Link
                    href="/productos"
                    className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8DDF2]/25">
                      <ShoppingBagIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Registrar venta</p>
                      <p className="text-[11px] text-white/70">Agrega un nuevo pedido</p>
                    </div>
                    <ArrowTrendingUpIcon className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    href="/distribuidor/prospectos"
                    className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8DDF2]/25">
                      <UserGroupIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Contactar prospectos</p>
                      <p className="text-[11px] text-white/70">Da seguimiento a oportunidades</p>
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
                      <p className="text-sm font-semibold text-white">Ver comisiones</p>
                      <p className="text-[11px] text-white/70">Revisa tus ingresos del periodo</p>
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
                  <h3 className="font-bold text-gray-900 mb-3">Periodo Actual</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Periodo</span>
                      <span className="font-medium text-gray-900">{points.periodName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Días restantes</span>
                      <span className="font-medium text-gray-900">{points.daysRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Puntos personales</span>
                      <span className="font-medium text-[#3E667D]">
                        {points.personalPoints.toLocaleString()} / {points.personalPointsRequired.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Calificado</span>
                      <span className={`font-medium ${points.isPersonalQualified ? 'text-green-600' : 'text-orange-500'}`}>
                        {points.isPersonalQualified ? 'Sí' : 'Pendiente'}
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
