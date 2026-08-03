'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  GiftIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  CubeIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { useKits } from '@/hooks/useKits';
import { useCountries } from '@/hooks/useConfig';
import { KitPosition, KIT_POSITION_LABEL } from '@/types/product';
import type { Product } from '@/types/product';
import type { KitListQueryParams } from '@/types/kit';
import { useQueryFilters } from '@/hooks/useQueryFilters';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

const KIT_POSITION_COLORS: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
  preferred: 'bg-amber-100 text-amber-800',
};

export function KitsTab() {
  const router = useRouter();

  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    kitPosition: '',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const filterPosition = get('kitPosition') as KitPosition | '';
  const filterStatus = get('status') as 'all' | 'active' | 'inactive';
  const filterCountryId = get('countryId');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);

  const { data: countries } = useCountries();

  // Default al primer pais activo (MX si existe). Solo set una vez sin
  // sobreescribir filtro explicito del usuario.
  useEffect(() => {
    if (!filterCountryId && countries && countries.length > 0) {
      const mx = countries.find((c) => c.code === 'MX');
      setParams({ countryId: mx?.id ?? countries[0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  const selectedCountry = countries?.find((c) => c.id === filterCountryId);

  const queryParams: KitListQueryParams = useMemo(() => {
    const p: KitListQueryParams = { page: currentPage, limit: pageSize };
    if (searchQuery) p.search = searchQuery;
    if (filterPosition) p.kitPosition = filterPosition;
    if (filterCountryId) p.countryId = filterCountryId;
    if (filterStatus === 'active') p.isActive = true;
    if (filterStatus === 'inactive') p.isActive = false;
    return p;
  }, [searchQuery, filterPosition, filterCountryId, filterStatus, currentPage, pageSize]);

  const activeStatsParams: KitListQueryParams = useMemo(() => {
    const p: KitListQueryParams = { limit: 1, page: 1, isActive: true };
    if (searchQuery) p.search = searchQuery;
    if (filterPosition) p.kitPosition = filterPosition;
    if (filterCountryId) p.countryId = filterCountryId;
    return p;
  }, [searchQuery, filterPosition, filterCountryId]);

  const { data: kitsData, isLoading, isFetching, isError, refetch } = useKits(queryParams);
  const { data: activeStatsData } = useKits(activeStatsParams);

  const kits: Product[] = kitsData?.data ?? [];
  const total = kitsData?.total ?? 0;

  const stats = useMemo(() => {
    const active = filterStatus === 'active' ? total : filterStatus === 'inactive' ? 0 : (activeStatsData?.total ?? 0);
    return {
      total,
      active,
    };
  }, [total, activeStatsData, filterStatus]);

  const hasActiveFilters = Boolean(
    searchQuery || filterPosition || filterStatus !== 'all',
  );

  const handleSearch = () => {
    setParams({ search: searchInput.trim() });
  };

  const handleFilterPosition = (value: string) => {
    setParams({ kitPosition: value });
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
    setParams({ search: null, kitPosition: '', status: 'all', page: null });
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
      sortValue: (k) => k.code,
      render: (kit) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {kit.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (k) => k.name,
      render: (kit) => (
        <div className="flex items-center gap-3">
          {/* Imagen principal del kit: el hueco ambar delata los que faltan
              por subir (el POS la muestra al inscribir). */}
          {kit.imageUrl ? (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image
                src={kit.imageUrl}
                alt={kit.name}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center flex-shrink-0"
              title="Este kit no tiene imagen cargada"
            >
              <PhotoIcon className="h-5 w-5 text-amber-500" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{kit.name}</p>
            {kit.shortName && (
              <p className="text-sm text-gray-500 truncate max-w-xs">{kit.shortName}</p>
            )}
            {!kit.imageUrl && (
              <p className="text-xs font-medium text-amber-600">Sin imagen</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'kitPosition',
      header: 'Posición',
      sortable: true,
      sortValue: (k) => k.kitPosition || '',
      render: (kit) =>
        kit.kitPosition ? (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              KIT_POSITION_COLORS[kit.kitPosition] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {KIT_POSITION_LABEL[kit.kitPosition as KitPosition] || kit.kitPosition}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Sin posición</span>
        ),
    },
    {
      key: 'price',
      header: `Precio ${selectedCountry ? `(${selectedCountry.code})` : ''}`,
      sortable: true,
      sortValue: (k) => parseFloat(k.price || '0') || 0,
      render: (kit) => (
        <span className="text-sm font-semibold text-gray-900">
          {kit.price && Number(kit.price) > 0
            ? `$${Number(kit.price).toLocaleString('es-MX')} ${kit.priceCurrency || ''}`
            : <span className="text-xs text-gray-400 italic">Sin precio</span>
          }
        </span>
      ),
    },
    {
      key: 'countries',
      header: 'Países',
      render: (kit) => {
        const countries = kit.activeCountries ?? [];
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
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (k) => (k.isActive ? 1 : 0),
      render: (kit) =>
        kit.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Inactivo
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      sortable: true,
      sortValue: (k) => k.createdAt,
      render: (kit) => (
        <span className="text-sm text-gray-600">{formatDate(kit.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (kit) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => router.push(`/admin/kits/${kit.id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-green-50"
            title="Editar kit"
          >
            <PencilIcon className="h-4 w-4 text-green-600" />
          </button>
        </div>
      ),
    },
  ];

  if (isError && !kitsData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <XCircleIcon className="h-6 w-6" />
              <p>Error al cargar los kits. Por favor, intenta de nuevo.</p>
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
                <p className="text-sm text-gray-600 mb-1">Total Kits</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CubeIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Kits Activos</p>
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
            <div className="lg:col-span-5">
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar por nombre o código</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="KBM10, Kit Básico..."
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
                  variant="default"
                  size="sm"
                  className="h-10 px-4 sm:min-w-[96px]"
                  onClick={handleSearch}
                >
                  Buscar
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">País (precio)</label>
              <SearchableSelect
                options={(countries ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                value={filterCountryId}
                onChange={handleFilterCountry}
                allLabel="Todos los Países"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Posición</label>
              <SearchableSelect
                options={[
                  { value: KitPosition.BASIC, label: 'Básico' },
                  { value: KitPosition.PREMIUM, label: 'Premium' },
                  { value: KitPosition.PREFERRED, label: 'Preferente' },
                ]}
                value={filterPosition}
                onChange={handleFilterPosition}
                allLabel="Todas"
                allValue=""
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <SearchableSelect
                options={[
                  { value: 'active', label: 'Activos' },
                  { value: 'inactive', label: 'Inactivos' },
                ]}
                value={filterStatus}
                onChange={handleFilterStatus}
                allLabel="Todos"
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
              {filterPosition && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Posición: {KIT_POSITION_LABEL[filterPosition as KitPosition] || filterPosition}
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Estado: {filterStatus === 'active' ? 'Activos' : 'Inactivos'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Kits de inscripción</h2>
            <p className="text-sm text-gray-600">
              Mostrando {kits.length} de {total}
            </p>
          </div>

          <div className="relative">
            {isFetching && kits.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
                <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2">
                  <ArrowPathIcon className="h-4 w-4 text-[#3E667D] animate-spin" />
                  <span className="text-sm font-medium text-gray-600">Actualizando...</span>
                </div>
              </div>
            )}

            <DataTable
              columns={columns}
              data={kits}
              isLoading={isLoading && !kitsData}
              getRowKey={(kit) => kit.id}
              minWidthClassName="min-w-[1000px]"
              emptyState={
                <div className="py-2 text-center">
                  <GiftIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">No se encontraron kits</h3>
                  <p className="text-gray-600">
                    Intenta ajustar los filtros o crea un nuevo kit de inscripción.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                    <Link href="/admin/kits/nuevo">
                      <Button variant="default">
                        <PlusIcon className="h-4 w-4" />
                        Nuevo Kit
                      </Button>
                    </Link>
                  </div>
                </div>
              }
            />
          </div>

          {kits.length > 0 && (
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
