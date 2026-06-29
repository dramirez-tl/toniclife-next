// components/commissions/CommissionSummaryCards.tsx
'use client';

import { useTranslations } from 'next-intl';
import { CommissionSummary } from '@/types/commissions';
import { Card, CardContent } from '@/components/ui/card';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  TrophyIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

interface SummaryCardsProps {
  summary: CommissionSummary | null;
  isLoading?: boolean;
  currencyCode?: string;
  isActivePeriod?: boolean;
}

export function CommissionSummaryCards({ summary, isLoading, currencyCode = 'MXN', isActivePeriod }: SummaryCardsProps) {
  const t = useTranslations('distributor.commissions.summaryCards');
  const isUsd = currencyCode === 'USD';
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(isUsd ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: currencyCode || 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const Badge = ({ light }: { light?: boolean }) => (
    <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1 ${
      light ? 'bg-white/20 text-white/80' : 'bg-gray-100 text-gray-500'
    }`}>
      {currencyCode}
    </span>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Main card skeleton */}
        <div className="animate-pulse bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl h-40" />
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl p-6 shadow-sm">
              <div className="h-10 w-10 bg-gray-200 rounded-xl mb-4" />
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const totalNet = parseFloat(summary.totalNetMxn);
  const totalSubtotal = parseFloat(summary.totalSubtotalMxn);
  const mlmAmount = parseFloat(summary.mlmCommissionsMxn);
  const cedeaAmount = parseFloat(summary.cedeaBonusesMxn);
  const autoAmount = parseFloat(summary.autoBonusesMxn);
  const personalSales = parseFloat(summary.personalSales || '0');
  const networkGroupPoints = parseFloat(summary.networkGroupPoints || '0');

  // Calculate percentage of each type
  const mlmPercent = totalNet > 0 ? ((mlmAmount / totalNet) * 100).toFixed(0) : 0;
  const cedeaPercent = totalNet > 0 ? ((cedeaAmount / totalNet) * 100).toFixed(0) : 0;
  const autoPercent = totalNet > 0 ? ((autoAmount / totalNet) * 100).toFixed(0) : 0;

  // Bonos por generación: mostrar la tarjeta únicamente si hay monto (rango Plata+).
  const showCedea = cedeaAmount > 0;

  return (
    <div className="space-y-6">
      {/* Hero Card - Total del Periodo */}
      <Card className="overflow-hidden border-0 shadow-xl shadow-[#3E667D]/10">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-[#3E667D] via-[#2f5165] to-[#3E667D] text-white">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
            </div>

            <div className="relative p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left - Main info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <BanknotesIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-medium">
                        {isActivePeriod ? t('activePeriod') : t('yourPeriodBalance')}
                      </p>
                      {isActivePeriod && totalNet === 0 ? (
                        <div>
                          <p className="text-2xl lg:text-3xl font-bold tracking-tight text-white/90 mt-1">
                            {t('inProgress')}
                          </p>
                          <p className="text-white/50 text-sm mt-1">
                            {t('balanceAtClose')}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-2">
                            <p className="text-4xl lg:text-5xl font-bold tracking-tight">
                              {formatCurrency(summary.totalNetMxn)}
                            </p>
                            <span className="text-white/60 text-sm">{currencyCode}</span>
                          </div>
                          <p className="text-white/75 text-xs mt-1">
                            {t('netHint')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary info */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-white/70">{t('grossBeforeTaxes')}</span>
                      <span className="text-white font-medium">
                        {formatCurrency(summary.totalSubtotalMxn)}<Badge light />
                      </span>
                    </div>
                    {parseFloat(summary.totalIva || '0') > 0 && (
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/70">{t('iva')}</span>
                        <span className="text-white font-medium">
                          +{formatCurrency(summary.totalIva || '0')}<Badge light />
                        </span>
                      </div>
                    )}
                    {parseFloat(summary.totalIvaWithholding || '0') > 0 && (
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/70">{t('ivaWithholding')}</span>
                        <span className="text-white font-medium">
                          -{formatCurrency(summary.totalIvaWithholding || '0')}<Badge light />
                        </span>
                      </div>
                    )}
                    {parseFloat(summary.totalIsr || '0') > 0 && (
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/70">{t('isr')}</span>
                        <span className="text-white font-medium">
                          -{formatCurrency(summary.totalIsr || '0')}<Badge light />
                        </span>
                      </div>
                    )}
                    {parseFloat(summary.totalResico || '0') > 0 && (
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/70">{t('resico')}</span>
                        <span className="text-white font-medium">
                          -{formatCurrency(summary.totalResico || '0')}<Badge light />
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-white/20 pt-2.5 mt-2.5">
                      <span className="text-sm font-semibold text-white">{t('netToDeposit')}</span>
                      <span className="text-lg font-bold text-white">
                        {formatCurrency(summary.totalNetMxn)}<Badge light />
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60 mt-2">
                      <span>{t('transactions', { count: summary.transactionCount })}</span>
                    </div>
                  </div>
                </div>

                {/* Right - Quick stats */}
                <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                  <div className="flex-1 lg:flex-none bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <BanknotesIcon className="h-8 w-8 text-white" />
                      <div>
                        <p className="text-white/70 text-xs uppercase tracking-wide">{t('grossCommission')}</p>
                        <p className="text-xl font-bold">{formatCurrency(summary.totalSubtotalMxn)}<Badge light /></p>
                        <p className="text-white/50 text-[10px]">{t('beforeIvaAndRetentions')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 lg:flex-none bg-yellow-400/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/30">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-8 w-8 text-yellow-300" />
                      <div>
                        <p className="text-yellow-200/80 text-xs uppercase tracking-wide">{t('breakdown')}</p>
                        <div className="mt-1 space-y-0.5">
                          {parseFloat(summary.totalIva || '0') > 0 && (
                            <p className="text-sm font-semibold text-green-300">{t('breakdownIva', { amount: formatCurrency(summary.totalIva || '0') })}</p>
                          )}
                          {parseFloat(summary.totalIvaWithholding || '0') > 0 && (
                            <p className="text-sm font-semibold text-yellow-100">{t('breakdownIvaWithholding', { amount: formatCurrency(summary.totalIvaWithholding || '0') })}</p>
                          )}
                          {parseFloat(summary.totalIsr || '0') > 0 && (
                            <p className="text-sm font-semibold text-yellow-100">{t('breakdownIsr', { amount: formatCurrency(summary.totalIsr || '0') })}</p>
                          )}
                          {parseFloat(summary.totalResico || '0') > 0 && (
                            <p className="text-sm font-semibold text-yellow-100">{t('breakdownResico', { amount: formatCurrency(summary.totalResico || '0') })}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Volume Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Sales */}
        <Card className="group hover:shadow-lg hover:shadow-[#3E667D]/10 transition-all duration-300 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#abc9ba] to-[#3E667D] rounded-xl flex items-center justify-center shadow-lg shadow-[#3E667D]/30 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBagIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">{t('personalSales')}</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(personalSales)}<Badge />
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <ShoppingBagIcon className="h-3.5 w-3.5 text-[#3E667D]" />
                  {t('personalSalesHint')}
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#abc9ba] to-[#3E667D]" />
          </CardContent>
        </Card>

        {/* Network Sales Volume */}
        <Card className="group hover:shadow-lg hover:shadow-[#3E667D]/10 transition-all duration-300 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3E667D] to-[#4d7a8f] rounded-xl flex items-center justify-center shadow-lg shadow-[#3E667D]/30 group-hover:scale-110 transition-transform duration-300">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">{t('networkPoints')}</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {networkGroupPoints.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                <span className="text-base font-semibold text-gray-400 ml-1">{t('pts')}</span>
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <UserGroupIcon className="h-3.5 w-3.5 text-[#3E667D]" />
                  {t('networkPointsHint')}
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#3E667D] to-[#4d7a8f]" />
          </CardContent>
        </Card>
      </div>

      {/* Commission Types Grid */}
      <div className={`grid grid-cols-1 gap-4 ${showCedea ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* MLM Commissions */}
        <Card className="group hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                  {mlmPercent}%
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">{t('mlmCommissions')}</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(summary.mlmCommissionsMxn)}<Badge />
              </p>
            </div>
            {/* Bottom accent */}
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          </CardContent>
        </Card>

        {/* Bonos por generación — solo si hay monto (rango Plata o superior) */}
        {showCedea && (
        <Card className="group hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30 group-hover:scale-110 transition-transform duration-300">
                  <TrophyIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                  {cedeaPercent}%
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">{t('generationBonuses')}</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(summary.cedeaBonusesMxn)}<Badge />
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <TrophyIcon className="h-3.5 w-3.5 text-yellow-500" />
                  {t('generationBonusHint')}
                </p>
              </div>
            </div>
            {/* Bottom accent */}
            <div className="h-1 bg-gradient-to-r from-yellow-500 to-amber-500" />
          </CardContent>
        </Card>
        )}

        {/* Auto Bonuses */}
        <Card className="group hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBagIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                  {autoPercent}%
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">{t('autoBonuses')}</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(summary.autoBonusesMxn)}<Badge />
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <ShoppingBagIcon className="h-3.5 w-3.5 text-purple-500" />
                  {t('autoBonusHint')}
                </p>
              </div>
            </div>
            {/* Bottom accent */}
            <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          </CardContent>
        </Card>
      </div>

      {/* Tax summary */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 text-lg">{t('taxBreakdown')}</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {t('calculatedAutomatically')}
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">{t('gross')}</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(summary.totalSubtotalMxn)}</span>
            </div>
            {parseFloat(summary.totalIva || '0') > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('ivaShort')}</span>
                <span className="text-sm font-semibold text-blue-600 tabular-nums">+ {formatCurrency(summary.totalIva || '0')}</span>
              </div>
            )}
            {parseFloat(summary.totalIvaWithholding || '0') > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('ivaWithholdingShort')}</span>
                <span className="text-sm font-semibold text-red-500 tabular-nums">- {formatCurrency(summary.totalIvaWithholding || '0')}</span>
              </div>
            )}
            {parseFloat(summary.totalIsr || '0') > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('isr')}</span>
                <span className="text-sm font-semibold text-red-500 tabular-nums">- {formatCurrency(summary.totalIsr || '0')}</span>
              </div>
            )}
            {parseFloat(summary.totalResico || '0') > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('resico')}</span>
                <span className="text-sm font-semibold text-red-500 tabular-nums">- {formatCurrency(summary.totalResico || '0')}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-3 bg-[#3E667D]/5 border-t border-gray-200">
              <span className="text-sm font-bold text-[#3E667D]">{t('net')}</span>
              <span className="text-sm font-bold text-[#3E667D] tabular-nums">{formatCurrency(summary.totalNetMxn)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
