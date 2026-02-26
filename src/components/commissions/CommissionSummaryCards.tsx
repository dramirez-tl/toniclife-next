// components/commissions/CommissionSummaryCards.tsx
'use client';

import { CommissionSummary } from '@/types/commissions';
import { Card, CardContent } from '@/components/ui/Card';
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
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface SummaryCardsProps {
  summary: CommissionSummary | null;
  isLoading?: boolean;
  currencyCode?: string;
}

export function CommissionSummaryCards({ summary, isLoading, currencyCode = 'MXN' }: SummaryCardsProps) {
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
  const networkSalesVolume = parseFloat(summary.networkSalesVolume || '0');

  // Calculate percentage of each type
  const mlmPercent = totalNet > 0 ? ((mlmAmount / totalNet) * 100).toFixed(0) : 0;
  const cedeaPercent = totalNet > 0 ? ((cedeaAmount / totalNet) * 100).toFixed(0) : 0;
  const autoPercent = totalNet > 0 ? ((autoAmount / totalNet) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-6">
      {/* Hero Card - Total del Periodo */}
      <Card className="overflow-hidden border-0 shadow-xl shadow-[#7AB82E]/10">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-[#7AB82E] via-[#6aa025] to-[#5a8a20] text-white">
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
                      <p className="text-white/70 text-sm font-medium">Tu Balance del Periodo</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl lg:text-5xl font-bold tracking-tight">
                          {formatCurrency(summary.totalNetMxn)}
                        </p>
                        <span className="text-white/60 text-sm">{currencyCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary info */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-white/70">Subtotal bruto</span>
                      <span className="text-white font-medium">
                        {formatCurrency(summary.totalSubtotalMxn)}<Badge light />
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-white/70">Retenciones</span>
                      <span className="text-white font-medium">
                        -{formatCurrency(summary.totalRetentions)}<Badge light />
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60 mt-2">
                      <span>{summary.transactionCount} transacciones</span>
                    </div>
                  </div>
                </div>

                {/* Right - Quick stats */}
                <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                  <div className="flex-1 lg:flex-none bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <CheckCircleSolidIcon className="h-8 w-8 text-white" />
                      <div>
                        <p className="text-white/70 text-xs uppercase tracking-wide">Total Neto</p>
                        <p className="text-xl font-bold">{formatCurrency(summary.totalNetMxn)}<Badge light /></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 lg:flex-none bg-yellow-400/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/30">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-8 w-8 text-yellow-300" />
                      <div>
                        <p className="text-yellow-200/80 text-xs uppercase tracking-wide">Retenciones</p>
                        <p className="text-xl font-bold text-yellow-100">{formatCurrency(summary.totalRetentions)}<Badge light /></p>
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
        <Card className="group hover:shadow-lg hover:shadow-[#7AB82E]/10 transition-all duration-300 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#7AB82E] to-[#6aa025] rounded-xl flex items-center justify-center shadow-lg shadow-[#7AB82E]/30 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBagIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">Ventas Personales</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(personalSales)}<Badge />
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <ShoppingBagIcon className="h-3.5 w-3.5 text-[#7AB82E]" />
                  Tus compras en el periodo
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#7AB82E] to-[#6aa025]" />
          </CardContent>
        </Card>

        {/* Network Sales Volume */}
        <Card className="group hover:shadow-lg hover:shadow-[#003B7A]/10 transition-all duration-300 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#003B7A] to-[#004d99] rounded-xl flex items-center justify-center shadow-lg shadow-[#003B7A]/30 group-hover:scale-110 transition-transform duration-300">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">Volumen de Red</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(networkSalesVolume)}<Badge />
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <UserGroupIcon className="h-3.5 w-3.5 text-[#003B7A]" />
                  Ventas de tu red en el periodo
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#003B7A] to-[#004d99]" />
          </CardContent>
        </Card>
      </div>

      {/* Commission Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-sm text-gray-500 font-medium mb-1">Comisiones MLM</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(summary.mlmCommissionsMxn)}<Badge />
              </p>
            </div>
            {/* Bottom accent */}
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          </CardContent>
        </Card>

        {/* CEDEA Bonuses */}
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
              <p className="text-sm text-gray-500 font-medium mb-1">Bonos CEDEA</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(summary.cedeaBonusesMxn)}<Badge />
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <TrophyIcon className="h-3.5 w-3.5 text-yellow-500" />
                  Bono por desempeno CEDEA
                </p>
              </div>
            </div>
            {/* Bottom accent */}
            <div className="h-1 bg-gradient-to-r from-yellow-500 to-amber-500" />
          </CardContent>
        </Card>

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
              <p className="text-sm text-gray-500 font-medium mb-1">Bonos Automaticos</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(summary.autoBonusesMxn)}<Badge />
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <ShoppingBagIcon className="h-3.5 w-3.5 text-purple-500" />
                  Bono automatico (Platino+)
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
            <h3 className="font-bold text-gray-900 text-lg">Desglose Fiscal</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              Calculado automaticamente
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <p className="text-gray-600 text-xs font-medium">Subtotal Bruto</p>
              </div>
              <p className="font-bold text-green-600 text-lg">{formatCurrency(summary.totalSubtotalMxn)} <span className="text-[10px] font-semibold text-green-400">{currencyCode}</span></p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <p className="text-gray-600 text-xs font-medium">Retenciones</p>
              </div>
              <p className="font-bold text-red-500 text-lg">-{formatCurrency(summary.totalRetentions)} <span className="text-[10px] font-semibold text-red-300">{currencyCode}</span></p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <p className="text-gray-600 text-xs font-medium">Ajustes</p>
              </div>
              <p className="font-bold text-orange-600 text-lg">{formatCurrency(summary.adjustmentsMxn)} <span className="text-[10px] font-semibold text-orange-400">{currencyCode}</span></p>
            </div>
            <div className="bg-gradient-to-br from-[#003B7A]/5 to-[#003B7A]/10 rounded-xl p-4 border border-[#003B7A]/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleSolidIcon className="w-4 h-4 text-[#003B7A]" />
                <p className="text-gray-600 text-xs font-medium">Total Neto</p>
              </div>
              <p className="font-bold text-[#003B7A] text-lg">{formatCurrency(summary.totalNetMxn)} <span className="text-[10px] font-semibold text-[#003B7A]/50">{currencyCode}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
