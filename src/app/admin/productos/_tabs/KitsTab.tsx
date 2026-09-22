'use client';

// KitsTab — pestaña Kits de /admin/productos.
//
// Además del listado (GET /products con isEnrollmentKit + productType=kit) cruza
// GET /products/kits/availability (contrato kits §4.1, solo lectura) para
// responder en la misma tabla "¿dónde no se vende KPM05 y qué le falta?":
//   - columna Surtido ("Se arma al vender" / "Prearmado"),
//   - columna Disponible hoy ("47 de 60 · máx 20" con semáforo, faltantes y chips
//     "Sin receta" / "Sin precio" / "Existencia fantasma" / "Sin respaldo"),
//   - filtros Surtido, Disponibilidad y "Le falta…" (por componente).
// Con esos filtros la lista se trae completa (son ~55 kits) y se filtra y pagina
// aquí. Si el servidor aún no expone la disponibilidad (404) la columna avisa y
// los filtros se deshabilitan: nada se rompe.

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
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useKits } from '@/hooks/useKits';
import { useKitsAvailability } from '@/hooks/useKitAvailability';
import { useCountries } from '@/hooks/useConfig';
import { KitPosition, KIT_POSITION_LABEL } from '@/types/product';
import type { Product } from '@/types/product';
import type { KitListQueryParams } from '@/types/kit';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  AVAILABILITY_FILTER_OPTIONS,
  AVAILABILITY_TONE_CLASS,
  STOCK_MODE_FILTER_OPTIONS,
  availabilityShort,
  availabilitySentence,
  availabilitySortValue,
  availabilityTone,
  filterKitsByAvailability,
  limitingSentence,
  resolveStockMode,
  shortageOptions,
  stockModeLabel,
  summaryFlags,
  type AvailabilityFilter,
  type KitAvailabilitySummary,
  type KitStockMode,
} from '@/lib/kits/kit-availability';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

const KIT_POSITION_COLORS: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
  preferred: 'bg-amber-100 text-amber-800',
};

const STOCK_MODE_CLASS: Record<KitStockMode, string> = {
  assemble_on_sale: 'bg-[#C8DDF2] text-[#2f5165]',
  prebuilt: 'bg-gray-100 text-gray-800',
};

/** Con filtros de disponibilidad la lista se trae completa y se pagina aquí. */
const CLIENT_PAGE_LIMIT = 500;

const isAvailabilityFilter = (v: string): v is AvailabilityFilter =>
  v === '' || AVAILABILITY_FILTER_OPTIONS.some((o) => o.value === v);
const isStockModeFilter = (v: string): v is KitStockMode | '' =>
  v === '' || STOCK_MODE_FILTER_OPTIONS.some((o) => o.value === v);

const kitModeOf = (kit: Product): KitStockMode | null =>
  resolveStockMode({
    productType: kit.productType,
    kitStockMode: kit.kitStockMode,
    kitDeductsInventory: kit.kitDeductsInventory,
  });

export function KitsTab() {
  const router = useRouter();

  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    kitPosition: '',
    surtido: '',
    disponibilidad: '',
    falta: '',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const filterPosition = get('kitPosition') as KitPosition | '';
  const filterStatus = get('status') as 'all' | 'active' | 'inactive';
  const filterCountryId = get('countryId');
  const rawStockMode = get('surtido');
  const filterStockMode: KitStockMode | '' = isStockModeFilter(rawStockMode) ? rawStockMode : '';
  const rawAvailability = get('disponibilidad');
  const filterAvailability: AvailabilityFilter = isAvailabilityFilter(rawAvailability) ? rawAvailability : '';
  const filterMissing = get('falta');
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

  // ---------- Disponibilidad (solo lectura; null = el servidor aún no la expone) ----------
  const availabilityQuery = useKitsAvailability(filterCountryId || undefined, { onlyActive: false });
  const availabilityRows: KitAvailabilitySummary[] | null | undefined = availabilityQuery.data;
  const availabilityUnavailable = availabilityRows === null;
  const availabilityReady = Array.isArray(availabilityRows);
  const availabilityById = useMemo(
    () => new Map((availabilityRows ?? []).map((r) => [r.productId, r] as const)),
    [availabilityRows],
  );
  const missingOptions = useMemo(() => shortageOptions(availabilityRows ?? []), [availabilityRows]);

  const availabilityFiltersActive = Boolean(filterStockMode || filterAvailability || filterMissing);
  // Los filtros de disponibilidad se aplican aquí sobre la lista completa
  // (no existen en el servidor); sin el endpoint se ignoran y se avisa.
  const clientMode = availabilityFiltersActive && availabilityReady;

  const queryParams: KitListQueryParams = useMemo(() => {
    const p: KitListQueryParams = clientMode
      ? { page: 1, limit: CLIENT_PAGE_LIMIT }
      : { page: currentPage, limit: pageSize };
    if (searchQuery) p.search = searchQuery;
    if (filterPosition) p.kitPosition = filterPosition;
    if (filterCountryId) p.countryId = filterCountryId;
    if (filterStatus === 'active') p.isActive = true;
    if (filterStatus === 'inactive') p.isActive = false;
    return p;
  }, [clientMode, searchQuery, filterPosition, filterCountryId, filterStatus, currentPage, pageSize]);

  const activeStatsParams: KitListQueryParams = useMemo(() => {
    const p: KitListQueryParams = { limit: 1, page: 1, isActive: true };
    if (searchQuery) p.search = searchQuery;
    if (filterPosition) p.kitPosition = filterPosition;
    if (filterCountryId) p.countryId = filterCountryId;
    return p;
  }, [searchQuery, filterPosition, filterCountryId]);

  const { data: kitsData, isLoading, isFetching, isError, refetch } = useKits(queryParams);
  const { data: activeStatsData } = useKits(activeStatsParams);

  const { kits, total } = useMemo(() => {
    const all: Product[] = kitsData?.data ?? [];
    if (!clientMode) return { kits: all, total: kitsData?.total ?? 0 };
    const filtered = filterKitsByAvailability(
      all,
      availabilityById,
      { stockMode: filterStockMode, availability: filterAvailability, missingCode: filterMissing },
      kitModeOf,
    );
    const start = (currentPage - 1) * pageSize;
    return { kits: filtered.slice(start, start + pageSize), total: filtered.length };
  }, [kitsData, clientMode, availabilityById, filterStockMode, filterAvailability, filterMissing, currentPage, pageSize]);

  const stats = useMemo(() => {
    const active = filterStatus === 'active' ? total : filterStatus === 'inactive' ? 0 : (activeStatsData?.total ?? 0);
    return {
      total,
      active,
    };
  }, [total, activeStatsData, filterStatus]);

  const hasActiveFilters = Boolean(
    searchQuery || filterPosition || filterStatus !== 'all' || availabilityFiltersActive,
  );

  const handleSearch = () => {
    setParams({ search: searchInput.trim(), page: null });
  };

  const handleFilterPosition = (value: string) => {
    setParams({ kitPosition: value, page: null });
  };

  const handleFilterStatus = (value: string) => {
    setParams({ status: value, page: null });
  };

  const handleFilterCountry = (value: string) => {
    // El país cambia el universo de sucursales: "Le falta…" deja de tener sentido.
    setParams({ countryId: value || null, falta: '', page: null });
  };

  const handlePageSizeChange = (size: number) => {
    setParams({ limit: String(size), page: null });
  };

  // "Limpiar filtros" limpia también el país: el efecto de arriba lo regresa a MX.
  const resetFilters = () => {
    setSearchInput('');
    setParams({
      search: null,
      kitPosition: '',
      status: 'all',
      surtido: '',
      disponibilidad: '',
      falta: '',
      countryId: null,
      page: null,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const availabilityHref = (kit: Product) => `/admin/productos/${kit.id}/editar?seccion=inventario`;

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
      key: 'stockMode',
      header: 'Surtido',
      sortable: true,
      sortValue: (k) => availabilityById.get(k.id)?.stockMode ?? kitModeOf(k) ?? '',
      render: (kit) => {
        const mode = availabilityById.get(kit.id)?.stockMode ?? kitModeOf(kit);
        return mode ? (
          <span
            className={`inline-flex whitespace-nowrap px-2 py-1 text-xs font-medium rounded-full ${STOCK_MODE_CLASS[mode]}`}
            title={
              mode === 'assemble_on_sale'
                ? 'La sucursal descuenta los componentes de la receta al cobrar. Si falta uno solo, no se vende.'
                : 'La sucursal vende con su propia existencia del kit, como cualquier producto.'
            }
          >
            {stockModeLabel(mode)}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Sin definir</span>
        );
      },
    },
    {
      key: 'availability',
      header: `Disponible hoy${selectedCountry ? ` (${selectedCountry.code})` : ''}`,
      sortable: availabilityReady,
      sortValue: (k) => availabilitySortValue(availabilityById.get(k.id)),
      render: (kit) => {
        if (availabilityUnavailable) {
          return (
            <span className="text-xs text-gray-400 italic" title="Este servidor aún no calcula la disponibilidad de kits">
              —
            </span>
          );
        }
        if (!availabilityReady) {
          return (
            <span className="text-xs text-gray-400" role="status">
              {availabilityQuery.isError ? 'Sin dato' : 'Calculando…'}
            </span>
          );
        }
        const s = availabilityById.get(kit.id);
        if (!s) {
          return (
            <span className="text-xs text-gray-400 italic" title="Este kit no entró en el cálculo (inactivo o sin precio en el país)">
              Sin dato
            </span>
          );
        }
        const tone = availabilityTone(s);
        const limiting = limitingSentence(s.limiting);
        const flags = summaryFlags(s);
        const sentence = availabilitySentence(s, s.code || kit.code);
        return (
          <div className="flex flex-col items-start gap-1">
            <Link
              href={availabilityHref(kit)}
              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${AVAILABILITY_TONE_CLASS[tone]}`}
              title={`${sentence}${limiting ? ` ${limiting}` : ''} Ver el detalle por sucursal.`}
              aria-label={`${sentence}${limiting ? ` ${limiting}` : ''} Ver el detalle por sucursal.`}
            >
              {availabilityShort(s)}
            </Link>
            {limiting ? <p className="max-w-[16rem] text-xs text-gray-700">{limiting}</p> : null}
            {flags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {flags.map((f) => (
                  <span
                    key={f.key}
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${AVAILABILITY_TONE_CLASS[f.tone]}`}
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      },
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
        <div className="flex items-center justify-end gap-1">
          <Link
            href={availabilityHref(kit)}
            className="rounded-lg p-2 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
            title="Ver disponibilidad por sucursal"
            aria-label={`Ver disponibilidad por sucursal de ${kit.code}`}
          >
            <EyeIcon className="h-4 w-4 text-[#3E667D]" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/admin/kits/${kit.id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
            title="Editar kit"
            aria-label={`Editar kit ${kit.code}`}
          >
            <PencilIcon className="h-4 w-4 text-green-600" aria-hidden />
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
                onClick={() => {
                  void refetch();
                  void availabilityQuery.refetch();
                }}
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
              <label htmlFor="kits-search" className="block text-xs font-medium text-gray-500 mb-1">Buscar por nombre o código</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="kits-search"
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
              <label htmlFor="kits-country" className="block text-xs font-medium text-gray-500 mb-1">País (precio y sucursales)</label>
              <SearchableSelect
                id="kits-country"
                options={(countries ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                value={filterCountryId}
                onChange={handleFilterCountry}
                allLabel="Todos los Países"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="kits-position" className="block text-xs font-medium text-gray-500 mb-1">Posición</label>
              <SearchableSelect
                id="kits-position"
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
              <label htmlFor="kits-status" className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <SearchableSelect
                id="kits-status"
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

            <div className="lg:col-span-3">
              <label htmlFor="kits-stock-mode" className="block text-xs font-medium text-gray-500 mb-1">Surtido</label>
              <SearchableSelect
                id="kits-stock-mode"
                options={STOCK_MODE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={filterStockMode}
                onChange={(v) => setParams({ surtido: v, page: null })}
                allLabel="Todos"
                allValue=""
                className="w-full"
                disabled={!availabilityReady}
              />
            </div>

            <div className="lg:col-span-4">
              <label htmlFor="kits-availability" className="block text-xs font-medium text-gray-500 mb-1">Disponibilidad</label>
              <SearchableSelect
                id="kits-availability"
                options={AVAILABILITY_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={filterAvailability}
                onChange={(v) => setParams({ disponibilidad: v, page: null })}
                allLabel="Todas"
                allValue=""
                className="w-full"
                disabled={!availabilityReady}
              />
            </div>

            <div className="lg:col-span-5">
              <label htmlFor="kits-missing" className="block text-xs font-medium text-gray-500 mb-1">Le falta…</label>
              <SearchableSelect
                id="kits-missing"
                options={missingOptions.map((o) => ({
                  value: o.code,
                  label: `${o.code}${o.name ? ` — ${o.name}` : ''} (${o.kits} ${o.kits === 1 ? 'kit' : 'kits'})`,
                }))}
                value={filterMissing}
                onChange={(v) => setParams({ falta: v, page: null })}
                allLabel="Cualquier componente"
                allValue=""
                className="w-full"
                disabled={!availabilityReady || missingOptions.length === 0}
                aria-describedby="kits-missing-help"
              />
              <p id="kits-missing-help" className="mt-1 text-xs text-gray-500">
                {availabilityReady && missingOptions.length === 0
                  ? 'Hoy ningún componente deja un kit en cero en este país.'
                  : 'Componentes que hoy dejan algún kit en cero en alguna sucursal.'}
              </p>
            </div>
          </div>

          {availabilityUnavailable ? (
            <p className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700" role="status">
              Este servidor aún no calcula la disponibilidad de kits: la columna «Disponible hoy» y los filtros de
              surtido, disponibilidad y «Le falta…» se activarán cuando se despliegue el API.
            </p>
          ) : availabilityQuery.isError ? (
            <p className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
              No se pudo calcular la disponibilidad de los kits.
              <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => void availabilityQuery.refetch()}>
                Reintentar
              </Button>
            </p>
          ) : null}

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
              {filterStockMode && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Surtido: {stockModeLabel(filterStockMode)}
                </span>
              )}
              {filterAvailability && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Disponibilidad: {AVAILABILITY_FILTER_OPTIONS.find((o) => o.value === filterAvailability)?.label}
                </span>
              )}
              {filterMissing && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Le falta: {filterMissing}
                </span>
              )}
              {availabilityFiltersActive && !availabilityReady ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                  Los filtros de disponibilidad no se aplican: falta el dato del servidor
                </span>
              ) : null}
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
              minWidthClassName="min-w-[1240px]"
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
