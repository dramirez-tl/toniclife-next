'use client';

// Inventario de Activos de TI - listado principal.
// Filtros ligados a la URL (useQueryFilters -> requiere Suspense), tabla con
// paginación y orden server-side, alta con especificaciones dinámicas.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ComputerDesktopIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Barcode, Camera, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useAssetCategories, useAssetStats, useAssets } from '@/hooks/useAssets';
import { useBranches } from '@/hooks/useBranches';
import { AssetFormModal } from '@/components/admin/assets/AssetFormModal';
import { LifeBar } from '@/components/admin/assets/AssignAssetModal';
import { AssetImportDialog } from '@/components/admin/assets/AssetImportDialog';
import { BarcodeScannerDialog } from '@/components/admin/assets/BarcodeScannerDialog';
import { assetsService } from '@/services/assets.service';
import {
  ASSET_CONDITION_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_VARIANTS,
  type Asset,
} from '@/types/asset';

export default function ActivosPage() {
  return (
    <Suspense fallback={<ActivosSkeleton />}>
      <ActivosContent />
    </Suspense>
  );
}

function ActivosSkeleton() {
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

function ActivosContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    category: 'all',
    branch: 'all',
    life: 'all',
    invoice: 'all',
    page: '1',
    limit: '20',
  });

  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLookup, setScanLookup] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [searchDraft, setSearchDraft] = useState(get('search'));

  /**
   * Escanear para BUSCAR: vas caminando con el celular, apuntas a la etiqueta y
   * caes en la ficha del equipo. Si el código no está vinculado a nada, se
   * ofrece darlo de alta con esa etiqueta ya puesta.
   */
  const handleScanSearch = async (code: string) => {
    setScanLookup(true);
    try {
      const asset = await assetsService.getAssetByTag(code);
      router.push(`/admin/activos/${asset.id}`);
    } catch {
      toast.info(`La etiqueta ${code} no está vinculada a ningún equipo. Dala de alta.`);
      setScanCode(code);
      setFormOpen(true);
    } finally {
      setScanLookup(false);
    }
  };

  const search = get('search');
  const status = get('status');
  const category = get('category');
  const branch = get('branch');
  const life = get('life');
  const invoice = get('invoice');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;

  const { data: stats } = useAssetStats();
  const { data: categories = [] } = useAssetCategories({ leafOnly: 'true' });
  const { data: branchesData } = useBranches({ limit: 200, isActive: true });

  const { data, isLoading, isFetching } = useAssets({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    categoryId: category !== 'all' ? category : undefined,
    branchId: branch !== 'all' ? branch : undefined,
    lifeBelowPct: life !== 'all' ? Number(life) : undefined,
    hasInvoice: invoice !== 'all' ? invoice : undefined,
    page,
    limit,
  });

  const assets = data?.data ?? [];
  const branches = branchesData?.data ?? [];

  const applySearch = () => setParams({ search: searchDraft.trim() || null, page: null });

  const columns: DataTableColumn<Asset>[] = [
    {
      key: 'assetTag',
      header: 'Etiqueta',
      render: (a) => (
        <Link
          href={`/admin/activos/${a.id}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {a.assetTag ? (
            <span className="font-mono tracking-wider">{a.assetTag}</span>
          ) : (
            <span className="text-muted-foreground italic">Sin etiqueta</span>
          )}
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Equipo',
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{a.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[a.brand, a.model].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (a) => <span className="text-sm">{a.categoryName ?? '—'}</span>,
    },
    {
      key: 'serial',
      header: 'No. de serie',
      render: (a) => (
        <span className="font-mono text-xs text-muted-foreground">{a.serialNumber ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (a) => (
        <div className="flex flex-col gap-1">
          <Badge variant={ASSET_STATUS_VARIANTS[a.status]}>{ASSET_STATUS_LABELS[a.status]}</Badge>
          <span className="text-[11px] text-muted-foreground">
            {ASSET_CONDITION_LABELS[a.condition]}
          </span>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Asignado a',
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{a.assignedUserName ?? a.branchName ?? '—'}</p>
          {a.locationName ? (
            <p className="truncate text-xs text-muted-foreground">{a.locationName}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'life',
      header: 'Vida útil',
      render: (a) => <LifeBar pct={a.lifeRemainingPct} />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/activos/${a.id}`} aria-label={`Ver ${a.assetTag}`}>
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
            <ComputerDesktopIcon className="h-7 w-7 sm:h-9 sm:w-9" />
            <h1 className="text-2xl font-bold sm:text-4xl">Activos de TI</h1>
          </div>
          <p className="text-sm text-white/80 sm:text-lg">
            Inventario de equipo bajo gestión del departamento de Sistemas
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard label="Total de equipos" value={stats?.total ?? 0} />
          <StatCard label="Disponibles" value={stats?.available ?? 0} tone="text-emerald-600" />
          <StatCard label="Asignados" value={stats?.assigned ?? 0} tone="text-sky-600" />
          <StatCard
            label="Vida útil crítica"
            value={stats?.lifeCritical ?? 0}
            tone="text-red-600"
            hint="20% o menos"
          />
          <StatCard
            label="Sin etiqueta"
            value={stats?.pendingLabel ?? 0}
            tone="text-amber-600"
            hint="por vincular"
          />
        </div>

        {/* Filtros y acciones */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Inventario</h2>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button
                  onClick={() => setFormOpen(true)}
                  className="order-first h-12 w-full sm:order-last sm:h-10 sm:w-auto"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Nuevo activo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setImportOpen(true)}
                  className="h-11 flex-1 sm:h-10 sm:flex-none"
                >
                  <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                  Carga masiva
                </Button>
                <Button asChild variant="outline" className="h-11 flex-1 sm:h-10 sm:flex-none">
                  <Link href="/admin/activos/etiquetas">
                    <Barcode className="mr-2 h-4 w-4" />
                    Etiquetas
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <div className="flex gap-2 lg:col-span-2">
                <Input
                  className="h-12 flex-1 sm:h-10"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                  onBlur={applySearch}
                  placeholder="Etiqueta, serie, nombre, marca o modelo"
                />
                <Button
                  variant="outline"
                  onClick={() => setScanOpen(true)}
                  disabled={scanLookup}
                  className="h-12 shrink-0 px-4 sm:h-10 sm:px-3"
                  aria-label="Escanear una etiqueta para buscar el equipo"
                  title="Escanear para buscar"
                >
                  {scanLookup ? (
                    <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
                  ) : (
                    <Camera className="h-5 w-5 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>
              <SearchableSelect
                options={ASSET_STATUSES.map((s) => ({ value: s, label: ASSET_STATUS_LABELS[s] }))}
                value={status}
                onChange={(v) => setParams({ status: v, page: null })}
                allLabel="Todos los estados"
                allValue="all"
              />
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
                  { value: '20', label: 'Vida útil ≤ 20%' },
                  { value: '50', label: 'Vida útil ≤ 50%' },
                  { value: '80', label: 'Vida útil ≤ 80%' },
                ]}
                value={life}
                onChange={(v) => setParams({ life: v, page: null })}
                allLabel="Cualquier vida útil"
                allValue="all"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <FilterChip
                active={invoice === 'false'}
                onClick={() =>
                  setParams({ invoice: invoice === 'false' ? 'all' : 'false', page: null })
                }
              >
                Sin factura ({stats?.withoutInvoice ?? 0})
              </FilterChip>
              <FilterChip
                active={status === 'in_repair'}
                onClick={() =>
                  setParams({ status: status === 'in_repair' ? 'all' : 'in_repair', page: null })
                }
              >
                En reparación ({stats?.inRepair ?? 0})
              </FilterChip>
              {(search || status !== 'all' || category !== 'all' || branch !== 'all' ||
                life !== 'all' || invoice !== 'all') && (
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => {
                    setSearchDraft('');
                    setParams({
                      search: null,
                      status: 'all',
                      category: 'all',
                      branch: 'all',
                      life: 'all',
                      invoice: 'all',
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

        {/* Listado: tarjetas en celular, tabla en escritorio.
            Con 8 columnas, en un teléfono la tabla obliga a scroll horizontal y
            es inservible para quien anda inventariando de pie. */}
        <div className="space-y-3 sm:hidden">
          {isLoading && !data ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          ) : assets.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <ComputerDesktopIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No hay activos que coincidan</p>
                <p className="text-sm text-muted-foreground">
                  Da de alta el primer equipo o usa la carga masiva.
                </p>
              </CardContent>
            </Card>
          ) : (
            assets.map((a) => (
              <Link key={a.id} href={`/admin/activos/${a.id}`} className="block">
                <Card className="transition-colors active:bg-muted/60">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{a.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[a.brand, a.model].filter(Boolean).join(' · ') || a.categoryName}
                        </p>
                      </div>
                      <Badge variant={ASSET_STATUS_VARIANTS[a.status]} className="shrink-0">
                        {ASSET_STATUS_LABELS[a.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {a.assetTag ? (
                        <span className="font-mono tracking-wider text-foreground">
                          {a.assetTag}
                        </span>
                      ) : (
                        <span className="italic">Sin etiqueta</span>
                      )}
                      {a.serialNumber ? <span className="font-mono">S/N {a.serialNumber}</span> : null}
                      {a.assignedUserName || a.branchName ? (
                        <span>{a.assignedUserName ?? a.branchName}</span>
                      ) : null}
                    </div>
                    <LifeBar pct={a.lifeRemainingPct} />
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
          {assets.length > 0 && (
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
              data={assets}
              isLoading={isLoading && !data}
              getRowKey={(a) => a.id}
              minWidthClassName="min-w-[1000px]"
              emptyState={
                <div className="py-8 text-center">
                  <ComputerDesktopIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No hay activos que coincidan</p>
                  <p className="text-sm text-muted-foreground">
                    Da de alta el primer equipo o usa la carga masiva.
                  </p>
                </div>
              }
            />
            {assets.length > 0 && (
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

      <AssetFormModal
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setScanCode('');
        }}
        defaultLabelCode={scanCode}
        onSaved={() => toast.success('Inventario actualizado')}
      />
      <BarcodeScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDetected={(code) => void handleScanSearch(code)}
        title="Buscar equipo"
        description="Apunta a la etiqueta del aparato para abrir su ficha."
      />
      <AssetImportDialog open={importOpen} onOpenChange={setImportOpen} />
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
