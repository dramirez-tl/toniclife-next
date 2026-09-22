'use client';

// /admin/productos/salud — "Salud del catálogo" (contrato §7.6).
//
// Tarjetas por defecto de captura (GET /catalog-admin/health?country=) que abren
// el listado ya filtrado, tabla "Prioridad de captura" (productos por `score`
// ascendente; cada chip abre la ficha en la sección que corrige ese defecto) y
// "Exportar pendientes (CSV)" generado en el servidor.

import { Suspense, useId, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ChevronRight, ClipboardCheck, Download, Info, Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PermissionGuard } from '@/components/auth';
import { downloadBlob, fileDateStamp } from '@/components/admin/products/lib/csv';
import { productAdminErrorMessage } from '@/components/admin/products/lib/errors';
import {
  HEALTH_ISSUE_BASES,
  SCORE_TONE_CLASS,
  SELLABLE_TYPES,
  STORE_COUNTRY_NAME,
  healthIssueBasesFor,
  healthIssueLabel,
  healthIssueMeta,
  issueAppliesTo,
  issueCodeFor,
  productTypeLabel,
  scoreTone,
} from '@/components/admin/products/lib/labels';
import { useCatalogAdminProducts, useCatalogHealth } from '@/components/admin/products/useProductsAdmin';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  STORE_COUNTRY_CODES,
  productsAdminService,
  type CatalogAdminListParams,
  type CatalogAdminRow,
  type HealthIssueCount,
  type StoreCountryCode,
} from '@/services/products-admin.service';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);
const isCountry = (v: string): v is StoreCountryCode => (STORE_COUNTRY_CODES as string[]).includes(v);

const FILTER_DEFAULTS = { pais: 'MX', page: '1', limit: '20' };

/** Tarjetas del tablero: cada una agrupa una o varias reglas de salud (códigos base). */
const HEALTH_CARDS: { id: string; title: string; help: string; bases: string[]; onlyCountry?: StoreCountryCode }[] = [
  { id: 'imagen', title: 'Sin imagen', help: 'La tienda muestra el monograma de la marca.', bases: ['no_image'] },
  { id: 'descripcion', title: 'Sin descripción', help: 'La ficha pública queda sin texto.', bases: ['no_description'] },
  { id: 'precio', title: 'Sin precio público', help: 'No aparecen en la tienda ni en el POS del país.', bases: ['no_public_price'] },
  { id: 'categoria', title: 'Sin categoría', help: 'No salen al filtrar por categoría.', bases: ['no_category'] },
  { id: 'en', title: 'Sin traducción al inglés', help: 'La tienda en inglés muestra el español.', bases: ['no_en_name', 'no_en_description'] },
  { id: 'seo', title: 'Sin SEO', help: 'Sin meta título ni meta descripción.', bases: ['no_seo'] },
  { id: 'precios', title: 'Precios incoherentes o en cero', help: 'Público menor que distribuidor, preferente mayor que público o precio 0.', bases: ['price_incoherent', 'zero_price'] },
  {
    id: 'zona',
    title: 'Sin precio de zona Frontera',
    help: 'Ya se venden en la tienda de México sin fila para Frontera MX-USA: esas cuentas los pagan con el precio de respaldo y sin puntos. Se corrige capturando la fila de la zona en Precios.',
    bases: ['zone_price_missing'],
    onlyCountry: 'MX',
  },
  { id: 'preciobajo', title: 'Precio sospechosamente bajo', help: 'Ya se ven en la tienda con un precio público simbólico (material interno, cortesías). Revísalos y, si no deben venderse, ocúltalos de la tienda.', bases: ['suspicious_low_price'] },
  { id: 'nombres', title: 'Nombres por normalizar', help: 'En mayúsculas, con espacios sobrantes o duplicados.', bases: ['name_uppercase', 'name_untrimmed', 'duplicate_name'] },
  { id: 'slugs', title: 'URLs fuera de convención', help: 'Sin URL o que no siguen clave-nombre.', bases: ['no_slug', 'slug_off_convention'] },
  { id: 'fiscal', title: 'Sin regla fiscal o clave SAT', help: 'Necesarias para facturar en México.', bases: ['no_tax_rule', 'no_sat_code'], onlyCountry: 'MX' },
  { id: 'componentes', title: 'Kits o paquetes sin componentes', help: 'No descuentan inventario al venderse.', bases: ['components_missing'] },
  { id: 'novendible', title: 'Visibles que no se pueden vender', help: 'Marcados para la tienda pero de un tipo que la tienda no vende.', bases: ['visible_not_sellable_type'] },
];

export default function SaludCatalogoPage() {
  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" role="status" aria-label="Cargando" />}>
        <SaludContent />
      </Suspense>
    </PermissionGuard>
  );
}

function countFor(issues: HealthIssueCount[], base: string, country: StoreCountryCode): number {
  const wanted = issueCodeFor(base, country);
  let total = 0;
  for (const issue of issues) {
    if (issue.code === wanted) total += issue.count;
    // Tolerancia: una regla por país que llegue sin sufijo cuenta igual.
    else if (issue.code === base && wanted !== base) total += issue.count;
  }
  return total;
}

function SaludContent() {
  const ids = useId();
  const { get, getNumber, setParams } = useQueryFilters(FILTER_DEFAULTS);
  const paisRaw = get('pais');
  const country: StoreCountryCode = isCountry(paisRaw) ? paisRaw : 'MX';
  const faltaRaw = get('falta');
  // Una regla de zona solo aplica en el país con zonas (MX): en otro país se ignora el filtro.
  const falta = HEALTH_ISSUE_BASES.includes(faltaRaw) && issueAppliesTo(faltaRaw, country) ? faltaRaw : '';
  const includeAll = get('todos') === '1';
  const currentPage = getNumber('page') || 1;
  const pageSize = Math.min(100, Math.max(10, getNumber('limit') || 20));
  const [isExporting, setIsExporting] = useState(false);

  const health = useCatalogHealth(country);

  const listParams: CatalogAdminListParams = {
    country,
    isActive: true,
    productType: SELLABLE_TYPES,
    sortBy: 'score',
    sortDir: 'asc',
    page: currentPage,
    limit: pageSize,
  };
  if (!includeAll) {
    // "Vendibles": lo que el cliente YA ve en la tienda del país es lo primero que hay que completar.
    listParams.visibleEcommerce = true;
    listParams.hasPublicPrice = true;
  }
  if (falta) listParams.issue = [issueCodeFor(falta, country)];
  const priority = useCatalogAdminProducts(listParams);

  const issues = health.data?.issues ?? [];
  const active = health.data?.totals.active ?? 0;
  const sellable = health.data?.totals.sellable[country];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await productsAdminService.exportHealthCsv(country);
      downloadBlob(blob, `salud_catalogo_${country}_${fileDateStamp()}.csv`);
      toast.success('Pendientes exportados');
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo exportar los pendientes'));
    } finally {
      setIsExporting(false);
    }
  };

  const columns: DataTableColumn<CatalogAdminRow>[] = [
    {
      key: 'name',
      header: 'Producto',
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
            <Link href={`/admin/productos/${row.id}/editar`} className="font-semibold text-gray-900 underline-offset-2 hover:underline">
              {row.name}
            </Link>
            <p className="text-xs text-gray-700">
              <span className="font-mono">{row.code}</span> · {productTypeLabel(row.productType)}
              {row.categoryName ? ` · ${row.categoryName}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Ficha',
      render: (row) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${SCORE_TONE_CLASS[scoreTone(row.health.score)]}`}>
          {row.health.score === null ? 'Sin dato' : `${Math.round(row.health.score)}%`}
        </span>
      ),
    },
    {
      key: 'issues',
      header: 'Le falta (clic para corregir)',
      render: (row) =>
        row.health.issues.length === 0 ? (
          <span className="text-sm text-emerald-800">Ficha completa</span>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {row.health.issues.map((code) => (
              <li key={code}>
                <Link
                  href={`/admin/productos/${row.id}/editar?seccion=${healthIssueMeta(code).section}`}
                  className="inline-flex min-h-7 items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs text-gray-900 hover:border-[#3E667D] hover:bg-[#C8DDF2]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
                >
                  {healthIssueLabel(code, true)}
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
  ];

  const visibleCards = HEALTH_CARDS.filter(
    (card) => (!card.onlyCountry || card.onlyCountry === country) && card.bases.every((base) => issueAppliesTo(base, country)),
  );
  const rows = priority.data?.data ?? [];
  const total = priority.data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <ClipboardCheck className="h-9 w-9" aria-hidden />
                <h1 className="text-3xl font-bold sm:text-4xl">Salud del catálogo</h1>
              </div>
              <p className="text-base text-white/85 sm:text-lg">
                Qué le falta a cada producto para verse y venderse bien en la tienda.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/admin/productos">
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  Volver al catálogo
                </Link>
              </Button>
              <Button variant="default" onClick={() => void handleExport()} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                {isExporting ? 'Exportando…' : 'Exportar pendientes (CSV)'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="note">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            Un producto aparece en la tienda de un país cuando está activo, visible en tienda, es producto o
            paquete, tiene URL y precio público vigente en ese país.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:w-64">
            <Label htmlFor={`${ids}-pais`} className="mb-1 block">
              País
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
          <Button variant="ghost" size="sm" onClick={() => { void health.refetch(); void priority.refetch(); }} disabled={health.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${health.isFetching ? 'animate-spin' : ''}`} aria-hidden />
            Actualizar
          </Button>
        </div>

        {/* ---------- Tarjetas ---------- */}
        {health.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Cargando indicadores">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : health.isError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6" role="alert">
              <p className="text-red-800">{productAdminErrorMessage(health.error, 'No se pudo calcular la salud del catálogo.')}</p>
              <Button variant="outline" className="mt-3" onClick={() => void health.refetch()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <li>
              <Card className="h-full border-emerald-200 bg-emerald-50 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-emerald-900">Vendibles en tienda · {STORE_COUNTRY_NAME[country]}</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-900">
                    {sellable === undefined ? '—' : formatNumber(sellable)}
                    <span className="text-lg font-semibold text-emerald-800"> / {formatNumber(active)}</span>
                  </p>
                  <p className="mt-1 text-xs text-emerald-900">de los productos activos</p>
                </CardContent>
              </Card>
            </li>
            {visibleCards.map((card) => {
              const parts = card.bases.map((base) => ({ base, count: countFor(issues, base, country) }));
              const sum = parts.reduce((acc, p) => acc + p.count, 0);
              const single = parts.length === 1;
              const tone = sum === 0 ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50';
              const body = (
                <>
                  <p className="text-sm font-medium text-gray-900">{card.title}</p>
                  <p className={`mt-1 text-3xl font-bold ${sum === 0 ? 'text-gray-900' : 'text-amber-900'}`}>{formatNumber(sum)}</p>
                  <p className="mt-1 text-xs text-gray-700">{card.help}</p>
                </>
              );
              return (
                <li key={card.id}>
                  <Card className={`h-full shadow-sm ${tone}`}>
                    <CardContent className="p-5">
                      {single ? (
                        <Link
                          href={`/admin/productos?falta=${card.bases[0]}&pais=${country}`}
                          className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
                          aria-label={`${card.title}: ${sum}. Abrir el listado filtrado`}
                        >
                          {body}
                          <span className="mt-2 inline-flex items-center text-xs font-semibold text-[#2f5165]">
                            Ver productos <ChevronRight className="h-3 w-3" aria-hidden />
                          </span>
                        </Link>
                      ) : (
                        <>
                          {body}
                          <ul className="mt-2 space-y-1 border-t border-black/10 pt-2">
                            {parts.map((part) => (
                              <li key={part.base}>
                                <Link
                                  href={`/admin/productos?falta=${part.base}&pais=${country}`}
                                  className="flex min-h-7 items-center justify-between gap-2 rounded text-xs text-[#2f5165] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]"
                                >
                                  <span>{healthIssueLabel(part.base)}</span>
                                  <span className="font-semibold tabular-nums">{formatNumber(part.count)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {/* ---------- Prioridad de captura ---------- */}
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Prioridad de captura</h2>
                <p className="text-sm text-gray-700">
                  Productos con la ficha más incompleta primero. Cada pendiente abre la ficha en la sección que lo corrige.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:w-64">
                  <Label htmlFor={`${ids}-falta`} className="mb-1 block text-xs">
                    Le falta…
                  </Label>
                  <SearchableSelect
                    id={`${ids}-falta`}
                    options={healthIssueBasesFor(country).map((base) => ({ value: base, label: healthIssueLabel(issueCodeFor(base, country)) }))}
                    value={falta}
                    onChange={(v) => setParams({ falta: v || null })}
                    allLabel="Cualquier pendiente"
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2 pb-1.5">
                  <Switch
                    id={`${ids}-todos`}
                    checked={!includeAll}
                    onCheckedChange={(checked) => setParams({ todos: checked ? null : '1' })}
                  />
                  <Label htmlFor={`${ids}-todos`} className="text-sm font-normal">
                    Solo los que ya se venden en {STORE_COUNTRY_NAME[country]}
                  </Label>
                </div>
              </div>
            </div>

            {priority.isError && !priority.data ? (
              <p className="text-sm text-red-700" role="alert">
                {productAdminErrorMessage(priority.error, 'No se pudo cargar la lista de prioridad.')}
              </p>
            ) : (
              <>
                <div className={priority.isFetching && rows.length > 0 ? 'opacity-60 transition-opacity' : undefined} aria-busy={priority.isFetching}>
                  <DataTable
                    columns={columns}
                    data={rows}
                    isLoading={priority.isLoading && !priority.data}
                    getRowKey={(row) => row.id}
                    minWidthClassName="min-w-[760px]"
                    sortingMode="server"
                    emptyMessage={
                      falta || includeAll
                        ? 'Ningún producto tiene ese pendiente con los filtros actuales.'
                        : 'Ningún producto vendible tiene pendientes. Apaga el interruptor para revisar los que aún no se venden.'
                    }
                  />
                </div>
                {rows.length > 0 ? (
                  <DataTablePagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={total}
                    isLoading={priority.isFetching}
                    onPageChange={(p) => setParams({ page: String(p) })}
                    onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
