'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import { usePromotions } from '@/hooks/usePromotions';
import { useCountries } from '@/hooks/useConfig';
import type { Product } from '@/types/product';
import type { PromotionListQueryParams } from '@/types/promotion';
import { useQueryFilters } from '@/hooks/useQueryFilters';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export function PromocionesTab() {
  const router = useRouter();

  const { get, getNumber, setParams } = useQueryFilters({
    status: 'active',
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

  const queryParams: PromotionListQueryParams = useMemo(() => {
    const p: PromotionListQueryParams = { page: currentPage, limit: pageSize };
    if (searchQuery) p.search = searchQuery;
    if (filterCountryId) p.countryId = filterCountryId;
    if (filterStatus === 'active') p.isActive = true;
    if (filterStatus === 'inactive') p.isActive = false;
    return p;
  }, [searchQuery, filterCountryId, filterStatus, currentPage, pageSize]);

  const activeStatsParams: PromotionListQueryParams = useMemo(() => {
    const p: PromotionListQueryParams = { limit: 1, page: 1, isActive: true };
    if (searchQuery) p.search = searchQuery;
    if (filterCountryId) p.countryId = filterCountryId;
    return p;
  }, [searchQuery, filterCountryId]);

  const { data: promosData, isLoading, isFetching, isError, refetch } = usePromotions(queryParams);
  const { data: activeStatsData } = usePromotions(activeStatsParams);

  const promos: Product[] = promosData?.data ?? [];
  const total = promosData?.total ?? 0;

  const stats = useMemo(() => ({
    total,
    active: filterStatus === 'active' ? total : filterStatus === 'inactive' ? 0 : (activeStatsData?.total ?? 0),
  }), [total, activeStatsData, filterStatus]);

  const hasActiveFilters = Boolean(searchQuery || filterStatus !== 'active' || filterCountryId);

  const handleSearch = () => {
    setParams({ search: searchInput.trim() });
  };

  const handleFilterStatus = (value: string) => {
    setParams({ status: value });
  };

  const handleFilterCountry = (value: string) => {
    setParams({ countryId: value || null });
  };

  const handlePageSizeChange = (size: number) => {
    setParams({ limit: String(size), page: null });
  };

  const resetFilters = () => {
    setSearchInput('');
    setParams({ search: null, status: 'active', countryId: null, page: null });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      sortValue: (p) => p.code,
      render: (promo) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {promo.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (p) => p.name,
      render: (promo) => (
        <div>
          <p className="font-semibold text-gray-900">{promo.name}</p>
          {promo.shortName && (
            <p className="text-sm text-gray-500 truncate max-w-xs">{promo.shortName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'countries',
      header: 'Países',
      render: (promo) => {
        const countries = promo.activeCountries ?? [];
        if (countries.length === 0) return <span className="text-sm text-gray-400">—</span>;
        const flagMap: Record<string, string> = {
          MX: '🇲🇽', US: '🇺🇸', CO: '🇨🇴', GT: '🇬🇹', FN: '🇲🇽',
          SV: '🇸🇻', HN: '🇭🇳', NI: '🇳🇮', CR: '🇨🇷', PA: '🇵🇦',
          PE: '🇵🇪', EC: '🇪🇨', CL: '🇨🇱', AR: '🇦🇷', BR: '🇧🇷', ES: '🇪🇸',
        };
        return (
          <div className="flex flex-wrap gap-1">
            {countries.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                title={code}
              >
                {flagMap[code] || '🏳️'} {code}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'pointsValue',
      header: 'Puntos',
      sortable: true,
      sortValue: (p) => parseFloat(p.pointsValue || '0') || 0,
      render: (promo) => (
        <span className="text-sm font-semibold text-gray-900">
          {promo.pointsValue && Number(promo.pointsValue) > 0
            ? new Intl.NumberFormat('es-MX').format(Number(promo.pointsValue))
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (p) => (p.isActive ? 1 : 0),
      render: (promo) =>
        promo.isActive ? (
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
      key: 'createdAt',
      header: 'Creada',
      sortable: true,
      sortValue: (p) => p.createdAt,
      render: (promo) => (
        <span className="text-sm text-gray-600">{formatDate(promo.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (promo) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => router.push(`/admin/promociones/${promo.id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-blue-50"
            title="Ver detalles"
          >
            <EyeIcon className="h-4 w-4 text-blue-600" />
          </button>
          <button
            onClick={() => router.push(`/admin/promociones/${promo.id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-green-50"
            title="Editar promoción"
          >
            <PencilIcon className="h-4 w-4 text-green-600" />
          </button>
        </div>
      ),
    },
  ];

  if (isError && !promosData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <XCircleIcon className="h-6 w-6" />
              <p>Error al cargar las promociones. Por favor, intenta de nuevo.</p>
            </div>
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
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Promociones</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <SparklesIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Promociones Activas</p>
                <p className="text-3xl font-bold text-green-600">{formatNumber(stats.active)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar por nombre o código</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="PROMO99, PROMO100..."
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
                <Button
                  variant="primary"
                  size="sm"
                  className="h-10 px-4 sm:min-w-[96px]"
                  onClick={handleSearch}
                >
                  Buscar
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">País</label>
              <SearchableSelect
                options={(countries ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                value={filterCountryId}
                onChange={handleFilterCountry}
                allLabel="Todos los Países"
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
                onChange={handleFilterStatus}
                allLabel="Todas"
                allValue="all"
                className="w-full"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                Filtros activos
              </span>
              {searchQuery && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Búsqueda: {searchQuery}
                </span>
              )}
              {filterStatus !== 'active' && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Estado: {filterStatus === 'all' ? 'Todas' : filterStatus === 'inactive' ? 'Inactivas' : 'Activas'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Promociones canjeables</h2>
            <p className="text-sm text-gray-600">
              Mostrando {promos.length} de {total}
            </p>
          </div>

          <div className="relative">
            {isFetching && promos.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
                <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2">
                  <ArrowPathIcon className="h-4 w-4 text-[#3E667D] animate-spin" />
                  <span className="text-sm font-medium text-gray-600">Actualizando...</span>
                </div>
              </div>
            )}

            <DataTable
              columns={columns}
              data={promos}
              isLoading={isLoading && !promosData}
              getRowKey={(promo) => promo.id}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="py-2 text-center">
                  <GiftIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">No se encontraron promociones</h3>
                  <p className="text-gray-600">
                    Intenta ajustar los filtros o crea una nueva promoción canjeable.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                    <Link href="/admin/promociones/nuevo">
                      <Button variant="primary" leftIcon={<PlusIcon className="h-4 w-4" />}>
                        Nueva Promoción
                      </Button>
                    </Link>
                  </div>
                </div>
              }
            />
          </div>

          {promos.length > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={total}
              isLoading={isLoading || isFetching}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
