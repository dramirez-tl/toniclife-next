'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import { selectUser } from '@/store/slices/authSlice';
import { useNetworkDownlines } from '@/hooks/useNetwork';
import { networkApi } from '@/services/networkApi';
import {
  useDistributorDashboard,
  useCopyReferralLink,
  useShareReferralLink,
} from '@/hooks/useDistributor';
import { DownlineItem, DownlineQuery } from '@/types/network';
import { RANK_ORDER, RANK_LABELS } from '@/constants/ranks';
import {
  UsersIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { MemberEnrollmentPanel } from './MemberEnrollmentPanel';

export default function RedPage() {
  return <Suspense><RedContent /></Suspense>;
}

function RedContent() {
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const user = useSelector(selectUser);

  const { profile: distributorProfile } = useDistributorDashboard();

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
                variant="secondary"
                size="sm"
                onClick={handleInviteMember}
              >
                <ShareIcon className="h-4 w-4" />
                Enlace de invitación
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEnrollOpen(true)}
              >
                <UserPlusIcon className="h-4 w-4" />
                Dar de alta miembro
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <TreeListView />

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
              onClick={() => setIsEnrollOpen(true)}
            >
              <UserPlusIcon className="h-5 w-5" />
              Dar de alta nuevo miembro
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
                variant="default"
                className="flex-1"
                onClick={handleCopyInviteLink}
                disabled={!dynamicPersonalLink || copyLinkMutation.isPending}
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copiar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleShareInviteLink}
                disabled={!dynamicPersonalLink || shareLinkMutation.isPending}
              >
                <ShareIcon className="h-4 w-4" />
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

      {/* Panel de alta estructurada (colocación + kit + modo de pago) */}
      <MemberEnrollmentPanel
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
      />
    </div>
  );
}

// Etiquetas de estado para el archivo exportado
const STATUS_LABELS_EXPORT: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
};

// Genera y descarga un CSV (UTF-8 + BOM, separador ";") que Excel abre en columnas.
function downloadDownlinesCsv(rows: DownlineItem[]) {
  const headers = ['Nombre', 'Email', 'Teléfono', 'Nivel', 'Rango', 'Patrocinador', 'ID patrocinador', 'Estado', 'Puntos personales', 'Fecha de ingreso'];
  const esc = (v: string | number | null | undefined) =>
    `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`;

  const body = rows.map((r) =>
    [
      r.fullName,
      r.email,
      r.phone || '',
      r.level,
      r.rankName || 'Distribuidor',
      r.sponsorName || '',
      r.sponsorCode || '',
      STATUS_LABELS_EXPORT[r.status] || r.status,
      r.personalPoints ?? 0,
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-MX') : '',
    ]
      .map(esc)
      .join(';'),
  );

  const csv = '﻿' + [headers.map(esc).join(';'), ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `descendencia-red-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Colores por rango (etiquetas en español devueltas por el backend)
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

// Vista de la descendencia de red (tabla con paginación del servidor)
function TreeListView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '20' });
  const levelFilterStr = get('level');
  const levelFilter = levelFilterStr ? parseInt(levelFilterStr) : undefined;
  const statusFilterStr = get('status');
  const statusFilter = (statusFilterStr || undefined) as DownlineQuery['status'] | undefined;
  const qualifiedStr = get('qualified');
  const qualified = qualifiedStr === 'true' ? true : qualifiedStr === 'false' ? false : undefined;
  const rankStr = get('rank');
  const rankNumber = rankStr ? parseInt(rankStr) : undefined;
  const page = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

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
    qualified,
    rankNumber,
    page,
    limit: pageSize,
    sortBy: 'level',
    sortOrder: 'asc',
  }), [debouncedSearch, levelFilter, statusFilter, qualified, rankNumber, page, pageSize]);

  const { data: response, isLoading, isFetching, error, refetch } = useNetworkDownlines(query);

  const hasActiveFilters = Boolean(
    debouncedSearch || levelFilter || statusFilter || qualifiedStr || rankStr,
  );

  // Descarga la red COMPLETA (sin filtros), paginando hasta traer todos los registros.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const fetchSize = 100; // el backend limita `limit` a 100 (@Max(100))
      const rows: DownlineItem[] = [];
      let total = 0;
      let p = 1;
      do {
        const res = await networkApi.getDownlines({
          page: p,
          limit: fetchSize,
          sortBy: 'level',
          sortOrder: 'asc',
        });
        total = res.total;
        if (!res.data.length) break;
        rows.push(...res.data);
        p += 1;
      } while (rows.length < total && p <= 2000);

      if (!rows.length) {
        toast('No tienes distribuidores en tu red para exportar');
        return;
      }
      downloadDownlinesCsv(rows);
      toast.success(`Se descargaron ${rows.length} distribuidores`);
    } catch {
      toast.error('No se pudo generar el archivo');
    } finally {
      setIsExporting(false);
    }
  };

  const columns: DataTableColumn<DownlineItem>[] = [
    {
      key: 'fullName',
      header: 'Distribuidor',
      sortable: true,
      sortValue: (m) => m.fullName,
      render: (m) => {
        const initials = m.fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{m.fullName}</p>
              <p className="text-xs text-gray-500 truncate">
                {m.email}
                {m.phone ? ` · ${m.phone}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'level',
      header: 'Nivel',
      sortable: true,
      sortValue: (m) => m.level,
      render: (m) => <span className="text-sm text-gray-600">Nivel {m.level}</span>,
    },
    {
      key: 'rankName',
      header: 'Rango',
      sortable: true,
      sortValue: (m) => m.rankName || 'Distribuidor',
      render: (m) => {
        const rank = m.rankName || 'Distribuidor';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${rankColors[rank] || rankColors['Distribuidor']}`}>
            {rank}
          </span>
        );
      },
    },
    {
      key: 'sponsorName',
      header: 'Patrocinador',
      sortable: true,
      sortValue: (m) => m.sponsorName || '',
      render: (m) =>
        m.sponsorName ? (
          <div className="min-w-0">
            <p className="text-sm text-gray-700 truncate">{m.sponsorName}</p>
            {m.sponsorCode && (
              <p className="text-xs text-gray-400 font-mono">ID {m.sponsorCode}</p>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (m) => m.status,
      render: (m) => {
        const s = statusLabels[m.status] || statusLabels.active;
        return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.color}`}>{s.label}</span>;
      },
    },
    {
      key: 'personalPoints',
      header: 'Pts. personales',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      sortable: true,
      sortValue: (m) => m.personalPoints ?? 0,
      render: (m) => (
        <span className="font-bold text-gray-900">{(m.personalPoints ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ingreso',
      sortable: true,
      sortValue: (m) => m.createdAt || '',
      render: (m) => (
        <span className="text-sm text-gray-500">
          {m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-MX') : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Encabezado: Descendencia de Red + descarga */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Descendencia de Red</h2>
              <p className="text-sm text-gray-500">Consulta tu red y descarga la lista completa en Excel</p>
            </div>
            <Button
              variant="default"
              onClick={handleExport}
              disabled={isExporting || (isExporting)}
            >
              {isExporting && <Loader2 className="mr-2 size-4 animate-spin" />}
              <ArrowDownTrayIcon className="h-4 w-4" />
              Descargar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

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
              onChange={(val) => setParams({ level: val || null, page: null })}
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
              onChange={(val) => setParams({ status: val || null, page: null })}
              allLabel="Todos los estados"
              allValue=""
            />
            {/* Filtro de calificación */}
            <SearchableSelect
              options={[
                { value: 'false', label: 'No calificados' },
                { value: 'true', label: 'Calificados' },
              ]}
              value={qualifiedStr}
              onChange={(val) => setParams({ qualified: val || null, page: null })}
              allLabel="Calificación: todos"
              allValue=""
            />
            {/* Filtro de rango */}
            <SearchableSelect
              options={RANK_ORDER.map((code, i) => ({
                value: String(i + 1),
                label: RANK_LABELS[code],
              }))}
              value={rankStr}
              onChange={(val) => setParams({ rank: val || null, page: null })}
              allLabel="Todos los rangos"
              allValue=""
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      {error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500 mb-2">Error al cargar los distribuidores</p>
            <p className="text-sm text-gray-500">Intenta de nuevo más tarde</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            {isFetching && !isLoading && (
              <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                Actualizando resultados...
              </div>
            )}
            <DataTable
              columns={columns}
              data={response?.data ?? []}
              isLoading={isLoading}
              getRowKey={(m) => m.id}
              minWidthClassName="min-w-[920px]"
              emptyState={
                <div className="py-4 text-center">
                  <UsersIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No se encontraron distribuidores con los filtros aplicados'
                      : 'No tienes distribuidores en tu red aún'}
                  </p>
                </div>
              }
            />

            {response && response.total > 0 && (
              <DataTablePagination
                currentPage={page}
                pageSize={pageSize}
                totalItems={response.total}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
