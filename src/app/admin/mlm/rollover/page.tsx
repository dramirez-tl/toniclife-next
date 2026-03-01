'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCurrentPeriod, usePeriods } from '@/hooks/useMlmPeriods';
import {
  useRolloverStatus,
  useRolloverStats,
  useRolloverHistory,
  useCalculateRollover,
} from '@/hooks/useMlmRollover';

export default function RolloverPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [searchCustomerId, setSearchCustomerId] = useState('');
  const [searchedCustomerId, setSearchedCustomerId] = useState('');

  // Periods
  const { data: periods } = usePeriods();
  const { data: currentPeriod } = useCurrentPeriod();

  const activePeriodId = selectedPeriodId || currentPeriod?.id || '';

  // Rollover data
  const { data: rolloverStatus, isLoading: statusLoading } = useRolloverStatus(activePeriodId, !!activePeriodId);
  const { data: rolloverStats, isLoading: statsLoading } = useRolloverStats(activePeriodId, !!activePeriodId);
  const { data: rolloverHistory, isLoading: historyLoading } = useRolloverHistory(
    searchedCustomerId,
    !!searchedCustomerId
  );

  const calculateMutation = useCalculateRollover();

  const handleCalculate = async () => {
    if (!activePeriodId) {
      toast.error('Selecciona un periodo primero');
      return;
    }
    try {
      await calculateMutation.mutateAsync(activePeriodId);
      toast.success('Calculo de roll-over iniciado');
    } catch {
      toast.error('Error al calcular puntos acumulados');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCustomerId.trim()) {
      setSearchedCustomerId(searchCustomerId.trim());
    }
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const isLoading = statusLoading || statsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowsRightLeftIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Puntos Acumulados MLM</h1>
              </div>
              <p className="text-white/80 text-lg">
                Gestión de puntos acumulados de patrocinadores inactivos
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={handleCalculate}
                isLoading={calculateMutation.isPending}
                disabled={!activePeriodId}
              >
                Calcular Puntos Acumulados
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Periodo:</label>
              <SearchableSelect
                options={(periods || []).map((period) => ({
                  value: period.id,
                  label: `${period.name} (${period.status})`,
                }))}
                value={selectedPeriodId}
                onChange={setSelectedPeriodId}
                placeholder={currentPeriod ? `Actual: ${currentPeriod.name}` : 'Seleccionar periodo'}
                allLabel={currentPeriod ? `Actual: ${currentPeriod.name}` : 'Seleccionar periodo'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  {rolloverStatus ? (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(rolloverStatus.status)}`}>
                      {rolloverStatus.status === 'completed' ? 'Completado' :
                       rolloverStatus.status === 'processing' ? 'Procesando' : rolloverStatus.status}
                    </span>
                  ) : (
                    <p className="text-lg font-bold text-gray-400">Sin datos</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Procesados</p>
                  <p className="text-3xl font-bold text-[#3E667D]">
                    {formatNumber(rolloverStatus?.totalProcessed || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Puntos Acumulados</p>
                  <p className="text-3xl font-bold text-[#3E667D]">
                    {formatNumber(rolloverStatus?.totalRolledOver || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowsRightLeftIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Elegibles</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {formatNumber(rolloverStats?.totalEligible || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rollover Statistics Detail */}
        {rolloverStats && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas de Puntos Acumulados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Elegibles</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(rolloverStats.totalEligible)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Acumulados Aplicados</p>
                  <p className="text-2xl font-bold text-[#3E667D]">{formatNumber(rolloverStats.totalRolledOver)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Promedio Monto Acumulado</p>
                  <p className="text-2xl font-bold text-[#3E667D]">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
                      rolloverStats.averageRolloverAmount
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer History Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Historial por Distribuidor</h3>
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
              <Button variant="primary" type="submit">
                Buscar
              </Button>
            </form>

            {historyLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-gray-600">Cargando historial...</p>
              </div>
            ) : searchedCustomerId && rolloverHistory ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Periodo</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Patrocinador Original</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nuevo Patrocinador</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Razon</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolloverHistory.length > 0 ? (
                      rolloverHistory.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-700">{entry.periodId}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{entry.originalSponsorId}</td>
                          <td className="py-3 px-4 text-sm font-medium text-[#3E667D]">{entry.newSponsorId}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{entry.reason}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{formatDate(entry.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No se encontró historial de puntos acumulados para este distribuidor
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              !searchedCustomerId && (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Ingresa un ID de distribuidor para ver su historial de puntos acumulados</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Processing info */}
        {rolloverStatus?.processedAt && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <p className="text-sm text-gray-600">
                  Ultimo procesamiento: {formatDate(rolloverStatus.processedAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
