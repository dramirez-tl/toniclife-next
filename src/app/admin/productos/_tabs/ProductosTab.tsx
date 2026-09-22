'use client';

// ProductosTab — listado admin del catálogo (contrato §7.5).
//
// TODO en servidor vía GET /catalog-admin/products: filtros, orden por columna
// y paginación (estado en la URL con useQueryFilters). Los kits y las
// promociones NO salen aquí: tienen su pestaña y su editor.
//
//  - Filtros: búsqueda, clave exacta, categoría, tipo, estado, en tienda, POS,
//    destacado, país de referencia, con/sin precio, con/sin imagen y
//    "Le falta…" (multi). Chips removibles.
//  - Selección POR PÁGINA (nunca "todos los resultados") con acciones masivas
//    seguras: `expectedCount` + ConfirmDialog con el alcance real; desactivar
//    exige escribir DESACTIVAR.
//  - Export CSV que respeta los filtros activos (celdas neutralizadas).
//  - Una sola llamada de indicadores (/catalog-admin/health).

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  LineChart,
  ListChecks,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, DataTablePagination, type DataTableColumn, type DataTableSortState } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DuplicateProductDialog } from '@/components/admin/products/DuplicateProductDialog';
import { ProductActiveDialog, type ProductActiveTarget } from '@/components/admin/products/ProductActiveDialog';
import { buildCsv, downloadCsv, fileDateStamp } from '@/components/admin/products/lib/csv';
import { productAdminErrorCode, productAdminErrorMessage } from '@/components/admin/products/lib/errors';
import {
  BULK_ACTIONS,
  BULK_SKIP_REASON_LABEL,
  CATALOG_LIST_SORT_KEYS,
  HEALTH_ISSUE_BASES,
  PRODUCTS_LIST_RETURN_KEY,
  PRODUCTS_TAB_TYPES,
  PRODUCT_TYPE_LABEL,
  SCORE_TONE_CLASS,
  STORE_COUNTRY_CURRENCY,
  STORE_COUNTRY_NAME,
  STOREFRONT_REASON_LABEL,
  healthIssueBasesFor,
  healthIssueLabel,
  healthIssueMeta,
  issueAppliesTo,
  issueCodeFor,
  productTypeLabel,
  scoreTone,
  type BulkActionMeta,
} from '@/components/admin/products/lib/labels';
import { canToggleProductActive, useProductPermissions } from '@/components/admin/products/lib/permissions';
import {
  useCatalogAdminProducts,
  useCatalogBulk,
  useCatalogHealth,
} from '@/components/admin/products/useProductsAdmin';
import { useCategories } from '@/hooks/useProducts';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { formatCurrency } from '@/lib/currency';
import {
  STORE_COUNTRY_CODES,
  productsAdminService,
  type CatalogAdminListParams,
  type CatalogAdminRow,
  type CatalogAdminSortBy,
  type StoreCountryCode,
} from '@/services/products-admin.service';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

const FILTER_DEFAULTS = { status: 'all', page: '1', limit: '20', pais: 'MX' };

const isSortKey = (v: string): v is CatalogAdminSortBy => (CATALOG_LIST_SORT_KEYS as string[]).includes(v);
const isCountry = (v: string): v is StoreCountryCode => (STORE_COUNTRY_CODES as string[]).includes(v);

const COUNTRY_LOCALE: Record<StoreCountryCode, string> = { MX: 'es-mx', US: 'en-us', CO: 'es-co', GT: 'es-gt' };

const YES_NO = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];
const triState = (v: string): boolean | undefined => (v === 'si' ? true : v === 'no' ? false : undefined);

export function ProductosTab() {
  const ids = useId();
  const permissions = useProductPermissions();
  const { searchParams, get, getNumber, setParams } = useQueryFilters(FILTER_DEFAULTS);

  // ---------- Estado en la URL ----------
  const search = get('search');
  const sku = get('sku');
  const categoryId = get('categoryId');
  const status = get('status') as 'all' | 'active' | 'inactive';
  const tipo = get('tipo');
  const tienda = get('tienda');
  const pos = get('pos');
  const destacado = get('destacado');
  const paisRaw = get('pais');
  const country: StoreCountryCode = isCountry(paisRaw) ? paisRaw : 'MX';
  const precio = get('precio');
  const imagen = get('imagen');
  const falta = get('falta');
  // Una regla de zona (Frontera) solo aplica en el país con zonas: en otro país se descarta del filtro.
  const missing = useMemo(
    () => (falta ? falta.split(',').filter((b) => HEALTH_ISSUE_BASES.includes(b) && issueAppliesTo(b, country)) : []),
    [country, falta],
  );
  const orden = get('orden');
  const dir = get('dir') === 'desc' ? 'desc' : 'asc';
  const currentPage = getNumber('page') || 1;
  const pageSize = Math.min(100, Math.max(10, getNumber('limit') || 20));

  const [searchInput, setSearchInput] = useState(search);
  const [skuInput, setSkuInput] = useState(sku);

  // El botón "Regresar" de la ficha vuelve al listado con estos filtros.
  const currentQs = searchParams.toString();
  useEffect(() => {
    try {
      sessionStorage.setItem(PRODUCTS_LIST_RETURN_KEY, currentQs);
    } catch {
      // Sin sessionStorage (modo privado): el botón vuelve al listado sin filtros.
    }
  }, [currentQs]);

  const filterParams = useMemo<CatalogAdminListParams>(() => {
    const params: CatalogAdminListParams = {
      country,
      // Kits y promociones viven en sus pestañas.
      productType: tipo && PRODUCTS_TAB_TYPES.includes(tipo) ? [tipo] : PRODUCTS_TAB_TYPES,
    };
    if (search) params.q = search;
    if (sku) params.sku = sku;
    if (categoryId) params.categoryId = categoryId;
    if (status === 'active') params.isActive = true;
    if (status === 'inactive') params.isActive = false;
    const visible = triState(tienda);
    if (visible !== undefined) params.visibleEcommerce = visible;
    const inPos = triState(pos);
    if (inPos !== undefined) params.availableInPos = inPos;
    const featured = triState(destacado);
    if (featured !== undefined) params.isFeatured = featured;
    if (precio === 'con') params.hasPublicPrice = true;
    if (precio === 'sin') params.hasPublicPrice = false;
    if (imagen === 'con') params.hasImage = true;
    if (imagen === 'sin') params.hasImage = false;
    if (missing.length > 0) params.issue = missing.map((base) => issueCodeFor(base, country));
    if (isSortKey(orden)) {
      params.sortBy = orden;
      params.sortDir = dir;
    }
    return params;
  }, [country, tipo, search, sku, categoryId, status, tienda, pos, destacado, precio, imagen, missing, orden, dir]);

  const listParams = useMemo<CatalogAdminListParams>(
    () => ({ ...filterParams, page: currentPage, limit: pageSize }),
    [filterParams, currentPage, pageSize],
  );

  const list = useCatalogAdminProducts(listParams);
  const health = useCatalogHealth(country);
  const { data: categories = [] } = useCategories({ isActive: true });
  const bulk = useCatalogBulk();

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const total = list.data?.total ?? 0;

  // ---------- Selección (solo la página visible) ----------
  const selectionScope = JSON.stringify(listParams);
  const [selection, setSelection] = useState<{ scope: string; ids: string[] }>({ scope: '', ids: [] });
  const selectedIds = useMemo(() => {
    if (selection.scope !== selectionScope) return [];
    const visible = new Set(rows.map((r) => r.id));
    return selection.ids.filter((id) => visible.has(id));
  }, [rows, selection, selectionScope]);
  const setSelectedIds = (next: string[]) => setSelection({ scope: selectionScope, ids: next });

  const [bulkMeta, setBulkMeta] = useState<BulkActionMeta | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [duplicateSource, setDuplicateSource] = useState<CatalogAdminRow | null>(null);
  const [activeTarget, setActiveTarget] = useState<ProductActiveTarget | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const hasActiveFilters = Boolean(
    search || sku || categoryId || status !== 'all' || tipo || tienda || pos || destacado || precio || imagen || missing.length > 0,
  );

  const resetFilters = () => {
    setSearchInput('');
    setSkuInput('');
    setParams({
      search: null,
      sku: null,
      categoryId: null,
      status: null,
      tipo: null,
      tienda: null,
      pos: null,
      destacado: null,
      precio: null,
      imagen: null,
      falta: null,
      page: null,
    });
  };

  const toggleMissing = (base: string) => {
    const next = missing.includes(base) ? missing.filter((b) => b !== base) : [...missing, base];
    setParams({ falta: next.length > 0 ? next.join(',') : null });
  };

  const sortState: DataTableSortState | null = isSortKey(orden) ? { key: orden, direction: dir } : null;
  const handleSortChange = (next: DataTableSortState | null) =>
    setParams({ orden: next?.key ?? null, dir: next && next.direction === 'desc' ? 'desc' : null });

  // ---------- Acción masiva ----------
  const runBulk = async () => {
    if (!bulkMeta || selectedIds.length === 0) return;
    try {
      const result = await bulk.mutateAsync({
        ids: selectedIds,
        action: bulkMeta.action,
        categoryId: bulkMeta.action === 'set_category' ? bulkCategoryId : undefined,
        expectedCount: selectedIds.length,
      });
      const skippedByReason = new Map<string, number>();
      for (const s of result.skipped) skippedByReason.set(s.reason, (skippedByReason.get(s.reason) ?? 0) + 1);
      const skippedText = Array.from(skippedByReason.entries())
        .map(([reason, n]) => `${n} ${BULK_SKIP_REASON_LABEL[reason] ?? reason}`)
        .join(', ');
      const message = `${bulkMeta.label}: ${result.updated} ${result.updated === 1 ? 'actualizado' : 'actualizados'}${
        result.skipped.length > 0 ? ` · ${result.skipped.length} omitidos (${skippedText})` : ''
      }`;
      if (result.skipped.length > 0) toast.warning(message, { duration: 8000 });
      else toast.success(message);
      const slugs = rows.filter((r) => selectedIds.includes(r.id)).map((r) => r.slug);
      void productsAdminService.revalidateCatalog(slugs);
      setSelection({ scope: '', ids: [] });
      setBulkMeta(null);
    } catch (err) {
      toast.error(productAdminErrorMessage(err, `No se pudo aplicar "${bulkMeta.label}"`), { duration: 8000 });
      if (productAdminErrorCode(err) === 'PRD_COUNT_MISMATCH') {
        setSelection({ scope: '', ids: [] });
        setBulkMeta(null);
        void list.refetch();
      }
    }
  };

  // ---------- Export (respeta los filtros activos) ----------
  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparando la exportación…');
    try {
      const PAGE = 100;
      const all: CatalogAdminRow[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await productsAdminService.listProducts({ ...filterParams, page, limit: PAGE });
        all.push(...res.data);
        totalPages = res.totalPages;
        page += 1;
      } while (page <= totalPages && page <= 100);

      if (all.length === 0) {
        toast.error('No hay productos que exportar con estos filtros', { id: toastId });
        return;
      }
      const flag = (row: CatalogAdminRow, cc: StoreCountryCode) => {
        const f = row.storefront[cc];
        return f ? (f.sellable ? 'Sí' : 'No') : '';
      };
      const csv = buildCsv(
        [
          'Clave', 'Nombre', 'Tipo', 'Categoría', 'Activo', 'Visible en tienda', 'POS', 'Destacado',
          'Precio público MX', 'Precio público US', 'Precio público CO', 'Precio público GT',
          'Se vende en MX', 'Se vende en US', 'Ficha %', 'Pendientes', 'URL', 'Actualizado',
        ],
        all.map((r) => [
          r.code,
          r.name,
          productTypeLabel(r.productType),
          r.categoryName ?? '',
          r.isActive,
          r.isVisibleEcommerce,
          r.availableInPos,
          r.isFeatured,
          r.publicPrices.MX ?? '',
          r.publicPrices.US ?? '',
          r.publicPrices.CO ?? '',
          r.publicPrices.GT ?? '',
          flag(r, 'MX'),
          flag(r, 'US'),
          r.health.score === null ? '' : Math.round(r.health.score),
          r.health.issues.map((i) => healthIssueLabel(i)).join('; '),
          r.slug ?? '',
          r.updatedAt ? r.updatedAt.slice(0, 10) : '',
        ]),
      );
      downloadCsv(csv, `catalogo_productos_${fileDateStamp()}.csv`);
      toast.success(`${formatNumber(all.length)} productos exportados`, { id: toastId });
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo exportar el catálogo'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // ---------- Columnas ----------
  const priceCountries: StoreCountryCode[] = country === 'MX' || country === 'US' ? ['MX', 'US'] : ['MX', 'US', country];

  const columns: DataTableColumn<CatalogAdminRow>[] = [
    {
      key: 'name',
      header: 'Producto',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {row.imageUrl ? (
              <Image src={row.imageUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <Package className="absolute inset-0 m-auto h-5 w-5 text-gray-500" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/productos/${row.id}/editar`}
              className="font-semibold text-gray-900 underline-offset-2 hover:underline"
            >
              {row.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {!row.isActive ? <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-800">Inactivo</span> : null}
              {row.isFeatured ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900">Destacado</span> : null}
              {!row.availableInPos ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Sin POS</span> : null}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Clave',
      sortable: true,
      render: (row) => (
        <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 font-mono text-sm font-medium text-gray-900">{row.code}</span>
      ),
    },
    {
      key: 'productType',
      header: 'Tipo',
      render: (row) => <span className="text-sm text-gray-800">{productTypeLabel(row.productType)}</span>,
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (row) =>
        row.categoryName ? (
          <span className="text-sm text-gray-800">{row.categoryName}</span>
        ) : (
          <span className="text-sm font-medium text-amber-800">Sin categoría</span>
        ),
    },
    ...priceCountries.map(
      (cc): DataTableColumn<CatalogAdminRow> => ({
        // Solo el país de referencia ordena en servidor (`sortBy=price` usa `country`).
        key: cc === country ? 'price' : `price-${cc}`,
        header: `Público ${cc}`,
        sortable: cc === country,
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (row) => {
          const value = row.publicPrices[cc];
          return value === null || value === undefined ? (
            <span className="text-sm text-gray-600">Sin precio</span>
          ) : (
            <span className="text-sm font-semibold tabular-nums text-gray-900">
              {formatCurrency(value, STORE_COUNTRY_CURRENCY[cc])}
            </span>
          );
        },
      }),
    ),
    {
      key: 'storefront',
      header: 'En tienda',
      render: (row) => (
        <ul className="flex flex-col gap-1">
          {(['MX', 'US'] as const).map((cc) => {
            const f = row.storefront[cc];
            if (!f) return null;
            const reasons = f.reasons.map((r) => STOREFRONT_REASON_LABEL[r] ?? r).join('; ');
            return (
              <li key={cc} className="flex items-center gap-1.5 text-xs text-gray-800" title={reasons || undefined}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${f.sellable ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden />
                <span>
                  {cc}: {f.sellable ? 'se vende' : 'no aparece'}
                  {!f.sellable && reasons ? <span className="sr-only"> ({reasons})</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ),
    },
    {
      key: 'score',
      header: 'Ficha',
      sortable: true,
      render: (row) => {
        const score = row.health.score;
        const issues = row.health.issues;
        return (
          <div className="space-y-1">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${SCORE_TONE_CLASS[scoreTone(score)]}`}>
              {score === null ? 'Sin dato' : `${Math.round(score)}%`}
            </span>
            {issues.length > 0 ? (
              <div className="flex max-w-[220px] flex-wrap gap-1">
                {issues.slice(0, 2).map((code) => (
                  <Link
                    key={code}
                    href={`/admin/productos/${row.id}/editar?seccion=${healthIssueMeta(code).section}`}
                    className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-800 hover:bg-gray-100"
                  >
                    {healthIssueLabel(code, true)}
                  </Link>
                ))}
                {issues.length > 2 ? <span className="px-1 text-xs text-gray-700">+{issues.length - 2}</span> : null}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'updatedAt',
      header: 'Actualizado',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        const flagHere = row.storefront[country];
        const storeHref = row.slug && flagHere?.sellable ? `/${COUNTRY_LOCALE[country]}/productos/${row.slug}` : null;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href={`/admin/productos/${row.id}/editar`} aria-label={`${permissions.canUpdate ? 'Editar' : 'Ver'} ${row.name}`}>
                <Pencil className="h-4 w-4" aria-hidden />
                <span className="ml-1 hidden xl:inline">{permissions.canUpdate ? 'Editar' : 'Ver'}</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`Más acciones para ${row.name}`}>
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {storeHref ? (
                  <DropdownMenuItem asChild>
                    <a href={storeHref} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                      <ExternalLink className="h-4 w-4" aria-hidden /> Ver en tienda ({country})
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/productos/${row.id}/editar?seccion=tienda`} className="cursor-pointer">
                      <ExternalLink className="h-4 w-4" aria-hidden /> Por qué no sale en tienda
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/admin/inventario/kardex/${row.id}`} className="cursor-pointer">
                    <LineChart className="h-4 w-4" aria-hidden /> Ver kardex
                  </Link>
                </DropdownMenuItem>
                {permissions.canCreate ? (
                  <DropdownMenuItem onSelect={() => setDuplicateSource(row)}>
                    <Copy className="h-4 w-4" aria-hidden /> Duplicar
                  </DropdownMenuItem>
                ) : null}
                {canToggleProductActive(permissions, row.isActive) ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() =>
                        setActiveTarget({ id: row.id, code: row.code, name: row.name, slug: row.slug, isActive: row.isActive })
                      }
                      className={row.isActive ? 'text-red-700 focus:text-red-800' : undefined}
                    >
                      <Power className="h-4 w-4" aria-hidden /> {row.isActive ? 'Desactivar' : 'Reactivar'}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // ---------- Chips de filtros ----------
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (search) chips.push({ key: 'search', label: `Búsqueda: ${search}`, clear: () => { setSearchInput(''); setParams({ search: null }); } });
  if (sku) chips.push({ key: 'sku', label: `Clave: ${sku}`, clear: () => { setSkuInput(''); setParams({ sku: null }); } });
  if (categoryId) chips.push({ key: 'cat', label: `Categoría: ${categories.find((c) => c.id === categoryId)?.name ?? '…'}`, clear: () => setParams({ categoryId: null }) });
  if (tipo) chips.push({ key: 'tipo', label: `Tipo: ${productTypeLabel(tipo)}`, clear: () => setParams({ tipo: null }) });
  if (status !== 'all') chips.push({ key: 'status', label: status === 'active' ? 'Activos' : 'Inactivos', clear: () => setParams({ status: null }) });
  if (tienda) chips.push({ key: 'tienda', label: tienda === 'si' ? 'Visibles en tienda' : 'Ocultos de la tienda', clear: () => setParams({ tienda: null }) });
  if (pos) chips.push({ key: 'pos', label: pos === 'si' ? 'Disponibles en POS' : 'Sin POS', clear: () => setParams({ pos: null }) });
  if (destacado) chips.push({ key: 'dest', label: destacado === 'si' ? 'Destacados' : 'No destacados', clear: () => setParams({ destacado: null }) });
  if (precio) chips.push({ key: 'precio', label: `${precio === 'con' ? 'Con' : 'Sin'} precio público en ${country}`, clear: () => setParams({ precio: null }) });
  if (imagen) chips.push({ key: 'imagen', label: imagen === 'con' ? 'Con imagen' : 'Sin imagen', clear: () => setParams({ imagen: null }) });
  for (const base of missing) {
    chips.push({ key: `falta-${base}`, label: `Le falta: ${healthIssueLabel(issueCodeFor(base, country), true)}`, clear: () => toggleMissing(base) });
  }

  if (list.isError && !list.data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6" role="alert">
            <p className="text-red-800">{productAdminErrorMessage(list.error, 'No se pudo cargar el catálogo de productos.')}</p>
            <Button variant="outline" className="mt-4" onClick={() => void list.refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sellable = health.data?.totals.sellable ?? {};
  const availableBulk = BULK_ACTIONS.filter((a) => (a.needsDelete ? permissions.canDelete : permissions.canUpdate));
  const canSelect = availableBulk.length > 0;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---------- Indicadores (una sola llamada) ---------- */}
        <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: 'Resultados', value: list.data ? formatNumber(total) : '…', tone: 'text-gray-900' },
            { label: 'Productos activos', value: health.data ? formatNumber(health.data.totals.active) : '…', tone: 'text-emerald-700' },
            { label: 'Se venden en México', value: sellable.MX !== undefined ? formatNumber(sellable.MX) : '…', tone: 'text-[#2f5165]' },
            { label: 'Se venden en Estados Unidos', value: sellable.US !== undefined ? formatNumber(sellable.US) : '…', tone: 'text-[#2f5165]' },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-gray-100 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <p className="mb-1 text-sm text-gray-700">{kpi.label}</p>
                <p className={`text-2xl font-bold sm:text-3xl ${kpi.tone}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ---------- Filtros ---------- */}
        <Card className="mb-6 border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Búsqueda y filtros</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/productos/salud?pais=${country}`}>
                    <ListChecks className="mr-2 h-4 w-4" aria-hidden />
                    Salud del catálogo
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void list.refetch()} disabled={list.isFetching}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${list.isFetching ? 'animate-spin' : ''}`} aria-hidden />
                  {list.isFetching ? 'Actualizando…' : 'Actualizar'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                  {isExporting ? 'Exportando…' : hasActiveFilters ? 'Exportar resultados (CSV)' : 'Exportar catálogo (CSV)'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
              <form
                className="lg:col-span-5"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  setParams({ search: searchInput.trim() || null });
                }}
              >
                <Label htmlFor={`${ids}-search`} className="mb-1 block text-xs">
                  Buscar por nombre o clave
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
                    <Input
                      id={`${ids}-search`}
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Ej.: colágeno"
                      className="pl-9"
                    />
                  </div>
                  <Button type="submit">Buscar</Button>
                </div>
              </form>

              <form
                className="lg:col-span-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setParams({ sku: skuInput.trim().toUpperCase() || null });
                }}
              >
                <Label htmlFor={`${ids}-sku`} className="mb-1 block text-xs">
                  Clave exacta
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`${ids}-sku`}
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    placeholder="Ej.: 3025"
                    className="font-mono"
                  />
                  <Button type="submit" variant="outline">
                    Ir
                  </Button>
                </div>
              </form>

              <div className="lg:col-span-4">
                <Label htmlFor={`${ids}-category`} className="mb-1 block text-xs">
                  Categoría
                </Label>
                <SearchableSelect
                  id={`${ids}-category`}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  value={categoryId}
                  onChange={(v) => setParams({ categoryId: v || null })}
                  allLabel="Todas las categorías"
                  className="w-full"
                />
              </div>

              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-tipo`} className="mb-1 block text-xs">
                  Tipo
                </Label>
                <SearchableSelect
                  id={`${ids}-tipo`}
                  options={PRODUCTS_TAB_TYPES.map((t) => ({ value: t, label: PRODUCT_TYPE_LABEL[t] ?? t }))}
                  value={tipo}
                  onChange={(v) => setParams({ tipo: v || null })}
                  allLabel="Todos los tipos"
                  className="w-full"
                />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-status`} className="mb-1 block text-xs">
                  Estado
                </Label>
                <SearchableSelect
                  id={`${ids}-status`}
                  options={[
                    { value: 'active', label: 'Activos' },
                    { value: 'inactive', label: 'Inactivos' },
                  ]}
                  value={status}
                  onChange={(v) => setParams({ status: v })}
                  allLabel="Activos e inactivos"
                  allValue="all"
                  className="w-full"
                />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-tienda`} className="mb-1 block text-xs">
                  Visible en tienda
                </Label>
                <SearchableSelect id={`${ids}-tienda`} options={YES_NO} value={tienda} onChange={(v) => setParams({ tienda: v || null })} allLabel="Indistinto" className="w-full" />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-pos`} className="mb-1 block text-xs">
                  Disponible en POS
                </Label>
                <SearchableSelect id={`${ids}-pos`} options={YES_NO} value={pos} onChange={(v) => setParams({ pos: v || null })} allLabel="Indistinto" className="w-full" />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-destacado`} className="mb-1 block text-xs">
                  Destacado
                </Label>
                <SearchableSelect id={`${ids}-destacado`} options={YES_NO} value={destacado} onChange={(v) => setParams({ destacado: v || null })} allLabel="Indistinto" className="w-full" />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-pais`} className="mb-1 block text-xs">
                  País de referencia
                </Label>
                <SearchableSelect
                  id={`${ids}-pais`}
                  options={STORE_COUNTRY_CODES.map((cc) => ({ value: cc, label: STORE_COUNTRY_NAME[cc] }))}
                  value={country}
                  onChange={(v) => setParams({ pais: v || 'MX' })}
                  showAllOption={false}
                  className="w-full"
                />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-precio`} className="mb-1 block text-xs">
                  Precio público en {country}
                </Label>
                <SearchableSelect
                  id={`${ids}-precio`}
                  options={[
                    { value: 'con', label: 'Con precio' },
                    { value: 'sin', label: 'Sin precio' },
                  ]}
                  value={precio}
                  onChange={(v) => setParams({ precio: v || null })}
                  allLabel="Indistinto"
                  className="w-full"
                />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`${ids}-imagen`} className="mb-1 block text-xs">
                  Imagen
                </Label>
                <SearchableSelect
                  id={`${ids}-imagen`}
                  options={[
                    { value: 'con', label: 'Con imagen' },
                    { value: 'sin', label: 'Sin imagen' },
                  ]}
                  value={imagen}
                  onChange={(v) => setParams({ imagen: v || null })}
                  allLabel="Indistinto"
                  className="w-full"
                />
              </div>

              <div className="lg:col-span-12">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between sm:w-auto">
                      Le falta…{missing.length > 0 ? ` (${missing.length})` : ''}
                      <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="max-h-80 w-80 overflow-y-auto">
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-gray-900">Productos a los que les falta…</legend>
                      <ul className="space-y-1">
                        {healthIssueBasesFor(country).map((base) => {
                          const checkboxId = `${ids}-falta-${base}`;
                          return (
                            <li key={base} className="flex min-h-9 items-center gap-2">
                              <Checkbox id={checkboxId} checked={missing.includes(base)} onCheckedChange={() => toggleMissing(base)} />
                              <Label htmlFor={checkboxId} className="cursor-pointer text-sm font-normal">
                                {healthIssueLabel(issueCodeFor(base, country))}
                              </Label>
                            </li>
                          );
                        })}
                      </ul>
                    </fieldset>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {chips.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-3 pr-1 text-xs text-gray-900">
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.clear}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
                      aria-label={`Quitar filtro ${chip.label}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ---------- Tabla ---------- */}
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Catálogo de productos</h2>
              <p className="text-sm text-gray-700" aria-live="polite">
                Mostrando {rows.length} de {formatNumber(total)}
              </p>
            </div>

            {canSelect && rows.length > 0 ? (
              <div
                className="mb-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                role="region"
                aria-label="Acciones masivas"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
                  {selectedIds.length === 0 ? (
                    <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedIds(rows.map((r) => r.id))}>
                      Seleccionar los {rows.length} de esta página
                    </Button>
                  ) : (
                    <>
                      <span className="font-semibold" aria-live="polite">
                        {selectedIds.length} {selectedIds.length === 1 ? 'seleccionado' : 'seleccionados'} de esta página
                      </span>
                      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedIds([])}>
                        Quitar selección
                      </Button>
                    </>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={selectedIds.length === 0}>
                      Acciones masivas
                      <ChevronDown className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {availableBulk.map((meta) => (
                      <DropdownMenuItem
                        key={meta.action}
                        onSelect={() => {
                          setBulkCategoryId('');
                          setBulkMeta(meta);
                        }}
                        className={meta.destructive ? 'text-red-700 focus:text-red-800' : undefined}
                      >
                        {meta.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}

            <div className={list.isFetching && rows.length > 0 ? 'opacity-60 transition-opacity' : undefined} aria-busy={list.isFetching}>
              <DataTable
                columns={columns}
                data={rows}
                isLoading={list.isLoading && !list.data}
                getRowKey={(row) => row.id}
                minWidthClassName="min-w-[1180px]"
                sortingMode="server"
                sortState={sortState}
                onSortChange={handleSortChange}
                enableRowSelection={canSelect}
                selectedRowKeys={selectedIds}
                onSelectedRowKeysChange={setSelectedIds}
                rowClassName={(row) =>
                  `border-b border-border transition-colors hover:bg-muted/50 ${row.isActive ? '' : 'bg-gray-50/70'}`
                }
                emptyState={
                  <div className="py-4 text-center">
                    <Package className="mx-auto mb-3 h-12 w-12 text-gray-500" aria-hidden />
                    <h3 className="mb-1 text-lg font-bold text-gray-900">No se encontraron productos</h3>
                    <p className="text-sm text-gray-700">
                      {hasActiveFilters ? 'Ningún producto cumple todos los filtros.' : 'Aún no hay productos en el catálogo.'}
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      {hasActiveFilters ? (
                        <Button variant="outline" onClick={resetFilters}>
                          Limpiar filtros
                        </Button>
                      ) : null}
                      {permissions.canCreate ? (
                        <Button asChild>
                          <Link href="/admin/productos/nuevo">
                            <Plus className="mr-1 h-4 w-4" aria-hidden />
                            Nuevo producto
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                }
              />
            </div>

            {rows.length > 0 ? (
              <DataTablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={total}
                isLoading={list.isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Confirmación de acción masiva: alcance real ---------- */}
      <ConfirmDialog
        open={!!bulkMeta}
        onOpenChange={(open) => {
          if (!open) setBulkMeta(null);
        }}
        title={bulkMeta ? `${bulkMeta.scope} ${selectedIds.length} ${selectedIds.length === 1 ? 'producto' : 'productos'}` : ''}
        description={bulkMeta?.note ?? 'Solo afecta a los productos seleccionados en esta página.'}
        confirmLabel={bulkMeta?.label ?? 'Confirmar'}
        confirmText={bulkMeta?.confirmText}
        destructive={bulkMeta?.destructive}
        isPending={bulk.isPending}
        disabled={bulkMeta?.action === 'set_category' && !bulkCategoryId}
        onConfirm={runBulk}
      >
        <div className="space-y-3">
          {bulkMeta?.action === 'set_category' ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-bulk-category`}>Nueva categoría</Label>
              <SearchableSelect
                id={`${ids}-bulk-category`}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                value={bulkCategoryId}
                onChange={setBulkCategoryId}
                showAllOption={false}
                placeholder="Elige una categoría"
                className="w-full"
              />
            </div>
          ) : null}
          <ul className="max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm">
            {rows
              .filter((r) => selectedIds.includes(r.id))
              .map((r) => (
                <li key={r.id}>
                  <span className="font-mono text-xs">{r.code}</span> · {r.name}
                </li>
              ))}
          </ul>
        </div>
      </ConfirmDialog>

      <DuplicateProductDialog
        source={duplicateSource ? { id: duplicateSource.id, code: duplicateSource.code, name: duplicateSource.name } : null}
        onOpenChange={(open) => {
          if (!open) setDuplicateSource(null);
        }}
      />
      <ProductActiveDialog
        target={activeTarget}
        onOpenChange={(open) => {
          if (!open) setActiveTarget(null);
        }}
      />
    </>
  );
}
