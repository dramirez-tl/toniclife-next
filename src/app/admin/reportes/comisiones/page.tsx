'use client';

import { useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  TrophyIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui';
import type { DistributorCommission, RankUp } from '@/types/reports';
import { useCommissionsReport, usePointsReport, useRankUpsReport } from '@/hooks/useReports';
import { useCommissionPeriods } from '@/hooks/useCommissions';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { exportToCsv, csvDateStamp } from '@/lib/csv-export';

type ViewMode = 'commissions' | 'points' | 'rank-ups';

const formatCurrency = (amount: number, currency: 'MXN' | 'USD' = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const getRankColor = (rank: string) => {
  switch (rank.toLowerCase()) {
    case 'diamante':
      return 'bg-purple-100 text-purple-800';
    case 'platino':
      return 'bg-gray-100 text-gray-800';
    case 'oro':
      return 'bg-yellow-100 text-yellow-800';
    case 'plata':
      return 'bg-slate-100 text-slate-800';
    case 'bronce':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function ComisionesReportesPage() {
  return (
    <Suspense>
      <ComisionesReportesContent />
    </Suspense>
  );
}

function ComisionesReportesContent() {
  const { get, setParams } = useQueryFilters({
    viewMode: 'commissions',
    status: 'all',
  });

  const viewMode = get('viewMode') as ViewMode;
  const selectedStatus = get('status') as 'pending' | 'approved' | 'paid' | 'all';
  const selectedPeriod = get('period');

  // Fetch periods - getPeriods() returns an array directly
  const { data: periodsData, isLoading: loadingPeriods } = useCommissionPeriods();
  const periods: any[] = Array.isArray(periodsData) ? periodsData : (periodsData as any)?.data ?? [];
  const currentPeriod = periods.find((p: any) => !p.isClosed) ?? periods[0];

  // Set default period once when data loads (useEffect, no en el render → evita loop).
  useEffect(() => {
    if (!selectedPeriod && currentPeriod?.id) {
      setParams({ period: currentPeriod.id });
    }
  }, [selectedPeriod, currentPeriod?.id, setParams]);

  const periodName =
    periods.find((p: any) => p.id === selectedPeriod)?.name || selectedPeriod || '';

  // Query params
  const commissionsQuery = {
    periodId: selectedPeriod,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  };

  // Fetch report data
  const { data: commissionsData, isLoading: loadingCommissions } = useCommissionsReport(commissionsQuery);
  const { data: pointsData, isLoading: loadingPoints } = usePointsReport({ periodId: selectedPeriod });
  const { data: rankUpsData, isLoading: loadingRankUps } = useRankUpsReport({ periodId: selectedPeriod });

  const isLoading = loadingPeriods ||
    (viewMode === 'commissions' && loadingCommissions) ||
    (viewMode === 'points' && loadingPoints) ||
    (viewMode === 'rank-ups' && loadingRankUps);

  // Data from API
  const commissionSummary = commissionsData?.summary;
  const distributorCommissions = commissionsData?.distributors ?? [];
  const pointsSummary = pointsData?.summary;
  const rankUps = rankUpsData?.rankUps ?? [];
  const totalRankUps = rankUpsData?.totalRankUps ?? 0;

  const commissionColumns = useMemo<DataTableColumn<DistributorCommission>[]>(() => [
    {
      key: 'distributor',
      header: 'Distribuidor',
      cellClassName: 'whitespace-nowrap',
      render: (distributor, index) => (
        <div className="flex items-center">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center justify-center mr-3">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">{distributor.customerName}</p>
            <p className="text-xs text-gray-500">{distributor.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'rank',
      header: 'Rango',
      headerClassName: 'text-center',
      cellClassName: 'whitespace-nowrap text-center',
      render: (distributor) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRankColor(distributor.rank)}`}>
          {distributor.rank}
        </span>
      ),
    },
    {
      key: 'grossMxn',
      header: 'Bruto MXN',
      headerClassName: 'text-right',
      cellClassName: 'whitespace-nowrap text-right text-sm text-gray-900',
      render: (distributor) => formatCurrency(distributor.grossAmountMxn),
    },
    {
      key: 'grossUsd',
      header: 'Bruto USD',
      headerClassName: 'text-right',
      cellClassName: 'whitespace-nowrap text-right text-sm text-gray-500',
      render: (distributor) => formatCurrency(distributor.grossAmountUsd, 'USD'),
    },
    {
      key: 'retentions',
      header: 'Retenciones',
      headerClassName: 'text-right',
      cellClassName: 'whitespace-nowrap text-right text-sm text-red-600',
      render: (distributor) => <>-{formatCurrency(distributor.retentions)}</>,
    },
    {
      key: 'netMxn',
      header: 'Neto MXN',
      headerClassName: 'text-right',
      cellClassName: 'whitespace-nowrap text-right text-sm font-medium text-green-600',
      render: (distributor) => formatCurrency(distributor.netAmountMxn),
    },
  ], []);

  const handleExport = () => {
    const slug = periodName.replace(/\s+/g, '_') || 'periodo';
    if (viewMode === 'commissions') {
      if (distributorCommissions.length === 0) {
        toast.error('No hay comisiones para exportar');
        return;
      }
      exportToCsv(
        `comisiones_${slug}_${csvDateStamp()}.csv`,
        ['Distribuidor', 'Email', 'Rango', 'Bruto MXN', 'Bruto USD', 'Retenciones', 'Neto MXN', 'Neto USD'],
        distributorCommissions.map((d) => [
          d.customerName,
          d.email,
          d.rank,
          d.grossAmountMxn,
          d.grossAmountUsd,
          d.retentions,
          d.netAmountMxn,
          d.netAmountUsd,
        ]),
      );
      toast.success('CSV de comisiones descargado');
    } else if (viewMode === 'rank-ups') {
      if (rankUps.length === 0) {
        toast.error('No hay subidas de rango para exportar');
        return;
      }
      exportToCsv(
        `subidas_rango_${slug}_${csvDateStamp()}.csv`,
        ['Distribuidor', 'Rango Anterior', 'Nuevo Rango', 'Fecha'],
        rankUps.map((r) => [
          r.customerName,
          r.previousRank,
          r.newRank,
          new Date(r.achievedAt).toLocaleDateString('es-MX'),
        ]),
      );
      toast.success('CSV de subidas de rango descargado');
    } else {
      if (!pointsSummary) {
        toast.error('No hay datos de puntos para exportar');
        return;
      }
      exportToCsv(
        `puntos_${slug}_${csvDateStamp()}.csv`,
        ['Métrica', 'Valor'],
        [
          ['Puntos personales', pointsSummary.totalPersonalPoints ?? 0],
          ['Puntos de grupo', pointsSummary.totalGroupPoints ?? 0],
          ['Business Value MXN', pointsSummary.totalBusinessValueMxn ?? 0],
          ['Distribuidores calificados', pointsSummary.qualifiedDistributors ?? 0],
        ],
      );
      toast.success('CSV de puntos descargado');
    }
  };

  const rankUpColumns = useMemo<DataTableColumn<RankUp>[]>(() => [
    {
      key: 'distributor',
      header: 'Distribuidor',
      cellClassName: 'whitespace-nowrap',
      render: (rankUp) => (
        <div className="flex items-center">
          <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="text-sm font-medium text-gray-900">{rankUp.customerName}</span>
        </div>
      ),
    },
    {
      key: 'previousRank',
      header: 'Rango Anterior',
      headerClassName: 'text-center',
      cellClassName: 'whitespace-nowrap text-center',
      render: (rankUp) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRankColor(rankUp.previousRank)}`}>
          {rankUp.previousRank}
        </span>
      ),
    },
    {
      key: 'newRank',
      header: 'Nuevo Rango',
      headerClassName: 'text-center',
      cellClassName: 'whitespace-nowrap text-center',
      render: (rankUp) => (
        <div className="flex items-center justify-center space-x-2">
          <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRankColor(rankUp.newRank)}`}>
            {rankUp.newRank}
          </span>
        </div>
      ),
    },
    {
      key: 'achievedAt',
      header: 'Fecha',
      headerClassName: 'text-center',
      cellClassName: 'whitespace-nowrap text-center text-sm text-gray-500',
      render: (rankUp) => new Date(rankUp.achievedAt).toLocaleDateString('es-MX'),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/reportes" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes MLM</h1>
            <p className="mt-1 text-sm text-gray-500">
              Comisiones, puntos y subidas de rango por periodo
            </p>
          </div>
        </div>
        <Button variant="success" onClick={handleExport}>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Periodo:</span>
              <SearchableSelect
                options={periods.map((period: any) => ({
                  value: period.id,
                  label: period.name,
                }))}
                value={selectedPeriod}
                onChange={(val) => setParams({ period: val })}
                showAllOption={false}
                placeholder={periods.length === 0 ? 'Cargando...' : 'Seleccionar periodo'}
                disabled={loadingPeriods}
              />
            </div>

            {viewMode === 'commissions' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Estado:</span>
                <SearchableSelect
                  options={[
                    { value: 'pending', label: 'Pendiente' },
                    { value: 'approved', label: 'Aprobado' },
                    { value: 'paid', label: 'Pagado' },
                  ]}
                  value={selectedStatus}
                  onChange={(val) => setParams({ status: val })}
                  allLabel="Todos"
                  allValue="all"
                />
              </div>
            )}

            <div className="flex rounded-lg bg-gray-100 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParams({ viewMode: 'commissions' })}
                className={
                  viewMode === 'commissions'
                    ? 'bg-white text-gray-900 shadow hover:bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }
              >
                <CurrencyDollarIcon className="mr-1 inline h-4 w-4" />
                Comisiones
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParams({ viewMode: 'points' })}
                className={
                  viewMode === 'points'
                    ? 'bg-white text-gray-900 shadow hover:bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }
              >
                <StarIcon className="mr-1 inline h-4 w-4" />
                Puntos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParams({ viewMode: 'rank-ups' })}
                className={
                  viewMode === 'rank-ups'
                    ? 'bg-white text-gray-900 shadow hover:bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }
              >
                <TrophyIcon className="mr-1 inline h-4 w-4" />
                Subidas de Rango
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards - Commissions */}
      {viewMode === 'commissions' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
                        <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Comisiones Brutas MXN</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatCurrency(commissionSummary?.totalGrossMxn ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
                        <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Comisiones Brutas USD</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatCurrency(commissionSummary?.totalGrossUsd ?? 0, 'USD')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-red-100 p-3">
                        <ChartBarIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Retenciones</p>
                        <p className="text-2xl font-semibold text-red-600">
                          {formatCurrency(commissionSummary?.totalRetentions ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3">
                        <UserGroupIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Distribuidores con Comisión</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {commissionSummary?.distributorsWithCommission ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commissions Table */}
              <div className="overflow-hidden rounded-lg bg-white shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Detalle de Comisiones</h3>
                </div>
                <DataTable<DistributorCommission>
                  columns={commissionColumns}
                  data={distributorCommissions}
                  getRowKey={(distributor, index) => String(distributor.customerId ?? index)}
                  emptyState={
                    <div className="py-12 text-center">
                      <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No hay comisiones para este periodo</p>
                    </div>
                  }
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Points Summary */}
      {viewMode === 'points' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-yellow-100 p-3">
                        <StarIcon className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Puntos Personales</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {(pointsSummary?.totalPersonalPoints ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3">
                        <UserGroupIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Puntos de Grupo</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {(pointsSummary?.totalGroupPoints ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
                        <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Business Value MXN</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatCurrency(pointsSummary?.totalBusinessValueMxn ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
                        <TrophyIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Distribuidores Calificados</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {pointsSummary?.qualifiedDistributors ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg bg-white shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Puntos por Periodo</h3>
                <p className="text-sm text-gray-500">
                  El detalle de puntos por distribuidor está disponible en el módulo de Comisiones
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* Rank-ups */}
      {viewMode === 'rank-ups' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3">
                        <TrophyIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Subidas de Rango</p>
                        <p className="text-2xl font-semibold text-gray-900">{totalRankUps}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg bg-white shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Subidas de Rango del Periodo</h3>
                </div>
                <DataTable<RankUp>
                  columns={rankUpColumns}
                  data={rankUps}
                  getRowKey={(rankUp, index) => String(rankUp.customerId ?? index)}
                  emptyState={
                    <div className="py-12 text-center">
                      <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No hay subidas de rango en este periodo</p>
                    </div>
                  }
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
