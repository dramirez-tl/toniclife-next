'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  AcademicCapIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function DistribuidorDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Mock distributor data
  const distributorData = {
    name: 'María González',
    rank: 'Gold',
    distributorId: 'TL-MX-00234',
    joinDate: 'Enero 2024',
    profileImage: '/avatars/distributor-1.png',
    personalLink: 'toniclife.com/maria-gonzalez',
    qrCode: '/qr/maria-gonzalez.png',
  };

  const stats = {
    monthlyCommission: 4567.89,
    totalSales: 12345.67,
    activeDownline: 23,
    totalDownline: 47,
    personalSales: 3200.45,
    teamSales: 9145.22,
    conversionRate: 68,
    rankProgress: 75,
  };

  const recentActivity = [
    {
      id: 1,
      type: 'sale',
      description: 'Nueva venta - Paquete Detox',
      amount: 245.99,
      customer: 'Ana Martínez',
      date: 'Hace 2 horas',
    },
    {
      id: 2,
      type: 'recruit',
      description: 'Nuevo distribuidor en tu red',
      person: 'Carlos Rodríguez',
      date: 'Hace 5 horas',
    },
    {
      id: 3,
      type: 'commission',
      description: 'Comisión acreditada',
      amount: 89.50,
      date: 'Hoy',
    },
    {
      id: 4,
      type: 'sale',
      description: 'Venta del equipo - Energy Gold',
      amount: 39.99,
      downline: 'Laura Pérez',
      date: 'Ayer',
    },
  ];

  const topPerformers = [
    { name: 'Laura Pérez', sales: 2345.67, level: 1 },
    { name: 'Carlos Rodríguez', sales: 1876.43, level: 1 },
    { name: 'Ana Martínez', sales: 1543.21, level: 2 },
    { name: 'José García', sales: 1234.56, level: 1 },
    { name: 'Diana López', sales: 987.65, level: 2 },
  ];

  const trainingCourses = [
    {
      id: 1,
      title: 'Introducción a Tonic Life',
      progress: 100,
      duration: '2 horas',
      completed: true,
    },
    {
      id: 2,
      title: 'Técnicas de Venta Efectiva',
      progress: 60,
      duration: '3 horas',
      completed: false,
    },
    {
      id: 3,
      title: 'Gestión de Red y Liderazgo',
      progress: 0,
      duration: '4 horas',
      completed: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ¡Bienvenida, {distributorData.name}!
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="success" className="text-sm">
                  <TrophyIcon className="h-4 w-4 mr-1" />
                  Rango {distributorData.rank}
                </Badge>
                <span className="text-sm text-gray-500">ID: {distributorData.distributorId}</span>
                <span className="text-sm text-gray-500">Miembro desde {distributorData.joinDate}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" leftIcon={<ShareIcon className="h-5 w-5" />}>
                Compartir enlace
              </Button>
              <Button variant="primary" leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}>
                Descargar QR
              </Button>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-[#003B7A] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Esta semana
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-[#003B7A] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Este mes
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 'year'
                ? 'bg-[#003B7A] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Este año
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#003B7A] to-[#003B7A]/80 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-white/80" />
                <Badge variant="success" className="bg-[#7AB82E]">
                  +12%
                </Badge>
              </div>
              <p className="text-sm text-white/80 mb-1">Comisiones del mes</p>
              <p className="text-3xl font-bold">${stats.monthlyCommission.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ChartBarIcon className="h-8 w-8 text-[#7AB82E]" />
                <ArrowTrendingUpIcon className="h-5 w-5 text-[#7AB82E]" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas totales</p>
              <p className="text-3xl font-bold text-[#003B7A]">${stats.totalSales.toLocaleString()}</p>
              <div className="mt-2 text-sm text-gray-500">
                Personal: ${stats.personalSales.toLocaleString()} | Equipo: ${stats.teamSales.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UsersIcon className="h-8 w-8 text-[#7AB82E]" />
                <Badge variant="info">{stats.activeDownline} activos</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">Red de distribuidores</p>
              <p className="text-3xl font-bold text-[#003B7A]">{stats.totalDownline}</p>
              <div className="mt-2 text-sm text-gray-500">
                {stats.activeDownline} activos este mes
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/80 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TrophyIcon className="h-8 w-8 text-white/80" />
                <SparklesIcon className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-sm text-white/80 mb-1">Progreso a Diamond</p>
              <p className="text-3xl font-bold">{stats.rankProgress}%</p>
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${stats.rankProgress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'sale' ? 'bg-[#7AB82E]/10' :
                        activity.type === 'recruit' ? 'bg-blue-50' :
                        'bg-purple-50'
                      }`}>
                        {activity.type === 'sale' && <ChartBarIcon className="h-5 w-5 text-[#7AB82E]" />}
                        {activity.type === 'recruit' && <UsersIcon className="h-5 w-5 text-blue-600" />}
                        {activity.type === 'commission' && <CurrencyDollarIcon className="h-5 w-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {activity.amount && (
                            <span className="text-sm font-semibold text-[#7AB82E]">
                              +${activity.amount.toFixed(2)}
                            </span>
                          )}
                          {activity.customer && (
                            <span className="text-sm text-gray-500">Cliente: {activity.customer}</span>
                          )}
                          {activity.person && (
                            <span className="text-sm text-gray-500">{activity.person}</span>
                          )}
                          {activity.downline && (
                            <span className="text-sm text-gray-500">Por: {activity.downline}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{activity.date}</span>
                    </div>
                  ))}
                </div>
                <Link href="/distribuidor/actividad">
                  <Button variant="outline" className="w-full mt-4">
                    Ver toda la actividad
                    <ChevronRightIcon className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers de tu Red</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((performer, index) => (
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
                        <p className="font-medium text-gray-900">{performer.name}</p>
                        <p className="text-sm text-gray-500">Nivel {performer.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#003B7A]">${performer.sales.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">en ventas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Training Courses */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AcademicCapIcon className="h-6 w-6 text-[#003B7A]" />
                    Capacitación
                  </CardTitle>
                  <Link href="/distribuidor/capacitacion">
                    <Button variant="ghost" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainingCourses.map((course) => (
                    <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{course.title}</h4>
                          <p className="text-sm text-gray-500">{course.duration}</p>
                        </div>
                        {course.completed && (
                          <Badge variant="success">Completado</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7AB82E] rounded-full transition-all"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">{course.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Personal Link Card */}
            <Card className="bg-gradient-to-br from-[#003B7A] to-[#003B7A]/80 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <ShareIcon className="h-5 w-5" />
                  Tu Enlace Personal
                </h3>
                <div className="bg-white/10 rounded-lg p-3 mb-4">
                  <p className="text-sm text-white/80 mb-1">Enlace de referidos</p>
                  <p className="font-mono text-sm break-all">{distributorData.personalLink}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}
                  >
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                    leftIcon={<ShareIcon className="h-4 w-4" />}
                  >
                    Compartir
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/distribuidor/ventas">
                    <Button variant="outline" className="w-full justify-start">
                      <ChartBarIcon className="h-5 w-5 mr-2" />
                      Registrar venta
                    </Button>
                  </Link>
                  <Link href="/distribuidor/red">
                    <Button variant="outline" className="w-full justify-start">
                      <UsersIcon className="h-5 w-5 mr-2" />
                      Ver mi red
                    </Button>
                  </Link>
                  <Link href="/distribuidor/comisiones">
                    <Button variant="outline" className="w-full justify-start">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      Historial de comisiones
                    </Button>
                  </Link>
                  <Link href="/distribuidor/materiales">
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                      Material de marketing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Rank Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progreso de Rango</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
                    <h4 className="font-bold text-lg text-gray-900">Gold</h4>
                    <p className="text-sm text-gray-500">Rango actual</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Próximo rango: Diamond
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ventas personales</span>
                        <span className="font-medium text-[#7AB82E]">✓ Completado</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ventas de equipo</span>
                        <span className="font-medium">$2,500 / $10,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Distribuidores activos</span>
                        <span className="font-medium">23 / 30</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="primary" className="w-full">
                    Ver requisitos completos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
