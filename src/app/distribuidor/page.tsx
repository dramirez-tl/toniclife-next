'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ChartBarIcon,
  UsersIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  GiftIcon,
  UserPlusIcon,
  AcademicCapIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  WifiIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RankMedal } from '@/components/distributor/RankMedal';
import { RANK_LABELS } from '@/constants/ranks';
import type { RankType } from '@/types/network';
import { usePaymentData } from '@/hooks/usePaymentData';
import {
  useDistributorDashboard,
  useRankRoadmap,
  useCopyReferralLink,
  useShareReferralLink,
} from '@/hooks/useDistributor';
import { useMyCourses } from '@/hooks/useCourses';
import { useCurrentPeriod, useCommissionPeriods, periodsUpToCurrent } from '@/hooks/useCommissions';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { localeLanguage } from '@/i18n/config';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { toast } from 'sonner';

// Mapas de íconos/colores de la actividad reciente. OCULTOS TEMPORALMENTE junto
// con la tarjeta "Lo que ha pasado" (mostraba montos de comisión). Restaurar
// descomentando esto, la entrada `recentActivity` del destructuring y la
// tarjeta más abajo.
/*
const activityIcons: Record<string, typeof ChartBarIcon> = {
  sale: ChartBarIcon,
  recruit: UsersIcon,
  commission: CurrencyDollarIcon,
  qualification: TrophyIcon,
  rank_change: TrophyIcon,
};

const activityColors: Record<string, string> = {
  sale: 'bg-[#C8DDF2]/10 text-[#3E667D]',
  recruit: 'bg-blue-50 text-blue-600',
  commission: 'bg-purple-50 text-purple-600',
  qualification: 'bg-yellow-50 text-yellow-600',
  rank_change: 'bg-amber-50 text-amber-600',
};
*/

/** 'YYYY-MM-DD' → Date LOCAL (nunca new Date('YYYY-MM-DD'), que cae en UTC y
 *  recorre un día en México). Tolera un sufijo de hora por si acaso. */
function parseYmd(value?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Días enteros de a → b (redondeo por cambios de horario). */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Número finito seguro (los montos del API pueden venir como string decimal). */
function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const safePct = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;

/** Ancho de barra: mínimo visible cuando hay avance > 0. */
const barWidth = (pct: number) => (pct <= 0 ? 0 : Math.max(pct, 2));

export default function DistribuidorDashboard() {
  const t = useTranslations('distributor.dashboard');
  // Claves compartidas con "Tu camino al siguiente rango" (misiones, proyección).
  const tr = useTranslations('distributor.commissions.rankStepper');
  const locale = useLocale();
  // Formato de números/fechas según el idioma de la cuenta (no el del navegador).
  const numLocale = localeLanguage(locale) === 'en' ? 'en-US' : 'es-MX';
  const fmt = (n: number | string | null | undefined) =>
    toNumber(n).toLocaleString(numLocale, { maximumFractionDigits: 0 });
  const user = useAppSelector(selectUser);
  const currencyCode = user?.currencyCode || 'MXN';
  const isUsd = currencyCode === 'USD';
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat(isUsd ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  // Para montos cuya moneda REAL la dicta el API (comisiones: convertidas a
  // la moneda del distribuidor cuando hay tasa; MXN si no la hubo).
  const formatMoneyIn = (amount: number, cur: string) =>
    new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: cur || 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const [showPointsDetail, setShowPointsDetail] = useState(false);

  // Periodo seleccionado (default: periodo actual). Permite ver periodos pasados.
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const { data: currentPeriodData } = useCurrentPeriod();
  const { data: periodsData } = useCommissionPeriods();
  useEffect(() => {
    if (currentPeriodData?.id && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriodData.id);
    }
  }, [currentPeriodData, selectedPeriodId]);

  const periodsArray = Array.isArray(periodsData)
    ? periodsData
    : (periodsData as any)?.data ?? [];
  const sortedPeriods = [...periodsArray].sort((a: any, b: any) => {
    const ad = String(a?.startDate ?? a?.start_date ?? '');
    const bd = String(b?.startDate ?? b?.start_date ?? '');
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);
    return (
      Number(b?.periodNumber ?? b?.period_number ?? 0) -
      Number(a?.periodNumber ?? a?.period_number ?? 0)
    );
  });
  const currentPeriodId = currentPeriodData?.id ?? '';
  const isCurrentSelected = !!currentPeriodId && selectedPeriodId === currentPeriodId;
  const isPastPeriod = !!selectedPeriodId && !isCurrentSelected;

  // React Query hooks
  const {
    profile,
    points,
    networkSummary,
    commissionsSummary,
    previousPeriodCommissions,
    // recentActivity, // oculto temporalmente (tarjeta "Lo que ha pasado")
    isLoading,
    isRefreshing,
    isError,
    error,
    refetch,
  } = useDistributorDashboard(selectedPeriodId || undefined);

  // Siguiente rango y sus 3 misiones: misma fuente que "Tu camino al siguiente
  // rango" en Comisiones (GET /distributor/rank-roadmap del periodo elegido).
  // Sin periodId el API resuelve el periodo actual en el servidor (igual que
  // /dashboard): la query NO se gatea por selectedPeriodId, así un fallo o
  // demora de /mlm/periods/current degrada al periodo actual en vez de dejar
  // el bloque en skeleton permanente.
  const roadmap = useRankRoadmap(selectedPeriodId || undefined);

  // Comisión del PERIODO ANTERIOR (lo cobrado en el último cierre): con el
  // periodo actual seleccionado, la tarjeta de comisiones muestra ese monto
  // — las del periodo en curso no existen hasta el cierre. Viene en el mismo
  // payload del dashboard (previousPeriodCommissions); ya no se pide un
  // segundo dashboard. Moneda REAL según el API (moneda del distribuidor si
  // hubo tasa del periodo; MXN si no se pudo convertir).
  const prevPeriodNet = previousPeriodCommissions
    ? toNumber(
        previousPeriodCommissions.netAfterWithholdings ??
          previousPeriodCommissions.totalNet,
      )
    : null;
  const prevPeriodName = previousPeriodCommissions?.periodName ?? '';
  const prevPeriodCurrency =
    previousPeriodCommissions?.currencyCode || currencyCode;
  // Periodo pasado seleccionado: neto después de retenciones. Si el payload
  // no trae netAfterWithholdings se calcula aquí (totalNet - retenciones),
  // igual que lo hace el API para previousPeriodCommissions: el mismo periodo
  // debe mostrar el MISMO monto venga de donde venga.
  const pastPeriodNet =
    commissionsSummary?.netAfterWithholdings != null
      ? toNumber(commissionsSummary.netAfterWithholdings)
      : toNumber(commissionsSummary?.totalNet) -
        toNumber(commissionsSummary?.companyWithholdings);

  const copyLinkMutation = useCopyReferralLink();
  const shareLinkMutation = useShareReferralLink();
  const { data: paymentData } = usePaymentData();
  const { data: myCourses = [] } = useMyCourses();

  // Extraer el código de referido del perfil
  const referralCode = useMemo(() => {
    if (profile?.referralCode) return profile.referralCode;
    if (profile?.personalLink) {
      try {
        const url = new URL(profile.personalLink);
        const refParam = url.searchParams.get('ref');
        if (refParam) return refParam;
      } catch {
        // Si personalLink no es una URL válida, continuar
      }
    }
    if (profile?.code) return profile.code;
    return null;
  }, [profile?.referralCode, profile?.personalLink, profile?.code]);

  // Enlaces dinámicos (funcionan en localhost, QA y producción)
  const dynamicPersonalLink = useMemo(() => {
    if (typeof window === 'undefined' || !referralCode) return '';
    return `${window.location.origin}/registro/distribuidor?ref=${referralCode}`;
  }, [referralCode]);

  const dynamicStoreLink = useMemo(() => {
    if (typeof window === 'undefined' || !referralCode) return '';
    return `${window.location.origin}/productos?ref=${referralCode}`;
  }, [referralCode]);

  const handleShareLink = async () => {
    if (!dynamicPersonalLink) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        link: dynamicPersonalLink,
        title: t('share.shareTitle'),
        text: t('share.shareText'),
      });
      if (result.method === 'clipboard') {
        toast.success(t('toasts.linkCopied'));
      } else {
        toast.success(t('toasts.linkShared'));
      }
    } catch {
      toast.error(t('toasts.shareError'));
    }
  };

  const handleCopyStoreLink = async () => {
    if (!dynamicStoreLink) return;
    try {
      await copyLinkMutation.mutateAsync(dynamicStoreLink);
      toast.success(t('toasts.storeLinkCopied'));
    } catch {
      toast.error(t('toasts.copyError'));
    }
  };

  const handleRefresh = () => {
    refetch();
    roadmap.refetch();
    toast.success(t('refreshing'));
  };

  const handleDownloadQr = (link?: string) => {
    const target =
      typeof link === 'string' && link
        ? link
        : dynamicStoreLink || dynamicPersonalLink;
    if (!target) {
      toast.error(t('toasts.qrError'));
      return;
    }
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(target)}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = qrUrl;
    downloadLink.download = `qr-toniclife-${referralCode || 'enlace'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success(t('toasts.qrDownloading'));
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      toast.success(t('toasts.codeCopied'));
    } catch {
      toast.error(t('toasts.codeCopyError'));
    }
  };

  const handleShareWhatsApp = () => {
    if (!dynamicStoreLink) {
      toast.error(t('toasts.linkError'));
      return;
    }
    const text = encodeURIComponent(t('share.whatsappText', { link: dynamicStoreLink }));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-5">
        <div className="h-56 bg-gray-200 rounded-2xl" />
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-lg w-full mx-4 overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
              <ServerIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('error.title')}</h2>
          </div>
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <WifiIcon className="h-5 w-5" />
                <span className="text-sm">{t('error.offline')}</span>
              </div>
              <p className="text-gray-600">{t('error.body')}</p>
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-gray-50 rounded-lg p-3 text-left">
                  <p className="text-xs font-mono text-gray-500 break-all">
                    {error instanceof Error ? error.message : 'Error desconocido'}
                  </p>
                </div>
              )}
              <div className="pt-4 space-y-3">
                <Button
                  variant="default"
                  className="w-full bg-[#3E667D] hover:bg-[#002a5c]"
                  onClick={() => refetch()}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  {t('error.retry')}
                </Button>
                <div className="flex gap-3">
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full">{t('error.goHome')}</Button>
                  </Link>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">{t('error.suggestions')}</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-2">
                    <ExclamationCircleIcon className="h-3 w-3 text-gray-400" />
                    {t('error.checkConnection')}
                  </li>
                  <li className="flex items-center gap-2">
                    <ExclamationCircleIcon className="h-3 w-3 text-gray-400" />
                    {t('error.reloadLater')}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Calificación personal del periodo ──
  const personalPoints = points?.personalPoints || 0;
  const personalRequired = points?.personalPointsRequired || 3300;
  const personalPointsGap = Math.max(0, personalRequired - personalPoints);
  const progressPercent = Math.min(
    100,
    Math.round((personalPoints / personalRequired) * 100),
  );

  // ── Fechas del periodo (26→25) ──
  // startDate/endDate llegan como 'YYYY-MM-DD' y daysRemaining lo calcula
  // Postgres con la fecha de México: aquí NO se usa la hora del navegador.
  const periodStart = parseYmd(points?.startDate);
  const periodEnd = parseYmd(points?.endDate);
  const daysRemaining = Math.max(0, points?.daysRemaining ?? 0);
  const totalDays =
    periodStart && periodEnd ? Math.max(1, daysBetween(periodStart, periodEnd)) : 0;
  // Fracción transcurrida del periodo (0 el día 26, 1 el día 25).
  const elapsedFraction =
    totalDays > 0
      ? Math.min(1, Math.max(0, (totalDays - daysRemaining) / totalDays))
      : 1;
  const endDateLabel = periodEnd
    ? new Intl.DateTimeFormat(numLocale, { day: 'numeric', month: 'short' }).format(periodEnd)
    : '';

  // Semáforo por RITMO: compara los puntos que llevas con los que "deberías"
  // llevar a estas alturas del periodo (no contra el total del periodo).
  // El día 26 aún no se espera nada (expectedSoFar = 0): ahí el ritmo es
  // "bien" por definición y el semáforo NO se muestra (solo el % de
  // calificación) hasta que haya al menos un día contra qué comparar.
  const expectedSoFar = personalRequired * elapsedFraction;
  const paceRatio = personalPoints / Math.max(1, expectedSoFar);
  const pace: 'good' | 'ok' | 'low' =
    expectedSoFar <= 0 ? 'good' : paceRatio >= 1 ? 'good' : paceRatio >= 0.7 ? 'ok' : 'low';
  const showPace = !isPastPeriod && expectedSoFar > 0;
  const progressColor = {
    good: 'from-emerald-400 to-emerald-500',
    ok: 'from-amber-400 to-yellow-400',
    low: 'from-red-400 to-orange-400',
  }[pace];
  const progressDot = {
    good: 'bg-emerald-400',
    ok: 'bg-amber-400',
    low: 'bg-red-400',
  }[pace];
  const progressLabel = {
    good: t('hero.statusGood'),
    ok: t('hero.statusOk'),
    low: t('hero.statusLow'),
  }[pace];

  // El rango actual sale del PERFIL (fuente de verdad): un distribuidor que aún no
  // califica es "Distribuidor", no "Bronce".
  const currentRankCode = (profile?.rank || 'distribuidor') as RankType;
  const currentRankLabel = profile?.rankLabel || RANK_LABELS[currentRankCode] || t('distributor');

  // ── Siguiente rango (camino de rango del periodo) ──
  const roadmapData = roadmap.data;
  const nextRank = roadmapData?.nextRank ?? null;
  // Avance global = promedio de las 3 misiones (igual que RoadmapHeader).
  const nextRankPercent = nextRank
    ? Math.round(
        (safePct(nextRank.personal.percent) +
          safePct(nextRank.qualifiers.percent) +
          safePct(nextRank.group.percent)) /
          3,
      )
    : 0;
  const projectedRank =
    roadmapData?.projectedRank &&
    roadmapData.projectedRank.rankNumber > roadmapData.currentRank.rankNumber
      ? roadmapData.projectedRank
      : null;
  // Cada misión declara su unidad para que el "te faltan" use la misma copy
  // que RankRoadmap en Comisiones (pts vs calificados, con plural correcto).
  const missions = nextRank
    ? [
        { key: 'personal', icon: ChartBarIcon, label: tr('personalPoints'), req: nextRank.personal, unit: 'points' as const },
        { key: 'qualifiers', icon: UserGroupIcon, label: tr('qualifiersFirstLevel'), req: nextRank.qualifiers, unit: 'qualifiers' as const },
        { key: 'group', icon: UsersIcon, label: tr('groupPointsCapped'), req: nextRank.group, unit: 'points' as const },
      ]
    : [];

  // ── Puntos de grupo con tope ──
  // El API manda groupCounted/groupRolledOver; el fallback replica su regla
  // (points_group_roll_over cuando > 0, si no points_group) por si el payload
  // viejo aún no los trae.
  const groupPoints = points?.groupPoints || 0;
  const groupCounted =
    points?.groupCounted ??
    ((points?.rolloverPoints || 0) > 0 ? points?.rolloverPoints || 0 : groupPoints);
  const groupRolledOver =
    points?.groupRolledOver ?? Math.max(0, groupPoints - groupCounted);

  // Estilo compartido de las tarjetas de acción rápida
  const actionBox =
    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#a7c1e2] hover:bg-[#C8DDF2]/5 transition-all cursor-pointer text-center';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{t('title')}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-full"
          title={t('refresh')}
        >
          <ArrowPathIcon className={`h-5 w-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* ══════════════ Selector de periodo (default: actual) ══════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDaysIcon className="h-4 w-4 shrink-0 text-[#3E667D]" />
        <div className="w-full max-w-[260px]">
          <SearchableSelect
            options={periodsUpToCurrent(sortedPeriods).map((period: any) => ({
              value: period.id,
              label: `${period.name}${period.isCurrent ? ` (${t('current')})` : ''}`,
            }))}
            value={selectedPeriodId}
            onChange={setSelectedPeriodId}
            placeholder={t('selectPeriod')}
            showAllOption={false}
          />
        </div>
        {isPastPeriod && (
          <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
            {t('pastPeriod')}
          </span>
        )}
      </div>

      {/* ══════════════ HERO — Rango, periodo, calificación y siguiente rango ══════════════ */}
      <Card className="border-0 shadow-lg overflow-hidden p-0">
        <div className="bg-gradient-to-br from-[#3E667D] via-[#2f5165] to-[#3E667D] p-6 text-white">
          {/* Rango actual con medalla + chip de periodo (siempre visible) */}
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="flex items-center gap-4">
              <RankMedal rank={currentRankCode} size="lg" glow zoomable />
              <div className="min-w-0">
                <p className="text-white/60 text-xs uppercase tracking-wide">{t('hero.level')}</p>
                <h2 className="text-2xl font-bold leading-tight">{currentRankLabel}</h2>
                {points?.isPersonalQualified ? (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-emerald-100 bg-emerald-500/25 px-2 py-0.5 rounded-full">
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    {t('hero.qualified')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-amber-100 bg-amber-400/25 px-2 py-0.5 rounded-full">
                    {isPastPeriod ? t('hero.notQualifiedPast') : t('hero.inProgress')}
                  </span>
                )}
              </div>
            </div>

            {points && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                  <CalendarDaysIcon className="h-4 w-4 text-white/80" />
                  {points.periodName}
                </span>
                {isPastPeriod ? (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    {tr('periodFinal')}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100">
                    {t('hero.periodDays', { days: daysRemaining })}
                  </span>
                )}
                {endDateLabel && (
                  <span className="text-xs text-white/70">
                    {isPastPeriod
                      ? t('hero.closed', { date: endDateLabel })
                      : t('hero.closes', { date: endDateLabel })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Calificación del periodo (en pasado si el periodo ya cerró) */}
          <div className="mt-6">
            {points?.isPersonalQualified ? (
              <p className="text-white/80 text-sm">
                {isPastPeriod
                  ? t('hero.qualifiedBodyPast', { current: fmt(personalPoints) })
                  : t('hero.qualifiedBody', { points: fmt(personalRequired) })}
              </p>
            ) : (
              <>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold">{t('hero.goal')}</span>
                  <span className="text-xs text-white/70">
                    {t('hero.pts', {
                      current: fmt(personalPoints),
                      required: fmt(personalRequired),
                    })}
                  </span>
                </div>
                <div className="h-3 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`}
                    style={{ width: `${barWidth(progressPercent)}%` }}
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 mt-2 text-xs text-white/70">
                  {/* El ritmo solo tiene sentido con el periodo en curso y
                      cuando ya hay algo contra qué comparar (no el día 26) */}
                  {showPace && (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${progressDot}`} />
                      {progressLabel}
                    </span>
                  )}
                  <span className="ml-auto">{t('hero.pctOfQualification', { pct: progressPercent })}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-white">
                  {isPastPeriod
                    ? t('hero.gapPast', {
                        current: fmt(personalPoints),
                        required: fmt(personalRequired),
                      })
                    : t('hero.gap', { points: fmt(personalPointsGap) })}
                </p>
              </>
            )}
          </div>

          {/* Siguiente rango: medalla bloqueada + las 3 misiones (camino de rango) */}
          {roadmap.isPending ? (
            <Skeleton className="mt-6 h-32 w-full rounded-xl bg-white/10" />
          ) : roadmap.isError || !roadmapData ? null : nextRank ? (
            <Link
              href="/distribuidor/comisiones"
              className="group mt-6 block rounded-xl bg-white/10 p-3.5 transition-colors hover:bg-white/15"
            >
              <div className="flex items-center gap-3">
                <RankMedal rank={nextRank.code} size="md" locked label={nextRank.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
                    {t('hero.nextGoal')}
                  </p>
                  <p className="font-semibold leading-tight truncate">{nextRank.name}</p>
                  <p className="text-xs text-white/70">
                    {tr('missionsDone', { count: nextRank.metCount })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-lg font-bold tabular-nums">{nextRankPercent}%</span>
                  <ChevronRightIcon className="h-4 w-4 text-white/50" />
                </div>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C8DDF2] to-emerald-300 transition-all duration-700"
                  style={{ width: `${barWidth(nextRankPercent)}%` }}
                />
              </div>

              {/* items-start + sin truncate: en 375px la etiqueta baja a dos
                  líneas en vez de perder "(con tope)" / "1er nivel". */}
              <ul className="mt-3 space-y-1.5">
                {missions.map(({ key, icon: Icon, label, req, unit }) => (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                        req.met ? 'bg-emerald-300 text-[#1f3a4a]' : 'bg-white/15 text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 pt-[3px] leading-tight text-white/85">{label}</span>
                    {req.met ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 pt-1 text-xs font-semibold text-emerald-200">
                        <CheckIcon className="h-3.5 w-3.5" />
                        {t('hero.missionReady')}
                      </span>
                    ) : (
                      <span className="shrink-0 pt-1 text-xs font-semibold text-amber-100">
                        {unit === 'qualifiers'
                          ? tr('missingQualifiers', { count: Math.ceil(Math.max(0, req.gap)) })
                          : tr('missingPoints', { points: fmt(req.gap) })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {projectedRank && (
                <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-emerald-100">
                  <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  <span>{tr('projectedRank', { rank: projectedRank.name })}</span>
                </p>
              )}

              <p className="mt-3 flex items-center justify-end gap-0.5 text-xs font-semibold text-white/80 group-hover:text-white">
                {t('hero.viewPath')}
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </p>
            </Link>
          ) : (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-3 text-sm font-semibold">
              <TrophyIcon className="h-5 w-5 shrink-0 text-yellow-300" />
              {t('hero.maxRank')}
            </p>
          )}

          {/* CTA: en un periodo cerrado ya no hay nada que vender/lograr, así
              que la única acción es volver al periodo actual. */}
          <div className="mt-5">
            {isPastPeriod ? (
              currentPeriodId ? (
                <Button
                  type="button"
                  variant="default"
                  className="bg-white text-[#3E667D] hover:bg-white/90 font-semibold w-full sm:w-auto"
                  onClick={() => setSelectedPeriodId(currentPeriodId)}
                >
                  {t('hero.ctaCurrentPeriod')}
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              ) : null
            ) : (
              <Button
                asChild
                variant="default"
                className="bg-white text-[#3E667D] hover:bg-white/90 font-semibold w-full sm:w-auto"
              >
                <Link
                  href={
                    points?.isPersonalQualified
                      ? '/distribuidor/compartir-carrito'
                      : '/distribuidor/comisiones'
                  }
                >
                  {points?.isPersonalQualified ? t('hero.ctaQualified') : t('hero.ctaProgress')}
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ══════════════ Tira de 3 números clave ══════════════ */}
      <Card className="p-0">
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="p-4 text-center">
              <CurrencyDollarIcon className="h-5 w-5 text-[#3E667D] mx-auto mb-1" />
              {isCurrentSelected ? (
                prevPeriodNet != null && prevPeriodName ? (
                  <>
                    {/* Lo COBRADO del último cierre (neto tras retenciones);
                        lo del periodo en curso no existe hasta cerrar. */}
                    <p className="text-lg font-bold text-[#3E667D] leading-tight">
                      {formatMoneyIn(prevPeriodNet, prevPeriodCurrency)}
                    </p>
                    <p className="text-[11px] font-medium text-gray-600">
                      {t('stats.commissionsPrevPeriod', { period: prevPeriodName })}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {t('stats.currentAtCloseHint')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-bold text-gray-400 leading-tight mt-0.5">{t('stats.atClose')}</p>
                    <p className="text-[11px] font-medium text-gray-600">{t('stats.commissions')}</p>
                    <p className="text-[10px] text-gray-400">{t('stats.commissionsAtClose')}</p>
                  </>
                )
              ) : (
                <>
                  <p className="text-lg font-bold text-[#3E667D] leading-tight">
                    {formatMoneyIn(
                      pastPeriodNet,
                      commissionsSummary?.currencyCode || currencyCode,
                    )}
                  </p>
                  <p className="text-[11px] font-medium text-gray-600">{t('stats.commissions')}</p>
                  <p className="text-[10px] text-gray-400">{t('stats.thisPeriodCurrency', { currency: commissionsSummary?.currencyCode || currencyCode })}</p>
                </>
              )}
            </div>
            <div className="p-4 text-center">
              <UsersIcon className="h-5 w-5 text-[#3E667D] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#3E667D] leading-tight">
                {fmt(networkSummary?.totalDistributors)}
              </p>
              <p className="text-[11px] font-medium text-gray-600">{t('stats.inNetwork')}</p>
              <p className="text-[10px] text-gray-400">
                {t('stats.activeCount', { count: networkSummary?.activeDistributors || 0 })}
              </p>
            </div>
            <div className="p-4 text-center">
              <ChartBarIcon className="h-5 w-5 text-[#3E667D] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#3E667D] leading-tight">
                {fmt(groupCounted)}
              </p>
              <p className="text-[11px] font-medium text-gray-600">{t('stats.points')}</p>
              <p className="text-[10px] text-gray-400">
                {t('stats.personalHint', { personal: fmt(personalPoints) })}
              </p>
            </div>
          </div>

          {points && (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowPointsDetail((v) => !v)}
                className="w-full h-auto border-t border-gray-100 py-2 text-xs font-medium text-[#3E667D] flex items-center justify-center gap-1 hover:bg-gray-50 rounded-none"
              >
                {showPointsDetail ? t('stats.hideBreakdown') : t('stats.showBreakdown')}
                {showPointsDetail ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              </Button>
              {showPointsDetail && (
                <div className="border-t border-gray-100 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('stats.pointsFromSales')}</span>
                    <span className="font-semibold text-[#3E667D]">{fmt(personalPoints)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('stats.pointsFromTeam')}</span>
                    <span className="font-semibold text-[#3E667D]">{fmt(groupPoints)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('stats.groupCounted')}</span>
                    <span className="font-semibold text-emerald-600">{fmt(groupCounted)}</span>
                  </div>
                  {groupRolledOver > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('stats.groupRolledOver')}</span>
                      <span className="font-semibold text-amber-600">{fmt(groupRolledOver)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ══════════════ CTA: comprar a precio de distribuidor ══════════════ */}
      <Link href="/productos" className="block">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3E667D] to-[#0A4B94] text-white shadow-lg transition-transform hover:-translate-y-0.5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <ShoppingBagIcon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold">{t('buyCta.title')}</p>
              <p className="text-sm text-white/80">{t('buyCta.body')}</p>
            </div>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-white/70" />
          </CardContent>
        </Card>
      </Link>

      {/* ══════════════ Acciones rápidas ══════════════ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('actions.title')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Link href="/distribuidor/compartir-carrito" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#abc9ba]/20 flex items-center justify-center">
                <ShoppingBagIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('actions.shareCart')}</span>
            </Link>
            <Link href="/distribuidor/ventas" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#C8DDF2]/20 flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('actions.newSale')}</span>
            </Link>
            <Link href="/distribuidor/red?alta=socio" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
                <UserPlusIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('actions.enrollPartner')}</span>
            </Link>
            <Link href="/distribuidor/red?alta=preferente" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#abc9ba]/20 flex items-center justify-center">
                <UserPlusIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('actions.preferredCustomer')}</span>
            </Link>
            <Link href="/distribuidor/red" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('actions.myTeam')}</span>
            </Link>
            <Link href="/distribuidor/comisiones" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#a7c1e2]/20 flex items-center justify-center">
                <CurrencyDollarIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('actions.myCommissions')}</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════ Banners contextuales ══════════════ */}
      {paymentData && paymentData.overallStatus === 'incomplete' && (
        <Link
          href="/distribuidor/pagos"
          className="block rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {t('banners.completeData')}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {t('banners.completeDataBody')}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-amber-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
          </div>
        </Link>
      )}

      {myCourses.length > 0 && (
        <Link
          href="/distribuidor/capacitacion"
          className="block rounded-xl border border-[#a7c1e2] bg-gradient-to-r from-[#C8DDF2]/40 to-[#abc9ba]/30 p-4 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
              <AcademicCapIcon className="h-5 w-5 text-[#3E667D]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2f5165]">
                {t('banners.courses', { count: myCourses.length })}
              </p>
              <p className="text-xs text-[#3E667D]/80 mt-0.5 line-clamp-1">
                {myCourses.length === 1
                  ? myCourses[0].title
                  : t('banners.coursesBody')}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-[#3E667D]/50 group-hover:text-[#3E667D] transition-colors flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* ══════════════ Comparte y gana ══════════════ */}
      <Card className="overflow-hidden border-0 shadow-md p-0">
        {/* Encabezado cálido + código de referido */}
        <div className="bg-gradient-to-br from-[#3E667D] to-[#0A4B94] px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <GiftIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-tight">{t('share.title')}</h3>
              <p className="text-sm text-white/80">{t('share.body')}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-white/60">{t('share.yourCode')}</p>
              <p className="text-xl font-bold tracking-wider truncate">
                {referralCode || '—'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              disabled={!referralCode}
              className="shrink-0"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              {t('share.copyCode')}
            </Button>
          </div>
        </div>

        <CardContent className="p-5">
          {/* Acción principal: WhatsApp */}
          <Button
            size="lg"
            onClick={handleShareWhatsApp}
            disabled={!dynamicStoreLink}
            className="w-full bg-[#15803d] text-white hover:bg-[#166534]"
          >
            <ShareIcon className="h-5 w-5" />
            {t('share.whatsapp')}
          </Button>

          {/* Secundarias */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleCopyStoreLink}
              disabled={copyLinkMutation.isPending}
              className="border-[#a7c1e2] text-[#3E667D] hover:bg-[#C8DDF2]/10"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              {t('share.copyLink')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownloadQr(dynamicStoreLink)}
              disabled={!dynamicStoreLink}
              className="border-[#a7c1e2] text-[#3E667D] hover:bg-[#C8DDF2]/10"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t('share.qr')}
            </Button>
          </div>

          {/* Invitar socios (enlace de registro) */}
          <button
            type="button"
            onClick={handleShareLink}
            disabled={shareLinkMutation.isPending}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-[#3E667D] hover:underline disabled:opacity-50"
          >
            <UsersIcon className="h-4 w-4" />
            {t('share.invitePartners')}
          </button>
        </CardContent>
      </Card>

      {/* "Lo que ha pasado" (actividad reciente) OCULTA TEMPORALMENTE: mostraba
          montos de comisión acreditada. Restaurar quitando este envoltorio de
          comentario y descomentando activityIcons/activityColors, recentActivity
          y el import de TrophyIcon. */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle>Lo que ha pasado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const Icon = activityIcons[activity.type] || ChartBarIcon;
                const colorClass = activityColors[activity.type] || 'bg-gray-50 text-gray-600';
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                      <Icon className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {activity.amount !== undefined && (
                          <span className="text-sm font-semibold text-[#3E667D]">
                            +{formatMoney(activity.amount)}
                            <span className="text-[9px] font-semibold text-gray-400 ml-0.5">{currencyCode}</span>
                          </span>
                        )}
                        {activity.personName && (
                          <span className="text-sm text-gray-500">{activity.personName}</span>
                        )}
                        {activity.description && (
                          <span className="text-sm text-gray-500">{activity.description}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{activity.relativeTime}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#C8DDF2]/30">
                  <GiftIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
                <p className="font-semibold text-gray-900">¡Tu historia empieza aquí!</p>
                <p className="mx-auto mt-1 mb-4 max-w-xs text-sm text-gray-500">
                  Comparte tu enlace o haz tu primera venta. Cada paso suma puntos y aparecerá aquí.
                </p>
                <Link href="/distribuidor/compartir-carrito">
                  <Button variant="default" size="sm">
                    Comparte tu primer carrito
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
          {recentActivity && recentActivity.length > 0 && (
            <Link href="/distribuidor/actividad">
              <Button variant="outline" className="w-full mt-4">
                Ver toda la actividad
                <ChevronRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
      */}
    </div>
  );
}
