'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CommissionSummaryCards,
  CommissionTable,
  CommissionChart,
  CommissionPercentagesTable,
  RankProgressStepper,
} from '@/components/commissions';
import {
  useCustomerCommissions,
  useCurrentPeriod,
  useCommissionPeriods,
  useCommissionProjection,
  useCommissionTrends,
  useCommissionStructure,
  useRequestPayment,
  useDownloadStatement,
} from '@/hooks/useCommissions';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { Commission, CommissionType, CommissionStatus } from '@/types/commissions';
import {
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  TableCellsIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  FunnelIcon,
  SparklesIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

type ViewMode = 'summary' | 'table' | 'chart' | 'structure';

export default function ComisionesPage() {
  const user = useAppSelector(selectUser);

  const currencyCode = user?.currencyCode || 'MXN';
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [filterType, setFilterType] = useState<CommissionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<CommissionStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Obtener periodo actual para default
  const { data: currentPeriodData } = useCurrentPeriod();

  useEffect(() => {
    if (currentPeriodData?.id && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriodData.id);
    }
  }, [currentPeriodData, selectedPeriodId]);

  // React Query hooks
  const { data: periodsData } = useCommissionPeriods();
  const {
    data: commissionsData,
    isLoading: isLoadingCommissions,
    refetch: refetchCommissions,
  } = useCustomerCommissions(
    user?.customerId || '',
    {
      periodId: selectedPeriodId || undefined,
      commissionType: filterType !== 'all' ? filterType : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    },
    !!user?.customerId && !!selectedPeriodId,
  );
  const { data: projection } = useCommissionProjection();
  const { data: trends } = useCommissionTrends(6);
  const { data: commissionStructure } = useCommissionStructure(
    user?.customerId || '',
    !!user?.customerId,
  );

  const requestPaymentMutation = useRequestPayment();
  const downloadStatementMutation = useDownloadStatement();

  const handleDownloadStatement = async () => {
    try {
      await downloadStatementMutation.mutateAsync(selectedPeriodId);
      toast.success('Estado de cuenta descargado');
    } catch {
      toast.error('Error al descargar el estado de cuenta');
    }
  };

  const handleRequestPayment = async () => {
    if (!commissionsData) return;

    const pendingIds = commissionsData.data
      .filter((c: Commission) => c.status === 'approved' || c.status === 'calculated')
      .map((c: Commission) => c.id);

    if (pendingIds.length === 0) {
      toast.info('No hay comisiones pendientes de pago');
      return;
    }

    try {
      const result = await requestPaymentMutation.mutateAsync(pendingIds);
      toast.success(result.message);
    } catch {
      toast.error('Error al solicitar el pago');
    }
  };

  const handleRefresh = () => {
    refetchCommissions();
    toast.success('Datos actualizados');
  };

  // Get current period name for display
  // periodsData is an array from getPeriods()
  const periodsArray = Array.isArray(periodsData) ? periodsData : (periodsData as any)?.data ?? [];
  const currentPeriod = periodsArray.find((p: any) => p.id === selectedPeriodId);
  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header - Rediseñado con mejor visual */}
      <div className="relative overflow-hidden">
        {/* Fondo con patrón decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003B7A] via-[#004d99] to-[#003B7A]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7AB82E] rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/distribuidor" className="hover:text-white transition-colors">
              Panel Principal
            </Link>
            <span>/</span>
            <span className="text-white">Comisiones</span>
          </nav>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <BanknotesIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                    Comisiones
                  </h1>
                  <p className="text-white/70 text-sm lg:text-base mt-0.5">
                    Gestiona y visualiza todas tus ganancias
                  </p>
                </div>
              </div>

              {/* Quick stats en el header */}
              {commissionsData?.summary && (
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                    <SparklesIcon className="h-4 w-4 text-[#7AB82E]" />
                    <span className="text-white/80 text-sm">Total Neto:</span>
                    <span className="text-white font-bold">
                      {new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'es-MX', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(commissionsData.summary.totalNetMxn))}
                    </span>
                    <span className="text-[10px] font-semibold bg-white/20 text-white/80 px-1.5 py-0.5 rounded">{currencyCode}</span>
                  </div>
                  {parseFloat(commissionsData.summary.totalRetentions) > 0 && (
                    <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-400/30">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-yellow-400" />
                      <span className="text-white/80 text-sm">Retenciones:</span>
                      <span className="text-yellow-300 font-bold">
                        {new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'es-MX', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(commissionsData.summary.totalRetentions))}
                      </span>
                      <span className="text-[10px] font-semibold bg-yellow-400/30 text-yellow-200 px-1.5 py-0.5 rounded">{currencyCode}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                onClick={handleDownloadStatement}
                disabled={downloadStatementMutation.isPending}
              >
                {downloadStatementMutation.isPending ? 'Descargando...' : 'Estado de cuenta'}
              </Button>
              {commissionsData?.summary && commissionsData.data.some((c: Commission) => c.status === 'approved' || c.status === 'calculated') && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#7AB82E] hover:bg-[#6aa025] shadow-lg shadow-[#7AB82E]/30"
                  onClick={handleRequestPayment}
                  disabled={requestPaymentMutation.isPending}
                >
                  {requestPaymentMutation.isPending ? 'Procesando...' : 'Solicitar Pago'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 -mt-4">
        {/* Filters Bar - Rediseñada */}
        <Card className="mb-6 shadow-lg shadow-gray-200/50 border-0 overflow-hidden">
          <CardContent className="p-0">
            {/* Main filter row */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between p-4 bg-white">
              {/* Left: Period selector prominente */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gradient-to-r from-[#003B7A]/5 to-[#003B7A]/10 rounded-xl px-4 py-2.5 border border-[#003B7A]/10">
                  <CalendarDaysIcon className="h-5 w-5 text-[#003B7A]" />
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="bg-transparent border-0 focus:ring-0 text-[#003B7A] font-semibold text-sm cursor-pointer pr-8"
                  >
                    {periodsArray.map((period: any) => (
                      <option key={period.id} value={period.id}>
                        {period.name}
                        {period.status === 'open' && ' (Actual)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botón de filtros */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                    showFilters || hasActiveFilters
                      ? 'bg-[#7AB82E]/10 border-[#7AB82E]/30 text-[#7AB82E]'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FunnelIcon className="h-4 w-4" />
                  <span>Filtros</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 bg-[#7AB82E] rounded-full animate-pulse" />
                  )}
                </button>
              </div>

              {/* Right: View mode & Actions */}
              <div className="flex gap-3 items-center">
                {/* View mode toggle - Mejorado */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('summary')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'summary'
                        ? 'bg-white text-[#003B7A] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Resumen</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-[#003B7A] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <TableCellsIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Detalle</span>
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'chart'
                        ? 'bg-white text-[#003B7A] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Tendencia</span>
                  </button>
                </div>

                <button
                  onClick={handleRefresh}
                  className="p-2.5 text-gray-500 hover:text-[#003B7A] hover:bg-[#003B7A]/5 rounded-xl transition-all"
                  title="Actualizar datos"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filtros expandibles */}
            {showFilters && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/50">
                <div className="flex flex-wrap gap-3 pt-4">
                  {/* Type filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Tipo de comisión
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as CommissionType | 'all')}
                      className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent text-sm min-w-[180px]"
                    >
                      <option value="all">Todos los tipos</option>
                      <option value="mlm">Comisiones MLM</option>
                      <option value="cedea_bonus">Bonos CEDEA</option>
                      <option value="auto_bonus">Bonos Automaticos</option>
                      <option value="adjustment">Ajustes</option>
                    </select>
                  </div>

                  {/* Status filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Estado
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as CommissionStatus | 'all')}
                      className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent text-sm min-w-[160px]"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="paid">Pagadas</option>
                      <option value="approved">Aprobadas</option>
                      <option value="calculated">Calculadas</option>
                    </select>
                  </div>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setFilterType('all');
                          setFilterStatus('all');
                        }}
                        className="px-4 py-2.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content based on view mode */}
        {viewMode === 'summary' && (
          <CommissionSummaryCards
            summary={commissionsData?.summary || null}
            isLoading={isLoadingCommissions}
            currencyCode={user?.currencyCode}
          />
        )}

        {viewMode === 'table' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Historial de Comisiones
                </h2>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showTaxDetails}
                    onChange={(e) => setShowTaxDetails(e.target.checked)}
                    className="rounded border-gray-300 text-[#7AB82E] focus:ring-[#7AB82E]"
                  />
                  Mostrar detalles de impuestos
                </label>
              </div>

              {isLoadingCommissions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003B7A]"></div>
                </div>
              ) : (
                <CommissionTable
                  commissions={commissionsData?.data || []}
                  showTaxDetails={showTaxDetails}
                  currencyCode={currencyCode}
                />
              )}
            </CardContent>
          </Card>
        )}

        {viewMode === 'chart' && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Tendencia de Comisiones (Últimos 6 meses)
              </h2>
              {trends && trends.length > 0 ? (
                <CommissionChart data={trends} height={350} />
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  No hay datos de tendencia disponibles
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rank progression stepper */}
        {commissionStructure?.ranks && commissionStructure.ranks.length > 0 && (
          <div className="mt-8">
            <RankProgressStepper
              ranks={commissionStructure.ranks}
              currentRankNumber={commissionStructure.userRankNumber ?? 1}
              currencyCode={currencyCode}
            />
          </div>
        )}

        {/* Commission structure tables */}
        {commissionStructure && (
          <div className="mt-6">
            <CommissionPercentagesTable
              structure={commissionStructure}
            />
          </div>
        )}

        {/* Help CTA - Rediseñado */}
        <Card className="mt-8 overflow-hidden border-0 shadow-xl">
          <CardContent className="p-0">
            <div className="relative bg-gradient-to-br from-[#7AB82E] via-[#6aa025] to-[#5a8a20] text-white">
              {/* Decorative pattern */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-black/5 rounded-full blur-2xl" />
                {/* Pattern dots */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
                }} />
              </div>

              <div className="relative p-6 lg:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex-1 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                      <SparklesIcon className="h-4 w-4" />
                      <span>Consejo Pro</span>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold mb-4 tracking-tight">
                      Maximiza tus Comisiones
                    </h3>
                    <p className="text-white/85 text-base lg:text-lg leading-relaxed">
                      Ayuda a tus distribuidores a calificar <span className="font-semibold">(≥3,300 puntos)</span> para desbloquear porcentajes aumentados.
                      ¡Cada distribuidor calificado adicional aumenta tus ganancias en todos los niveles!
                    </p>

                    <div className="flex flex-wrap gap-4 mt-8">
                      <Link href="/distribuidor/red">
                        <Button
                          variant="secondary"
                          size="lg"
                          className="bg-white text-[#7AB82E] hover:bg-white/90 shadow-lg shadow-black/10"
                        >
                          <UserGroupIcon className="h-5 w-5 mr-2" />
                          Ver Mi Red
                        </Button>
                      </Link>
                      <Link href="/distribuidor/metas">
                        <Button
                          variant="outline"
                          size="lg"
                          className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                        >
                          <ChartBarIcon className="h-5 w-5 mr-2" />
                          Ver Mis Metas
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Stats highlight */}
                  <div className="lg:w-72">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <p className="text-white/70 text-sm uppercase tracking-wide mb-4">Potencial de Ganancias</p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white/80">1 calificado</span>
                          <span className="font-bold">+5%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/80">3 calificados</span>
                          <span className="font-bold">+15%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/80">5+ calificados</span>
                          <span className="font-bold text-yellow-300">+25%</span>
                        </div>
                        <div className="pt-4 border-t border-white/20">
                          <p className="text-xs text-white/60">
                            Porcentajes adicionales sobre tu comisión base
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
