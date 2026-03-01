'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAnalytics } from '@/hooks/useReports';
import { PermissionGuard } from '@/components/auth';

// Helper to calculate date range based on selection
function getDateRange(rangeKey: string): { startDate: string; endDate: string; months: number } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: Date;
  let months = 7;

  switch (rangeKey) {
    case 'last-7-days':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      months = 1;
      break;
    case 'last-30-days':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      months = 1;
      break;
    case 'last-3-months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      months = 3;
      break;
    case 'last-6-months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      months = 6;
      break;
    case 'last-7-months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 7);
      months = 7;
      break;
    case 'this-year':
      start = new Date(now.getFullYear(), 0, 1);
      months = now.getMonth() + 1;
      break;
    default:
      start = new Date(now);
      start.setMonth(start.getMonth() - 7);
      months = 7;
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end,
    months,
  };
}

export default function ReportesPage() {
  const [dateRange, setDateRange] = useState('last-7-months');
  const [selectedMetric, setSelectedMetric] = useState<'sales' | 'orders' | 'customers'>('sales');

  // Calculate date range based on selection
  const dateParams = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useAnalytics({
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    months: dateParams.months,
    limit: 5,
  });

  // Extract data from API response
  const salesTrend = analyticsData?.salesTrend || [];
  const topProducts = analyticsData?.topProducts || [];
  const topDistributors = analyticsData?.topDistributors || [];
  const categoryPerformance = analyticsData?.categoryPerformance || [];
  const kpis = analyticsData?.kpis;

  // KPIs with defaults
  const currentMonthSales = kpis?.currentMonthSales || 0;
  const salesGrowth = kpis?.salesGrowth || 0;
  const currentMonthOrders = kpis?.currentMonthOrders || 0;
  const ordersGrowth = kpis?.ordersGrowth || 0;
  const currentMonthCustomers = kpis?.currentMonthCustomers || 0;
  const customersGrowth = kpis?.customersGrowth || 0;
  const averageOrderValue = kpis?.averageOrderValue || 0;

  const handleExportReport = (reportType: string) => {
    toast.success(`Exportando reporte de ${reportType}...`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getGrowthIndicator = (growth: number) => {
    if (growth > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
          <ArrowTrendingUpIcon className="h-4 w-4" />
          +{growth.toFixed(1)}%
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium">
          <ArrowTrendingDownIcon className="h-4 w-4" />
          {growth.toFixed(1)}%
        </span>
      );
    }
  };

  return (
    <PermissionGuard permissions={['reports:read', 'reports:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Análisis y Reportes</h1>
              </div>
              <p className="text-white/80 text-lg">
                Métricas clave y análisis de rendimiento del negocio
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">
                  Volver al Panel Principal
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={() => handleExportReport('completo')}
              >
                Exportar Reporte
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Período de Análisis:</span>
                <SearchableSelect
                  options={[
                    { value: 'last-7-days', label: 'Últimos 7 días' },
                    { value: 'last-30-days', label: 'Últimos 30 días' },
                    { value: 'last-3-months', label: 'Últimos 3 meses' },
                    { value: 'last-6-months', label: 'Últimos 6 meses' },
                    { value: 'last-7-months', label: 'Últimos 7 meses' },
                    { value: 'this-year', label: 'Este año' },
                    { value: 'custom', label: 'Personalizado' },
                  ]}
                  value={dateRange}
                  onChange={setDateRange}
                  showAllOption={false}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportReport('ventas')}>
                  Exportar Ventas
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportReport('productos')}>
                  Exportar Productos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
                {getGrowthIndicator(salesGrowth)}
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas del Período</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(currentMonthSales)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
                </div>
                {getGrowthIndicator(ordersGrowth)}
              </div>
              <p className="text-sm text-gray-600 mb-1">Pedidos del Período</p>
              <p className="text-3xl font-bold text-gray-900">{currentMonthOrders.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                {getGrowthIndicator(customersGrowth)}
              </div>
              <p className="text-sm text-gray-600 mb-1">Clientes del Período</p>
              <p className="text-3xl font-bold text-gray-900">{currentMonthCustomers.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(averageOrderValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Trend Chart */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Tendencia de Ventas</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMetric('sales')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'sales'
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setSelectedMetric('orders')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'orders'
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pedidos
                </button>
                <button
                  onClick={() => setSelectedMetric('customers')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'customers'
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Clientes
                </button>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]"></div>
                </div>
              ) : salesTrend.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay datos disponibles para el período seleccionado
                </div>
              ) : (
                salesTrend.map((data) => {
                  const value = selectedMetric === 'sales' ? data.sales :
                               selectedMetric === 'orders' ? data.orders :
                               data.customers;
                  const maxValue = Math.max(...salesTrend.map(d =>
                    selectedMetric === 'sales' ? d.sales :
                    selectedMetric === 'orders' ? d.orders :
                    d.customers
                  ));
                  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

                  return (
                    <div key={`${data.month}-${data.year}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 w-12">{data.month}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {selectedMetric === 'sales' ? formatCurrency(value) : value.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div
                          className="bg-gradient-to-r from-[#3E667D] to-[#C8DDF2] h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Top Productos</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportReport('productos-top')}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3E667D]"></div>
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">Sin datos</div>
                ) : (
                  topProducts.map((product, index) => (
                    <div key={product.productId} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{product.sales} vendidos</span>
                          <span className="text-gray-400">•</span>
                          <span>{formatCurrency(product.revenue)}</span>
                        </div>
                      </div>
                      {getGrowthIndicator(product.growth)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Distributors */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Top Distribuidores</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportReport('distribuidores-top')}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3E667D]"></div>
                  </div>
                ) : topDistributors.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">Sin datos</div>
                ) : (
                  topDistributors.map((distributor, index) => (
                    <div key={distributor.customerId} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{distributor.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{formatCurrency(distributor.sales)}</span>
                            <span className="text-gray-400">•</span>
                            <span>{distributor.teamSize} miembros</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            {formatCurrency(distributor.commission)}
                          </p>
                          <p className="text-xs text-gray-500">comisión</p>
                        </div>
                      </div>
                    ))
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Performance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Rendimiento por Categoría</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportReport('categorias')}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]"></div>
                </div>
              ) : categoryPerformance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Sin datos de categorías</div>
              ) : (
                categoryPerformance.map((category) => (
                  <div key={category.categoryId || category.category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{category.category}</span>
                        {getGrowthIndicator(category.growth)}
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(category.sales)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-gradient-to-r from-[#3E667D] to-[#C8DDF2] h-6 rounded-full flex items-center justify-end pr-3"
                          style={{ width: `${Math.max(category.percentage, 5)}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            {category.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PermissionGuard>
  );
}
