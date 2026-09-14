// components/commissions/RankRoadmap.tsx
// "Tu camino al siguiente rango": vista tipo videojuego del avance de rango en
// el periodo. Sustituye al stepper de medallas (que solo listaba requisitos
// estáticos) por misiones con lo que FALTA, las patas (líneas directas) y lo
// que le falta a cada una. Los datos vienen de GET /distributor/rank-roadmap.
'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import confetti from 'canvas-confetti';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RankMedal } from '@/components/distributor/RankMedal';
import { useRankRoadmap } from '@/hooks/useDistributor';
import { localeLanguage } from '@/i18n/config';
import { cn } from '@/lib/utils';
import type {
  RankRoadmapLeg,
  RankRoadmapRankStep,
  RankRoadmapRequirement,
  RankRoadmapResponse,
} from '@/types/distributor';
import { CheckIcon, LockClosedIcon, MinusIcon } from '@heroicons/react/24/solid';
import {
  ArrowPathIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface RankRoadmapProps {
  /** Periodo a evaluar. Sin periodo no se consulta (se muestra el skeleton). */
  periodId?: string;
  currencyCode?: string;
}

type Translate = ReturnType<typeof useTranslations<'distributor.commissions.rankStepper'>>;
type PointsFormatter = (n: number) => string;

// Color de acento por rango (texto/anillo). Se conserva del stepper anterior.
const rankColors: Record<string, { text: string; ring: string }> = {
  distribuidor: { text: 'text-gray-600', ring: 'ring-gray-400' },
  bronce: { text: 'text-amber-700', ring: 'ring-amber-600' },
  plata: { text: 'text-gray-500', ring: 'ring-gray-400' },
  oro: { text: 'text-yellow-600', ring: 'ring-yellow-500' },
  platino: { text: 'text-cyan-600', ring: 'ring-cyan-500' },
  diamante: { text: 'text-blue-600', ring: 'ring-blue-500' },
  doble_diamante: { text: 'text-violet-600', ring: 'ring-violet-500' },
  triple_diamante: { text: 'text-purple-600', ring: 'ring-purple-500' },
  sirius: { text: 'text-rose-600', ring: 'ring-rose-500' },
  azul: { text: 'text-sky-600', ring: 'ring-sky-500' },
};
const defaultColor = { text: 'text-gray-500', ring: 'ring-gray-300' };

// Beneficios cualitativos por rango (claves i18n bajo rankStepper.benefits).
// Los números de niveles/generaciones NO se hardcodean: vienen de la API.
const rankBenefitKeys: Record<string, string[]> = {
  distribuidor: ['distribuidor1', 'distribuidor2'],
  bronce: ['bronce1', 'bronce2'],
  plata: ['plata1', 'plata2'],
  oro: ['oro1', 'oro2'],
  platino: ['platino1', 'platino2'],
  diamante: ['diamante1', 'diamante2'],
  doble_diamante: ['doble_diamante1', 'doble_diamante2'],
  triple_diamante: ['triple_diamante1', 'triple_diamante2'],
  sirius: ['sirius1', 'sirius2'],
  azul: ['azul1', 'azul2', 'azul3'],
};

// Alias heredados de la migración (mismo criterio que constants/ranks.ts).
const RANK_CODE_ALIASES: Record<string, string> = {
  diamante_sirius: 'sirius',
  diamante_azul: 'azul',
};
const normalizeRankCode = (code: string) => RANK_CODE_ALIASES[code] ?? code;

const LEG_STATUSES = ['active', 'inactive', 'suspended', 'pending'] as const;
type LegStatus = (typeof LEG_STATUSES)[number];
const isKnownStatus = (s: string): s is LegStatus =>
  (LEG_STATUSES as readonly string[]).includes(s);

const statusDot: Record<LegStatus, string> = {
  active: 'bg-emerald-500',
  pending: 'bg-amber-400',
  inactive: 'bg-gray-300',
  suspended: 'bg-red-400',
};

/** Porcentaje seguro 0..100 (sin NaN/Infinity). */
const safePct = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;

/** Ancho de barra: mínimo visible cuando hay avance > 0. */
const barWidth = (pct: number) => (pct <= 0 ? 0 : Math.max(pct, 2));

/**
 * Peldaño anterior en la escalera ACTIVA (por índice, como capApplied en la
 * API): es el rango cuyo tope se aplica para evaluar el grupo de `step`.
 */
function previousLadderStep(
  ranks: RankRoadmapRankStep[],
  step: RankRoadmapRankStep,
): RankRoadmapRankStep | null {
  const idx = ranks.findIndex((r) => r.id === step.id);
  return idx > 0 ? ranks[idx - 1] : null;
}

/** Formateador de puntos según el idioma del panel (es-MX / en-US). */
function usePointsFormatter(): PointsFormatter {
  const locale = useLocale();
  const numLocale = localeLanguage(locale) === 'en' ? 'en-US' : 'es-MX';
  return useMemo(
    () => (n: number) =>
      Number(n || 0).toLocaleString(numLocale, { maximumFractionDigits: 0 }),
    [numLocale],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function RankRoadmap({ periodId, currencyCode = 'MXN' }: RankRoadmapProps) {
  const t = useTranslations('distributor.commissions.rankStepper');
  const { data, isPending, isError, isFetching, refetch } = useRankRoadmap(
    periodId,
    !!periodId,
  );

  // Confeti UNA sola vez por montaje cuando el siguiente rango ya es
  // alcanzable con los números de hoy. Vive aquí (no en el cuerpo) para que
  // cambiar de periodo no lo vuelva a disparar.
  const confettiFired = useRef(false);
  const nextReachable = !!data?.nextRank?.isReachableNow;
  useEffect(() => {
    if (!nextReachable || confettiFired.current) return;
    confettiFired.current = true;
    confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 35,
      origin: { y: 0.35 },
      colors: ['#3E667D', '#C8DDF2', '#a7c1e2', '#FFD700'],
      disableForReducedMotion: true,
    });
  }, [nextReachable]);

  if (!periodId || isPending) return <RoadmapSkeleton />;
  if (isError || !data) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-sm text-gray-600">{t('loadError')}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <ArrowPathIcon className="h-4 w-4" />
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <RoadmapBody data={data} currencyCode={currencyCode} isFetching={isFetching} />
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuerpo (con datos)
// ─────────────────────────────────────────────────────────────────────────────

interface RoadmapBodyProps {
  data: RankRoadmapResponse;
  currencyCode: string;
  isFetching: boolean;
}

function RoadmapBody({ data, currencyCode, isFetching }: RoadmapBodyProps) {
  const t = useTranslations('distributor.commissions.rankStepper');
  const fmt = usePointsFormatter();

  const current = data.currentRank;
  const ranks = data.ranks;
  const byNumber = useMemo(
    () => new Map(ranks.map((r) => [r.rankNumber, r])),
    [ranks],
  );

  // Selección de la escalera. Se guarda junto con el periodo para que, al
  // cambiar de periodo, la selección vieja se ignore sin necesitar un efecto.
  const [selection, setSelection] = useState<{
    periodId: string;
    rankNumber: number;
  } | null>(null);
  const selectedRankNumber =
    selection && selection.periodId === data.period.id ? selection.rankNumber : null;
  const selectedStep =
    selectedRankNumber != null ? (byNumber.get(selectedRankNumber) ?? null) : null;

  // Meta de las misiones: el rango elegido si está por ENCIMA del actual; si
  // no (o sin selección), el siguiente rango. El panel de detalle muestra el
  // rango seleccionado (incluso los ya alcanzados, en modo solo lectura).
  const targetStep =
    selectedStep && selectedStep.rankNumber > current.rankNumber
      ? selectedStep
      : data.nextRank;

  // Orden del cuerpo: lo que FALTA primero (misiones y patas, el "juego"), y al
  // final la escalera de medallas con el detalle del rango (requisitos
  // estáticos + beneficios) que solo se abre al tocar una medalla.
  return (
    <Card
      className={cn(
        'overflow-hidden border-0 p-0 shadow-lg transition-opacity',
        isFetching && 'opacity-70',
      )}
    >
      <RoadmapHeader data={data} target={targetStep} t={t} />

      <CardContent className="space-y-6 p-4 sm:p-6">
        {targetStep ? (
          <MissionCards data={data} target={targetStep} fmt={fmt} t={t} />
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <TrophyIcon className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800">{t('maxRankReached')}</p>
              <p className="text-sm text-emerald-700">{t('maxRankBody')}</p>
            </div>
          </div>
        )}

        <LegsSection data={data} fmt={fmt} t={t} />

        <RankLadder
          ranks={ranks}
          currentRankNumber={current.rankNumber}
          selectedRankNumber={selectedRankNumber ?? targetStep?.rankNumber ?? null}
          focusRankNumber={targetStep?.rankNumber ?? current.rankNumber}
          onSelect={(rankNumber) =>
            setSelection({ periodId: data.period.id, rankNumber })
          }
          t={t}
        />

        {selectedStep && (
          <RankDetailPanel
            step={selectedStep}
            currentRankNumber={current.rankNumber}
            ranks={ranks}
            currencyCode={currencyCode}
            fmt={fmt}
            t={t}
            onClose={() => setSelection(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Encabezado: medalla actual → riel → medalla meta
// ─────────────────────────────────────────────────────────────────────────────

interface RoadmapHeaderProps {
  data: RankRoadmapResponse;
  target: RankRoadmapRankStep | null;
  t: Translate;
}

function RoadmapHeader({ data, target, t }: RoadmapHeaderProps) {
  const { period, currentRank, projectedRank } = data;
  const overallPct = target
    ? Math.round(
        (safePct(target.personal.percent) +
          safePct(target.qualifiers.percent) +
          safePct(target.group.percent)) /
          3,
      )
    : 100;
  const missions: RankRoadmapRequirement[] = target
    ? [target.personal, target.qualifiers, target.group]
    : [];
  const showProjection =
    !!projectedRank && projectedRank.rankNumber > currentRank.rankNumber;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#3E667D] via-[#2f5165] to-[#3E667D] p-5 text-white sm:p-6">
      {/* Decoración de marca */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#C8DDF2] blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
              <TrophyIcon className="h-5 w-5 text-yellow-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-tight sm:text-xl">{t('roadmapTitle')}</h3>
              <p className="text-xs text-white/70 sm:text-sm">{t('roadmapSubtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
              <CalendarDaysIcon className="h-4 w-4 text-white/80" />
              {period.name}
            </span>
            {period.isClosed ? (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                {t('periodFinal')}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100">
                {t('periodDaysRemaining', { days: Math.max(0, period.daysRemaining ?? 0) })}
              </span>
            )}
          </div>
        </div>

        {/* Medalla actual → riel de progreso → medalla meta */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:justify-start sm:gap-5">
          <div className="order-1 flex w-20 shrink-0 flex-col items-center gap-1 sm:w-24">
            <RankMedal
              rank={currentRank.code}
              size="lg"
              glow
              label={currentRank.name}
              className="h-14 w-14 sm:h-20 sm:w-20"
            />
            <p className="text-[10px] uppercase tracking-wide text-white/60">{t('currentRankLabel')}</p>
            <p className="text-center text-sm font-bold leading-tight">{currentRank.name}</p>
          </div>

          <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
            {target ? (
              <>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-white/80">
                  <span className="font-semibold">
                    {t('missionsDone', { count: target.metCount })}
                  </span>
                  <span className="text-sm font-bold text-white">{overallPct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C8DDF2] to-emerald-300 transition-all duration-700"
                    style={{ width: `${barWidth(overallPct)}%` }}
                  />
                </div>
                {/* Pips: una por misión */}
                <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
                  {missions.map((m, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors',
                        m.met ? 'bg-emerald-300' : 'bg-white/20',
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-white/60">{t('overallProgress')}</p>
              </>
            ) : (
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">
                <p className="font-semibold">{t('maxRankReached')}</p>
              </div>
            )}
          </div>

          {target && (
            <div className="order-2 flex w-20 shrink-0 flex-col items-center gap-1 sm:order-3 sm:w-24">
              <MedalWithLock
                code={target.code}
                name={target.name}
                locked={!target.isAchieved}
                size="lg"
                className="h-14 w-14 sm:h-20 sm:w-20"
              />
              <p className="text-[10px] uppercase tracking-wide text-white/60">{t('targetRankLabel')}</p>
              <p className="text-center text-sm font-bold leading-tight">{target.name}</p>
            </div>
          )}
        </div>

        {showProjection && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/20 px-3 py-2">
            <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
            <div>
              <p className="text-sm font-semibold">
                {t('projectedRank', { rank: projectedRank.name })}
              </p>
              {!period.isClosed && (
                <p className="text-xs text-emerald-100/80">{t('projectedRankHint')}</p>
              )}
            </div>
          </div>
        )}

        {!data.rankResolvedFromPeriod && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-white/60">
            <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('notCalculatedHint')}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Medalla con candado (rangos no alcanzados)
// ─────────────────────────────────────────────────────────────────────────────

interface MedalWithLockProps {
  code: string;
  name: string;
  locked: boolean;
  size: 'sm' | 'md' | 'lg';
  glow?: boolean;
  ring?: boolean;
  className?: string;
}

function MedalWithLock({ code, name, locked, size, glow, ring, className }: MedalWithLockProps) {
  return (
    <div className="relative">
      <RankMedal
        rank={code}
        size={size}
        locked={locked}
        glow={glow}
        ring={ring}
        label={name}
        className={className}
      />
      {locked && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700/70">
            <LockClosedIcon className="h-3 w-3 text-white" />
          </span>
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Escalera de medallas (elige la meta)
// ─────────────────────────────────────────────────────────────────────────────

interface RankLadderProps {
  ranks: RankRoadmapRankStep[];
  currentRankNumber: number;
  selectedRankNumber: number | null;
  /** Rango que se centra en el scroll al cargar. */
  focusRankNumber: number;
  onSelect: (rankNumber: number) => void;
  t: Translate;
}

function RankLadder({
  ranks,
  currentRankNumber,
  selectedRankNumber,
  focusRankNumber,
  onSelect,
  t,
}: RankLadderProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  // Centra la meta en el carrusel SOLO la primera vez (scroll horizontal
  // manual, no scrollIntoView, para no mover la página verticalmente).
  useEffect(() => {
    if (didScroll.current) return;
    const scroller = scrollerRef.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-rank="${focusRankNumber}"]`);
    if (!scroller || !el) return;
    didScroll.current = true;
    scroller.scrollLeft = Math.max(
      0,
      el.offsetLeft - scroller.clientWidth / 2 + el.clientWidth / 2,
    );
  }, [focusRankNumber]);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('ladderTitle')}
        </p>
        <p className="text-xs text-gray-400">{t('ladderHint')}</p>
      </div>
      <div
        ref={scrollerRef}
        role="group"
        aria-label={t('ladderAria')}
        className="relative -mx-2 overflow-x-auto px-2 pb-2 pt-3"
      >
        <div className="flex min-w-max items-start">
          {ranks.map((rank, index) => {
            const isCurrent = rank.rankNumber === currentRankNumber;
            const isAchieved = rank.rankNumber < currentRankNumber;
            const isLocked = rank.rankNumber > currentRankNumber;
            const isSelected = rank.rankNumber === selectedRankNumber;
            const showReachable = isLocked && rank.isReachableNow;
            const colors = rankColors[normalizeRankCode(rank.code)] ?? defaultColor;
            const isLast = index === ranks.length - 1;

            return (
              <div key={rank.id} className="flex items-start">
                <button
                  type="button"
                  data-rank={rank.rankNumber}
                  aria-pressed={isSelected}
                  aria-label={
                    isLocked
                      ? t('selectTargetAria', { rank: rank.name })
                      : t('viewRankAria', { rank: rank.name })
                  }
                  onClick={() => onSelect(rank.rankNumber)}
                  className="group flex w-[84px] cursor-pointer flex-col items-center rounded-xl px-1 py-1 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#a7c1e2]"
                >
                  <div className="relative">
                    <RankMedal
                      rank={rank.code}
                      size="md"
                      locked={isLocked}
                      glow={isCurrent}
                      ring={isSelected}
                      label={rank.name}
                      className={cn(
                        'transition-transform group-hover:scale-105',
                        isCurrent && !isSelected && `ring-2 ring-offset-2 ${colors.ring}`,
                      )}
                    />
                    {isLocked && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700/70">
                          <LockClosedIcon className="h-3 w-3 text-white" />
                        </span>
                      </span>
                    )}
                    {isAchieved && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                        <CheckIcon className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    {/* Número de rango */}
                    <span
                      className={cn(
                        'absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                        isLocked
                          ? 'bg-gray-200 text-gray-500'
                          : 'border border-gray-200 bg-white text-gray-700 shadow-sm',
                      )}
                    >
                      {rank.rankNumber}
                    </span>
                    {showReachable && (
                      <span
                        className="absolute -top-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-1.5 text-center text-[11px] font-semibold leading-tight',
                      isSelected
                        ? 'text-[#3E667D]'
                        : isCurrent
                          ? colors.text
                          : isAchieved
                            ? 'text-gray-700'
                            : 'text-gray-400',
                    )}
                  >
                    {rank.name}
                  </p>
                  {isCurrent ? (
                    <span className="mt-0.5 text-[10px] font-medium text-[#3E667D]">
                      {t('youAreHere')}
                    </span>
                  ) : showReachable ? (
                    <span className="mt-0.5 text-[10px] font-semibold text-emerald-600">
                      {t('reachableNow')}
                    </span>
                  ) : null}
                </button>

                {!isLast && (
                  <div className="mt-6 flex items-center">
                    <div
                      className={cn(
                        'h-0.5 w-4',
                        isAchieved
                          ? 'bg-[#C8DDF2]'
                          : isCurrent
                            ? 'bg-gradient-to-r from-[#C8DDF2] to-gray-200'
                            : 'bg-gray-200',
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detalle del rango seleccionado (requisitos estáticos + beneficios)
// ─────────────────────────────────────────────────────────────────────────────

interface RankDetailPanelProps {
  step: RankRoadmapRankStep;
  currentRankNumber: number;
  ranks: RankRoadmapRankStep[];
  currencyCode: string;
  fmt: PointsFormatter;
  t: Translate;
  onClose: () => void;
}

function RankDetailPanel({
  step,
  currentRankNumber,
  ranks,
  currencyCode,
  fmt,
  t,
  onClose,
}: RankDetailPanelProps) {
  const isCurrent = step.rankNumber === currentRankNumber;
  const isAchieved = step.rankNumber < currentRankNumber;
  const isLocked = step.rankNumber > currentRankNumber;
  const benefitKeys = rankBenefitKeys[normalizeRankCode(step.code)] ?? [];
  const autoBonus =
    currencyCode === 'USD'
      ? parseFloat(step.autoBonusUsd || '0')
      : parseFloat(step.autoBonusMxn || '0');
  const blockedBy =
    step.blockedByRankNumber != null
      ? (ranks.find((r) => r.rankNumber === step.blockedByRankNumber) ?? null)
      : null;
  // Dueño del tope = peldaño ANTERIOR en la escalera activa (por índice, igual
  // que capApplied en la API), no rankNumber - 1.
  const prevRank = previousLadderStep(ranks, step);

  const requirementRow = (
    label: string,
    value: string,
    req?: RankRoadmapRequirement,
    icon?: ReactNode,
  ) => (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon}
        <span className="truncate text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-bold text-gray-900">{value}</span>
        {isLocked && req && (
          <span
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full',
              req.met ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400',
            )}
            aria-label={req.met ? t('missionDone') : undefined}
          >
            {req.met ? (
              <CheckIcon className="h-2.5 w-2.5" />
            ) : (
              <MinusIcon className="h-2.5 w-2.5" />
            )}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
          isAchieved ? 'bg-emerald-50' : isCurrent ? 'bg-[#C8DDF2]/30' : 'bg-gray-50',
        )}
      >
        <div className="flex items-center gap-3">
          <MedalWithLock code={step.code} name={step.name} locked={isLocked} size="sm" />
          <div>
            <p className="font-bold text-gray-900">{step.name}</p>
            <p className="text-xs text-gray-500">
              {isAchieved ? t('rankAchieved') : isCurrent ? t('currentRank') : t('rankLocked')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLocked && step.isReachableNow && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <SparklesIcon className="h-3.5 w-3.5" />
              {t('reachableNow')}
            </span>
          )}
          {blockedBy && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {t('blockedBy', { rank: blockedBy.name })}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t('closeDetail')}
            className="rounded-full hover:bg-gray-200"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-2">
        <div>
          <h4 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <BoltIcon className="h-4 w-4 text-amber-500" />
            {isLocked ? t('requirementsToUnlock') : t('requirements')}
          </h4>
          <div className="space-y-2">
            {requirementRow(
              t('personalPoints'),
              `${fmt(step.personal.required)} ${t('ptsUnit')}`,
              step.personal,
            )}
            {step.group.required > 0 &&
              requirementRow(
                t('groupPoints'),
                `${fmt(step.group.required)} ${t('ptsUnit')}`,
                step.group,
              )}
            {step.qualifiers.required > 0 &&
              requirementRow(
                t('qualifiersFirstLevel'),
                String(step.qualifiers.required),
                step.qualifiers,
                <UserGroupIcon className="h-4 w-4 shrink-0 text-gray-400" />,
              )}
            {step.capApplied > 0 && (
              <p className="flex items-start gap-1.5 px-1 text-xs text-gray-500">
                <InformationCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {t('capTooltip', {
                    cap: fmt(step.capApplied),
                    rank: prevRank?.name ?? step.name,
                  })}
                </span>
              </p>
            )}
            {step.levelMax != null &&
              step.levelMax > 0 &&
              requirementRow(t('commissionLevels'), t('upToLevel', { level: step.levelMax }))}
            {step.generationMax != null &&
              step.generationMax > 0 &&
              requirementRow(t('generations'), t('generationsValue', { count: step.generationMax }))}
            {autoBonus > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <CurrencyDollarIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">{t('autoBonus')}</span>
                </div>
                <span className="font-bold text-emerald-700">
                  ${autoBonus.toLocaleString(currencyCode === 'USD' ? 'en-US' : 'es-MX')} {currencyCode}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
            {t('benefitsTitle')}
          </h4>
          {benefitKeys.length > 0 ? (
            <ul className="space-y-2">
              {benefitKeys.map((benefitKey) => (
                <li key={benefitKey} className="flex items-start gap-2">
                  <CheckIcon
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      isLocked ? 'text-gray-300' : 'text-emerald-500',
                    )}
                  />
                  <span className={cn('text-sm', isLocked ? 'text-gray-500' : 'text-gray-700')}>
                    {t(`benefits.${benefitKey}`)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">{t('noInfo')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Misiones (3 requisitos de la meta)
// ─────────────────────────────────────────────────────────────────────────────

interface MissionCardsProps {
  data: RankRoadmapResponse;
  target: RankRoadmapRankStep;
  fmt: PointsFormatter;
  t: Translate;
}

function MissionCards({ data, target, fmt, t }: MissionCardsProps) {
  const prevRank = previousLadderStep(data.ranks, target);
  const blockedBy =
    target.blockedByRankNumber != null
      ? (data.ranks.find((r) => r.rankNumber === target.blockedByRankNumber) ?? null)
      : null;
  const capText =
    target.capApplied > 0
      ? t('capTooltip', { cap: fmt(target.capApplied), rank: prevRank?.name ?? target.name })
      : t('capTooltipNoCap');
  const closest = data.closestToQualify.slice(0, 5);
  const qualifiersGap = Math.ceil(Math.max(0, target.qualifiers.gap));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlagIcon className="h-5 w-5 text-[#3E667D]" />
          <h4 className="font-bold text-gray-900">{t('missionsTitle', { rank: target.name })}</h4>
        </div>
        <div className="flex items-center gap-2">
          {target.isReachableNow && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <SparklesIcon className="h-3.5 w-3.5" />
              {t('reachableNow')}
            </span>
          )}
          <span className="text-xs font-semibold text-gray-500">
            {t('missionsDone', { count: target.metCount })}
          </span>
        </div>
      </div>

      {blockedBy && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <span>
            <strong>{t('blockedBy', { rank: blockedBy.name })}.</strong> {t('blockedByBody')}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Misión 1: puntos personales */}
        <MissionCard
          index={1}
          icon={<BoltIcon className="h-4 w-4" />}
          title={t('personalPoints')}
          requirement={target.personal}
          unit={t('ptsUnit')}
          statusText={
            target.personal.met
              ? t('missionDone')
              : t('missingPoints', { points: fmt(target.personal.gap) })
          }
          badge={
            data.isQualified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CheckIcon className="h-3 w-3" />
                {t('qualifiedBadge')}
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {t('notQualifiedBadge')}
              </span>
            )
          }
          fmt={fmt}
          t={t}
        >
          {!data.isQualified && (
            <p className="text-xs text-amber-700">
              {t('toQualify', {
                points: fmt(data.pointsToQualify),
                threshold: fmt(data.qualificationThreshold),
              })}
            </p>
          )}
        </MissionCard>

        {/* Misión 2: calificados en primer nivel */}
        <MissionCard
          index={2}
          icon={<UserGroupIcon className="h-4 w-4" />}
          title={t('qualifiersFirstLevel')}
          requirement={target.qualifiers}
          statusText={
            target.qualifiers.met
              ? t('missionDone')
              : t('missingQualifiers', { count: qualifiersGap })
          }
          fmt={fmt}
          t={t}
        >
          {!target.qualifiers.met &&
            (closest.length > 0 ? (
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  {t('closestTitle')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {closest.map((leg) => (
                    <span
                      key={leg.memberId}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#a7c1e2]/40 bg-[#C8DDF2]/20 px-2 py-0.5 text-[11px] text-[#2f5165]"
                      title={`${leg.name} #${leg.customerNumber}`}
                    >
                      <span className="truncate font-medium">{leg.name}</span>
                      <span className="shrink-0 text-[#3E667D]/70">
                        {t('closestChipGap', { points: fmt(leg.pointsToQualify) })}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">{t('noClosest')}</p>
            ))}
        </MissionCard>

        {/* Misión 3: puntos de grupo (con tope por línea) */}
        <MissionCard
          index={3}
          icon={<ChartBarIcon className="h-4 w-4" />}
          title={t('groupPointsCapped')}
          tooltip={capText}
          requirement={target.group}
          unit={t('ptsUnit')}
          statusText={
            target.group.met
              ? t('missionDone')
              : t('missingPoints', { points: fmt(target.group.gap) })
          }
          fmt={fmt}
          t={t}
        >
          {!target.group.met && target.capApplied > 0 && (
            <>
              {target.groupHeadroom > 0 ? (
                <p className="text-xs text-gray-600">
                  {t('groupHeadroom', { points: fmt(target.groupHeadroom) })}
                </p>
              ) : data.legs.length > 0 ? (
                <p className="text-xs text-gray-600">{t('groupNoHeadroom')}</p>
              ) : null}
              {target.newLegsNeeded > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <UserPlusIcon className="h-3 w-3" />
                  {t('newLegsNeeded', { count: target.newLegsNeeded })}
                </span>
              )}
            </>
          )}
        </MissionCard>
      </div>
    </section>
  );
}

interface MissionCardProps {
  index: number;
  icon: ReactNode;
  title: string;
  tooltip?: string;
  requirement: RankRoadmapRequirement;
  unit?: string;
  statusText: string;
  badge?: ReactNode;
  children?: ReactNode;
  fmt: PointsFormatter;
  t: Translate;
}

function MissionCard({
  index,
  icon,
  title,
  tooltip,
  requirement,
  unit,
  statusText,
  badge,
  children,
  fmt,
  t,
}: MissionCardProps) {
  const met = requirement.met;
  const pct = met ? 100 : safePct(requirement.percent);
  const barColor = met
    ? 'bg-emerald-500'
    : pct >= 40
      ? 'bg-gradient-to-r from-[#3E667D] to-[#a7c1e2]'
      : 'bg-gradient-to-r from-amber-400 to-yellow-400';

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border p-4 transition-shadow',
        met ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-white hover:shadow-md',
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            met ? 'bg-emerald-500 text-white' : 'bg-[#3E667D]/10 text-[#3E667D]',
          )}
        >
          {met ? <CheckIcon className="h-4 w-4" /> : icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {t('missionN', { n: index })}
          </p>
          <p className="flex items-start gap-1 text-sm font-bold leading-tight text-gray-900">
            <span className="min-w-0">{title}</span>
            {tooltip && <InfoTip text={tooltip} />}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-1">
        <span className={cn('text-2xl font-bold', met ? 'text-emerald-700' : 'text-gray-900')}>
          {fmt(requirement.current)}
        </span>
        <span className="text-sm text-gray-400">
          / {fmt(requirement.required)}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={title}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${barWidth(pct)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className={cn('text-sm font-semibold', met ? 'text-emerald-700' : 'text-gray-700')}>
          {statusText}
        </p>
        {badge}
      </div>
      {children && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-gray-400 outline-none hover:text-[#3E667D] focus-visible:ring-2 focus-visible:ring-[#a7c1e2]"
          aria-label={text}
        >
          <InformationCircleIcon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tus patas (líneas directas)
// ─────────────────────────────────────────────────────────────────────────────

interface LegsSectionProps {
  data: RankRoadmapResponse;
  fmt: PointsFormatter;
  t: Translate;
}

/**
 * Resumen de las patas en la card (totales + tope) y botón que abre el panel
 * lateral con la lista completa. La lista NO va inline para que la escalera
 * de rangos quede a la vista sin desplazar toda la página.
 */
function LegsSection({ data, fmt, t }: LegsSectionProps) {
  const [open, setOpen] = useState(false);
  const legs = data.legs;
  const cap = data.currentRank.rollOverLimit;
  const hasCap = cap > 0;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-[#3E667D]" />
          <div>
            <h4 className="font-bold text-gray-900">{t('legsTitle')}</h4>
            <p className="text-xs text-gray-500">{t('legsSubtitle')}</p>
          </div>
        </div>
        {legs.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-[#3E667D]/10 px-3 py-1 text-xs font-semibold text-[#3E667D]">
            {t('legsQualified', {
              qualified: data.qualifiedFirstLevel,
              total: data.directCount,
            })}
          </span>
        )}
      </div>

      {legs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E667D]/10">
            <UserPlusIcon className="h-6 w-6 text-[#3E667D]" />
          </div>
          <p className="mt-3 font-semibold text-gray-800">{t('legsEmptyTitle')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('legsEmptyBody')}</p>
          <Button asChild className="mt-4 bg-[#3E667D] text-white hover:bg-[#2f5165]">
            <Link href="/distribuidor/red">
              <UserPlusIcon className="h-4 w-4" />
              {t('legsEmptyCta')}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Totales de grupo con el tope del rango actual */}
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 sm:block sm:p-2.5 sm:text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('legsTotalVolume')}</p>
              <p className="min-w-0 break-all text-base font-bold tabular-nums text-gray-900 sm:text-lg">{fmt(data.groupVolumeRaw)}</p>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 sm:block sm:p-2.5 sm:text-center">
              <p className="text-[10px] uppercase tracking-wide text-emerald-600">{t('legsCounted')}</p>
              <p className="min-w-0 break-all text-base font-bold tabular-nums text-emerald-700 sm:text-lg">{fmt(data.groupCounted)}</p>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 sm:block sm:p-2.5 sm:text-center">
              <p className="text-[10px] uppercase tracking-wide text-amber-600">{t('legsRolledOver')}</p>
              <p className="min-w-0 break-all text-base font-bold tabular-nums text-amber-700 sm:text-lg">{fmt(data.groupRolledOver)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {hasCap ? (
              <p className="flex items-start gap-1.5 text-xs text-gray-500">
                <InformationCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{t('legsCapHint', { cap: fmt(cap), rank: data.currentRank.name })}</span>
              </p>
            ) : (
              <span />
            )}
            <Button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full shrink-0 bg-[#3E667D] text-white hover:bg-[#2f5165] sm:w-auto"
            >
              <UserGroupIcon className="h-4 w-4" />
              {t('legsOpen', { count: legs.length })}
            </Button>
          </div>
          <LegsSheet open={open} onOpenChange={setOpen} data={data} fmt={fmt} t={t} />
        </>
      )}
    </section>
  );
}

type LegsFilter = 'all' | 'pending' | 'qualified';
const LEGS_FILTERS: LegsFilter[] = ['all', 'pending', 'qualified'];

interface LegsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RankRoadmapResponse;
  fmt: PointsFormatter;
  t: Translate;
}

/** Panel lateral con TODAS las patas, con búsqueda y filtro por calificación. */
function LegsSheet({ open, onOpenChange, data, fmt, t }: LegsSheetProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LegsFilter>('all');
  const legs = data.legs;
  const cap = data.currentRank.rollOverLimit;
  const hasCap = cap > 0;
  // Misma escala para todas las barras de pata (como en Mi Red).
  const maxBar = Math.max(1, cap, ...legs.map((l) => l.legVolume));
  // "Más cerca": la primera sin calificar con puntos (la API ya ordena así).
  const closestId = legs.find((l) => !l.isQualified && l.personalPoints > 0)?.memberId ?? null;
  const pendingCount = legs.length - data.qualifiedFirstLevel;

  const q = query.trim().toLowerCase();
  const visible = legs.filter((l) => {
    if (filter === 'pending' && l.isQualified) return false;
    if (filter === 'qualified' && !l.isQualified) return false;
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.customerNumber.toLowerCase().includes(q)
    );
  });

  const filterLabel = (f: LegsFilter) =>
    f === 'all'
      ? t('legsFilterAll', { count: legs.length })
      : f === 'pending'
        ? t('legsFilterPending', { count: pendingCount })
        : t('legsFilterQualified', { count: data.qualifiedFirstLevel });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-gray-100 px-5 pb-4 pr-12 pt-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-gray-900">
            <UserGroupIcon className="h-5 w-5 text-[#3E667D]" />
            {t('legsTitle')}
          </SheetTitle>
          <SheetDescription>{t('legsSubtitle')}</SheetDescription>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#3E667D]/10 px-3 py-1 text-xs font-semibold text-[#3E667D]">
              {t('legsQualified', {
                qualified: data.qualifiedFirstLevel,
                total: data.directCount,
              })}
            </span>
            {hasCap && (
              <span className="text-xs text-gray-500">
                {t('legsCapHint', { cap: fmt(cap), rank: data.currentRank.name })}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('legsSearch')}
                aria-label={t('legsSearch')}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label={t('legsFilterAria')}>
              {LEGS_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    filter === f
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {filterLabel(f)}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">{t('legsOrderHint')}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">{t('legsNoResults')}</p>
          ) : (
            <div className="space-y-2">
              {visible.map((leg) => (
                <LegCard
                  key={leg.memberId}
                  leg={leg}
                  threshold={data.qualificationThreshold}
                  cap={cap}
                  maxBar={maxBar}
                  isClosest={leg.memberId === closestId}
                  fmt={fmt}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface LegCardProps {
  leg: RankRoadmapLeg;
  threshold: number;
  cap: number;
  maxBar: number;
  isClosest: boolean;
  fmt: PointsFormatter;
  t: Translate;
}

function LegCard({ leg, threshold, cap, maxBar, isClosest, fmt, t }: LegCardProps) {
  const hasCap = cap > 0;
  const personalPct = threshold > 0 ? safePct((leg.personalPoints / threshold) * 100) : 100;
  const countedPct = safePct((Math.min(leg.counted, maxBar) / maxBar) * 100);
  const rolledPct = safePct((Math.min(leg.rolledOver, maxBar) / maxBar) * 100);
  const capPct = hasCap ? safePct((Math.min(cap, maxBar) / maxBar) * 100) : 0;
  const status = isKnownStatus(leg.status) ? leg.status : null;

  return (
    <div className="rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {isClosest && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                {t('legClosest')}
              </span>
            )}
            {leg.atCap && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                {t('legCap')}
              </span>
            )}
            <span className="truncate font-semibold text-gray-900">{leg.name}</span>
            <span className="text-xs text-gray-400">#{leg.customerNumber}</span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500">
            {leg.rankName && <span>{leg.rankName} ·</span>}
            <span className="inline-flex items-center gap-1">
              <span
                className={cn('h-1.5 w-1.5 rounded-full', status ? statusDot[status] : 'bg-gray-300')}
                aria-hidden="true"
              />
              {status ? t(`status.${status}`) : leg.status}
            </span>
            <span>· {t('legMembers', { active: leg.activeCount, total: leg.memberCount })}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {leg.isQualified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <CheckIcon className="h-3 w-3" />
              {t('qualifiedBadge')}
            </span>
          ) : leg.personalPoints > 0 ? (
            <span className="text-xs font-medium text-amber-600">
              {t('legToQualify', { points: fmt(leg.pointsToQualify) })}
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-400">{t('legNoPoints')}</span>
          )}
        </div>
      </div>

      {/* Personales del frontal vs umbral de calificación */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>{t('legPersonalLabel')}</span>
          <span>
            {fmt(leg.personalPoints)} / {fmt(threshold)} {t('ptsUnit')}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              leg.isQualified ? 'bg-emerald-500' : 'bg-amber-400',
            )}
            style={{ width: `${barWidth(personalPct)}%` }}
          />
        </div>
      </div>

      {/* Volumen de la pata: cuenta (teal) + rolla (ámbar) + marcador del tope */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>{t('legVolumeLabel')}</span>
          <span className="font-semibold text-gray-700">
            {fmt(leg.legVolume)} {t('ptsUnit')}
          </span>
        </div>
        <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="absolute left-0 top-0 h-full bg-[#3E667D]"
            style={{ width: `${countedPct}%` }}
          />
          <div
            className="absolute top-0 h-full bg-amber-400"
            style={{ left: `${countedPct}%`, width: `${rolledPct}%` }}
          />
          {hasCap && (
            <div
              className="absolute top-[-2px] h-[14px] w-0.5 bg-gray-700"
              style={{ left: `${capPct}%` }}
              title={t('capTitle', { amount: fmt(cap) })}
            />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 text-[11px]">
          <span className="font-medium text-[#3E667D]">
            {t('legContributes', { points: fmt(leg.counted) })}
          </span>
          {leg.rolledOver > 0 ? (
            <span className="font-medium text-amber-600">
              {t('legRollsOver', { points: fmt(leg.rolledOver) })}
            </span>
          ) : hasCap && leg.headroom > 0 ? (
            <span className="text-gray-400">
              {t('legHeadroom', { points: fmt(leg.headroom) })}
            </span>
          ) : hasCap ? (
            <span className="font-medium text-emerald-600">{t('legAtCap')}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function RoadmapSkeleton() {
  return (
    <Card className="overflow-hidden border-0 p-0 shadow-lg">
      <div className="bg-gradient-to-br from-[#3E667D] via-[#2f5165] to-[#3E667D] p-5 sm:p-6">
        <Skeleton className="h-6 w-56 bg-white/20" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full bg-white/15" />
        <div className="mt-6 flex items-center gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full bg-white/20 sm:h-20 sm:w-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24 bg-white/15" />
            <Skeleton className="h-3 w-full bg-white/20" />
          </div>
          <Skeleton className="h-14 w-14 shrink-0 rounded-full bg-white/20 sm:h-20 sm:w-20" />
        </div>
      </div>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
