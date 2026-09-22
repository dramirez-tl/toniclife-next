'use client';

// KitsTab — pestaña Kits de /admin/productos (contrato de kits §5.1).
//
// Cruza tres lecturas del API en una sola tabla:
//   - GET /products (isEnrollmentKit + productType=kit): la fila del kit
//     (imagen, precio del país, canales, estado) y los filtros de SERVIDOR:
//     búsqueda, país, posición, estado y canal (availableInPos /
//     isVisibleEcommerce).
//   - GET /products/kits/availability: Surtido, Receta, Disponible hoy y los
//     chips de Salud (sin receta, sin precio, existencia fantasma, sin respaldo).
//   - GET /products/kits/sales-summary?periodNumber=: Ventas del periodo de
//     negocio (26 → 25) tal como lo delimita el API; aquí no se calculan periodos.
//
// Los filtros que el servidor no conoce (surtido, disponibilidad, "le falta…",
// salud, con/sin ventas) se aplican AQUÍ sobre la lista completa (~55 kits,
// tope 500) y se pagina en cliente. Si el servidor aún no expone alguna de las
// dos lecturas (404) la columna avisa y sus filtros se ignoran: nada se rompe.
//
// Acciones por fila: lápiz (products:update) u ojo "Ver" hacia la ficha
// (?seccion=kit); eliminar = baja lógica con DELETE /products/:id
// (products:delete, ProductActiveDialog con el mensaje real del API);
// reactivar cuando está inactivo. "Nuevo kit" (products:create) va a
// /admin/productos/nuevo?tipo=kit. "Exportar CSV" respeta los filtros activos
// y neutraliza fórmulas (buildCsv), como el resto del admin.

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
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
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CubeIcon,
  PhotoIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { kitKeys, useKits } from '@/hooks/useKits';
import { kitAvailabilityKeys, useKitsAvailability } from '@/hooks/useKitAvailability';
import { useKitsSalesSummary } from '@/hooks/useKitAdmin';
import { useCountries } from '@/hooks/useConfig';
import { kitsService } from '@/services/kits.service';
import { KitPosition, KIT_POSITION_LABEL } from '@/types/product';
import type { Product } from '@/types/product';
import type { KitListQueryParams } from '@/types/kit';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { ProductActiveDialog, type ProductActiveTarget } from '@/components/admin/products/ProductActiveDialog';
import { canToggleProductActive, useProductPermissions } from '@/components/admin/products/lib/permissions';
import { buildCsv, downloadCsv, fileDateStamp } from '@/components/admin/products/lib/csv';
import { productAdminErrorMessage } from '@/components/admin/products/lib/errors';
import {
  AVAILABILITY_FILTER_OPTIONS,
  AVAILABILITY_TONE_CLASS,
  STOCK_MODE_FILTER_OPTIONS,
  STOCK_MODE_HELP,
  availabilityShort,
  availabilitySentence,
  availabilitySortValue,
  availabilityTone,
  limitingSentence,
  resolveStockMode,
  shortageOptions,
  stockModeLabel,
  type AvailabilityFilter,
  type KitAvailabilitySummary,
  type KitStockMode,
} from '@/lib/kits/kit-availability';
import {
  CHANNEL_FILTER_OPTIONS,
  HEALTH_FILTER_OPTIONS,
  KITS_CSV_HEADERS,
  SALES_FILTER_OPTIONS,
  channelFilterParams,
  filterKitList,
  healthText,
  isChannelFilter,
  isHealthFilter,
  isSalesFilter,
  kitCsvRow,
  kitHealthFlags,
  recipeCell,
  type KitListClientFilters,
} from '@/lib/kits/kit-list';
import { periodRange, salesCellText, salesCellTitle, type KitSalesSummaryItem } from '@/lib/kits/kit-sales';

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

/** Con filtros de cliente la lista se trae completa (tope del API) y se pagina aquí. */
const CLIENT_PAGE_LIMIT = 500;
/** Exportación: páginas de 100 hasta agotar (tope de seguridad 50 páginas). */
const EXPORT_PAGE = 100;
const EXPORT_MAX_PAGES = 50;

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

const positionLabel = (kit: Pick<Product, 'kitPosition'>): string =>
  kit.kitPosition ? KIT_POSITION_LABEL[kit.kitPosition as KitPosition] || kit.kitPosition : '';

const editHref = (kit: Pick<Product, 'id'>) => `/admin/productos/${kit.id}/editar?seccion=kit`;
const availabilityHref = (kit: Pick<Product, 'id'>) => `/admin/productos/${kit.id}/editar?seccion=inventario`;
const componentsHref = (kit: Pick<Product, 'id'>) => `/admin/productos/${kit.id}/editar?seccion=componentes`;

export function KitsTab() {
  const queryClient = useQueryClient();
  const permissions = useProductPermissions();

  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    kitPosition: '',
    surtido: '',
    disponibilidad: '',
    falta: '',
    salud: '',
    canal: '',
    ventas: '',
    periodo: '',
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
  const rawHealth = get('salud');
  const filterHealth = isHealthFilter(rawHealth) ? rawHealth : '';
  const rawChannel = get('canal');
  const filterChannel = isChannelFilter(rawChannel) ? rawChannel : '';
  const rawSales = get('ventas');
  const filterSales = isSalesFilter(rawSales) ? rawSales : '';
  /** Número de periodo elegido; 0 = el vigente (lo resuelve el API). */
  const periodNumber = getNumber('periodo') || undefined;
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [activeTarget, setActiveTarget] = useState<ProductActiveTarget | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
  // Se consulta solo con país: el efecto de arriba fija MX en el primer render
  // y sin esta guarda se disparaban dos consultas (una sin país).
  const availabilityQuery = useKitsAvailability(filterCountryId || undefined, {
    onlyActive: false,
    enabled: !!filterCountryId,
  });
  const availabilityRows: KitAvailabilitySummary[] | null | undefined = availabilityQuery.data;
  const availabilityUnavailable = availabilityRows === null;
  const availabilityReady = Array.isArray(availabilityRows);
  const availabilityById = useMemo(
    () => new Map((availabilityRows ?? []).map((r) => [r.productId, r] as const)),
    [availabilityRows],
  );
  const missingOptions = useMemo(() => shortageOptions(availabilityRows ?? []), [availabilityRows]);

  // ---------- Ventas del periodo (solo lectura; null = el servidor aún no la expone) ----------
  const salesQuery = useKitsSalesSummary(periodNumber);
  const salesSummary = salesQuery.data ?? null;
  const salesUnavailable = salesQuery.data === null;
  const salesReady = !!salesSummary;
  const salesById = useMemo(
    () => new Map<string, KitSalesSummaryItem>((salesSummary?.items ?? []).map((i) => [i.productId, i] as const)),
    [salesSummary],
  );
  const periodLabel = salesSummary
    ? `${salesSummary.name}${periodRange(salesSummary) ? ` (${periodRange(salesSummary)})` : ''}`
    : '';

  // ---------- Filtros de cliente (sobre la lista completa) ----------
  // Surtido se resuelve con la propia fila aunque no haya resumen; los demás
  // necesitan su dato del servidor y, si falta, se ignoran y se avisa.
  const effectiveFilters: KitListClientFilters = useMemo(
    () => ({
      stockMode: filterStockMode,
      availability: availabilityReady ? filterAvailability : '',
      missingCode: availabilityReady ? filterMissing : '',
      health: availabilityReady ? filterHealth : '',
      sales: salesReady ? filterSales : '',
    }),
    [filterStockMode, filterAvailability, filterMissing, filterHealth, filterSales, availabilityReady, salesReady],
  );
  const clientFiltersActive = Boolean(
    filterStockMode || filterAvailability || filterMissing || filterHealth || filterSales,
  );
  const clientMode = Boolean(
    effectiveFilters.stockMode ||
    effectiveFilters.availability ||
    effectiveFilters.missingCode ||
    effectiveFilters.health ||
    effectiveFilters.sales,
  );
  const availabilityFiltersIgnored = Boolean(
    (filterAvailability || filterMissing || filterHealth) && !availabilityReady,
  );
  const salesFilterIgnored = Boolean(filterSales && !salesReady);

  const listCtx = useMemo(() => ({ availabilityById, salesById, modeOf: kitModeOf }), [availabilityById, salesById]);

  // ---------- Parámetros de servidor ----------
  const serverParams: KitListQueryParams = useMemo(() => {
    const p: KitListQueryParams = { ...channelFilterParams(filterChannel) };
    if (searchQuery) p.search = searchQuery;
    if (filterPosition) p.kitPosition = filterPosition;
    if (filterCountryId) p.countryId = filterCountryId;
    if (filterStatus === 'active') p.isActive = true;
    if (filterStatus === 'inactive') p.isActive = false;
    return p;
  }, [searchQuery, filterPosition, filterCountryId, filterStatus, filterChannel]);

  const queryParams: KitListQueryParams = useMemo(
    () =>
      clientMode
        ? { ...serverParams, page: 1, limit: CLIENT_PAGE_LIMIT }
        : { ...serverParams, page: currentPage, limit: pageSize },
    [clientMode, serverParams, currentPage, pageSize],
  );

  const activeStatsParams: KitListQueryParams = useMemo(() => {
    const p: KitListQueryParams = { ...channelFilterParams(filterChannel), limit: 1, page: 1, isActive: true };
    if (searchQuery) p.search = searchQuery;
    if (filterPosition) p.kitPosition = filterPosition;
    if (filterCountryId) p.countryId = filterCountryId;
    return p;
  }, [searchQuery, filterPosition, filterCountryId, filterChannel]);

  const { data: kitsData, isLoading, isFetching, isError, refetch } = useKits(queryParams);
  const { data: activeStatsData } = useKits(activeStatsParams);

  const { kits, total } = useMemo(() => {
    const all: Product[] = kitsData?.data ?? [];
    if (!clientMode) return { kits: all, total: kitsData?.total ?? 0 };
    const filtered = filterKitList(all, listCtx, effectiveFilters);
    const start = (currentPage - 1) * pageSize;
    return { kits: filtered.slice(start, start + pageSize), total: filtered.length };
  }, [kitsData, clientMode, listCtx, effectiveFilters, currentPage, pageSize]);

  const stats = useMemo(() => {
    const active = filterStatus === 'active' ? total : filterStatus === 'inactive' ? 0 : (activeStatsData?.total ?? 0);
    return { total, active };
  }, [total, activeStatsData, filterStatus]);

  const hasActiveFilters = Boolean(
    searchQuery || filterPosition || filterStatus !== 'all' || filterChannel || clientFiltersActive || periodNumber,
  );

  const handleSearch = () => {
    setParams({ search: searchInput.trim(), page: null });
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
      salud: '',
      canal: '',
      ventas: '',
      periodo: '',
      countryId: null,
      page: null,
    });
  };

  const refreshAll = () => {
    void refetch();
    void availabilityQuery.refetch();
    void salesQuery.refetch();
  };

  // Tras eliminar (baja lógica) o reactivar: la lista, la disponibilidad y el
  // conteo de activos cambian.
  const afterActiveChange = () => {
    queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
    queryClient.invalidateQueries({ queryKey: kitAvailabilityKeys.all });
  };

  // ---------- Exportar CSV (respeta los filtros activos, incluidos los de cliente) ----------
  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparando la exportación…');
    try {
      const all: Product[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await kitsService.listKits({ ...serverParams, page, limit: EXPORT_PAGE });
        all.push(...res.data);
        totalPages = res.totalPages;
        page += 1;
      } while (page <= totalPages && page <= EXPORT_MAX_PAGES);

      const rows = clientMode ? filterKitList(all, listCtx, effectiveFilters) : all;
      if (rows.length === 0) {
        toast.error('No hay kits que exportar con estos filtros', { id: toastId });
        return;
      }
      const csv = buildCsv(
        [...KITS_CSV_HEADERS],
        rows.map((kit) => {
          const mode = availabilityById.get(kit.id)?.stockMode ?? kitModeOf(kit);
          return kitCsvRow(kit, {
            summary: availabilityById.get(kit.id),
            sales: salesById.get(kit.id),
            periodLabel,
            mode,
            positionLabel: positionLabel(kit),
            stockModeLabel: stockModeLabel(mode),
          });
        }),
      );
      downloadCsv(csv, `kits_${selectedCountry?.code ?? 'todos'}_${fileDateStamp()}.csv`);
      toast.success(`${formatNumber(rows.length)} ${rows.length === 1 ? 'kit exportado' : 'kits exportados'}`, {
        id: toastId,
      });
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo exportar la lista de kits'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // ---------- Columnas ----------
  const pendingCell = (label = 'Sin dato') => (
    <span className="text-xs text-gray-400 italic" role="status">
      {label}
    </span>
  );

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
          {/* Imagen principal del kit: el hueco ámbar delata los que faltan
              por subir (el POS la muestra al inscribir); el chip va en Salud. */}
          {kit.imageUrl ? (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image src={kit.imageUrl} alt={kit.name} width={40} height={40} className="object-cover" />
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
            <Link
              href={editHref(kit)}
              className="font-semibold text-gray-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
            >
              {kit.name}
            </Link>
            {kit.shortName && <p className="text-sm text-gray-500 truncate max-w-xs">{kit.shortName}</p>}
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
            {positionLabel(kit)}
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
            title={STOCK_MODE_HELP[mode]}
          >
            {stockModeLabel(mode)}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Sin definir</span>
        );
      },
    },
    {
      key: 'recipe',
      header: 'Receta',
      sortable: availabilityReady,
      sortValue: (k) => availabilityById.get(k.id)?.componentsCount ?? -1,
      render: (kit) => {
        if (availabilityUnavailable) {
          return (
            <span className="text-xs text-gray-400 italic" title="Este servidor aún no calcula la receta de kits">
              —
            </span>
          );
        }
        if (!availabilityReady) return pendingCell(availabilityQuery.isError ? 'Sin dato' : 'Calculando…');
        const cell = recipeCell(availabilityById.get(kit.id));
        if (!cell.known) {
          return (
            <span
              className="text-xs text-gray-400 italic"
              title="Este kit no entró en el cálculo (inactivo o sin precio en el país)"
            >
              {cell.label}
            </span>
          );
        }
        return (
          <Link
            href={componentsHref(kit)}
            className={`whitespace-nowrap text-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${
              cell.missing ? 'font-semibold text-red-700' : 'text-gray-800'
            }`}
            title={
              cell.missing
                ? 'Se arma al vender pero no tiene componentes: no se puede vender. Ver la receta.'
                : 'Ver la receta del kit.'
            }
          >
            {cell.label}
          </Link>
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
            <span
              className="text-xs text-gray-400 italic"
              title="Este servidor aún no calcula la disponibilidad de kits"
            >
              —
            </span>
          );
        }
        if (!availabilityReady) return pendingCell(availabilityQuery.isError ? 'Sin dato' : 'Calculando…');
        const s = availabilityById.get(kit.id);
        if (!s) {
          return (
            <span
              className="text-xs text-gray-400 italic"
              title="Este kit no entró en el cálculo (inactivo o sin precio en el país)"
            >
              Sin dato
            </span>
          );
        }
        const tone = availabilityTone(s);
        const limiting = limitingSentence(s.limiting);
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
          </div>
        );
      },
    },
    {
      key: 'health',
      header: 'Salud',
      sortable: availabilityReady,
      sortValue: (k) => kitHealthFlags(k, availabilityById.get(k.id)).length,
      render: (kit) => {
        const s = availabilityById.get(kit.id);
        const flags = kitHealthFlags(kit, s);
        if (flags.length === 0) {
          return s ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              <CheckCircleIcon className="h-3 w-3" aria-hidden />
              Sin pendientes
            </span>
          ) : (
            <span
              className="text-xs text-gray-400 italic"
              title={
                availabilityUnavailable
                  ? 'Este servidor aún no calcula la salud de kits'
                  : 'Sin dato del servidor para este kit en el país elegido'
              }
            >
              —
            </span>
          );
        }
        return (
          <div className="flex max-w-[14rem] flex-wrap gap-1" aria-label={`Pendientes: ${healthText(flags)}`}>
            {flags.map((f) => (
              <span
                key={f.key}
                className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${AVAILABILITY_TONE_CLASS[f.tone]}`}
                title={f.title}
              >
                {f.label}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'sales',
      header: salesSummary ? `Ventas · ${salesSummary.name}` : 'Ventas del periodo',
      sortable: salesReady,
      sortValue: (k) => salesById.get(k.id)?.unitsPaid ?? -1,
      render: (kit) => {
        if (salesUnavailable) {
          return (
            <span className="text-xs text-gray-400 italic" title="Este servidor aún no calcula las ventas por periodo">
              —
            </span>
          );
        }
        if (!salesSummary) return pendingCell(salesQuery.isError ? 'Sin dato' : 'Calculando…');
        const item = salesById.get(kit.id);
        const paid = item?.unitsPaid ?? 0;
        const cancelled = item?.unitsCancelled ?? 0;
        return (
          <div className="flex flex-col" title={salesCellTitle(item, salesSummary)}>
            <span className={`whitespace-nowrap text-sm ${paid > 0 ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
              {salesCellText(paid, salesSummary.name)}
            </span>
            <span className="text-[11px] text-gray-500">{periodRange(salesSummary)}</span>
            {cancelled > 0 ? (
              <span className="text-[11px] text-red-700">
                {formatNumber(cancelled)} {cancelled === 1 ? 'cancelada' : 'canceladas'}
              </span>
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
          {kit.price && Number(kit.price) > 0 ? (
            `$${Number(kit.price).toLocaleString('es-MX')} ${kit.priceCurrency || ''}`
          ) : (
            <span className="text-xs text-gray-400 italic">Sin precio</span>
          )}
        </span>
      ),
    },
    {
      key: 'countries',
      header: 'Países',
      render: (kit) => {
        const codes = kit.activeCountries ?? [];
        if (codes.length === 0) return <span className="text-sm text-gray-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {codes.map((code) => (
              <span
                key={code}
                className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                title={code}
              >
                {code}
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
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (kit) => {
        const canToggle = canToggleProductActive(permissions, kit.isActive);
        return (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={editHref(kit)}
              className="inline-flex items-center gap-1 rounded-lg p-2 text-sm text-gray-700 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
              title={permissions.canUpdate ? 'Editar kit' : 'Ver kit'}
              aria-label={`${permissions.canUpdate ? 'Editar' : 'Ver'} kit ${kit.code}`}
            >
              {permissions.canUpdate ? (
                <PencilIcon className="h-4 w-4 text-green-600" aria-hidden />
              ) : (
                <EyeIcon className="h-4 w-4 text-[#3E667D]" aria-hidden />
              )}
              <span className="hidden xl:inline">{permissions.canUpdate ? 'Editar' : 'Ver'}</span>
            </Link>
            {canToggle ? (
              <button
                type="button"
                onClick={() =>
                  setActiveTarget({
                    id: kit.id,
                    code: kit.code,
                    name: kit.name,
                    slug: kit.slug,
                    isActive: kit.isActive,
                    productType: kit.productType,
                  })
                }
                className={`rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${
                  kit.isActive ? 'hover:bg-red-50' : 'hover:bg-emerald-50'
                }`}
                title={kit.isActive ? 'Eliminar (desactivar) kit' : 'Reactivar kit'}
                aria-label={`${kit.isActive ? 'Eliminar (desactivar)' : 'Reactivar'} kit ${kit.code}`}
              >
                {kit.isActive ? (
                  <TrashIcon className="h-4 w-4 text-red-600" aria-hidden />
                ) : (
                  <ArrowUturnLeftIcon className="h-4 w-4 text-emerald-700" aria-hidden />
                )}
              </button>
            ) : null}
          </div>
        );
      },
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
                onClick={refreshAll}
                disabled={isFetching}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Actualizando...' : 'Actualizar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void handleExport()}
                disabled={isExporting || isLoading}
              >
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
                {isExporting ? 'Exportando…' : 'Exportar CSV'}
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              )}
              {permissions.canCreate ? (
                <Link href="/admin/productos/nuevo?tipo=kit">
                  <Button variant="default" size="sm" className="gap-2">
                    <PlusIcon className="h-4 w-4" aria-hidden />
                    Nuevo kit
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
            <div className="lg:col-span-5">
              <label htmlFor="kits-search" className="block text-xs font-medium text-gray-500 mb-1">
                Buscar por nombre o código
              </label>
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
                <Button variant="default" size="sm" className="h-10 px-4 sm:min-w-[96px]" onClick={handleSearch}>
                  Buscar
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="kits-country" className="block text-xs font-medium text-gray-500 mb-1">
                País (precio y sucursales)
              </label>
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
              <label htmlFor="kits-position" className="block text-xs font-medium text-gray-500 mb-1">
                Posición
              </label>
              <SearchableSelect
                id="kits-position"
                options={[
                  { value: KitPosition.BASIC, label: 'Básico' },
                  { value: KitPosition.PREMIUM, label: 'Premium' },
                  { value: KitPosition.PREFERRED, label: 'Preferente' },
                ]}
                value={filterPosition}
                onChange={(v) => setParams({ kitPosition: v, page: null })}
                allLabel="Todas"
                allValue=""
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="kits-status" className="block text-xs font-medium text-gray-500 mb-1">
                Estado
              </label>
              <SearchableSelect
                id="kits-status"
                options={[
                  { value: 'active', label: 'Activos' },
                  { value: 'inactive', label: 'Inactivos' },
                ]}
                value={filterStatus}
                onChange={(v) => setParams({ status: v, page: null })}
                allLabel="Todos"
                allValue="all"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="kits-stock-mode" className="block text-xs font-medium text-gray-500 mb-1">
                Surtido
              </label>
              <SearchableSelect
                id="kits-stock-mode"
                options={STOCK_MODE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={filterStockMode}
                onChange={(v) => setParams({ surtido: v, page: null })}
                allLabel="Todos"
                allValue=""
                className="w-full"
              />
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="kits-availability" className="block text-xs font-medium text-gray-500 mb-1">
                Disponibilidad
              </label>
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

            <div className="lg:col-span-2">
              <label htmlFor="kits-health" className="block text-xs font-medium text-gray-500 mb-1">
                Salud
              </label>
              <SearchableSelect
                id="kits-health"
                options={HEALTH_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={filterHealth}
                onChange={(v) => setParams({ salud: v, page: null })}
                allLabel="Todos"
                allValue=""
                className="w-full"
                disabled={!availabilityReady}
              />
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="kits-channel" className="block text-xs font-medium text-gray-500 mb-1">
                Canal
              </label>
              <SearchableSelect
                id="kits-channel"
                options={CHANNEL_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={filterChannel}
                onChange={(v) => setParams({ canal: v, page: null })}
                allLabel="Todos"
                allValue=""
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="kits-sales" className="block text-xs font-medium text-gray-500 mb-1">
                Ventas
              </label>
              <SearchableSelect
                id="kits-sales"
                options={SALES_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={filterSales}
                onChange={(v) => setParams({ ventas: v, page: null })}
                allLabel="Todas"
                allValue=""
                className="w-full"
                disabled={!salesReady}
              />
            </div>

            <div className="lg:col-span-5">
              <label htmlFor="kits-missing" className="block text-xs font-medium text-gray-500 mb-1">
                Le falta…
              </label>
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
                  : 'Los 3 componentes que más sucursales dejan en cero por cada kit; un cuarto faltante no aparece aquí (velo en la ficha del kit).'}
              </p>
            </div>

            <div className="lg:col-span-7">
              <p className="block text-xs font-medium text-gray-500 mb-1">Periodo de ventas</p>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Periodo de ventas">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() =>
                    salesSummary && setParams({ periodo: String(salesSummary.periodNumber - 1), page: null })
                  }
                  disabled={!salesSummary || salesSummary.periodNumber <= 1 || salesQuery.isFetching}
                  title="Periodo anterior"
                  aria-label="Periodo anterior"
                >
                  <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                </Button>
                <span className="min-w-[14rem] text-sm font-medium text-gray-800" role="status">
                  {salesSummary
                    ? periodLabel
                    : salesUnavailable
                      ? 'Este servidor aún no calcula las ventas por periodo'
                      : salesQuery.isError
                        ? 'Sin dato'
                        : 'Cargando…'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() =>
                    salesSummary && setParams({ periodo: String(salesSummary.periodNumber + 1), page: null })
                  }
                  disabled={!salesSummary || salesSummary.isCurrent || salesQuery.isFetching}
                  title="Periodo siguiente"
                  aria-label="Periodo siguiente"
                >
                  <ChevronRightIcon className="h-4 w-4" aria-hidden />
                </Button>
                {periodNumber ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => setParams({ periodo: '', page: null })}
                  >
                    Periodo vigente
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Periodo de negocio del 26 al 25 tal como lo define el sistema; las unidades cobradas se muestran en la
                columna «Ventas».
              </p>
            </div>
          </div>

          {availabilityUnavailable ? (
            <p
              className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
              role="status"
            >
              Este servidor aún no calcula la disponibilidad de kits: las columnas «Receta», «Disponible hoy» y «Salud»
              y los filtros de disponibilidad, salud y «Le falta…» se activarán cuando se despliegue el API.
            </p>
          ) : availabilityQuery.isError ? (
            <p
              className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              role="status"
            >
              No se pudo calcular la disponibilidad de los kits.
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => void availabilityQuery.refetch()}
              >
                Reintentar
              </Button>
            </p>
          ) : null}

          {salesQuery.isError ? (
            <p
              className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              role="status"
            >
              {productAdminErrorMessage(salesQuery.error, 'No se pudieron calcular las ventas del periodo.')}
              {periodNumber ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => setParams({ periodo: '', page: null })}
                >
                  Volver al periodo vigente
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => void salesQuery.refetch()}
                >
                  Reintentar
                </Button>
              )}
            </p>
          ) : null}

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">Filtros activos</span>
              {searchQuery && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">Búsqueda: {searchQuery}</span>
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
              {filterChannel && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Canal: {CHANNEL_FILTER_OPTIONS.find((o) => o.value === filterChannel)?.label}
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
              {filterHealth && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Salud: {HEALTH_FILTER_OPTIONS.find((o) => o.value === filterHealth)?.label}
                </span>
              )}
              {filterSales && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  {SALES_FILTER_OPTIONS.find((o) => o.value === filterSales)?.label}
                </span>
              )}
              {filterMissing && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">Le falta: {filterMissing}</span>
              )}
              {periodNumber ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                  Periodo: {salesSummary ? periodLabel : `#${periodNumber}`}
                </span>
              ) : null}
              {availabilityFiltersIgnored ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                  Los filtros de disponibilidad, salud y «Le falta…» no se aplican: falta el dato del servidor
                </span>
              ) : null}
              {salesFilterIgnored ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                  El filtro de ventas no se aplica: falta el dato del periodo
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
              minWidthClassName="min-w-[1520px]"
              emptyState={
                <div className="py-2 text-center">
                  <GiftIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">No se encontraron kits</h3>
                  <p className="text-gray-600">
                    {hasActiveFilters
                      ? 'Ningún kit cumple con estos filtros. Ajústalos o límpialos.'
                      : 'Todavía no hay kits de inscripción. Crea el primero.'}
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                    {permissions.canCreate ? (
                      <Link href="/admin/productos/nuevo?tipo=kit">
                        <Button variant="default">
                          <PlusIcon className="h-4 w-4" />
                          Nuevo kit
                        </Button>
                      </Link>
                    ) : null}
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

      <ProductActiveDialog
        target={activeTarget}
        onOpenChange={(open) => {
          if (!open) setActiveTarget(null);
        }}
        onDone={afterActiveChange}
      />
    </div>
  );
}
