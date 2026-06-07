'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  ChartBarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  TrophyIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useCustomerNetworkStats,
  useNetworkStatsStatus,
  useTopByBusinessPoints,
  useTopByNetworkSize,
  useRefreshNetworkStats,
} from '@/hooks/useMlmNetworkStats';

export default function EstadisticasPage() {
  const [searchCustomerId, setSearchCustomerId] = useState('');
  const [searchedCustomerId, setSearchedCustomerId] = useState('');

  // Hooks
  const { data: statsStatus, isLoading: statusLoading } = useNetworkStatsStatus();
  const { data: topBusinessPoints, isLoading: topBpLoading } = useTopByBusinessPoints();
  const { data: topNetworkSize, isLoading: topNetLoading } = useTopByNetworkSize();
  const { data: customerStats, isLoading: customerLoading } = useCustomerNetworkStats(
    searchedCustomerId,
    !!searchedCustomerId
  );

  const refreshMutation = useRefreshNetworkStats();

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync();
      toast.success('Actualizacion de estadisticas iniciada');
    } catch {
      toast.error('Error al actualizar estadisticas');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCustomerId.trim()) {
      setSearchedCustomerId(searchCustomerId.trim());
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Estadísticas de Red</h1>
              </div>
              <p className="text-white/80 text-lg">
                Panel de rendimiento de la red de distribuidores
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="default"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
              >
                {refreshMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                <ArrowPathIcon className="h-5 w-5" />
                Actualizar Estadisticas
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Status */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Estado del Sistema</h3>
                  {statusLoading ? (
                    <p className="text-sm text-gray-500">Cargando...</p>
                  ) : statsStatus ? (
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Ultima actualizacion: {formatDate(statsStatus.lastRefresh)}</span>
                      <span className="text-gray-300">|</span>
                      <span>Total registros: {formatNumber(statsStatus.totalRecords)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sin datos de estado disponibles</p>
                  )}
                </div>
              </div>
              {statsStatus && (
                <div>
                  {statsStatus.isRefreshing ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Actualizando
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <CheckCircleIcon className="h-4 w-4" />
                      Actualizado
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top by Business Points */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <StarIcon className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Top por Puntos de Negocio</h3>
                  <p className="text-sm text-gray-500">Distribuidores con mas puntos acumulados</p>
                </div>
              </div>

              {topBpLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (topBusinessPoints || []).length > 0 ? (
                <div className="space-y-3">
                  {topBusinessPoints!.map((performer, index) => (
                    <div
                      key={performer.customerId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-400 text-white' :
                          index === 1 ? 'bg-gray-300 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{performer.customerName}</p>
                          <p className="text-xs text-gray-500">{performer.rank}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[#3E667D]">
                        {formatNumber(performer.value)} pts
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No hay datos disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top by Network Size */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-[#3E667D]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Top por Tamano de Red</h3>
                  <p className="text-sm text-gray-500">Distribuidores con redes mas grandes</p>
                </div>
              </div>

              {topNetLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (topNetworkSize || []).length > 0 ? (
                <div className="space-y-3">
                  {topNetworkSize!.map((performer, index) => (
                    <div
                      key={performer.customerId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-400 text-white' :
                          index === 1 ? 'bg-gray-300 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{performer.customerName}</p>
                          <p className="text-xs text-gray-500">{performer.rank}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[#3E667D]">
                        {formatNumber(performer.value)} miembros
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No hay datos disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Individual Customer Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <MagnifyingGlassIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Buscar Distribuidor</h3>
                <p className="text-sm text-gray-500">Consulta las estadisticas de un distribuidor especifico</p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ID del distribuidor..."
                  value={searchCustomerId}
                  onChange={(e) => setSearchCustomerId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>
              <Button variant="default" type="submit">
                Buscar
              </Button>
            </form>

            {customerLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-gray-600">Cargando estadisticas...</p>
              </div>
            ) : searchedCustomerId && customerStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Total Miembros</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(customerStats.totalMembers)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Miembros Activos</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(customerStats.activeMembers)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Puntos Totales</p>
                  <p className="text-2xl font-bold text-[#3E667D]">{formatNumber(customerStats.totalPoints)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Puntos de Grupo</p>
                  <p className="text-2xl font-bold text-[#3E667D]">{formatNumber(customerStats.groupPoints)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Rango</p>
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="h-5 w-5 text-yellow-500" />
                    <p className="text-lg font-bold text-gray-900">{customerStats.rank}</p>
                  </div>
                </div>
              </div>
            ) : (
              !searchedCustomerId && (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Ingresa un ID de distribuidor para ver sus estadisticas de red</p>
                </div>
              )
            )}

            {searchedCustomerId && !customerLoading && !customerStats && (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No se encontraron estadisticas para este distribuidor</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
