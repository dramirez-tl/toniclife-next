'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  TrophyIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const mockSalesData = {
  thisMonth: {
    personal: 12500,
    team: 32500,
    total: 45000,
    growth: 18.5,
    orders: 45,
    avgOrder: 1000,
  },
  lastMonth: {
    personal: 10600,
    team: 27400,
    total: 38000,
    growth: 12.3,
    orders: 38,
    avgOrder: 1000,
  },
  goals: {
    monthly: 50000,
    nextRank: 75000,
  },
  weeklyData: [
    { week: 'Sem 1', personal: 2800, team: 7200 },
    { week: 'Sem 2', personal: 3100, team: 8500 },
    { week: 'Sem 3', personal: 3500, team: 8800 },
    { week: 'Sem 4', personal: 3100, team: 8000 },
  ],
  topProducts: [
    { name: 'Vitamina D3 + K2', sales: 15, revenue: 6735 },
    { name: 'Omega 3 Premium', sales: 12, revenue: 7188 },
    { name: 'Magnesio Bisglicinato', sales: 10, revenue: 3990 },
    { name: 'Colágeno Hidrolizado', sales: 8, revenue: 5592 },
  ],
  topPerformers: [
    { name: 'Laura Pérez', sales: 8500, growth: 25 },
    { name: 'Carlos Rodríguez', sales: 7200, growth: 15 },
    { name: 'Ana Martínez', sales: 3200, growth: 32 },
    { name: 'José García', sales: 2800, growth: 8 },
  ],
};

export default function VentasPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const data = mockSalesData.thisMonth;
  const goalProgress = (data.total / mockSalesData.goals.monthly) * 100;
  const rankProgress = (data.total / mockSalesData.goals.nextRank) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Performance de Ventas</h1>
              </div>
              <p className="text-white/80 text-lg">
                Analiza tu desempeño y el de tu equipo
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-[#003B7A] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {p === 'week' ? 'Esta Semana' : p === 'month' ? 'Este Mes' : p === 'quarter' ? 'Este Trimestre' : 'Este Año'}
            </button>
          ))}
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-white/80" />
                <div className="flex items-center gap-1 text-sm">
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                  <span>+{data.growth}%</span>
                </div>
              </div>
              <p className="text-sm text-white/80 mb-1">Ventas Totales</p>
              <p className="text-3xl font-bold">${data.total.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas Personales</p>
              <p className="text-3xl font-bold text-gray-900">${data.personal.toLocaleString('es-MX')}</p>
              <p className="text-xs text-gray-500 mt-1">
                {((data.personal / data.total) * 100).toFixed(0)}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UserGroupIcon className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas de Equipo</p>
              <p className="text-3xl font-bold text-gray-900">${data.team.toLocaleString('es-MX')}</p>
              <p className="text-xs text-gray-500 mt-1">
                {((data.team / data.total) * 100).toFixed(0)}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ChartBarIcon className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Pedidos</p>
              <p className="text-3xl font-bold text-gray-900">{data.orders}</p>
              <p className="text-xs text-gray-500 mt-1">
                Ticket promedio: ${data.avgOrder.toLocaleString('es-MX')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Goals Progress */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Metas del Mes</h3>

                {/* Monthly Goal */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Meta Mensual</span>
                    <span className="text-sm font-bold text-gray-900">
                      ${data.total.toLocaleString('es-MX')} / ${mockSalesData.goals.monthly.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7AB82E] rounded-full transition-all"
                      style={{ width: `${Math.min(goalProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {goalProgress >= 100 ? '¡Meta alcanzada! 🎉' : `Faltan $${(mockSalesData.goals.monthly - data.total).toLocaleString('es-MX')} (${(100 - goalProgress).toFixed(0)}%)`}
                  </p>
                </div>

                {/* Rank Goal */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progreso a Diamond</span>
                    <span className="text-sm font-bold text-gray-900">
                      ${data.total.toLocaleString('es-MX')} / ${mockSalesData.goals.nextRank.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min(rankProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Faltan $${(mockSalesData.goals.nextRank - data.total).toLocaleString('es-MX')} para siguiente rango
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Tendencia Semanal</h3>
                <div className="space-y-4">
                  {mockSalesData.weeklyData.map((week, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{week.week}</span>
                        <span className="text-sm font-bold text-gray-900">
                          ${(week.personal + week.team).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <div className="flex gap-1 h-8">
                        <div
                          className="bg-blue-500 rounded"
                          style={{ width: `${(week.personal / 12000) * 100}%` }}
                          title={`Personal: $${week.personal}`}
                        />
                        <div
                          className="bg-purple-500 rounded"
                          style={{ width: `${(week.team / 12000) * 100}%` }}
                          title={`Equipo: $${week.team}`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Personal: ${week.personal.toLocaleString('es-MX')}</span>
                        <span>Equipo: ${week.team.toLocaleString('es-MX')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span className="text-sm text-gray-600">Ventas Personales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded" />
                    <span className="text-sm text-gray-600">Ventas de Equipo</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Productos Más Vendidos</h3>
                <div className="space-y-4">
                  {mockSalesData.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sales} ventas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#003B7A]">
                          ${product.revenue.toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
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
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {mockSalesData.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center gap-3">
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
                        <p className="text-xs text-gray-500">
                          ${performer.sales.toLocaleString('es-MX')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                        <span className="text-green-600 font-medium">+{performer.growth}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-[#003B7A] to-[#003B7A]/90 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Acciones Rápidas</h3>
                <div className="space-y-2">
                  <Link href="/distribuidor/comisiones">
                    <Button variant="secondary" size="sm" className="w-full justify-start">
                      Ver Comisiones
                    </Button>
                  </Link>
                  <Link href="/distribuidor/red">
                    <Button variant="secondary" size="sm" className="w-full justify-start">
                      Ver Red
                    </Button>
                  </Link>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    Exportar Reporte
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-3">💡 Tips para Mejorar</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Enfócate en productos con mejor margen</li>
                  <li>• Capacita a tu equipo regularmente</li>
                  <li>• Usa las redes sociales diariamente</li>
                  <li>• Haz seguimiento a prospectos</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
