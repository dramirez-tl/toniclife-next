'use client';

// DirectLinesVolumeSection — Volumen de grupo por LÍNEA DIRECTA (con tope y
// rollover por rango). Misma lógica y endpoint de siempre (network/direct-lines,
// contrato /distribuidor/red V16); cambia solo que el PERIODO llega del selector
// del encabezado (ya no tiene selector propio) y que puede resaltar la línea
// desde la que se llegó ("Ver volumen de la línea" del explorador).

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { InformationCircleIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNetworkDirectLines } from '@/hooks/useNetwork';
import { fmtInt } from '@/lib/network/format';
import type { DirectLineVolume } from '@/types/network';

interface DirectLinesVolumeSectionProps {
  /** Periodo elegido en el encabezado; undefined = actual (lo resuelve el servidor). */
  periodId?: string;
  /** memberId de la línea a resaltar (llegada desde el explorador). */
  highlightMemberId?: string | null;
}

export function DirectLinesVolumeSection({ periodId, highlightMemberId }: DirectLinesVolumeSectionProps) {
  const t = useTranslations('distributor.network.directLines');
  const locale = useLocale();
  const fmt = (n: number) => fmtInt(n, locale);
  const { data, isLoading, isFetching } = useNetworkDirectLines(periodId);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  // Al llegar desde "Ver volumen de la línea", acercar la línea resaltada.
  useEffect(() => {
    if (highlightMemberId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightMemberId, data]);

  const lines: DirectLineVolume[] = data?.lines ?? [];
  const cap = data?.rollOverLimit ?? 0;
  const hasCap = data?.hasCap ?? false;
  const maxBar = Math.max(1, cap, ...lines.map((l) => l.legVolume));
  // Orden solicitado: primero las líneas CON volumen (de mayor a menor) y al
  // final las que están en 0. El badge "más baja" se calcula por VALOR real
  // (no por posición), así sigue marcando la pierna más débil.
  const displayLines = [...lines].sort((a, b) => b.legVolume - a.legVolume);
  const lowestId =
    lines.length > 0 ? lines.reduce((min, l) => (l.legVolume < min.legVolume ? l : min), lines[0]).memberId : null;

  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-[#3E667D]/10 p-2 text-[#3E667D]">
            <ScaleIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('title')}</h3>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>

        {/* Explicación del rollover (tope por línea) */}
        {hasCap && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <span>
              <strong>{t('rolloverPrefix')}</strong> {t('rolloverBody1')}{' '}
              <strong>
                {fmt(cap)} {t('ptsUnit')}
              </strong>
              {data?.viewerRankName ? t('rolloverViewerRank', { rank: data.viewerRankName }) : ''}. <strong>“{t('rolloverWord')}”</strong>{' '}
              {t('rolloverBody2')} <strong>{t('rolloverStrengthen')}</strong> {t('rolloverBody3')}
            </span>
          </div>
        )}

        {/* Totales */}
        {data && lines.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t('totalLinesVolume')}</p>
              <p className="text-xl font-bold tabular-nums text-gray-900">{fmt(data.totalGroupVolume)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-emerald-600">{t('countsForGroup')}</p>
              <p className="text-xl font-bold tabular-nums text-emerald-700">{fmt(data.totalCounted)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-amber-600">{t('rollsOver')}</p>
              <p className="text-xl font-bold tabular-nums text-amber-700">{fmt(data.totalRolledOver)}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          </div>
        ) : lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
            <p className="text-sm text-gray-500">{t('empty')}</p>
          </div>
        ) : (
          <div className={`space-y-2 ${isFetching ? 'opacity-60' : ''}`} aria-busy={isFetching}>
            {displayLines.map((l) => {
              const countedPct = (Math.min(l.counted, maxBar) / maxBar) * 100;
              const rolledPct = (Math.min(l.rolledOver, maxBar) / maxBar) * 100;
              const capPct = hasCap ? (Math.min(cap, maxBar) / maxBar) * 100 : 0;
              const toCap = hasCap ? Math.max(0, cap - l.legVolume) : 0;
              const highlighted = highlightMemberId === l.memberId;
              return (
                <div
                  key={l.memberId}
                  ref={highlighted ? highlightRef : undefined}
                  className={`rounded-xl border p-3 hover:bg-gray-50/60 ${
                    highlighted ? 'border-[#3E667D] bg-[#C8DDF2]/15 ring-2 ring-[#3E667D]/30' : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {lines.length > 1 && l.memberId === lowestId && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            {t('lowest')}
                          </span>
                        )}
                        <span className="truncate font-semibold text-gray-900">{l.name}</span>
                        <span className="text-xs text-gray-400">#{l.customerNumber}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {l.rankName ? `${l.rankName} · ` : ''}
                        {t('activeOfTotal', { active: l.activeCount, total: l.memberCount })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-gray-900">
                        {fmt(l.legVolume)} <span className="text-xs font-normal text-gray-400">{t('ptsUnit')}</span>
                      </p>
                      {l.rolledOver > 0 ? (
                        <span className="text-xs font-medium text-amber-600">{t('rollsOverAmount', { amount: fmt(l.rolledOver) })}</span>
                      ) : hasCap && toCap > 0 ? (
                        <span className="text-xs font-medium text-gray-400">{t('remainingToCap', { amount: fmt(toCap) })}</span>
                      ) : hasCap ? (
                        <span className="text-xs font-medium text-emerald-600">{t('capReached')}</span>
                      ) : null}
                    </div>
                  </div>
                  {/* Barra: cuenta (teal) + excedente que rolla (ámbar); marcador del tope */}
                  <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="absolute left-0 top-0 h-full bg-[#3E667D]" style={{ width: `${countedPct}%` }} />
                    <div className="absolute top-0 h-full bg-amber-400" style={{ left: `${countedPct}%`, width: `${rolledPct}%` }} />
                    {hasCap && (
                      <div
                        className="absolute top-[-2px] h-[14px] w-0.5 bg-gray-700"
                        style={{ left: `${capPct}%` }}
                        title={t('capTitle', { amount: fmt(cap) })}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
