'use client';

import { useState } from 'react';
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
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockSalesData = [
  { month: 'Jul', sales: 125000, orders: 234, customers: 189 },
  { month: 'Ago', sales: 145000, orders: 267, customers: 215 },
  { month: 'Sep', sales: 168000, orders: 312, customers: 248 },
  { month: 'Oct', sales: 198000, orders: 356, customers: 289 },
  { month: 'Nov', sales: 223000, orders: 398, customers: 321 },
  { month: 'Dic', sales: 267000, orders: 445, customers: 367 },
  { month: 'Ene', sales: 298000, orders: 489, customers: 402 },
];

const mockTopProducts = [
  { name: 'Vitamina D3 + K2', sales: 234, revenue: 105066, growth: 18.5 },
  { name: 'Colágeno Hidrolizado', sales: 312, revenue: 218088, growth: 24.3 },
  { name: 'Omega 3 Premium', sales: 189, revenue: 113211, growth: 12.7 },
  { name: 'Probióticos Avanzados', sales: 178, revenue: 97722, growth: 8.9 },
  { name: 'Vitamina C 1000mg', sales: 287, revenue: 85813, growth: -3.2 },
];

const mockTopDistributors = [
  { name: 'Laura Mendoza', sales: 125000, orders: 45, team: 45, commission: 15625 },
  { name: 'Diana Flores', sales: 98000, orders: 38, team: 18, commission: 12250 },
  { name: 'Patricia González', sales: 87000, orders: 32, team: 12, commission: 10875 },
  { name: 'Ana Martínez', sales: 76000, orders: 28, team: 8, commission: 9500 },
  { name: 'Fernando García', sales: 54000, orders: 21, team: 5, commission: 6750 },
];

const mockCategoryPerformance = [
  { category: 'Vitaminas', sales: 458000, percentage: 32, growth: 15.3 },
  { category: 'Suplementos', sales: 387000, percentage: 27, growth: 12.8 },
  { category: 'Belleza', sales: 289000, percentage: 20, growth: 18.7 },
  { category: 'Digestión', sales: 156000, percentage: 11, growth: 8.4 },
  { category: 'Proteínas', sales: 142000, percentage: 10, growth: 6.2 },
];

export default function ReportesPage() {
  const [dateRange, setDateRange] = useState('last-7-months');
  const [selectedMetric, setSelectedMetric] = useState('sales');

  const currentMonthSales = mockSalesData[mockSalesData.length - 1].sales;
  const previousMonthSales = mockSalesData[mockSalesData.length - 2].sales;
  const salesGrowth = ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100;

  const currentMonthOrders = mockSalesData[mockSalesData.length - 1].orders;
  const previousMonthOrders = mockSalesData[mockSalesData.length - 2].orders;
  const ordersGrowth = ((currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 100;

  const currentMonthCustomers = mockSalesData[mockSalesData.length - 1].customers;
  const previousMonthCustomers = mockSalesData[mockSalesData.length - 2].customers;
  const customersGrowth = ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100;

  const totalRevenue = mockSalesData.reduce((sum, data) => sum + data.sales, 0);
  const totalOrders = mockSalesData.reduce((sum, data) => sum + data.orders, 0);
  const averageOrderValue = totalRevenue / totalOrders;

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
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
                  Volver al Dashboard
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
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="last-7-days">Últimos 7 días</option>
                  <option value="last-30-days">Últimos 30 días</option>
                  <option value="last-3-months">Últimos 3 meses</option>
                  <option value="last-6-months">Últimos 6 meses</option>
                  <option value="last-7-months">Últimos 7 meses</option>
                  <option value="this-year">Este año</option>
                  <option value="custom">Personalizado</option>
                </select>
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
              <p className="text-sm text-gray-600 mb-1">Ventas (Ene)</p>
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
              <p className="text-sm text-gray-600 mb-1">Pedidos (Ene)</p>
              <p className="text-3xl font-bold text-gray-900">{currentMonthOrders}</p>
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
              <p className="text-sm text-gray-600 mb-1">Clientes (Ene)</p>
              <p className="text-3xl font-bold text-gray-900">{currentMonthCustomers}</p>
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
                      ? 'bg-[#003B7A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setSelectedMetric('orders')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'orders'
                      ? 'bg-[#003B7A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pedidos
                </button>
                <button
                  onClick={() => setSelectedMetric('customers')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'customers'
                      ? 'bg-[#003B7A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Clientes
                </button>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="space-y-4">
              {mockSalesData.map((data) => {
                const value = selectedMetric === 'sales' ? data.sales :
                             selectedMetric === 'orders' ? data.orders :
                             data.customers;
                const maxValue = Math.max(...mockSalesData.map(d =>
                  selectedMetric === 'sales' ? d.sales :
                  selectedMetric === 'orders' ? d.orders :
                  d.customers
                ));
                const percentage = (value / maxValue) * 100;

                return (
                  <div key={data.month}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 w-12">{data.month}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedMetric === 'sales' ? formatCurrency(value) : value.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs font-bold text-white">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                {mockTopProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-4">
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
                ))}
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
                {mockTopDistributors.map((distributor, index) => (
                  <div key={distributor.name} className="flex items-center gap-4">
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
                        <span>{distributor.team} miembros</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(distributor.commission)}
                      </p>
                      <p className="text-xs text-gray-500">comisión</p>
                    </div>
                  </div>
                ))}
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
              {mockCategoryPerformance.map((category) => (
                <div key={category.category}>
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
                        className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] h-6 rounded-full flex items-center justify-end pr-3"
                        style={{ width: `${category.percentage}%` }}
                      >
                        <span className="text-xs font-bold text-white">
                          {category.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
