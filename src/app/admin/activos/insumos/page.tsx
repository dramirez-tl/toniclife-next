'use client';

// Insumos de TI - listado principal.
//
// Consumibles controlados por CANTIDAD (pilas, cables, tóner), no pieza por
// pieza como los activos. Mismo esqueleto que el inventario: filtros ligados a
// la URL (useQueryFilters -> requiere Suspense), tabla con paginación
// server-side, y botones rápidos para registrar entradas, consumos y desechos
// sin abrir la ficha.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArchiveBoxIcon, PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { ArrowDownToLine, ArrowUpFromLine, Camera, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useAssetCategories } from '@/hooks/useAssets';
import { useSupplies, useSupplyStats } from '@/hooks/useSupplies';
import { useBranches } from '@/hooks/useBranches';
import { SupplyFormModal } from '@/components/admin/assets/SupplyFormModal';
import { SupplyMovementModal } from '@/components/admin/assets/SupplyMovementModal';
import { BarcodeScannerDialog } from '@/components/admin/assets/BarcodeScannerDialog';
import { suppliesService } from '@/services/supplies.service';
import { assetsService } from '@/services/assets.service';
import {
  STOCK_STATE_LABELS,
  STOCK_STATE_VARIANTS,
  type Supply,
  type SupplyMovementType,
} from '@/types/supply';

export default function InsumosPage() {
  return (
    <Suspense fallback={<InsumosSkeleton />}>
      <InsumosContent />
    </Suspense>
  );
}

function InsumosSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      <div className="h-40 bg-gradient-to-r from-[#3E667D] to-[#0A4B94]" />
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

/** Qué movimiento se está capturando y sobre qué insumo. */
interface MovementTarget {
  supply: Supply;
  type: SupplyMovementType;
}

function InsumosContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    category: 'all',
    branch: 'all',
    stock: 'all',
    active: 'true',
    page: '1',
    limit: '20',
  });

  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLookup, setScanLookup] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [movement, setMovement] = useState<MovementTarget | null>(null);
  const [searchDraft, setSearchDraft] = useState(get('search'));

  /**
   * Escanear para BUSCAR: apuntas a la etiqueta del estante y caes en la ficha
   * del insumo. Las etiquetas salen del mismo lote que las de los equipos, así
   * que si el código resulta ser de un equipo se abre su ficha en vez de decir
   * que no existe. Si no está vinculado a nada, se ofrece darlo de alta con esa
   * etiqueta ya puesta.
   */
  const handleScanSearch = async (code: string) => {
    setScanLookup(true);
    try {
      try {
        const supply = await suppliesService.getSupplyByTag(code);
        router.push(`/admin/activos/insumos/${supply.id}`);
        return;
      } catch {
        /* no es insumo: se prueba como equipo antes de rendirse */
      }
      const asset = await assetsService.getAssetByTag(code);
      router.push(`/admin/activos/${asset.id}`);
    } catch {
      toast.info(
        `La etiqueta ${code} no está vinculada a ningún insumo ni equipo. Dalo de alta.`,
      );
      setScanCode(code);
      setFormOpen(true);
    } finally {
      setScanLookup(false);
    }
  };

  const search = get('search');
  const category = get('category');
  const branch = get('branch');
  const stock = get('stock');
  const active = get('active');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;

  const { data: stats } = useSupplyStats();
  const { data: categories = [] } = useAssetCategories({ isSupply: 'true' });
  const { data: branchesData } = useBranches({ limit: 200, isActive: true });

  const { data, isLoading, isFetching } = useSupplies({
    search: search || undefined,
    categoryId: category !== 'all' ? category : undefined,
    branchId: branch !== 'all' ? branch : undefined,
    stock: stock === 'low' || stock === 'out' ? stock : undefined,
    isActive: active === 'false' || active === 'all' ? active : 'true',
    page,
    limit,
  });

  const supplies = data?.data ?? [];
  const branches = branchesData?.data ?? [];

  const applySearch = () => setParams({ search: searchDraft.trim() || null, page: null });

  const openMovement = (supply: Supply, type: SupplyMovementType) =>
    setMovement({ supply, type });

  const hasFilters =
    !!search || category !== 'all' || branch !== 'all' || stock !== 'all' || active !== 'true';

  const columns: DataTableColumn<Supply>[] = [
    {
      key: 'supplyTag',
      header: 'Etiqueta',
      render: (s) => (
        <Link
          href={`/admin/activos/insumos/${s.id}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {s.supplyTag ? (
            <span className="font-mono tracking-wider">{s.supplyTag}</span>
          ) : (
            <span className="text-muted-foreground italic">Sin etiqueta</span>
          )}
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Insumo',
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{s.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[s.brand, s.model, s.sku].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (s) => <span className="text-sm">{s.categoryName ?? '—'}</span>,
    },
    {
      key: 'stock',
      header: 'Existencia',
      render: (s) => (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold tabular-nums">
            {s.stockQty}{' '}
            <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
          </p>
          <div className="flex items-center gap-2">
            <Badge variant={STOCK_STATE_VARIANTS[s.stockState]}>
              {STOCK_STATE_LABELS[s.stockState]}
            </Badge>
            <span className="text-[11px] text-muted-foreground">mín {s.minStock}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'consumed',
      header: 'Consumidos',
      render: (s) => <span className="text-sm tabular-nums">{s.consumedQty}</span>,
    },
    {
      key: 'discarded',
      header: 'Desechados',
      render: (s) => <span className="text-sm tabular-nums">{s.discardedQty}</span>,
    },
    {
      key: 'location',
      header: 'Ubicación',
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{s.branchName ?? 'Corporativo'}</p>
          {s.locationName ? (
            <p className="truncate text-xs text-muted-foreground">{s.locationName}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openMovement(s, 'entrada')}
            disabled={!s.isActive}
            title="Registrar entrada"
            aria-label={`Registrar entrada de ${s.name}`}
          >
            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openMovement(s, 'consumo')}
            disabled={!s.isActive || s.stockQty === 0}
            title="Registrar consumo"
            aria-label={`Registrar consumo de ${s.name}`}
          >
            <ArrowUpFromLine className="h-4 w-4 text-sky-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openMovement(s, 'desecho')}
            disabled={!s.isActive || s.stockQty === 0}
            title="Registrar desecho"
            aria-label={`Registrar desecho de ${s.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/activos/insumos/${s.id}`} aria-label={`Ver ${s.name}`}>
              <EyeIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <ArchiveBoxIcon className="h-7 w-7 sm:h-9 sm:w-9" />
            <h1 className="text-2xl font-bold sm:text-4xl">Insumos de TI</h1>
          </div>
          <p className="text-sm text-white/80 sm:text-lg">
            Consumibles de Sistemas controlados por cantidad: pilas, cables, tóner y más
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          <StatCard label="Insumos activos" value={stats?.activeSupplies ?? 0} />
          <StatCard
            label="Unidades disponibles"
            value={stats?.stockUnits ?? 0}
            tone="text-emerald-600"
          />
          <StatCard
            label="Bajo mínimo"
            value={stats?.lowStock ?? 0}
            tone="text-amber-600"
            hint="por resurtir"
          />
          <StatCard label="Agotados" value={stats?.outOfStock ?? 0} tone="text-red-600" />
          <StatCard
            label="Consumidos este mes"
            value={stats?.consumedThisMonth ?? 0}
            tone="text-sky-600"
            hint="mes calendario"
          />
          <StatCard
            label="Desechados este mes"
            value={stats?.discardedThisMonth ?? 0}
            hint="mes calendario"
          />
        </div>

        {/* Filtros y acciones */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Insumos</h2>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button
                  onClick={() => setFormOpen(true)}
                  className="order-first h-12 w-full sm:order-last sm:h-10 sm:w-auto"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Nuevo insumo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setScanOpen(true)}
                  disabled={scanLookup}
                  className="h-11 flex-1 sm:h-10 sm:flex-none"
                >
                  {scanLookup ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  Escanear
                </Button>
                <Button asChild variant="outline" className="h-11 flex-1 sm:h-10 sm:flex-none">
                  <Link href="/admin/activos">Ver equipos</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <Input
                  className="h-12 sm:h-10"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                  onBlur={applySearch}
                  placeholder="Etiqueta, nombre, marca, modelo, SKU o número de parte"
                />
              </div>
              <SearchableSelect
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                value={category}
                onChange={(v) => setParams({ category: v, page: null })}
                allLabel="Todas las categorías"
                allValue="all"
              />
              <SearchableSelect
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                value={branch}
                onChange={(v) => setParams({ branch: v, page: null })}
                allLabel="Todas las sucursales"
                allValue="all"
              />
              <SearchableSelect
                options={[
                  { value: 'low', label: 'Bajo mínimo' },
                  { value: 'out', label: 'Agotados' },
                ]}
                value={stock}
                onChange={(v) => setParams({ stock: v, page: null })}
                allLabel="Todas las existencias"
                allValue="all"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <FilterChip
                active={stock === 'low'}
                onClick={() => setParams({ stock: stock === 'low' ? 'all' : 'low', page: null })}
              >
                Bajo mínimo ({stats?.lowStock ?? 0})
              </FilterChip>
              <FilterChip
                active={stock === 'out'}
                onClick={() => setParams({ stock: stock === 'out' ? 'all' : 'out', page: null })}
              >
                Agotados ({stats?.outOfStock ?? 0})
              </FilterChip>
              <FilterChip
                active={active === 'false'}
                onClick={() =>
                  setParams({ active: active === 'false' ? 'true' : 'false', page: null })
                }
              >
                Ver inactivos
              </FilterChip>
              {hasFilters && (
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => {
                    setSearchDraft('');
                    setParams({
                      search: null,
                      category: 'all',
                      branch: 'all',
                      stock: 'all',
                      active: 'true',
                      page: null,
                    });
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Listado: tarjetas en celular, tabla en escritorio. Las tarjetas no
            son un Link completo porque llevan botones de movimiento dentro. */}
        <div className="space-y-3 sm:hidden">
          {isLoading && !data ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : supplies.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <ArchiveBoxIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No hay insumos que coincidan</p>
                <p className="text-sm text-muted-foreground">Da de alta el primer insumo.</p>
              </CardContent>
            </Card>
          ) : (
            supplies.map((s) => (
              <Card key={s.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/activos/insumos/${s.id}`}
                        className="block truncate text-base font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {[s.brand, s.model, s.sku].filter(Boolean).join(' · ') || s.categoryName}
                      </p>
                    </div>
                    <Badge variant={STOCK_STATE_VARIANTS[s.stockState]} className="shrink-0">
                      {STOCK_STATE_LABELS[s.stockState]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="text-base font-semibold tabular-nums text-foreground">
                      {s.stockQty} {s.unit}
                    </span>
                    <span>mín {s.minStock}</span>
                    {s.supplyTag ? (
                      <span className="font-mono tracking-wider text-foreground">
                        {s.supplyTag}
                      </span>
                    ) : (
                      <span className="italic">Sin etiqueta</span>
                    )}
                    {s.branchName || s.locationName ? (
                      <span>{[s.branchName, s.locationName].filter(Boolean).join(' · ')}</span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={() => openMovement(s, 'entrada')}
                      disabled={!s.isActive}
                    >
                      <ArrowDownToLine className="mr-1 h-4 w-4 text-emerald-600" />
                      Entrada
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={() => openMovement(s, 'consumo')}
                      disabled={!s.isActive || s.stockQty === 0}
                    >
                      <ArrowUpFromLine className="mr-1 h-4 w-4 text-sky-600" />
                      Consumo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={() => openMovement(s, 'desecho')}
                      disabled={!s.isActive || s.stockQty === 0}
                    >
                      <Trash2 className="mr-1 h-4 w-4 text-destructive" />
                      Desecho
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {supplies.length > 0 && (
            <DataTablePagination
              currentPage={page}
              pageSize={limit}
              totalItems={data?.total ?? 0}
              isLoading={isLoading || isFetching}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>

        <Card className="hidden sm:block">
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={supplies}
              isLoading={isLoading && !data}
              getRowKey={(s) => s.id}
              minWidthClassName="min-w-[1000px]"
              rowClassName={(s) => (s.isActive ? '' : 'opacity-60')}
              emptyState={
                <div className="py-8 text-center">
                  <ArchiveBoxIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No hay insumos que coincidan</p>
                  <p className="text-sm text-muted-foreground">Da de alta el primer insumo.</p>
                </div>
              }
            />
            {supplies.length > 0 && (
              <div className="mt-4">
                <DataTablePagination
                  currentPage={page}
                  pageSize={limit}
                  totalItems={data?.total ?? 0}
                  isLoading={isLoading || isFetching}
                  onPageChange={(p) => setParams({ page: String(p) })}
                  onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplyFormModal
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setScanCode('');
        }}
        defaultLabelCode={scanCode}
        onSaved={() => toast.success('Insumos actualizados')}
      />
      <SupplyMovementModal
        open={!!movement}
        onOpenChange={(o) => !o && setMovement(null)}
        supply={movement?.supply ?? null}
        initialType={movement?.type}
      />
      <BarcodeScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDetected={(code) => void handleScanSearch(code)}
        title="Buscar insumo"
        description="Apunta a la etiqueta del estante o la caja para abrir su ficha."
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${tone ?? ''}`}>{value.toLocaleString('es-MX')}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
