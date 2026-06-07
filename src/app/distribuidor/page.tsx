'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  AcademicCapIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  WifiIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RankMedal } from '@/components/distributor/RankMedal';
import { RANK_ORDER, RANK_LABELS, getRankIndex } from '@/constants/ranks';
import type { RankType } from '@/types/network';
import { usePaymentData } from '@/hooks/usePaymentData';
import {
  useDistributorDashboard,
  useCopyReferralLink,
  useShareReferralLink,
} from '@/hooks/useDistributor';
import { useMyCourses } from '@/hooks/useCourses';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { toast } from 'sonner';

// Mapa de íconos para tipos de actividad
const activityIcons: Record<string, typeof ChartBarIcon> = {
  sale: ChartBarIcon,
  recruit: UsersIcon,
  commission: CurrencyDollarIcon,
  qualification: TrophyIcon,
  rank_change: TrophyIcon,
};

// Colores para tipos de actividad
const activityColors: Record<string, string> = {
  sale: 'bg-[#C8DDF2]/10 text-[#3E667D]',
  recruit: 'bg-blue-50 text-blue-600',
  commission: 'bg-purple-50 text-purple-600',
  qualification: 'bg-yellow-50 text-yellow-600',
  rank_change: 'bg-amber-50 text-amber-600',
};

export default function DistribuidorDashboard() {
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

  const [showPointsDetail, setShowPointsDetail] = useState(false);

  // React Query hooks
  const {
    profile,
    points,
    rankProgress,
    networkSummary,
    commissionsSummary,
    recentActivity,
    isLoading,
    isRefreshing,
    isError,
    error,
    refetch,
  } = useDistributorDashboard();

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

  const handleCopyLink = async () => {
    if (!dynamicPersonalLink) return;
    try {
      await copyLinkMutation.mutateAsync(dynamicPersonalLink);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleShareLink = async () => {
    if (!dynamicPersonalLink) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        link: dynamicPersonalLink,
        title: 'Únete a Tonic Life',
        text: `Únete a mi equipo en Tonic Life y comienza tu camino hacia el bienestar y el éxito financiero.`,
      });
      if (result.method === 'clipboard') {
        toast.success('Enlace copiado al portapapeles');
      } else {
        toast.success('Enlace compartido exitosamente');
      }
    } catch {
      toast.error('Error al compartir el enlace');
    }
  };

  const handleCopyStoreLink = async () => {
    if (!dynamicStoreLink) return;
    try {
      await copyLinkMutation.mutateAsync(dynamicStoreLink);
      toast.success('Enlace de tienda copiado al portapapeles');
    } catch {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleShareStoreLink = async () => {
    if (!dynamicStoreLink) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        link: dynamicStoreLink,
        title: 'Tienda Tonic Life - Productos de Bienestar',
        text: `Descubre los mejores productos naturales para tu bienestar en Tonic Life. ¡Usa mi enlace para obtener puntos!`,
      });
      if (result.method === 'clipboard') {
        toast.success('Enlace de tienda copiado al portapapeles');
      } else {
        toast.success('Enlace compartido exitosamente');
      }
    } catch {
      toast.error('Error al compartir el enlace');
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Actualizando datos...');
  };

  const handleDownloadQr = () => {
    if (!dynamicPersonalLink) {
      toast.error('No se pudo generar el enlace de referido');
      return;
    }
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(dynamicPersonalLink)}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = qrUrl;
    downloadLink.download = `qr-referido-${referralCode || 'toniclife'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('Descargando QR...');
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
            <h2 className="text-xl font-bold text-white">Error de Conexión</h2>
          </div>
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <WifiIcon className="h-5 w-5" />
                <span className="text-sm">Sin conexión con el servidor</span>
              </div>
              <p className="text-gray-600">
                No pudimos cargar la información de tu Centro de Negocio.
                Esto puede deberse a un problema temporal con el servidor o tu conexión a internet.
              </p>
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
                  Intentar de nuevo
                </Button>
                <div className="flex gap-3">
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full">Ir al inicio</Button>
                  </Link>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Sugerencias:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-2">
                    <ExclamationCircleIcon className="h-3 w-3 text-gray-400" />
                    Verifica tu conexión a internet
                  </li>
                  <li className="flex items-center gap-2">
                    <ExclamationCircleIcon className="h-3 w-3 text-gray-400" />
                    Intenta recargar la página en unos minutos
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const personalPointsGap = Math.max(0, (points?.personalPointsRequired || 0) - (points?.personalPoints || 0));
  const progressPercent = points?.personalPointsRequired
    ? Math.min(100, Math.round(((points?.personalPoints || 0) / points.personalPointsRequired) * 100))
    : 0;

  // Semáforo: verde ≥ 75%, amarillo ≥ 40%, rojo < 40%
  const progressColor = progressPercent >= 75
    ? 'from-emerald-400 to-emerald-500'
    : progressPercent >= 40
    ? 'from-amber-400 to-yellow-400'
    : 'from-red-400 to-orange-400';
  const progressLabel = progressPercent >= 75
    ? 'Vas muy bien'
    : progressPercent >= 40
    ? 'Vas a buen ritmo'
    : 'Necesitas avanzar';
  const progressDot = progressPercent >= 75
    ? 'bg-emerald-400'
    : progressPercent >= 40
    ? 'bg-amber-400'
    : 'bg-red-400';

  // El rango actual sale del PERFIL (fuente de verdad): un distribuidor que aún no
  // califica es "Distribuidor", no "Bronce". El siguiente rango se deriva del orden real.
  const currentRankCode = (profile?.rank || 'distribuidor') as RankType;
  const currentRankLabel = profile?.rankLabel || RANK_LABELS[currentRankCode] || 'Distribuidor';
  const currentIndex = getRankIndex(currentRankCode);
  const nextRankCode: RankType | null =
    currentIndex >= 0 && currentIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentIndex + 1] : null;
  const nextRankLabel = nextRankCode ? RANK_LABELS[nextRankCode] : null;
  // El % de rankProgress solo es confiable cuando coincide con el rango del perfil;
  // si no, usamos el avance de puntos personales (la calificación del mes).
  const nextRankPercent =
    rankProgress?.currentRank === currentRankCode ? (rankProgress?.progressPercentage || 0) : progressPercent;

  // Estilo compartido de las tarjetas de acción rápida
  const actionBox =
    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#a7c1e2] hover:bg-[#C8DDF2]/5 transition-all cursor-pointer text-center';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Tu resumen del mes</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Actualizar datos"
        >
          <ArrowPathIcon className={`h-5 w-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ══════════════ HERO — Medalla + Meta del mes ══════════════ */}
      <Card className="border-0 shadow-lg overflow-hidden p-0">
        <div className="bg-gradient-to-br from-[#3E667D] via-[#2f5165] to-[#3E667D] p-6 text-white">
          {/* Rango actual con medalla */}
          <div className="flex items-center gap-4">
            <RankMedal rank={currentRankCode} size="lg" glow zoomable />
            <div className="min-w-0">
              <p className="text-white/60 text-xs uppercase tracking-wide">Tu nivel</p>
              <h2 className="text-2xl font-bold leading-tight">{currentRankLabel}</h2>
              {points?.isPersonalQualified ? (
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-emerald-100 bg-emerald-500/25 px-2 py-0.5 rounded-full">
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Calificado este mes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-amber-100 bg-amber-400/25 px-2 py-0.5 rounded-full">
                  En progreso
                </span>
              )}
            </div>
          </div>

          {/* Meta del mes */}
          <div className="mt-6">
            {points?.isPersonalQualified ? (
              <p className="text-white/80 text-sm">
                Ya alcanzaste tus {(points?.personalPointsRequired || 3300).toLocaleString()} puntos
                este mes. ¡Sigue vendiendo para aumentar tus ganancias!
              </p>
            ) : (
              <>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold">Tu meta del mes</span>
                  <span className="text-xs text-white/70">
                    {(points?.personalPoints || 0).toLocaleString()} / {(points?.personalPointsRequired || 3300).toLocaleString()} pts
                  </span>
                </div>
                <div className="h-3 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(progressPercent, 2)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/70">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${progressDot}`} />
                    {progressLabel} — {progressPercent}%
                  </span>
                  <span>
                    Te faltan {personalPointsGap.toLocaleString()} pts · {points?.daysRemaining ?? '--'} días
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Siguiente nivel con medalla bloqueada */}
          {nextRankCode && (
            <Link
              href="/distribuidor/ranking"
              className="mt-6 flex items-center gap-3 bg-white/10 rounded-xl p-3 hover:bg-white/15 transition-colors"
            >
              <RankMedal rank={nextRankCode} size="md" locked />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60">Tu siguiente meta</p>
                <p className="font-semibold truncate">{nextRankLabel}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">{nextRankPercent}%</span>
                <ChevronRightIcon className="h-4 w-4 text-white/50" />
              </div>
            </Link>
          )}

          {/* CTA */}
          <div className="mt-5">
            <Link href="/distribuidor/ventas">
              <Button
                variant="default"
                className="bg-white text-[#3E667D] hover:bg-white/90 font-semibold w-full sm:w-auto"
              >
                {points?.isPersonalQualified ? 'Seguir vendiendo' : 'Cómo lograrlo'}
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* ══════════════ Tira de 3 números clave ══════════════ */}
      <Card className="p-0">
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="p-4 text-center">
              <CurrencyDollarIcon className="h-5 w-5 text-[#3E667D] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#3E667D] leading-tight">
                {formatMoney(commissionsSummary?.totalNet || 0)}
              </p>
              <p className="text-[11px] text-gray-500">Ganancias</p>
            </div>
            <div className="p-4 text-center">
              <UsersIcon className="h-5 w-5 text-[#3E667D] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#3E667D] leading-tight">
                {(networkSummary?.totalDistributors || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500">{(networkSummary?.activeDistributors || 0).toLocaleString()} activos</p>
            </div>
            <div className="p-4 text-center">
              <ChartBarIcon className="h-5 w-5 text-[#3E667D] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#3E667D] leading-tight">
                {(points?.totalPoints || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500">Puntos</p>
            </div>
          </div>

          {points && (
            <>
              <button
                onClick={() => setShowPointsDetail((v) => !v)}
                className="w-full border-t border-gray-100 py-2 text-xs font-medium text-[#3E667D] flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
              >
                {showPointsDetail ? 'Ocultar desglose' : 'Ver desglose de puntos'}
                {showPointsDetail ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              </button>
              {showPointsDetail && (
                <div className="border-t border-gray-100 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Puntos por tus ventas</span>
                    <span className="font-semibold text-[#3E667D]">{points.personalPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Puntos de tu equipo</span>
                    <span className="font-semibold text-[#3E667D]">{points.groupPoints.toLocaleString()}</span>
                  </div>
                  {points.rolloverPoints > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Puntos acumulados</span>
                      <span className="font-semibold text-emerald-600">+{points.rolloverPoints.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-[#3E667D]">{points.totalPoints.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ══════════════ Acciones rápidas ══════════════ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>¿Qué quieres hacer?</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleShareLink} disabled={shareLinkMutation.isPending} className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#abc9ba]/20 flex items-center justify-center">
                <ShareIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">Compartir mi enlace</span>
            </button>
            <Link href="/distribuidor/ventas" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#C8DDF2]/20 flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">Nueva venta</span>
            </Link>
            <Link href="/distribuidor/red" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">Mi equipo</span>
            </Link>
            <Link href="/distribuidor/comisiones" className={actionBox}>
              <div className="w-10 h-10 rounded-full bg-[#a7c1e2]/20 flex items-center justify-center">
                <CurrencyDollarIcon className="h-5 w-5 text-[#3E667D]" />
              </div>
              <span className="text-sm font-medium text-gray-700">Mis ganancias</span>
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
                Completa tus datos para recibir comisiones
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Necesitamos tu información fiscal y bancaria para poder depositarte.
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
                {myCourses.length === 1
                  ? 'Tienes acceso a 1 curso de capacitación'
                  : `Tienes acceso a ${myCourses.length} cursos de capacitación`}
              </p>
              <p className="text-xs text-[#3E667D]/80 mt-0.5 line-clamp-1">
                {myCourses.length === 1
                  ? myCourses[0].title
                  : 'Entra a la Academia y continúa aprendiendo con los mejores coaches.'}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-[#3E667D]/50 group-hover:text-[#3E667D] transition-colors flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* ══════════════ Comparte y gana ══════════════ */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#3E667D] flex items-center gap-2">
              <ShareIcon className="h-5 w-5" />
              Comparte y gana
            </h3>
            <button
              onClick={handleDownloadQr}
              disabled={!dynamicPersonalLink}
              className="flex items-center gap-1 text-xs font-medium text-[#3E667D] border border-[#a7c1e2] rounded-full px-3 py-1.5 hover:bg-[#C8DDF2]/10 transition-colors disabled:opacity-50"
              title="Descargar código QR"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              QR
            </button>
          </div>

          {/* Enlace de tienda */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Enlace de tienda</p>
            <p className="font-mono text-xs text-[#3E667D] break-all bg-blue-50 border border-blue-100 rounded-lg p-2 mb-2">
              {dynamicStoreLink || 'Cargando...'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-[#3E667D] hover:bg-[#2f5165]"
                onClick={handleCopyStoreLink}
                disabled={copyLinkMutation.isPending}
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-[#a7c1e2] text-[#3E667D] hover:bg-[#C8DDF2]/10"
                onClick={handleShareStoreLink}
                disabled={shareLinkMutation.isPending}
              >
                <ShareIcon className="h-4 w-4" />
                Compartir
              </Button>
            </div>
          </div>

          {/* Enlace de registro */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Enlace de registro</p>
            <p className="font-mono text-xs text-[#3E667D] break-all bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
              {dynamicPersonalLink || 'Cargando...'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-[#3E667D] hover:bg-[#2f5165]"
                onClick={handleCopyLink}
                disabled={copyLinkMutation.isPending}
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-[#a7c1e2] text-[#3E667D] hover:bg-[#C8DDF2]/10"
                onClick={handleShareLink}
                disabled={shareLinkMutation.isPending}
              >
                <ShareIcon className="h-4 w-4" />
                Compartir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════ Actividad reciente ══════════════ */}
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
              <div className="text-center py-10">
                <p className="text-gray-400 mb-2">Aún no tienes actividad este mes</p>
                <Link href="/distribuidor/ventas">
                  <Button variant="outline" size="sm">
                    Empieza aquí
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
    </div>
  );
}
