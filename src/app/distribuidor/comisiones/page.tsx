'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CommissionSummaryCards,
  CommissionTable,
  CommissionChart,
  CommissionPercentagesTable,
  CommissionBreakdown,
  RankProgressStepper,
} from '@/components/commissions';
import {
  useCustomerCommissions,
  useCurrentPeriod,
  useCommissionPeriods,
  periodsUpToCurrent,
  useCommissionTrends,
  useCommissionStructure,
  useCommissionLevelBreakdown,
} from '@/hooks/useCommissions';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { CommissionType, CommissionStatus } from '@/types/commissions';
import { generateCommissionStatementPdf } from '@/lib/generate-commission-statement-pdf';
import {
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  FunnelIcon,
  SparklesIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { toast } from 'sonner';

type ViewMode = 'summary' | 'table' | 'chart' | 'structure';

export default function ComisionesPage() {
  return <Suspense><ComisionesContent /></Suspense>;
}

function ComisionesContent() {
  const t = useTranslations('distributor.commissions.page');
  const user = useAppSelector(selectUser);

  const currencyCode = user?.currencyCode || 'MXN';
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { get, setParams } = useQueryFilters({
    type: 'all',
    status: 'all',
    viewMode: 'summary',
  });

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const filterType = get('type') as CommissionType | 'all';
  const filterStatus = get('status') as CommissionStatus | 'all';
  const viewMode = get('viewMode') as ViewMode;

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
  const { data: trends } = useCommissionTrends(user?.customerId || '', 6);
  const { data: commissionStructure } = useCommissionStructure(
    user?.customerId || '',
    !!user?.customerId && !!selectedPeriodId,
    selectedPeriodId || undefined,
  );
  const { data: levelBreakdown } = useCommissionLevelBreakdown(
    user?.customerId || '',
    selectedPeriodId || '',
    !!user?.customerId && !!selectedPeriodId,
  );

  // Estado de cuenta: PDF generado 100% del lado del cliente desde los datos
  // del periodo ya cargados (no requiere endpoint de backend).
  const handleDownloadStatement = () => {
    if (!commissionsData?.summary) {
      toast.error(t('toastNoData'));
      return;
    }
    try {
      generateCommissionStatementPdf({
        distributorName:
          [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
          'Distribuidor',
        distributorCode: null,
        periodName: currentPeriod?.name || 'Periodo',
        currencyCode,
        summary: commissionsData.summary,
        commissions: commissionsData.data || [],
        generatedAt: new Date(),
      });
      toast.success(t('toastStatementDownloaded'));
    } catch {
      toast.error(t('toastStatementError'));
    }
  };

  const handleRefresh = () => {
    refetchCommissions();
    toast.success(t('toastRefreshed'));
  };

  // Get current period name for display
  // periodsData is an array from getPeriods()
  const periodsArray = Array.isArray(periodsData) ? periodsData : (periodsData as any)?.data ?? [];
  // Ordenar descendente: los más recientes primero, los más viejos al final.
  // El id es UUID (no cronológico), así que ordenamos por startDate y, si no
  // existe, por periodNumber (ambos descendentes).
  const sortedPeriods = [...periodsArray].sort((a: any, b: any) => {
    const ad = String(a?.startDate ?? a?.start_date ?? '');
    const bd = String(b?.startDate ?? b?.start_date ?? '');
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);
    return Number(b?.periodNumber ?? b?.period_number ?? 0) - Number(a?.periodNumber ?? a?.period_number ?? 0);
  });
  const currentPeriod = periodsArray.find((p: any) => p.id === selectedPeriodId);
  // Periodo en curso (abierto): las comisiones aún no son finales, así que se
  // ocultan los montos hasta el cierre; solo se muestran en periodos pasados.
  const isActivePeriod = currentPeriod?.status === 'open';
  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all';

  // Comisión del PERIODO ANTERIOR: en el periodo en curso el empty-state
  // muestra lo del último cierre (las del actual no existen hasta cerrar).
  // sortedPeriods va descendente → el anterior es el siguiente en la lista.
  const selectedIdx = sortedPeriods.findIndex(
    (p: any) => p?.id === selectedPeriodId,
  );
  const prevPeriod = selectedIdx >= 0 ? sortedPeriods[selectedIdx + 1] : undefined;
  const { data: prevCommissionsData } = useCustomerCommissions(
    user?.customerId || '',
    { periodId: prevPeriod?.id },
    !!user?.customerId && !!prevPeriod?.id && isActivePeriod,
  );
  const prevSummaryNet = prevCommissionsData?.summary
    ? parseFloat(prevCommissionsData.summary.totalNetMxn || '0')
    : null;

  // Porcentajes reales por nivel (panel "Consejo Pro"), no hardcodeados.
  const fmtPct = (v?: string) => `${Math.round(parseFloat(v || '0') * 100)}%`;
  const topLevels = [...(commissionStructure?.levels ?? [])]
    .sort((a, b) => (a.levelNumber ?? 0) - (b.levelNumber ?? 0))
    .slice(0, 3);
  const level1 = topLevels.find((l) => l.levelNumber === 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header - Rediseñado con mejor visual */}
      <div className="relative overflow-hidden">
        {/* Fondo con patrón decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3E667D] via-[#4d7a8f] to-[#3E667D]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C8DDF2] rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/distribuidor" className="hover:text-white transition-colors">
              {t('breadcrumbHome')}
            </Link>
            <span>/</span>
            <span className="text-white">{t('breadcrumbCurrent')}</span>
          </nav>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <BanknotesIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                    {t('title')}
                  </h1>
                  <p className="text-white/70 text-sm lg:text-base mt-0.5">
                    {t('subtitle')}
                  </p>
                </div>
              </div>

              {/* Quick stats en el header. En periodo en curso se ocultan los
                  montos (se calculan al cierre); solo se ven en periodos pasados. */}
              {isActivePeriod ? (
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                    <CalendarDaysIcon className="h-4 w-4 text-white/80" />
                    <span className="text-white/80 text-sm">{t('calculatedAtClose')}</span>
                  </div>
                </div>
              ) : commissionsData?.summary && (
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                    <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
                    <span className="text-white/80 text-sm">{t('totalNet')}</span>
                    <span className="text-white font-bold">
                      {new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'es-MX', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(commissionsData.summary.totalNetMxn))}
                    </span>
                    <span className="text-[10px] font-semibold bg-white/20 text-white/80 px-1.5 py-0.5 rounded">{currencyCode}</span>
                  </div>
                  {parseFloat(commissionsData.summary.totalRetentions) > 0 && (
                    <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-400/30">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-yellow-400" />
                      <span className="text-white/80 text-sm">{t('retentions')}</span>
                      <span className="text-yellow-300 font-bold">
                        {new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'es-MX', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(commissionsData.summary.totalRetentions))}
                      </span>
                      <span className="text-[10px] font-semibold bg-yellow-400/30 text-yellow-200 px-1.5 py-0.5 rounded">{currencyCode}</span>
                    </div>
                  )}
                  {/* Retención por convenio con la empresa (Tesorería). */}
                  {parseFloat(commissionsData.summary.companyWithholdings || '0') > 0 && (
                    <div className="flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-orange-400/30">
                      <BanknotesIcon className="h-4 w-4 text-orange-300" />
                      <span className="text-white/80 text-sm">{t('companyWithholding')}</span>
                      <span className="text-orange-300 font-bold">
                        -{new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'es-MX', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(commissionsData.summary.companyWithholdings || '0'))}
                      </span>
                      <span className="text-[10px] font-semibold bg-orange-400/30 text-orange-200 px-1.5 py-0.5 rounded">{currencyCode}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Acción: descargar estado de cuenta (PDF, client-side) */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleDownloadStatement}
                disabled={!commissionsData?.summary || isLoadingCommissions || isActivePeriod}
                className="bg-white text-[#3E667D] hover:bg-white/90 shadow-lg shadow-black/10 disabled:opacity-60"
                title={isActivePeriod ? t('downloadStatementTitleActive') : t('downloadStatementTitle')}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {t('downloadStatement')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 -mt-4">
        {/* Filters Bar - Rediseñada */}
        <Card className="mb-6 shadow-lg shadow-gray-200/50 border-0">
          <CardContent className="p-0">
            {/* Main filter row */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between p-4 bg-white">
              {/* Left: Period selector prominente */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gradient-to-r from-[#3E667D]/5 to-[#3E667D]/10 rounded-xl px-4 py-2.5 border border-[#3E667D]/10">
                  <CalendarDaysIcon className="h-5 w-5 text-[#3E667D]" />
                  <SearchableSelect
                    options={periodsUpToCurrent(sortedPeriods).map((period: any) => ({
                      value: period.id,
                      label: period.isCurrent ? t('periodCurrent', { name: period.name }) : period.name,
                    }))}
                    value={selectedPeriodId}
                    onChange={setSelectedPeriodId}
                    showAllOption={false}
                  />
                </div>

                {/* Botón de filtros */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                    showFilters || hasActiveFilters
                      ? 'bg-[#C8DDF2]/10 border-[#a7c1e2]/30 text-[#3E667D]'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FunnelIcon className="h-4 w-4" />
                  <span>{t('filters')}</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 bg-[#C8DDF2] rounded-full animate-pulse" />
                  )}
                </button>
              </div>

              {/* Right: View mode & Actions */}
              <div className="flex gap-3 items-center">
                {/* View mode toggle - Mejorado */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setParams({ viewMode: 'summary' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'summary'
                        ? 'bg-white text-[#3E667D] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('viewSummary')}</span>
                  </button>
                  {/* Detalle y Tendencia ocultos temporalmente (a peticion): solo
                      "Resumen" visible. Para restaurar, descomentar estos dos
                      botones y reimportar TableCellsIcon de @heroicons.
                  <button
                    onClick={() => setParams({ viewMode: 'table' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-[#3E667D] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <TableCellsIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Detalle</span>
                  </button>
                  <button
                    onClick={() => setParams({ viewMode: 'chart' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'chart'
                        ? 'bg-white text-[#3E667D] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Tendencia</span>
                  </button>
                  */}
                </div>

                <button
                  onClick={handleRefresh}
                  className="p-2.5 text-gray-500 hover:text-[#3E667D] hover:bg-[#3E667D]/5 rounded-xl transition-all"
                  title={t('refreshData')}
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
                      {t('filterTypeLabel')}
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'mlm', label: t('typeMlm') },
                        { value: 'cedea_bonus', label: t('typeCedea') },
                        { value: 'auto_bonus', label: t('typeAutoBonus') },
                        { value: 'adjustment', label: t('typeAdjustment') },
                      ]}
                      value={filterType}
                      onChange={(val) => setParams({ type: val })}
                      allLabel={t('typeAll')}
                      allValue="all"
                      className="min-w-[180px]"
                    />
                  </div>

                  {/* Status filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {t('filterStatusLabel')}
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'paid', label: t('statusPaid') },
                        { value: 'approved', label: t('statusApproved') },
                        { value: 'calculated', label: t('statusCalculated') },
                      ]}
                      value={filterStatus}
                      onChange={(val) => setParams({ status: val })}
                      allLabel={t('statusAll')}
                      allValue="all"
                      className="min-w-[160px]"
                    />
                  </div>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setParams({ type: null, status: null });
                        }}
                        className="px-4 py-2.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        {t('clearFilters')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rank progression stepper - Prominente arriba */}
        {commissionStructure?.ranks && commissionStructure.ranks.length > 0 && (
          <div className="mb-6">
            <RankProgressStepper
              ranks={commissionStructure.ranks}
              currentRankNumber={commissionStructure.userRankNumber ?? 1}
              currencyCode={currencyCode}
            />
          </div>
        )}

        {/* Content based on view mode. En periodo EN CURSO se muestra el mensaje
            "al cierre" SIN importar el viewMode (table/chart no se renderizan, ni
            siquiera forzando ?viewMode= por URL), para no filtrar montos. */}
        {(isActivePeriod || viewMode === 'summary') && (
          isActivePeriod ? (
            <Card className="border-0 shadow-md">
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3E667D]/10">
                  <CalendarDaysIcon className="h-7 w-7 text-[#3E667D]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t('closedPeriodTitle')}
                </h3>
                <p className="max-w-md text-sm text-gray-500">
                  {t('closedPeriodBody', { period: currentPeriod?.name ?? t('thisPeriod') })}
                </p>
                {/* Lo COBRADO del último cierre, para dar contexto mientras
                    corre el periodo actual. */}
                {prevSummaryNet != null && prevPeriod && (
                  <div className="mt-1 flex items-center gap-2 rounded-full bg-[#3E667D]/10 px-4 py-2">
                    <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
                    <span className="text-sm text-gray-600">
                      {t('prevPeriodTotal', { period: prevPeriod?.name ?? '' })}
                    </span>
                    <span className="text-base font-bold text-[#3E667D]">
                      {new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'es-MX', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(prevSummaryNet)}
                    </span>
                    <span className="text-[10px] font-semibold bg-[#3E667D]/15 text-[#3E667D] px-1.5 py-0.5 rounded">{currencyCode}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <CommissionSummaryCards
                summary={commissionsData?.summary || null}
                isLoading={isLoadingCommissions}
                currencyCode={user?.currencyCode}
                isActivePeriod={false}
              />
              {!isLoadingCommissions && commissionsData?.summary && (
                <CommissionBreakdown
                  summary={commissionsData.summary}
                  structure={commissionStructure ?? null}
                  levelBreakdown={levelBreakdown ?? null}
                  currencyCode={currencyCode}
                  isActivePeriod={false}
                />
              )}
            </div>
          )
        )}

        {viewMode === 'table' && !isActivePeriod && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('historyTitle')}
                </h2>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showTaxDetails}
                    onChange={(e) => setShowTaxDetails(e.target.checked)}
                    className="rounded border-gray-300 text-[#3E667D] focus:ring-[#a7c1e2]"
                  />
                  {t('showTaxDetails')}
                </label>
              </div>

              {isLoadingCommissions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]"></div>
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

        {viewMode === 'chart' && !isActivePeriod && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {t('trendTitle')}
              </h2>
              {trends && trends.length > 0 ? (
                <CommissionChart data={trends} height={350} />
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  {t('noTrendData')}
                </div>
              )}
            </CardContent>
          </Card>
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
            <div className="relative bg-gradient-to-br from-[#3E667D] via-[#2f5165] to-[#3E667D] text-white">
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
                      <span>{t('proTipBadge')}</span>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold mb-4 tracking-tight">
                      {t('proTipTitle')}
                    </h3>
                    <p className="text-white/85 text-base lg:text-lg leading-relaxed">
                      {t.rich('proTipBody', {
                        strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                      })}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-8">
                      <Link href="/distribuidor/red">
                        <Button
                          variant="secondary"
                          size="lg"
                          className="bg-white text-[#3E667D] hover:bg-white/90 shadow-lg shadow-black/10"
                        >
                          <UserGroupIcon className="h-5 w-5 mr-2" />
                          {t('viewMyNetwork')}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Stats highlight — porcentajes reales por nivel */}
                  <div className="lg:w-72">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <p className="text-white/70 text-sm uppercase tracking-wide mb-4">{t('yourPercentages')}</p>
                      {topLevels.length > 0 ? (
                        <div className="space-y-4">
                          {topLevels.map((lvl) => (
                            <div key={lvl.levelNumber} className="flex items-center justify-between">
                              <span className="text-white/80">
                                {lvl.levelNumber === 1
                                  ? t('levelDirect', { n: lvl.levelNumber })
                                  : t('level', { n: lvl.levelNumber })}
                              </span>
                              <span className="font-bold">{fmtPct(lvl.basePercentage)}</span>
                            </div>
                          ))}
                          {level1?.upgradedPercentage &&
                            parseFloat(level1.upgradedPercentage) >
                              parseFloat(level1.basePercentage) && (
                              <div className="flex items-center justify-between">
                                <span className="text-white/80">
                                  {t('levelWithQualifiers', { count: level1.qualifiersRequired ?? 5 })}
                                </span>
                                <span className="font-bold text-yellow-300">
                                  {fmtPct(level1.upgradedPercentage)}
                                </span>
                              </div>
                            )}
                          <div className="pt-4 border-t border-white/20">
                            <p className="text-xs text-white/60">
                              {t('percentagesFootnote')}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-white/70">
                          {t('percentagesFallback')}
                        </p>
                      )}
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
