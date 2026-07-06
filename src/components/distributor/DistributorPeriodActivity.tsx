'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TrophyIcon,
  BoltIcon,
  ArrowPathRoundedSquareIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import {
  usePeriodsForSelector,
  useCustomerStatsForPeriod,
} from '@/hooks/useDistributorPeriodStats';

interface DistributorPeriodActivityProps {
  customerId: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  // Las fechas de periodo son DATE puros (llegan como medianoche UTC): se
  // formatean en UTC para no recorrerlas un día (26-jun se pintaba 25-jun).
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });
}

function formatMxn(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-MX');
}

export function DistributorPeriodActivity({ customerId }: DistributorPeriodActivityProps) {
  const { data: periods = [], isLoading: loadingPeriods } = usePeriodsForSelector();
  const [periodId, setPeriodId] = useState<string | null>(null);

  // Selección por defecto: el periodo abierto, si no el más reciente
  useEffect(() => {
    if (!periodId && periods.length > 0) {
      const open = periods.find((p) => !p.isClosed);
      setPeriodId(open?.id || periods[0].id);
    }
  }, [periods, periodId]);

  const { data: stats, isLoading: loadingStats } = useCustomerStatsForPeriod(
    customerId,
    periodId,
  );

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === periodId),
    [periods, periodId],
  );

  const qualificationPercent = useMemo(() => {
    if (!stats) return 0;
    if (stats.points.qualificationThreshold <= 0) return 0;
    return Math.min(
      100,
      Math.round((stats.points.personal / stats.points.qualificationThreshold) * 100),
    );
  }, [stats]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-[#3E667D]" />
            <h2 className="text-base font-semibold text-gray-900">Actividad por Periodo</h2>
          </div>
          {selectedPeriod && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(selectedPeriod.startDate)} → {formatDate(selectedPeriod.endDate)}
              {' · '}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  selectedPeriod.isClosed
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {selectedPeriod.isClosed ? 'Cerrado' : 'En curso'}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Periodo:</label>
          <select
            value={periodId || ''}
            onChange={(e) => setPeriodId(e.target.value || null)}
            disabled={loadingPeriods || periods.length === 0}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none disabled:opacity-50"
          >
            {periods.length === 0 ? (
              <option value="">Sin periodos</option>
            ) : (
              periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.code || p.id} {p.isClosed ? '· Cerrado' : '· En curso'}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loadingStats || !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-24 rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Rango + calificación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <StatCard
              icon={TrophyIcon}
              label="Rango alcanzado"
              value={stats.rank.name || 'Sin rango'}
              accent="amber"
              subtitle={stats.rank.rankNumber ? `Rango #${stats.rank.rankNumber}` : undefined}
            />
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <CheckBadgeIcon className="h-5 w-5 text-emerald-500" />
                  <p className="text-xs text-gray-500">Calificación</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    stats.points.isQualified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {stats.points.isQualified ? 'Calificado' : 'En progreso'}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {formatNumber(stats.points.personal)} /{' '}
                {formatNumber(stats.points.qualificationThreshold)} pts personales
              </p>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    stats.points.isQualified ? 'bg-emerald-500' : 'bg-[#3E667D]'
                  }`}
                  style={{ width: `${qualificationPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{qualificationPercent}%</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              icon={BoltIcon}
              label="Puntos personales"
              value={formatNumber(stats.points.personal)}
              accent="blue"
            />
            <StatCard
              icon={UserGroupIcon}
              label="Puntos de grupo"
              value={formatNumber(stats.points.group)}
              accent="teal"
            />
            <StatCard
              icon={ArrowPathRoundedSquareIcon}
              label="Roll over"
              value={formatNumber(stats.points.rollOver)}
              accent="violet"
              subtitle="Grupo con tope por pierna aplicado"
            />
            <StatCard
              icon={ShoppingCartIcon}
              label="Ventas del periodo"
              value={`$${formatMxn(stats.sales.totalMxn)} ${stats.sales.currencyCode || 'MXN'}`}
              accent="emerald"
              subtitle={`${stats.sales.ordersCount} pedidos · ${stats.sales.posSalesCount} POS (solo completadas)`}
            />
            <StatCard
              icon={CurrencyDollarIcon}
              label="Puntos de negocio"
              value={formatNumber(stats.points.businessMxn)}
              accent="cyan"
              subtitle={
                stats.points.businessUsd > 0
                  ? `USD: ${formatNumber(stats.points.businessUsd)}`
                  : undefined
              }
            />
            <StatCard
              icon={UserPlusIcon}
              label="Nuevos reclutas directos"
              value={formatNumber(stats.network.newDirectRecruits)}
              accent="rose"
              subtitle="Altas en el periodo"
            />
          </div>

          {/* Comisión del periodo (último cálculo) */}
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Comisión del periodo
                </p>
                {!selectedPeriod?.isClosed && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    al último cálculo
                  </span>
                )}
                {stats.commission.status && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {stats.commission.status}
                  </span>
                )}
              </div>
              {stats.commission.exists ? (
                <p className="text-lg font-bold text-gray-900">
                  ${formatMxn(stats.commission.subtotal)}{' '}
                  <span className="text-xs font-medium text-gray-400">
                    {stats.commission.currencyCode || ''}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-400">Sin cálculo aún</p>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Último cálculo de comisión:{' '}
              <span className="font-medium text-gray-500">
                {formatDateTime(stats.lastCalculation.commissionAt)}
              </span>
              {' · '}Rango/puntos actualizados:{' '}
              <span className="font-medium text-gray-500">
                {formatDateTime(stats.lastCalculation.statsAt)}
              </span>
            </p>
          </div>

          {/* Red */}
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-4 w-4 text-[#3E667D]" />
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Red del distribuidor
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NetworkStat label="Tamaño total" value={formatNumber(stats.network.size)} />
              <NetworkStat label="Activos" value={formatNumber(stats.network.active)} />
              <NetworkStat
                label="Calificados (1er nivel)"
                value={formatNumber(stats.network.qualifiedFirstLevel)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent = 'blue',
}: {
  icon: typeof TrophyIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: 'blue' | 'teal' | 'violet' | 'emerald' | 'cyan' | 'rose' | 'amber';
}) {
  const accentMap: Record<string, string> = {
    blue: 'text-blue-500',
    teal: 'text-[#3E667D]',
    violet: 'text-violet-500',
    emerald: 'text-emerald-500',
    cyan: 'text-cyan-500',
    rose: 'text-rose-500',
    amber: 'text-amber-500',
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${accentMap[accent]}`} />
        <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      </div>
      <p className="text-lg font-bold text-gray-900 leading-tight break-words">{value}</p>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function NetworkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
