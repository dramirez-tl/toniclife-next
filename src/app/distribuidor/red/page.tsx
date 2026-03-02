'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { NetworkVisualization, RootUserDetailData } from '@/components/network';
import { selectUser } from '@/store/slices/authSlice';
import { RootUserData, useNetworkDownlines } from '@/hooks/useNetwork';
import {
  useDistributorDashboard,
  useCopyReferralLink,
  useShareReferralLink,
} from '@/hooks/useDistributor';
import { RankType, DownlineQuery } from '@/types/network';
import { RANK_LABELS } from '@/constants/ranks';
import {
  UsersIcon,
  ChartBarIcon,
  UserPlusIcon,
  EyeIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';

type ViewMode = 'graph' | 'tree';

export default function RedPage() {
  return <Suspense><RedContent /></Suspense>;
}

function RedContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const user = useSelector(selectUser);

  // Obtener datos completos del dashboard del distribuidor
  const {
    profile: distributorProfile,
    networkSummary,
    commissionsSummary,
    points,
  } = useDistributorDashboard();

  // Obtener datos del usuario autenticado para el nodo raíz
  const currentUserId = user?.id || 'root-001';
  const copyLinkMutation = useCopyReferralLink();
  const shareLinkMutation = useShareReferralLink();

  const referralCode = useMemo(() => {
    if (distributorProfile?.referralCode) return distributorProfile.referralCode;
    if (distributorProfile?.personalLink) {
      try {
        const url = new URL(distributorProfile.personalLink);
        const refParam = url.searchParams.get('ref');
        if (refParam) return refParam;
      } catch {
        // no-op
      }
    }
    if (distributorProfile?.code) return distributorProfile.code;
    return null;
  }, [distributorProfile?.referralCode, distributorProfile?.personalLink, distributorProfile?.code]);

  const dynamicPersonalLink = useMemo(() => {
    if (typeof window === 'undefined' || !referralCode) return '';
    return `${window.location.origin}/registro/distribuidor?ref=${referralCode}`;
  }, [referralCode]);

  // Datos básicos para el nodo del grafo
  const rootUserData: RootUserData | undefined = useMemo(() => {
    if (!user) return undefined;

    // Usar el rango del perfil del distribuidor si está disponible
    const rank = (distributorProfile?.rank as RankType) || 'distribuidor';

    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      code: distributorProfile?.code || `TL-${user.id.substring(0, 6).toUpperCase()}`,
      rank,
      // Datos adicionales de la red real
      networkCount: networkSummary?.totalDistributors,
      directCount: networkSummary?.directDistributors,
    };
  }, [user, distributorProfile, networkSummary]);

  // Datos detallados para el panel lateral cuando se selecciona el nodo raíz
  const rootUserDetailData: RootUserDetailData | undefined = useMemo(() => {
    if (!user) return undefined;

    const rank = (distributorProfile?.rank as RankType) || 'distribuidor';
    const rankLabel = RANK_LABELS[rank] || 'Distribuidor';

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || undefined,
      code: distributorProfile?.code || `TL-${user.id.substring(0, 6).toUpperCase()}`,
      rank,
      rankLabel,
      joinDate: distributorProfile?.joinDate,
      networkCount: networkSummary?.totalDistributors,
      directCount: networkSummary?.directDistributors,
      maxDepth: networkSummary?.maxDepth,
      personalSales: points?.personalPoints,
      teamSales: points?.groupPoints,
      totalBusinessPoints: points?.totalPoints?.toString(),
      currentCommission: commissionsSummary?.totalNet,
      historicCommission: commissionsSummary?.totalPaid,
    };
  }, [user, distributorProfile, networkSummary, points, commissionsSummary]);

  const handleInviteMember = () => {
    setIsInvitePanelOpen(true);
  };

  const handleCopyInviteLink = async () => {
    if (!dynamicPersonalLink) return;
    try {
      await copyLinkMutation.mutateAsync(dynamicPersonalLink);
      toast.success('Enlace de invitación copiado');
    } catch {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleShareInviteLink = async () => {
    if (!dynamicPersonalLink) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        link: dynamicPersonalLink,
        title: 'Invitación a Tonic Life',
        text: 'Únete a mi equipo de Tonic Life con este enlace de invitación.',
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UsersIcon className="h-8 lg:h-10 w-8 lg:w-10" />
                <h1 className="text-2xl lg:text-4xl font-bold">Mi Red de Distribuidores</h1>
              </div>
              <p className="text-white/80 text-base lg:text-lg">
                Visualiza y gestiona tu red multinivel
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary" size="sm">
                  Volver al Panel Principal
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlusIcon className="h-4 w-4" />}
                onClick={handleInviteMember}
              >
                Invitar Nuevo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Modo de Vista</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('tree')}
                    aria-pressed={viewMode === 'tree'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'tree'
                        ? 'bg-[#3E667D] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">Lista</span>
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    aria-pressed={viewMode === 'graph'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'graph'
                        ? 'bg-[#3E667D] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Gráfico</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-gray-400" />
                  <span>
                    Haz <strong>doble clic</strong> en un nodo para expandir su red
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Visualization */}
        {viewMode === 'graph' ? (
          <NetworkVisualization
            rootUserId={currentUserId}
            rootUserData={rootUserData}
            rootUserDetailData={rootUserDetailData}
            initialDepth={3}
            className="shadow-lg"
          />
        ) : (
          <TreeListView currentUserId={currentUserId} />
        )}

        {/* Help CTA */}
        <Card className="mt-8 bg-gradient-to-r from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
          <CardContent className="p-6 lg:p-8">
            <h3 className="text-xl lg:text-2xl font-bold mb-4">Haz Crecer tu Red</h3>
            <p className="text-white/90 mb-6 max-w-2xl">
              Invita a más distribuidores y aumenta tus comisiones. ¡Cada nuevo miembro activo te acerca a tu siguiente rango!
            </p>
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<UserPlusIcon className="h-5 w-5" />}
              onClick={handleInviteMember}
            >
              Invitar Nuevo Distribuidor
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal lateral de invitación */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isInvitePanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Invitar nuevo distribuidor"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-bold text-gray-900">Invitar Nuevo Distribuidor</h3>
            <button
              onClick={() => setIsInvitePanelOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Cerrar panel de invitación"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-xl border border-[#a7c1e2]/25 bg-[#C8DDF2]/10 p-4">
              <p className="text-sm font-semibold text-[#3E667D]">¿Cómo invitar?</p>
              <p className="mt-1 text-sm text-gray-600">
                Comparte este enlace con la persona que deseas invitar. Al registrarse con este link,
                quedará vinculada a tu red.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Enlace de Registro</p>
              <p className="mt-2 break-all font-mono text-sm text-[#3E667D]">
                {dynamicPersonalLink || 'Cargando enlace...'}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}
                onClick={handleCopyInviteLink}
                disabled={!dynamicPersonalLink || copyLinkMutation.isPending}
              >
                Copiar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                leftIcon={<ShareIcon className="h-4 w-4" />}
                onClick={handleShareInviteLink}
                disabled={!dynamicPersonalLink || shareLinkMutation.isPending}
              >
                Compartir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isInvitePanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsInvitePanelOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Componente de vista en lista con datos reales
function TreeListView({ currentUserId }: { currentUserId: string }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { get, getNumber, setParams } = useQueryFilters({ page: '1' });
  const levelFilterStr = get('level');
  const levelFilter = levelFilterStr ? parseInt(levelFilterStr) : undefined;
  const statusFilterStr = get('status');
  const statusFilter = (statusFilterStr || undefined) as DownlineQuery['status'] | undefined;
  const page = getNumber('page') || 1;
  const limit = 20;

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setParams({ page: '1' });
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const query: DownlineQuery = useMemo(() => ({
    search: debouncedSearch || undefined,
    level: levelFilter,
    status: statusFilter,
    page,
    limit,
    sortBy: 'level',
    sortOrder: 'asc',
  }), [debouncedSearch, levelFilter, statusFilter, page]);

  const { data: response, isLoading, error, refetch } = useNetworkDownlines(query);

  const rankColors: Record<string, string> = {
    'Diamante': 'text-blue-600 bg-blue-50',
    'Diamante Doble': 'text-blue-600 bg-blue-50',
    'Diamante Triple': 'text-blue-600 bg-blue-50',
    'Platino': 'text-purple-600 bg-purple-50',
    'Oro': 'text-yellow-600 bg-yellow-50',
    'Plata': 'text-gray-600 bg-gray-100',
    'Bronce': 'text-orange-600 bg-orange-50',
    'Distribuidor': 'text-green-700 bg-green-50',
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'Activo', color: 'text-green-700 bg-green-50' },
    inactive: { label: 'Inactivo', color: 'text-red-600 bg-red-50' },
    suspended: { label: 'Suspendido', color: 'text-amber-600 bg-amber-50' },
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
              />
            </div>
            {/* Filtro de nivel */}
            <SearchableSelect
              options={[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: `Nivel ${n}` }))}
              value={levelFilterStr}
              onChange={(val) => setParams({ level: val || null })}
              allLabel="Todos los niveles"
              allValue=""
            />
            {/* Filtro de estado */}
            <SearchableSelect
              options={[
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' },
                { value: 'suspended', label: 'Suspendidos' },
              ]}
              value={statusFilterStr}
              onChange={(val) => setParams({ status: val || null })}
              allLabel="Todos los estados"
              allValue=""
            />
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 text-[#3E667D] animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando distribuidores...</p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500 mb-2">Error al cargar los distribuidores</p>
            <p className="text-sm text-gray-500">Intenta de nuevo más tarde</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              onClick={() => refetch()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : !response || response.data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {debouncedSearch || levelFilter || statusFilter
                ? 'No se encontraron distribuidores con los filtros aplicados'
                : 'No tienes distribuidores en tu red aún'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header de resultados */}
          <div className="flex items-center justify-between text-sm text-gray-600 px-1">
            <span>
              Mostrando <strong>{(page - 1) * limit + 1}-{Math.min(page * limit, response.total)}</strong> de <strong>{response.total}</strong> distribuidores
            </span>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {response.data.map(member => {
              const initials = member.fullName
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const rank = member.rankName || 'Distribuidor';
              const statusInfo = statusLabels[member.status] || statusLabels.active;

              return (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{member.fullName}</h3>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${rankColors[rank] || rankColors['Distribuidor']}`}>
                            {rank}
                          </span>
                          <span className="text-[11px] text-gray-400">Nivel {member.level}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{member.email}</span>
                          {member.phone && <span>{member.phone}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-gray-400">Pts. personales</p>
                        <p className="font-bold text-gray-900">{(member.personalPoints ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Paginación */}
          {response.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setParams({ page: String(Math.max(1, page - 1)) })}
                disabled={page <= 1}
                aria-label="Página anterior"
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Página <strong>{page}</strong> de <strong>{response.totalPages}</strong>
              </span>
              <button
                onClick={() => setParams({ page: String(Math.min(response.totalPages, page + 1)) })}
                disabled={page >= response.totalPages}
                aria-label="Página siguiente"
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
