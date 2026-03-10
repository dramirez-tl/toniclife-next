// components/network/UserDetailPanel.tsx - Panel lateral con detalles del distribuidor
'use client';

import { useMemo } from 'react';
import { useNetworkStats } from '@/hooks/useNetwork';
import { RANK_COLORS, RANK_LABELS, RANK_BG_COLORS, RANK_TEXT_COLORS } from '@/constants/ranks';
import { RankType, NetworkMemberDetail } from '@/types/network';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { TrophyIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

// Datos del usuario raíz para cuando se selecciona el nodo raíz
export interface RootUserDetailData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  code: string;
  rank: string;
  rankLabel: string;
  joinDate?: string;
  networkCount?: number;
  directCount?: number;
  maxDepth?: number;
  personalSales?: number;
  teamSales?: number;
  totalBusinessPoints?: string;
  currentCommission?: number;
  historicCommission?: number;
}

interface UserDetailPanelProps {
  userId: string | null;
  rootUserId?: string;
  rootUserDetailData?: RootUserDetailData;
  onClose?: () => void;
  onNavigateToSponsor?: (sponsorId: string) => void;
}

export function UserDetailPanel({
  userId,
  rootUserId,
  rootUserDetailData,
  onClose,
  onNavigateToSponsor
}: UserDetailPanelProps) {
  // Verificar si es el usuario raíz
  const isRootUser = userId === rootUserId && rootUserDetailData;

  // Solo hacer la llamada a la API si no es el nodo raíz
  const { data: apiMemberDetail, isLoading, error } = useNetworkStats(
    userId || '',
    !!userId && !isRootUser
  );

  // Usar datos del usuario raíz si es el nodo raíz, si no usar datos de la API
  const memberDetail: NetworkMemberDetail | undefined = useMemo(() => {
    if (isRootUser && rootUserDetailData) {
      return {
        id: rootUserDetailData.id,
        code: rootUserDetailData.code,
        firstName: rootUserDetailData.firstName,
        lastName: rootUserDetailData.lastName,
        email: rootUserDetailData.email,
        phone: rootUserDetailData.phone,
        rank: rootUserDetailData.rank as RankType,
        rankLabel: rootUserDetailData.rankLabel,
        joinDate: rootUserDetailData.joinDate || new Date().toISOString(),
        status: 'active' as const,
        stats: {
          customerId: rootUserDetailData.id,
          networkCount: rootUserDetailData.networkCount || 0,
          directCount: rootUserDetailData.directCount || 0,
          maxDepth: rootUserDetailData.maxDepth || 0,
          totalBusinessPoints: rootUserDetailData.totalBusinessPoints || '0',
          personalSales: rootUserDetailData.personalSales || 0,
          teamSales: rootUserDetailData.teamSales || 0,
          currentCommission: rootUserDetailData.currentCommission || 0,
          historicCommission: rootUserDetailData.historicCommission || 0,
        },
      };
    }
    return apiMemberDetail;
  }, [isRootUser, rootUserDetailData, apiMemberDetail]);

  if (!userId) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div>
          <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Selecciona un miembro de la red para ver sus detalles</p>
        </div>
      </div>
    );
  }

  // Solo mostrar cargando si no es el usuario raíz (ya que tenemos sus datos)
  if (isLoading && !isRootUser) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3E667D] mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando información...</p>
        </div>
      </div>
    );
  }

  if ((error && !isRootUser) || !memberDetail) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div>
          <XMarkIcon className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-500">Error al cargar la información</p>
        </div>
      </div>
    );
  }

  const rank = memberDetail.rank as RankType;
  const rankColor = RANK_COLORS[rank] || RANK_COLORS.distribuidor;
  const rankBgColor = RANK_BG_COLORS[rank] || RANK_BG_COLORS.distribuidor;
  const rankTextColor = RANK_TEXT_COLORS[rank] || RANK_TEXT_COLORS.distribuidor;
  const rankLabel = RANK_LABELS[rank] || 'Distribuidor';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar panel"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        )}

        {/* Avatar y nombre */}
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: rankColor }}
          >
            {memberDetail.firstName[0]}{memberDetail.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {memberDetail.firstName} {memberDetail.lastName}
            </h2>
            <p className="text-sm text-gray-500">Código: {memberDetail.code}</p>
            <div
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2"
              style={{ backgroundColor: rankBgColor, color: rankTextColor }}
            >
              <TrophyIcon className="h-3.5 w-3.5" />
              {rankLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Información de contacto */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Contacto
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <EnvelopeIcon className="h-4 w-4 text-gray-400" />
              <a href={`mailto:${memberDetail.email}`} className="text-[#3E667D] hover:underline truncate">
                {memberDetail.email}
              </a>
            </div>
            {memberDetail.phone && (
              <div className="flex items-center gap-3 text-sm">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
                <a href={`tel:${memberDetail.phone}`} className="text-gray-700 hover:text-[#3E667D]">
                  {memberDetail.phone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">Desde {formatDate(memberDetail.joinDate)}</span>
            </div>
          </div>
        </section>

        {/* Patrocinador */}
        {memberDetail.sponsorId && memberDetail.sponsorName && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Patrocinador
            </h3>
            <button
              onClick={() => onNavigateToSponsor?.(memberDetail.sponsorId!)}
              className="flex items-center gap-2 text-sm text-[#3E667D] hover:underline"
            >
              <UserIcon className="h-4 w-4" />
              {memberDetail.sponsorName}
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </button>
          </section>
        )}

        {/* Estadísticas de red */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Red
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <UserGroupIcon className="h-4 w-4" />
                <span className="text-xs">Directos</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{memberDetail.stats.directCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <UserGroupIcon className="h-4 w-4" />
                <span className="text-xs">Red Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{memberDetail.stats.networkCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 col-span-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <ChartBarIcon className="h-4 w-4" />
                <span className="text-xs">Profundidad Máxima</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{memberDetail.stats.maxDepth} niveles</p>
            </div>
          </div>
        </section>

        {/* Ventas */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Ventas (Periodo Actual)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ventas Personales</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(memberDetail.stats.personalSales)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ventas de Red</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(memberDetail.stats.teamSales)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Puntos de Negocio</span>
              <span className="font-semibold text-gray-900">
                {parseInt(memberDetail.stats.totalBusinessPoints).toLocaleString('es-MX')} pts
              </span>
            </div>
          </div>
        </section>

       
      </div>

      {/* Footer con acciones */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href={`/distribuidor/perfil/${memberDetail.id}`}
          className="block w-full py-2 px-4 bg-[#3E667D] text-white text-center font-medium rounded-lg hover:bg-[#3E667D]/90 transition-colors"
        >
          Ver Perfil Completo
        </Link>
      </div>
    </div>
  );
}
