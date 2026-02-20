'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { NetworkVisualization, RootUserDetailData } from '@/components/network';
import { selectUser } from '@/store/slices/authSlice';
import { RootUserData } from '@/hooks/useNetwork';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import { RankType } from '@/types/network';
import { RANK_LABELS } from '@/constants/ranks';
import {
  UsersIcon,
  ChartBarIcon,
  UserPlusIcon,
  EyeIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

type ViewMode = 'graph' | 'tree';

export default function RedPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
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
    toast.info('Abriendo formulario de invitación');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
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
                    onClick={() => setViewMode('graph')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'graph'
                        ? 'bg-[#003B7A] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Gráfico</span>
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'tree'
                        ? 'bg-[#003B7A] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">Lista</span>
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
        <Card className="mt-8 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
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
    </div>
  );
}

// Componente de vista en lista/árbol (mantener funcionalidad anterior como alternativa)
function TreeListView({ currentUserId }: { currentUserId: string }) {
  // Datos mock simplificados para la vista de lista
  const mockMembers = [
    { id: '1', name: 'Laura Pérez García', rank: 'Plata', level: 1, sales: 8500, downline: 8 },
    { id: '2', name: 'Carlos Rodríguez Mora', rank: 'Plata', level: 1, sales: 7200, downline: 5 },
    { id: '3', name: 'Patricia Sánchez Díaz', rank: 'Bronce', level: 1, sales: 1500, downline: 0 },
    { id: '4', name: 'Ana Martínez Ruiz', rank: 'Bronce', level: 2, sales: 3200, downline: 0 },
    { id: '5', name: 'José García Luna', rank: 'Bronce', level: 2, sales: 2800, downline: 0 },
    { id: '6', name: 'Diana López Vega', rank: 'Bronce', level: 2, sales: 2100, downline: 0 },
  ];

  const rankColors: Record<string, string> = {
    'Diamante': 'text-blue-600 bg-blue-50',
    'Platino': 'text-purple-600 bg-purple-50',
    'Oro': 'text-yellow-600 bg-yellow-50',
    'Plata': 'text-gray-600 bg-gray-50',
    'Bronce': 'text-orange-600 bg-orange-50',
    'Distribuidor': 'text-gray-500 bg-gray-100',
  };

  return (
    <div className="space-y-3">
      {mockMembers.map(member => (
        <Card key={member.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white font-bold">
                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{member.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${rankColors[member.rank] || rankColors['Distribuidor']}`}>
                    {member.rank}
                  </span>
                  <span className="text-xs text-gray-500">Nivel {member.level}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Red: {member.downline}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Ventas</p>
                <p className="font-bold text-gray-900">${member.sales.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
