'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  AcademicCapIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  WifiIcon,
  ServerIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { usePaymentData } from '@/hooks/usePaymentData';
import {
  useDistributorDashboard,
  useCopyReferralLink,
  useShareReferralLink,
} from '@/hooks/useDistributor';
import { useCommissionStructure } from '@/hooks/useCommissions';
import { useMyCourses } from '@/hooks/useCourses';
import { RankProgressStepper } from '@/components/commissions';
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

// Mapa de labels para rangos
const rankLabels: Record<string, string> = {
  distribuidor: 'Distribuidor',
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  platino: 'Platino',
  diamante: 'Diamante',
  doble_diamante: 'Doble Diamante',
  triple_diamante: 'Triple Diamante',
  sirius: 'Sirius',
  azul: 'Azul',
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

  const [selectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // React Query hooks
  const {
    profile,
    points,
    rankProgress,
    networkSummary,
    commissionsSummary,
    recentActivity,
    topPerformers,
    stats,
    isLoading,
    isRefreshing,
    isError,
    error,
    refetch,
  } = useDistributorDashboard();

  const copyLinkMutation = useCopyReferralLink();
  const shareLinkMutation = useShareReferralLink();
  const { data: paymentData } = usePaymentData();
  const { data: commissionStructure } = useCommissionStructure(
    user?.customerId || '',
    !!user?.customerId,
  );
  const { data: myCourses = [] } = useMyCourses();

  // Extraer el código de referido del perfil
  const referralCode = useMemo(() => {
    // Prioridad 1: Campo referralCode del perfil
    if (profile?.referralCode) return profile.referralCode;

    // Prioridad 2: Intentar extraer el código del personalLink si existe
    if (profile?.personalLink) {
      try {
        const url = new URL(profile.personalLink);
        const refParam = url.searchParams.get('ref');
        if (refParam) return refParam;
      } catch {
        // Si personalLink no es una URL válida, continuar
      }
    }

    // Prioridad 3: Usar el code como fallback (no ideal pero funciona)
    if (profile?.code) return profile.code;

    return null;
  }, [profile?.referralCode, profile?.personalLink, profile?.code]);

  // Generar el enlace de registro de distribuidor dinámicamente
  // Esto permite que funcione correctamente en localhost, QA y producción
  const dynamicPersonalLink = useMemo(() => {
    if (typeof window === 'undefined' || !referralCode) return '';
    return `${window.location.origin}/registro/distribuidor?ref=${referralCode}`;
  }, [referralCode]);

  // Generar el enlace de tienda para compartir con clientes
  // Cuando un cliente use este enlace, su compra se asociará al distribuidor
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

  // Handlers para el enlace de tienda
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
      <div className="animate-pulse space-y-6">
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-gray-200 rounded-lg" />
            <div className="h-48 bg-gray-200 rounded-lg" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-gray-200 rounded-lg" />
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Error state - cuando la API no está disponible
  if (isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-lg w-full mx-4 overflow-hidden border-0 shadow-xl">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
              <ServerIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Error de Conexión
            </h2>
          </div>

          {/* Contenido */}
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

              {/* Detalles del error (solo en desarrollo) */}
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-gray-50 rounded-lg p-3 text-left">
                  <p className="text-xs font-mono text-gray-500 break-all">
                    {error instanceof Error ? error.message : 'Error desconocido'}
                  </p>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <Button
                  variant="primary"
                  className="w-full bg-[#3E667D] hover:bg-[#002a5c]"
                  leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                  onClick={() => refetch()}
                >
                  Intentar de nuevo
                </Button>

                <div className="flex gap-3">
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Ir al inicio
                    </Button>
                  </Link>
                  <Link href="/distribuidor/soporte" className="flex-1">
                    <Button variant="ghost" className="w-full">
                      Contactar soporte
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Tips */}
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
                  <li className="flex items-center gap-2">
                    <ExclamationCircleIcon className="h-3 w-3 text-gray-400" />
                    Si el problema persiste, contacta a soporte
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

  return (
    <div className="space-y-6">
      {/* Greeting + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {profile?.firstName || 'Distribuidor'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {profile?.rankLabel || rankLabels[profile?.rank || 'distribuidor']} &middot; ID {profile?.code || 'N/A'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Actualizar datos"
        >
          <ArrowPathIcon className={`h-5 w-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ══════════════ HERO — Tu Meta del Mes ══════════════ */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-[#3E667D] via-[#2f5165] to-[#3E667D] p-6 md:p-8">
          {points?.isPersonalQualified ? (
            /* ── Qualified state ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#abc9ba]/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="h-9 w-9 text-[#abc9ba]" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Listo para ganar comision
              </h2>
              <p className="text-white/80 text-sm max-w-md mx-auto">
                Ya alcanzaste tus {(points?.personalPointsRequired || 3300).toLocaleString()} puntos este mes. Sigue vendiendo para aumentar tus ganancias.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/distribuidor/ventas">
                  <Button variant="primary" className="bg-[#abc9ba] hover:bg-[#abc9ba]/90 text-[#2f5165] font-semibold">
                    Seguir vendiendo
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* ── Not yet qualified ── */
            <div>
              <h2 className="text-lg font-semibold text-white/80 mb-4">Tu meta del mes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Llevas</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    {(points?.personalPoints || 0).toLocaleString()}
                  </p>
                  <p className="text-white/50 text-xs">puntos</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Te faltan</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#C8DDF2]">
                    {personalPointsGap.toLocaleString()}
                  </p>
                  <p className="text-white/50 text-xs">puntos</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Te quedan</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    {points?.daysRemaining ?? '--'}
                  </p>
                  <p className="text-white/50 text-xs">dias</p>
                </div>
              </div>

              {/* Progress bar with traffic light colors */}
              <div className="mb-2 flex justify-between items-center text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${progressDot}`} />
                  {progressLabel} — {progressPercent}%
                </span>
                <span>Meta: {(points?.personalPointsRequired || 3300).toLocaleString()} pts</span>
              </div>
              <div className="h-4 bg-white/15 rounded-full overflow-hidden mb-5">
                <div
                  className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.max(progressPercent, 2)}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/distribuidor/ventas">
                  <Button variant="primary" className="bg-white text-[#3E667D] hover:bg-white/90 font-semibold">
                    Ver como lograrlo
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ══════════════ Payment banner ══════════════ */}
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
                Necesitamos tu informacion fiscal y bancaria para poder depositarte. Haz clic aqui para completar tu informacion.
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-amber-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* ══════════════ Capacitación disponible ══════════════ */}
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

      {/* ══════════════ Rank Progression ══════════════ */}
      {commissionStructure?.ranks && commissionStructure.ranks.length > 0 && (
        <RankProgressStepper
          ranks={commissionStructure.ranks}
          currentRankNumber={commissionStructure.userRankNumber ?? 1}
          currencyCode={currencyCode}
        />
      )}

      {/* ══════════════ 3-column stat cards ══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ventas del mes */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <ChartBarIcon className="h-7 w-7 text-[#3E667D]" />
              {(stats?.totalSales || 0) > 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                  Activo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Sin actividad
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-1">Ventas del mes</p>
            {(stats?.totalSales || 0) > 0 ? (
              <p className="text-2xl font-bold text-[#3E667D]">
                {formatMoney(stats?.totalSales || 0)}
                <span className="text-[10px] font-semibold text-gray-400 ml-1">{currencyCode}</span>
              </p>
            ) : (
              <div className="mt-1">
                <p className="text-sm text-gray-400">Aun no tienes ventas este mes</p>
                <Link href="/distribuidor/ventas" className="text-xs text-[#3E667D] font-medium mt-1 hover:underline inline-block">
                  Registrar mi primera venta
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tu equipo */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <UsersIcon className="h-7 w-7 text-[#3E667D]" />
              {(networkSummary?.newThisPeriod || 0) > 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  +{networkSummary?.newThisPeriod} nuevos
                </span>
              ) : (networkSummary?.totalDistributors || 0) > 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Sin nuevos
                </span>
              ) : null}
            </div>
            <p className="text-sm text-gray-500 mb-1">Personas en tu equipo</p>
            {(networkSummary?.totalDistributors || 0) > 0 ? (
              <>
                <p className="text-2xl font-bold text-[#3E667D]">
                  {networkSummary?.totalDistributors}
                </p>
                {/* Mini bar: activos vs total */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>{networkSummary?.activeDistributors || 0} activos</span>
                    <span>{networkSummary?.totalDistributors} total</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${networkSummary?.totalDistributors ? Math.round(((networkSummary?.activeDistributors || 0) / networkSummary.totalDistributors) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-1">
                <p className="text-sm text-gray-400">Invita a tu primer socio</p>
                <button
                  onClick={handleShareLink}
                  className="text-xs text-[#3E667D] font-medium mt-1 hover:underline"
                >
                  Compartir enlace
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tu nivel */}
        <Card className="bg-gradient-to-br from-[#C8DDF2]/40 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <TrophyIcon className="h-7 w-7 text-[#3E667D]" />
              {points?.isPersonalQualified ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Calificado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  En progreso
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-1">Tu nivel</p>
            <p className="text-xl font-bold text-[#3E667D]">
              {rankProgress?.currentRankLabel || rankLabels[profile?.rank || 'distribuidor']}
            </p>
            {rankProgress?.nextRankLabel && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                  <span>Siguiente: {rankProgress.nextRankLabel}</span>
                  <span>{rankProgress.progressPercentage || 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (rankProgress.progressPercentage || 0) >= 75 ? 'bg-emerald-400'
                      : (rankProgress.progressPercentage || 0) >= 40 ? 'bg-amber-400'
                      : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.max(rankProgress.progressPercentage || 0, 2)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════ Two-column layout ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — activity + leaders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
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
                        className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                          <Icon className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                        </div>
                        <div className="flex-1">
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
                        <span className="text-xs text-gray-400">{activity.relativeTime}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-400 mb-2">Aun no tienes actividad este mes</p>
                    <Link href="/distribuidor/ventas">
                      <Button variant="outline" size="sm">
                        Empieza aqui
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

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Quienes mas venden en tu equipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers && topPerformers.length > 0 ? (
                  topPerformers.map((performer, index) => (
                    <div key={performer.id} className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                            ? 'bg-gray-100 text-gray-700'
                            : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{performer.name}</p>
                        <p className="text-sm text-gray-500">
                          Nivel {performer.level} &middot; {rankLabels[performer.rank] || performer.rank}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#3E667D]">
                          {formatMoney(performer.sales)}
                          <span className="text-[9px] font-semibold text-gray-400 ml-0.5">{currencyCode}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Aqui apareceran los mejores vendedores de tu equipo
                  </div>
                )}
              </div>
              <Link href="/distribuidor/red">
                <Button variant="outline" className="w-full mt-4">
                  Ver todo mi equipo
                  <ChevronRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right column — links, actions, rank, points */}
        <div className="space-y-6">
          {/* Personal Links Card */}
          <Card className="border-2 border-[#a7c1e2] bg-gradient-to-br from-white to-gray-50 overflow-hidden">
            <div className="bg-[#C8DDF2] px-6 py-3 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ShareIcon className="h-5 w-5" />
                Tus enlaces
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={handleShareLink}
                  disabled={shareLinkMutation.isPending}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  title="Compartir"
                >
                  <ShareIcon className="h-4 w-4 text-white" />
                </button>
                <button
                  onClick={handleDownloadQr}
                  disabled={!dynamicPersonalLink}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  title="Descargar QR"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            <CardContent className="p-5 space-y-4">
              {/* Enlace de Tienda */}
              <div>
                <div className="bg-blue-50 rounded-lg p-4 mb-3 border border-blue-200">
                  <p className="text-xs text-blue-600 uppercase tracking-wide mb-1 font-medium">
                    Enlace de Tienda
                  </p>
                  <p className="font-mono text-sm text-[#3E667D] break-all font-medium">
                    {dynamicStoreLink || 'Cargando...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Comparte este enlace con clientes. Sus compras te daran puntos.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 bg-[#3E667D] hover:bg-[#2f5165]"
                    leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}
                    onClick={handleCopyStoreLink}
                    disabled={copyLinkMutation.isPending}
                  >
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#a7c1e2] text-[#3E667D] hover:bg-[#C8DDF2]/10"
                    leftIcon={<ShareIcon className="h-4 w-4" />}
                    onClick={handleShareStoreLink}
                    disabled={shareLinkMutation.isPending}
                  >
                    Compartir
                  </Button>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-200" />

              {/* Enlace de Registro de Distribuidores */}
              <div>
                <div className="bg-gray-100 rounded-lg p-4 mb-3 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-medium">
                    Enlace de Registro
                  </p>
                  <p className="font-mono text-sm text-[#3E667D] break-all font-medium">
                    {dynamicPersonalLink || 'Cargando...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Comparte este enlace para invitar nuevos socios a tu equipo.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 bg-[#3E667D] hover:bg-[#2f5165]"
                    leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}
                    onClick={handleCopyLink}
                    disabled={copyLinkMutation.isPending}
                  >
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#a7c1e2] text-[#3E667D] hover:bg-[#C8DDF2]/10"
                    leftIcon={<ShareIcon className="h-4 w-4" />}
                    onClick={handleShareLink}
                    disabled={shareLinkMutation.isPending}
                  >
                    Compartir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Que quieres hacer</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/distribuidor/ventas" className="block">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#a7c1e2] hover:bg-[#C8DDF2]/5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-[#C8DDF2]/10 flex items-center justify-center group-hover:bg-[#C8DDF2]/20 transition-colors">
                      <ChartBarIcon className="h-5 w-5 text-[#3E667D]" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Nueva venta</span>
                  </div>
                </Link>
                <Link href="/distribuidor/red" className="block">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#3E667D] hover:bg-[#3E667D]/5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-[#3E667D]/10 flex items-center justify-center group-hover:bg-[#3E667D]/20 transition-colors">
                      <UsersIcon className="h-5 w-5 text-[#3E667D]" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Mi equipo</span>
                  </div>
                </Link>
                <Link href="/distribuidor/comisiones" className="block">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#abc9ba] hover:bg-[#abc9ba]/5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-[#abc9ba]/10 flex items-center justify-center group-hover:bg-[#abc9ba]/20 transition-colors">
                      <CurrencyDollarIcon className="h-5 w-5 text-[#3E667D]" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Mis ganancias</span>
                  </div>
                </Link>
                <Link href="/distribuidor/materiales" className="block">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#a7c1e2] hover:bg-[#a7c1e2]/5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-[#a7c1e2]/10 flex items-center justify-center group-hover:bg-[#a7c1e2]/20 transition-colors">
                      <ArrowDownTrayIcon className="h-5 w-5 text-[#3E667D]" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Material</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Rank Progress Details */}
          <Card>
            <CardHeader>
              <CardTitle>Tu camino al siguiente nivel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <TrophyIcon className="h-14 w-14 text-yellow-500 mx-auto mb-2" />
                  <h4 className="font-bold text-lg text-gray-900">
                    {rankProgress?.currentRankLabel || rankLabels[profile?.rank || 'distribuidor']}
                  </h4>
                  <p className="text-sm text-gray-500">Tu nivel actual</p>
                </div>

                {rankProgress && (
                  <div className="bg-[#f5f7e7] rounded-lg p-4">
                    <p className="text-sm font-medium text-[#3E667D] mb-3">
                      Siguiente nivel: {rankProgress.nextRankLabel}
                    </p>
                    <div className="space-y-4 text-sm">
                      {rankProgress.requirements.map((req) => {
                        const pct = Math.min(req.percentComplete, 100);
                        const barColor = req.isMet ? 'bg-emerald-400' : pct >= 75 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
                        return (
                          <div key={req.id}>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">{req.name}</span>
                              {req.isMet ? (
                                <span className="font-medium text-emerald-600 flex items-center gap-1">
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Listo
                                </span>
                              ) : (
                                <span className="font-medium text-gray-700">
                                  {req.currentValue.toLocaleString()} / {req.requiredValue.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.max(pct, req.isMet ? 100 : 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Link href="/distribuidor/ranking">
                  <Button variant="primary" className="w-full bg-[#3E667D] hover:bg-[#2f5165]">
                    Ver todos los requisitos
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Points Summary */}
          {points && (
            <Card>
              <CardHeader>
                <CardTitle>Tus puntos este mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Puntos personales con barra */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Puntos por tus ventas</span>
                      <span className="font-bold text-[#3E667D]">
                        {points.personalPoints.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progressPercent >= 75 ? 'bg-emerald-400'
                          : progressPercent >= 40 ? 'bg-amber-400'
                          : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.max(progressPercent, 2)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {progressPercent}% de tu meta ({(points.personalPointsRequired || 3300).toLocaleString()} pts)
                    </p>
                  </div>
                  {/* Otros puntos */}
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Puntos de tu equipo</span>
                    <span className="font-bold text-[#3E667D]">
                      {points.groupPoints.toLocaleString()}
                    </span>
                  </div>
                  {points.rolloverPoints > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600">Puntos acumulados</span>
                      <span className="font-bold text-emerald-600">
                        +{points.rolloverPoints.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 bg-[#f5f7e7] rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-lg text-[#3E667D]">
                      {points.totalPoints.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

