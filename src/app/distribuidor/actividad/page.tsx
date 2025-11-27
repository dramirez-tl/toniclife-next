'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ClockIcon,
  ShoppingBagIcon,
  UserPlusIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  BellIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const mockActivities = [
  {
    id: '1',
    type: 'sale',
    icon: ShoppingBagIcon,
    color: 'green',
    title: 'Nueva Venta Realizada',
    description: 'Vendiste Vitamina D3 + K2 a Patricia González',
    amount: 449,
    timestamp: '2025-01-25T14:30:00',
    details: 'Pedido #12345',
  },
  {
    id: '2',
    type: 'commission',
    icon: CurrencyDollarIcon,
    color: 'blue',
    title: 'Comisión Generada',
    description: 'Carlos Ruiz (nivel 2) realizó una venta',
    amount: 120,
    timestamp: '2025-01-25T13:15:00',
    details: 'Comisión 10% por venta de equipo',
  },
  {
    id: '3',
    type: 'recruit',
    icon: UserPlusIcon,
    color: 'purple',
    title: 'Nuevo Distribuidor Reclutado',
    description: 'Ana Martínez se unió a tu equipo',
    timestamp: '2025-01-25T11:00:00',
    details: 'Ahora tienes 12 distribuidores activos',
  },
  {
    id: '4',
    type: 'achievement',
    icon: TrophyIcon,
    color: 'yellow',
    title: '¡Meta Alcanzada!',
    description: 'Completaste tu meta de ventas mensuales',
    timestamp: '2025-01-25T10:30:00',
    details: 'Meta: $50,000 MXN',
  },
  {
    id: '5',
    type: 'message',
    icon: ChatBubbleLeftIcon,
    color: 'gray',
    title: 'Nuevo Mensaje',
    description: 'Laura Mendoza te envió un mensaje en Equipo CDMX',
    timestamp: '2025-01-25T09:45:00',
    details: 'Grupo: Equipo CDMX',
  },
  {
    id: '6',
    type: 'sale',
    icon: ShoppingBagIcon,
    color: 'green',
    title: 'Venta de Equipo',
    description: 'Diana Flores vendió Omega 3 Premium',
    amount: 599,
    timestamp: '2025-01-24T18:20:00',
    details: 'Comisionable en tu siguiente pago',
  },
  {
    id: '7',
    type: 'rank',
    icon: ArrowTrendingUpIcon,
    color: 'orange',
    title: 'Progreso de Rango',
    description: 'Estás a $5,000 de alcanzar Diamond',
    timestamp: '2025-01-24T16:00:00',
    details: '87% completado',
  },
  {
    id: '8',
    type: 'training',
    icon: DocumentTextIcon,
    color: 'indigo',
    title: 'Curso Completado',
    description: 'Terminaste "Estrategias de Venta Digital"',
    timestamp: '2025-01-24T14:30:00',
    details: 'Certificado disponible',
  },
  {
    id: '9',
    type: 'commission',
    icon: CurrencyDollarIcon,
    color: 'blue',
    title: 'Comisión Generada',
    description: 'Roberto Sánchez (nivel 1) realizó 3 ventas',
    amount: 675,
    timestamp: '2025-01-24T12:00:00',
    details: 'Comisión 25% por ventas directas',
  },
  {
    id: '10',
    type: 'sale',
    icon: ShoppingBagIcon,
    color: 'green',
    title: 'Nueva Venta Realizada',
    description: 'Vendiste Colágeno Hidrolizado a Ricardo Méndez',
    amount: 699,
    timestamp: '2025-01-24T10:15:00',
    details: 'Cliente VIP - 28va compra',
  },
  {
    id: '11',
    type: 'notification',
    icon: BellIcon,
    color: 'red',
    title: 'Recordatorio',
    description: 'Tienes una reunión regional mañana a las 10am',
    timestamp: '2025-01-24T09:00:00',
    details: 'Hotel Sheraton, CDMX',
  },
  {
    id: '12',
    type: 'achievement',
    icon: CheckCircleIcon,
    color: 'green',
    title: 'Racha Activa',
    description: 'Has realizado ventas por 7 días consecutivos',
    timestamp: '2025-01-23T20:00:00',
    details: '¡Sigue así!',
  },
];

const activityTypes = [
  { id: 'all', name: 'Todas', icon: ClockIcon },
  { id: 'sale', name: 'Ventas', icon: ShoppingBagIcon },
  { id: 'commission', name: 'Comisiones', icon: CurrencyDollarIcon },
  { id: 'recruit', name: 'Reclutamiento', icon: UserPlusIcon },
  { id: 'achievement', name: 'Logros', icon: TrophyIcon },
  { id: 'message', name: 'Mensajes', icon: ChatBubbleLeftIcon },
];

const timeFilters = ['Hoy', 'Esta Semana', 'Este Mes', 'Todo'];

export default function ActividadPage() {
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('Todo');

  const filteredActivities = mockActivities.filter(activity => {
    if (filterType !== 'all' && activity.type !== filterType) return false;

    if (filterTime !== 'Todo') {
      const activityDate = new Date(activity.timestamp);
      const now = new Date();

      if (filterTime === 'Hoy') {
        return activityDate.toDateString() === now.toDateString();
      }

      if (filterTime === 'Esta Semana') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return activityDate >= weekAgo;
      }

      if (filterTime === 'Este Mes') {
        return activityDate.getMonth() === now.getMonth() &&
               activityDate.getFullYear() === now.getFullYear();
      }
    }

    return true;
  });

  const stats = {
    today: mockActivities.filter(a => {
      const activityDate = new Date(a.timestamp);
      const today = new Date();
      return activityDate.toDateString() === today.toDateString();
    }).length,
    sales: mockActivities.filter(a => a.type === 'sale').length,
    commissions: mockActivities.filter(a => a.type === 'commission').length,
    achievements: mockActivities.filter(a => a.type === 'achievement').length,
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      case 'orange': return 'bg-orange-100 text-orange-600';
      case 'red': return 'bg-red-100 text-red-600';
      case 'indigo': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
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
                <ClockIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Actividad Reciente</h1>
              </div>
              <p className="text-white/80 text-lg">
                Mantente al día con todo lo que sucede en tu negocio
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Actividades Hoy</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.today}</p>
                </div>
                <ClockIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ventas</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.sales}</p>
                </div>
                <ShoppingBagIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Comisiones</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.commissions}</p>
                </div>
                <CurrencyDollarIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Logros</p>
                  <p className="text-3xl font-bold">{stats.achievements}</p>
                </div>
                <TrophyIcon className="h-12 w-12 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5" />
                  Filtros
                </h3>

                {/* Type Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Actividad
                  </label>
                  <div className="space-y-2">
                    {activityTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setFilterType(type.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            filterType === type.id
                              ? 'bg-[#003B7A] text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                          <span className="text-sm font-medium">{type.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Periodo
                  </label>
                  <div className="space-y-2">
                    {timeFilters.map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFilterTime(filter)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          filterTime === filter
                            ? 'bg-[#7AB82E] text-white font-medium'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-6"
                  onClick={() => {
                    setFilterType('all');
                    setFilterTime('Todo');
                  }}
                >
                  Limpiar Filtros
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Activity Feed */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {filteredActivities.length} Actividades
                </h2>

                {filteredActivities.length === 0 ? (
                  <div className="text-center py-12">
                    <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No hay actividades
                    </h3>
                    <p className="text-gray-600">
                      Intenta ajustar los filtros de búsqueda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredActivities.map((activity) => {
                      const IconComponent = activity.icon;
                      return (
                        <div
                          key={activity.id}
                          className="flex gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                        >
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(activity.color)}`}>
                            <IconComponent className="h-6 w-6" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                              <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                                {formatTime(activity.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs text-gray-500">
                                {activity.details}
                              </span>
                              {activity.amount && (
                                <span className="text-sm font-bold text-[#7AB82E]">
                                  +${activity.amount.toLocaleString('es-MX')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Load More */}
                {filteredActivities.length > 0 && (
                  <div className="mt-6 text-center">
                    <Button variant="outline">
                      Cargar Más Actividades
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
