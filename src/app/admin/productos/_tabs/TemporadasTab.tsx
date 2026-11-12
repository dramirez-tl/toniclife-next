'use client';

// Pestaña Temporadas (Productos): promociones de temporada (mig 186). Una
// temporada (Buen Fin…) con fecha-hora local de inicio/fin y países agrupa
// promociones 3x2 / precio especial / % / regalo por compra; el POS y la
// tienda las aplican solos. Sin la migración el API responde 503 y aquí se
// avisa sin romper.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { usePromoSeasons } from '@/hooks/useSeasonalPromotions';
import { useCountries } from '@/hooks/useConfig';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useProductPermissions } from '@/components/admin/products/lib/permissions';
import { ArtZoom } from '@/components/admin/seasonal-promotions/ArtZoom';
import type { PromoSeason, PromoSeasonListQueryParams, SeasonStatusFilter } from '@/types/seasonal-promotion';
import {
  FLAGS,
  apiErrorMessage,
  formatMoney,
  isMigrationMissingError,
  seasonStatusLabel,
  windowLabel,
} from '@/lib/seasonal-promotions';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

const STATUS_OPTIONS: { value: SeasonStatusFilter; label: string }[] = [
  { value: 'active', label: 'En curso' },
  { value: 'upcoming', label: 'Programadas' },
  { value: 'ended', label: 'Terminadas' },
  { value: 'inactive', label: 'Inactivas' },
];

export function SeasonStatusPill({ status }: { status: PromoSeason['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-green-100 text-green-700'
      : status === 'upcoming'
        ? 'bg-blue-50 text-blue-700'
        : status === 'ended'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100 text-gray-700';
  const Icon = status === 'active' ? CheckCircleIcon : status === 'upcoming' ? ClockIcon : XCircleIcon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {seasonStatusLabel(status)}
    </span>
  );
}

export function CountryChips({ countries }: { countries: PromoSeason['countries'] }) {
  if (countries.length === 0) return <span className="text-xs text-gray-400">Sin países</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {countries.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700"
          title={c.name}
        >
          {FLAGS[c.code] || '🏳️'} {c.code}
        </span>
      ))}
    </div>
  );
}

export function TemporadasTab() {
  const router = useRouter();
  const { canManageSeasons } = useProductPermissions();

  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const filterStatus = (get('status') || 'all') as SeasonStatusFilter;
  const filterCountryId = get('countryId');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const { data: countries } = useCountries();

  const queryParams: PromoSeasonListQueryParams = useMemo(() => {
    const p: PromoSeasonListQueryParams = { page: currentPage, limit: pageSize, status: filterStatus };
    if (searchQuery) p.search = searchQuery;
    if (filterCountryId) p.countryId = filterCountryId;
    return p;
  }, [searchQuery, filterCountryId, filterStatus, currentPage, pageSize]);

  const { data, isLoading, isFetching, isError, error, refetch } = usePromoSeasons(queryParams);
  const { data: activeData } = usePromoSeasons({ status: 'active', limit: 1, page: 1 });
  const { data: upcomingData } = usePromoSeasons({ status: 'upcoming', limit: 1, page: 1 });

  const seasons: PromoSeason[] = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;

  const hasActiveFilters = Boolean(searchQuery || filterStatus !== 'all' || filterCountryId);
  const handleSearch = () => setParams({ search: searchInput.trim() });
  const resetFilters = () => {
    setSearchInput('');
    setParams({ search: null, status: null, countryId: null, page: null });
  };

  const columns: DataTableColumn<PromoSeason>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      sortValue: (s) => s.code,
      render: (s) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {s.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Temporada',
      sortable: true,
      sortValue: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          {s.imageUrl ? (
            // Al pulsar la miniatura el arte de la temporada se ve en grande.
            <ArtZoom
              thumbSrc={s.imageThumbnailUrl ?? s.imageUrl}
              fullSrc={s.imageUrl}
              title={s.name}
              caption="Arte de la temporada"
              className="h-10 w-16 rounded-lg"
            />
          ) : (
            <div className="flex h-10 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#C8DDF2]/40">
              <CalendarDaysIcon className="h-5 w-5 text-[#2f5165]" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{s.name}</p>
            {s.description && (
              <p className="max-w-xs truncate text-xs text-gray-500" title={s.description}>
                {s.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'window',
      header: 'Vigencia (hora local)',
      sortable: true,
      sortValue: (s) => s.startsAt,
      render: (s) => (
        <div className="flex flex-col gap-1">
          <span className="whitespace-nowrap text-sm text-gray-700">{windowLabel(s.startsAt, s.endsAt)}</span>
          <SeasonStatusPill status={s.status} />
        </div>
      ),
    },
    {
      key: 'countries',
      header: 'Países',
      render: (s) => <CountryChips countries={s.countries} />,
    },
    {
      key: 'promotions',
      header: 'Promos',
      sortable: true,
      sortValue: (s) => s.promotionsCount,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (s) => (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900">
          <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
          {formatNumber(s.promotionsCount)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Ventas',
      sortable: true,
      sortValue: (s) => s.usageCount,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (s) => (
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-gray-900">{formatNumber(s.usageCount)}</span>
          {s.discountTotal > 0 && (
            <span className="text-xs text-gray-500" title="Descuento acumulado en ventas cobradas">
              {formatMoney(s.discountTotal)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/temporadas/${s.id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-green-50"
            title={canManageSeasons ? 'Editar temporada' : 'Ver temporada'}
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
                  <p className="font-semibold">Falta aplicar la migración 186</p>
                  <p className="mt-1 text-sm">
                    El API respondió 503: el módulo de promociones de temporada aún no está disponible en esta
                    base de datos. Aplica la migración 186 y vuelve a intentar.
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80">
                    {apiErrorMessage(error, 'Sin detalle del API.')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-700">
                <XCircleIcon className="h-6 w-6" />
                <p>{apiErrorMessage(error, 'Error al cargar las temporadas. Intenta de nuevo.')}</p>
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
                <p className="mb-1 text-sm text-gray-600">Temporadas</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(total)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C8DDF2]/60">
                <CalendarDaysIcon className="h-6 w-6 text-[#2f5165]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-600">En curso ahora</p>
                <p className="text-3xl font-bold text-green-600">{formatNumber(activeData?.total ?? 0)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-600">Programadas</p>
                <p className="text-3xl font-bold text-blue-700">{formatNumber(upcomingData?.total ?? 0)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <ClockIcon className="h-6 w-6 text-blue-700" />
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
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Buscar por código o nombre
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="BUENFIN2026, Buen Fin…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-[#3E667D]"
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
              <label className="mb-1 block text-xs font-medium text-gray-500">País</label>
              <SearchableSelect
                options={(countries ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                value={filterCountryId}
                onChange={(v) => setParams({ countryId: v || null })}
                allLabel="Todos los países"
                className="w-full"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-medium text-gray-500">Estado</label>
              <SearchableSelect
                options={STATUS_OPTIONS}
                value={filterStatus}
                onChange={(v) => setParams({ status: v })}
                allLabel="Todas"
                allValue="all"
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Temporadas de promociones</h2>
              <p className="text-xs text-gray-500">
                Cada temporada trae sus promociones con fecha y hora local; el POS las muestra y aplica el día
                que toca y la tienda en línea las aplica para el país que corresponda.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Mostrando {seasons.length} de {total}
            </p>
          </div>

          <div className="relative">
            {isFetching && seasons.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  <ArrowPathIcon className="h-4 w-4 animate-spin text-[#3E667D]" />
                  <span className="text-sm font-medium text-gray-600">Actualizando...</span>
                </div>
              </div>
            )}
            <DataTable
              columns={columns}
              data={seasons}
              isLoading={isLoading && !data}
              getRowKey={(s) => s.id}
              minWidthClassName="min-w-[1000px]"
              emptyState={
                <div className="py-2 text-center">
                  <CalendarDaysIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">No hay temporadas</h3>
                  <p className="text-gray-600">
                    Crea la primera (p. ej. Buen Fin) con sus fechas y países, y agrega adentro las
                    promociones.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                    {canManageSeasons && (
                      <Link href="/admin/temporadas/nuevo">
                        <Button variant="default">
                          <PlusIcon className="h-4 w-4" />
                          Nueva temporada
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              }
            />
          </div>

          {seasons.length > 0 && (
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
