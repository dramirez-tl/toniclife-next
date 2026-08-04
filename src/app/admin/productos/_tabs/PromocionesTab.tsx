'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  GiftIcon,
  PhotoIcon,
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
      render: (promo) => {
        // La imagen de una promo se sube POR PAÍS (mig 107); la base del
        // producto es solo el respaldo. Miniatura: base o, si no hay, la
        // primera imagen de país. "Sin imagen" = ningún país ni base.
        const ruleImages = (promo.promotionRuleCountries ?? []).filter(
          (r) => r.imageUrl,
        );
        const thumb = promo.imageUrl || ruleImages[0]?.imageUrl || null;
        return (
          <div className="flex items-center gap-3">
            {thumb ? (
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                <Image
                  src={thumb}
                  alt={promo.name}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center flex-shrink-0"
                title="Esta promoción no tiene imagen cargada en ningún país"
              >
                <PhotoIcon className="h-5 w-5 text-amber-500" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{promo.name}</p>
              {promo.shortName && (
                <p className="text-sm text-gray-500 truncate max-w-xs">{promo.shortName}</p>
              )}
              {!thumb && (
                <p className="text-xs font-medium text-amber-600">Sin imagen</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'countries',
      header: 'Países',
      render: (promo) => {
        const flagMap: Record<string, string> = {
          MX: '🇲🇽', US: '🇺🇸', CO: '🇨🇴', GT: '🇬🇹', FN: '🇲🇽',
          SV: '🇸🇻', HN: '🇭🇳', NI: '🇳🇮', CR: '🇨🇷', PA: '🇵🇦',
          PE: '🇵🇪', EC: '🇪🇨', CL: '🇨🇱', AR: '🇦🇷', BR: '🇧🇷', ES: '🇪🇸',
        };
        // Para promos lo que importa es dónde hay REGLA de canje configurada
        // (multipaís real), no solo dónde hay precio activo.
        const rules = promo.promotionRuleCountries ?? [];
        if (rules.length > 0) {
          return (
            <div className="flex flex-col gap-1">
              {rules.map((r) => {
                // Estado del país: inactiva (apagada a mano) > vencida/futura
                // (ventana de fechas fuera de hoy) > vigente.
                const vigente = r.isActive && r.isCurrent !== false;
                const vencida = r.isActive && r.isCurrent === false;
                const ventana =
                  r.availableFrom || r.availableTo
                    ? ` · ventana ${r.availableFrom ?? '…'} → ${r.availableTo ?? '…'}`
                    : '';
                return (
                  <span
                    key={r.code}
                    className={`inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                      !r.isActive
                        ? 'bg-gray-50 text-gray-400 line-through'
                        : vencida
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-800'
                    }`}
                    title={`${r.name}: ${formatNumber(Number(r.minPoints))} puntos mínimos${!r.isActive ? ' (regla inactiva)' : vencida ? ' (FUERA de vigencia)' : ' (vigente hoy)'}${ventana}${r.imageUrl ? ' — con imagen propia' : ' — SIN imagen propia (usa la base)'}`}
                  >
                    {flagMap[r.code] || '🏳️'} {r.code}
                    <span className="font-normal opacity-80">
                      · {formatNumber(Number(r.minPoints))} pts
                    </span>
                    {vencida && (
                      <span className="rounded bg-amber-200/70 px-1 text-[10px] font-semibold uppercase text-amber-800">
                        no vigente
                      </span>
                    )}
                    {vigente && (
                      <span className="rounded bg-emerald-200/60 px-1 text-[10px] font-semibold uppercase text-emerald-800">
                        vigente
                      </span>
                    )}
                    {/* La imagen se sube POR PAÍS: marca qué países ya la tienen */}
                    <PhotoIcon
                      className={`h-3.5 w-3.5 ${
                        r.imageUrl ? 'text-emerald-600' : 'text-amber-400'
                      }`}
                    />
                  </span>
                );
              })}
            </div>
          );
        }
        const countries = promo.activeCountries ?? [];
        if (countries.length === 0) return <span className="text-sm text-gray-400">—</span>;
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
      key: 'channels',
      header: 'Canales',
      render: (promo) => {
        const channels: string[] = [];
        if (promo.availableInPos) channels.push('POS');
        if (promo.isVisibleEcommerce) channels.push('Tienda');
        if (channels.length === 0) return <span className="text-sm text-gray-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {channels.map((ch) => (
              <span
                key={ch}
                className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium"
              >
                {ch}
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
                      <Button variant="default">
                        <PlusIcon className="h-4 w-4" />
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
