'use client';

// Pestaña Membresías (Productos): campañas "Compra N puntos en producto y tu
// membresía es gratis" (mig 168). Se encienden POR SUCURSAL: 0 sucursales =
// apagada. Sin la migración el API responde 503 y aquí se avisa sin romper.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  IdentificationIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useMembershipCampaigns } from '@/hooks/useMembershipCampaigns';
import { useCountries } from '@/hooks/useConfig';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useProductPermissions } from '@/components/admin/products/lib/permissions';
import type {
  MembershipCampaign,
  MembershipCampaignListQueryParams,
} from '@/types/membership-campaign';
import {
  apiErrorMessage,
  appliesToLabel,
  benefitSummary,
  branchesLabel,
  formatPoints,
  isMigrationMissingError,
  toYmd,
  validityLabel,
  validityState,
} from '@/lib/membership-campaigns';

const FLAGS: Record<string, string> = {
  MX: '🇲🇽', US: '🇺🇸', CO: '🇨🇴', GT: '🇬🇹', SV: '🇸🇻', HN: '🇭🇳', NI: '🇳🇮',
  CR: '🇨🇷', PA: '🇵🇦', PE: '🇵🇪', EC: '🇪🇨', CL: '🇨🇱', AR: '🇦🇷', BR: '🇧🇷', ES: '🇪🇸',
};

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export function MembresiasTab() {
  const router = useRouter();
  const { canUpdate } = useProductPermissions();

  // Las campañas NACEN apagadas (isActive=false): el filtro arranca en "Todas"
  // para que una recién creada se vea en la lista.
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const filterStatus = get('status') as 'all' | 'active' | 'inactive';
  const filterCountryId = get('countryId');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);

  const { data: countries } = useCountries();

  const queryParams: MembershipCampaignListQueryParams = useMemo(() => {
    const p: MembershipCampaignListQueryParams = { page: currentPage, limit: pageSize };
    if (searchQuery) p.search = searchQuery;
    if (filterCountryId) p.countryId = filterCountryId;
    if (filterStatus === 'active') p.isActive = true;
    if (filterStatus === 'inactive') p.isActive = false;
    return p;
  }, [searchQuery, filterCountryId, filterStatus, currentPage, pageSize]);

  const activeStatsParams: MembershipCampaignListQueryParams = useMemo(() => {
    const p: MembershipCampaignListQueryParams = { limit: 1, page: 1, isActive: true };
    if (searchQuery) p.search = searchQuery;
    if (filterCountryId) p.countryId = filterCountryId;
    return p;
  }, [searchQuery, filterCountryId]);

  const { data, isLoading, isFetching, isError, error, refetch } = useMembershipCampaigns(queryParams);
  const { data: activeStatsData } = useMembershipCampaigns(activeStatsParams);

  const campaigns: MembershipCampaign[] = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const today = toYmd(new Date());

  const stats = useMemo(
    () => ({
      total,
      active:
        filterStatus === 'active' ? total : filterStatus === 'inactive' ? 0 : (activeStatsData?.total ?? 0),
      // Encendidas = con al menos una sucursal (de la página que se ve).
      enabledHere: campaigns.filter((c) => c.branchCount > 0).length,
    }),
    [total, activeStatsData, filterStatus, campaigns],
  );

  const hasActiveFilters = Boolean(searchQuery || filterStatus !== 'all' || filterCountryId);

  const handleSearch = () => setParams({ search: searchInput.trim() });
  const resetFilters = () => {
    setSearchInput('');
    setParams({ search: null, status: null, countryId: null, page: null });
  };

  const columns: DataTableColumn<MembershipCampaign>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      sortValue: (c) => c.code,
      render: (c) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {c.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.imageUrl ? (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {/* URL libre (cualquier host): next/image exige dominios registrados. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageThumbnailUrl ?? c.imageUrl} alt="" className="h-10 w-10 object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#C8DDF2]/40 flex items-center justify-center flex-shrink-0">
              <IdentificationIcon className="h-5 w-5 text-[#2f5165]" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{c.name}</p>
            {c.description && (
              <p className="text-xs text-gray-500 truncate max-w-xs" title={c.description}>
                {c.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'País',
      sortable: true,
      sortValue: (c) => c.countryCode,
      render: (c) => (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
          title={c.countryName}
        >
          {FLAGS[c.countryCode] || '🏳️'} {c.countryCode}
        </span>
      ),
    },
    {
      key: 'minPoints',
      header: 'Umbral',
      sortable: true,
      sortValue: (c) => Number(c.minPoints),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
          {formatPoints(c.minPoints)} <span className="font-normal text-gray-500">pts</span>
        </span>
      ),
    },
    {
      key: 'appliesTo',
      header: 'A quién',
      sortable: true,
      sortValue: (c) => c.appliesTo,
      render: (c) => <span className="text-sm text-gray-700">{appliesToLabel(c.appliesTo)}</span>,
    },
    {
      key: 'benefit',
      header: 'Beneficio',
      render: (c) => (
        <span className="text-sm text-gray-700" title={c.gifts.map((g) => `${g.sku} × ${g.quantity}`).join(', ')}>
          {benefitSummary(c)}
        </span>
      ),
    },
    {
      key: 'branches',
      header: 'Sucursales',
      sortable: true,
      sortValue: (c) => c.branchCount,
      render: (c) =>
        c.branchCount > 0 ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800"
            title={c.branches.map((b) => b.branchName).join(', ')}
          >
            <BuildingStorefrontIcon className="h-3.5 w-3.5" />
            {branchesLabel(c.branchCount)}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
            title="Sin sucursales habilitadas: el POS no la ofrece en ninguna"
          >
            {branchesLabel(0)}
          </span>
        ),
    },
    {
      key: 'redemptions',
      header: 'Canjes',
      sortable: true,
      sortValue: (c) => c.redemptionCount,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => <span className="text-sm font-medium text-gray-900">{formatNumber(c.redemptionCount)}</span>,
    },
    {
      key: 'validity',
      header: 'Vigencia',
      render: (c) => {
        const state = validityState(c.validFrom, c.validTo, today);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-700 whitespace-nowrap">{validityLabel(c.validFrom, c.validTo)}</span>
            {state === 'scheduled' && (
              <span className="w-fit rounded bg-blue-50 px-1.5 text-[10px] font-semibold uppercase text-blue-700">
                Programada
              </span>
            )}
            {state === 'expired' && (
              <span className="w-fit rounded bg-amber-100 px-1.5 text-[10px] font-semibold uppercase text-amber-800">
                Vencida
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (c) => (c.isActive ? 1 : 0),
      render: (c) =>
        c.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Activa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Inactiva
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/membresias/${c.id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-green-50"
            title={canUpdate ? 'Editar campaña' : 'Ver campaña'}
          >
            <PencilIcon className="h-4 w-4 text-green-600" />
          </button>
        </div>
      ),
    },
  ];

  if (isError && !data) {
    const migrationMissing = isMigrationMissingError(error);
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className={migrationMissing ? 'border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-6">
            {migrationMissing ? (
              <div className="flex items-start gap-3 text-amber-900">
                <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Falta aplicar la migración 168</p>
                  <p className="mt-1 text-sm">
                    El API respondió 503: el módulo de campañas de membresía aún no está disponible en
                    esta base de datos. Aplica la migración 168 y vuelve a intentar.
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80">
                    {apiErrorMessage(error, 'Sin detalle del API.')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-700">
                <XCircleIcon className="h-6 w-6" />
                <p>{apiErrorMessage(error, 'Error al cargar las campañas de membresía. Intenta de nuevo.')}</p>
              </div>
            )}
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total campañas</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
              </div>
              <div className="w-12 h-12 bg-[#C8DDF2]/60 rounded-full flex items-center justify-center">
                <IdentificationIcon className="h-6 w-6 text-[#2f5165]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Campañas activas</p>
                <p className="text-3xl font-bold text-green-600">{formatNumber(stats.active)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Encendidas en alguna sucursal</p>
                <p className="text-3xl font-bold text-emerald-700">{formatNumber(stats.enabledHere)}</p>
                <p className="text-xs text-gray-400">de las {campaigns.length} de esta página</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <BuildingStorefrontIcon className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-gray-100 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">Búsqueda y filtros</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-600"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Actualizando...' : 'Actualizar'}
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
            <div className="lg:col-span-6">
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar por código o nombre</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="MEMB1650, membresía gratis…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
                <Button variant="default" size="sm" className="h-10 px-4 sm:min-w-[96px]" onClick={handleSearch}>
                  Buscar
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">País</label>
              <SearchableSelect
                options={(countries ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                value={filterCountryId}
                onChange={(v) => setParams({ countryId: v || null })}
                allLabel="Todos los países"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <SearchableSelect
                options={[
                  { value: 'active', label: 'Activas' },
                  { value: 'inactive', label: 'Inactivas' },
                ]}
                value={filterStatus}
                onChange={(v) => setParams({ status: v })}
                allLabel="Todas"
                allValue="all"
                className="w-full"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">Filtros activos</span>
              {searchQuery && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">Búsqueda: {searchQuery}</span>
              )}
              {filterStatus !== 'all' && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Estado: {filterStatus === 'inactive' ? 'Inactivas' : 'Activas'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Campañas de membresía</h2>
              <p className="text-xs text-gray-500">
                Una compra con ≥ N puntos en producto da la posición sin pagar kit, regalos a $0 y un cupón
                de primera recompra. Se enciende por sucursal.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Mostrando {campaigns.length} de {total}
            </p>
          </div>

          <div className="relative">
            {isFetching && campaigns.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
                <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2">
                  <ArrowPathIcon className="h-4 w-4 text-[#3E667D] animate-spin" />
                  <span className="text-sm font-medium text-gray-600">Actualizando...</span>
                </div>
              </div>
            )}

            <DataTable
              columns={columns}
              data={campaigns}
              isLoading={isLoading && !data}
              getRowKey={(c) => c.id}
              minWidthClassName="min-w-[1100px]"
              emptyState={
                <div className="py-2 text-center">
                  <IdentificationIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">No hay campañas de membresía</h3>
                  <p className="text-gray-600">
                    Ajusta los filtros o crea la primera campaña: “Compra N puntos y tu membresía es gratis”.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                    {canUpdate && (
                      <Link href="/admin/membresias/nuevo">
                        <Button variant="default">
                          <PlusIcon className="h-4 w-4" />
                          Nueva campaña
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              }
            />
          </div>

          {campaigns.length > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={total}
              isLoading={isLoading || isFetching}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
