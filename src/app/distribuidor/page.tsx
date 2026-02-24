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
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  useDistributorDashboard,
  useCopyReferralLink,
  useShareReferralLink,
} from '@/hooks/useDistributor';
import { toast } from 'sonner';
import { useActivePrograms, useMyProgress } from '@/hooks/useStartupProgram';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

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
  sale: 'bg-[#7AB82E]/10 text-[#7AB82E]',
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
                  className="w-full bg-[#003B7A] hover:bg-[#002a5c]"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Bienvenido, {profile?.firstName || 'Distribuidor'}!
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant="success" className="text-sm">
              <TrophyIcon className="h-4 w-4 mr-1" />
              Rango {profile?.rankLabel || rankLabels[profile?.rank || 'distribuidor']}
            </Badge>
            <span className="text-sm text-gray-500">ID: {profile?.code || 'N/A'}</span>
            {profile?.joinDate && (
              <span className="text-sm text-gray-500">
                Miembro desde {new Date(profile.joinDate).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
              </span>
            )}
            {points?.isPersonalQualified ? (
              <Badge variant="success" className="text-xs">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Calificado
              </Badge>
            ) : (
              <Badge variant="warning" className="text-xs">
                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                Pendiente calificar
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ShareIcon className="h-4 w-4" />}
            onClick={handleShareLink}
            disabled={shareLinkMutation.isPending}
          >
            Compartir
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={handleDownloadQr}
            disabled={!dynamicPersonalLink}
          >
            Descargar QR
          </Button>
        </div>
      </div>

      {/* Period Info Banner */}
      {points && (
        <div className="bg-gradient-to-r from-[#003B7A]/10 to-[#7AB82E]/10 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-600">Periodo actual</p>
            <p className="font-semibold text-gray-900">{points.periodName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Días restantes</p>
              <p className="font-bold text-lg text-[#003B7A]">{points.daysRemaining}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Puntos personales</p>
              <p className="font-bold text-lg text-[#7AB82E]">
                {points.personalPoints.toLocaleString()} / {points.personalPointsRequired.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Comisiones del Mes - Diseño mejorado */}
          <Card className="relative overflow-hidden border-0 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#003B7A] via-[#004a99] to-[#002a5c]" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7AB82E]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <CardContent className="relative p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
                {commissionsSummary?.changeFromLastPeriod !== undefined && (
                  <div className="flex items-center gap-1 bg-[#7AB82E] px-2.5 py-1 rounded-full">
                    <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-bold text-white">
                      {commissionsSummary.changeFromLastPeriod >= 0 ? '+' : ''}
                      {commissionsSummary.changeFromLastPeriod.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-white/70 mb-1">Comisiones del mes</p>
              <p className="text-3xl font-bold text-white tracking-tight">
                ${(stats?.monthlyCommission || commissionsSummary?.totalNet || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 flex items-center gap-1">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-[#7AB82E]" />
                  Neto después de impuestos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ventas Totales */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ChartBarIcon className="h-8 w-8 text-[#7AB82E]" />
                <ArrowTrendingUpIcon className="h-5 w-5 text-[#7AB82E]" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Ventas totales</p>
              <p className="text-3xl font-bold text-[#003B7A]">
                ${(stats?.totalSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-sm text-gray-500">
                Puntos negocio: {(points?.businessPointsMxn || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* Red de Distribuidores */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UsersIcon className="h-8 w-8 text-[#7AB82E]" />
                <Badge variant="info">{networkSummary?.activeDistributors || 0} activos</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">Red de distribuidores</p>
              <p className="text-3xl font-bold text-[#003B7A]">
                {networkSummary?.totalDistributors || 0}
              </p>
              <div className="mt-2 text-sm text-gray-500">
                {networkSummary?.qualifiedDistributors || 0} calificados | {networkSummary?.newThisPeriod || 0} nuevos
              </div>
            </CardContent>
          </Card>

          {/* Progreso de Rango */}
          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/80 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TrophyIcon className="h-8 w-8 text-white/80" />
                <SparklesIcon className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-sm text-white/80 mb-1">
                Progreso a {rankProgress?.nextRankLabel || 'siguiente rango'}
              </p>
              <p className="text-3xl font-bold">{rankProgress?.progressPercentage || 0}%</p>
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${rankProgress?.progressPercentage || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Programa de Arranque Widget */}
      <StartupProgramWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
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
                                <span className="text-sm font-semibold text-[#7AB82E]">
                                  +${activity.amount.toFixed(2)}
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
                    <div className="text-center py-8 text-gray-500">
                      No hay actividad reciente
                    </div>
                  )}
                </div>
                <Link href="/distribuidor/actividad">
                  <Button variant="outline" className="w-full mt-4">
                    Ver toda la actividad
                    <ChevronRightIcon className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Líderes del Mes en tu Red</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers && topPerformers.length > 0 ? (
                    topPerformers.map((performer, index) => (
                      <div key={performer.id} className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
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
                            Nivel {performer.level} | {rankLabels[performer.rank] || performer.rank}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#003B7A]">
                            ${performer.sales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">en ventas</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No hay datos de líderes disponibles
                    </div>
                  )}
                </div>
                <Link href="/distribuidor/red">
                  <Button variant="outline" className="w-full mt-4">
                    Ver toda mi red
                    <ChevronRightIcon className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Training Placeholder */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AcademicCapIcon className="h-6 w-6 text-[#003B7A]" />
                    Capacitación
                  </CardTitle>
                  <Link href="/distribuidor/capacitacion">
                    <Button variant="ghost" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <AcademicCapIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Módulo de capacitación próximamente</p>
                  <p className="text-sm">Contenido educativo para potenciar tu negocio</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Personal Links Card - Mejorado con mejor contraste */}
            <Card className="border-2 border-[#7AB82E] bg-gradient-to-br from-white to-gray-50 overflow-hidden">
              <div className="bg-[#7AB82E] px-6 py-3">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ShareIcon className="h-5 w-5" />
                  Tus Enlaces Personales
                </h3>
              </div>
              <CardContent className="p-5 space-y-4">
                {/* Enlace de Tienda */}
                <div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-3 border border-blue-200">
                    <p className="text-xs text-blue-600 uppercase tracking-wide mb-1 font-medium">
                      Enlace de Tienda
                    </p>
                    <p className="font-mono text-sm text-[#003B7A] break-all font-medium">
                      {dynamicStoreLink || 'Cargando...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Comparte este enlace con clientes. Sus compras te darán puntos.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 bg-[#003B7A] hover:bg-[#002a5c]"
                      leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}
                      onClick={handleCopyStoreLink}
                      disabled={copyLinkMutation.isPending}
                    >
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-[#7AB82E] text-[#7AB82E] hover:bg-[#7AB82E]/10"
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
                    <p className="font-mono text-sm text-[#003B7A] break-all font-medium">
                      {dynamicPersonalLink || 'Cargando...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Comparte este enlace para reclutar nuevos distribuidores.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 bg-[#003B7A] hover:bg-[#002a5c]"
                      leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}
                      onClick={handleCopyLink}
                      disabled={copyLinkMutation.isPending}
                    >
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-[#7AB82E] text-[#7AB82E] hover:bg-[#7AB82E]/10"
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

            {/* Quick Actions - Mejorado con mejor espaciado */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/distribuidor/ventas" className="block">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#7AB82E] hover:bg-[#7AB82E]/5 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-full bg-[#7AB82E]/10 flex items-center justify-center group-hover:bg-[#7AB82E]/20 transition-colors">
                        <ChartBarIcon className="h-5 w-5 text-[#7AB82E]" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 text-center">Registrar venta</span>
                    </div>
                  </Link>
                  <Link href="/distribuidor/red" className="block">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#003B7A] hover:bg-[#003B7A]/5 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-full bg-[#003B7A]/10 flex items-center justify-center group-hover:bg-[#003B7A]/20 transition-colors">
                        <UsersIcon className="h-5 w-5 text-[#003B7A]" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 text-center">Ver mi red</span>
                    </div>
                  </Link>
                  <Link href="/distribuidor/comisiones" className="block">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <CurrencyDollarIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 text-center">Comisiones</span>
                    </div>
                  </Link>
                  <Link href="/distribuidor/materiales" className="block">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <ArrowDownTrayIcon className="h-5 w-5 text-orange-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 text-center">Marketing</span>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Rank Progress Details */}
            <Card>
              <CardHeader>
                <CardTitle>Progreso de Rango</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
                    <h4 className="font-bold text-lg text-gray-900">
                      {rankProgress?.currentRankLabel || rankLabels[profile?.rank || 'distribuidor']}
                    </h4>
                    <p className="text-sm text-gray-500">Rango actual</p>
                  </div>

                  {rankProgress && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Próximo rango: {rankProgress.nextRankLabel}
                      </p>
                      <div className="space-y-3 text-sm">
                        {rankProgress.requirements.map((req) => (
                          <div key={req.id}>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">{req.name}</span>
                              {req.isMet ? (
                                <span className="font-medium text-[#7AB82E]">
                                  <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                                  Completado
                                </span>
                              ) : (
                                <span className="font-medium">
                                  {req.currentValue.toLocaleString()} / {req.requiredValue.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {!req.isMet && (
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#7AB82E] rounded-full transition-all"
                                  style={{ width: `${Math.min(req.percentComplete, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link href="/distribuidor/ranking">
                    <Button variant="primary" className="w-full">
                      Ver requisitos completos
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Points Summary */}
            {points && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Puntos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-gray-600">Puntos personales</span>
                      <span className="font-bold text-[#003B7A]">
                        {points.personalPoints.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-gray-600">Puntos de negocio (MXN)</span>
                      <span className="font-bold text-[#003B7A]">
                        {points.businessPointsMxn.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-gray-600">Puntos de grupo</span>
                      <span className="font-bold text-[#003B7A]">
                        {points.groupPoints.toLocaleString()}
                      </span>
                    </div>
                    {points.rolloverPoints > 0 && (
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-gray-600">Puntos Acumulados</span>
                        <span className="font-bold text-[#7AB82E]">
                          +{points.rolloverPoints.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold text-gray-800">Total</span>
                      <span className="font-bold text-lg text-[#003B7A]">
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

// ─── Startup Program Widget ─────────────────────────────────────────────────

function StartupProgramWidget() {
  const { data: activePrograms, isLoading } = useActivePrograms();
  const program = activePrograms?.[0];
  const programId = program?.id ?? '';
  const currency = program?.currencyCode ?? 'MXN';

  const { data: progress } = useMyProgress(programId, !!programId);

  if (isLoading) return null;
  if (!program) return null;

  const recruits = progress?.totalRecruits ?? 0;
  const nextMilestone = progress?.nextMilestone;
  const progressPct = nextMilestone && nextMilestone.recruitsNeeded > 0
    ? Math.min(100, Math.round((recruits / nextMilestone.recruitsNeeded) * 100))
    : 0;

  const fmtCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0';
    const sym = currency === 'USD' ? 'US$' : '$';
    return `${sym}${num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Link href="/distribuidor/programa-arranque">
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
        <div className="flex items-stretch">
          <div className="bg-gradient-to-b from-[#003B7A] to-[#002a5c] p-4 flex items-center justify-center">
            <RocketLaunchIcon className="h-8 w-8 text-white" />
          </div>
          <CardContent className="p-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Programa de Arranque</p>
                <p className="text-xs text-gray-500">{program.name}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#003B7A]">{recruits}</p>
                <p className="text-xs text-gray-500">inscritos</p>
              </div>
            </div>
            {nextMilestone && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Proximo hito: {nextMilestone.recruitsNeeded} inscritos</span>
                  <span className="font-medium text-[#7AB82E]">
                    {fmtCurrency(nextMilestone.bonusAmount)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#7AB82E] h-2 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
