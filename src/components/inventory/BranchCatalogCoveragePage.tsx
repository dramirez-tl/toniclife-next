'use client';

// BranchCatalogCoveragePage — Inventario → Catálogo por sucursal.
//
// Tabla de cobertura (GET /inventory/branches/catalog-coverage): por cada
// sucursal activa con POS, cuántos productos elegibles tiene en su catálogo
// (fila en stock_levels), cuántos faltan y cuántos con existencia. Chips
// "Nueva" (< 30 días), "Sin catálogo" (0 filas) y "Almacén". La acción
// "Habilitar catálogo" abre EnableBranchCatalogDialog; `?branch=<id>` lo abre
// directo (enlace desde /admin/sucursales).
//
// Hereda `PermissionGuard inventory:read` del layout de Inventario; el botón
// de habilitar exige inventory:update (mismo permiso que el POST del API).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowPathIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { EnableBranchCatalogDialog, type EnableBranchCatalogBranch } from '@/components/inventory/EnableBranchCatalogDialog';
import { useBranchCatalogCoverage } from '@/hooks/useInventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { inventoryService } from '@/services/inventory.service';
import { apiErrorMessage } from '@/lib/branches/branch-cash-register';
import {
  BRANCH_CATALOG_RULE_TEXT,
  BRANCH_CATALOG_STOCK_NOTE,
  canEnableBranchCatalog,
  coverageStatus,
  coverageTotals,
  filterCoverageRows,
  isNewBranch,
} from '@/lib/inventory/branch-catalog';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import type { BranchCatalogCoverageRow } from '@/types/inventory';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

function PageHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-3">
          <BuildingStorefrontIcon className="h-9 w-9" aria-hidden />
          <h1 className="text-3xl font-bold sm:text-4xl">Catálogo por sucursal</h1>
        </div>
        <p className="text-base text-white/80 sm:text-lg">{subtitle}</p>
      </div>
    </div>
  );
}

/** Fallback del Suspense de la página. */
export function BranchCatalogCoverageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <PageHeader subtitle="Cargando cobertura…" />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

export function BranchCatalogCoveragePage() {
  const roles = useAppSelector(selectUserRoles);
  const permissions = useAppSelector(selectUserPermissions);
  const canEnable = canEnableBranchCatalog(roles, permissions);

  const { get, setParams } = useQueryFilters();
  const requestedBranch = get('branch');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<EnableBranchCatalogBranch | null>(null);

  const coverage = useBranchCatalogCoverage();
  const rows = useMemo(() => coverage.data?.data ?? [], [coverage.data]);
  const visibleRows = useMemo(() => filterCoverageRows(rows, search), [rows, search]);
  const totals = useMemo(() => coverageTotals(rows), [rows]);

  // `?branch=<id>` (desde /admin/sucursales) abre el diálogo de esa sucursal en
  // cuanto llega la cobertura; al cerrarlo se limpia el parámetro para que no
  // se reabra. Derivado, no copiado a estado: así no hay efectos.
  const dialogBranch: EnableBranchCatalogBranch | null = useMemo(() => {
    if (target) return target;
    if (!canEnable || !requestedBranch) return null;
    const row = rows.find((r) => r.branchId === requestedBranch);
    return row ? { id: row.branchId, code: row.code, name: row.name } : null;
  }, [target, canEnable, requestedBranch, rows]);

  const closeDialog = () => {
    setTarget(null);
    if (requestedBranch) setParams({ branch: null });
  };

  const openFor = (row: BranchCatalogCoverageRow) => setTarget({ id: row.branchId, code: row.code, name: row.name });

  const columns: DataTableColumn<BranchCatalogCoverageRow>[] = [
    {
      key: 'branch',
      header: 'Sucursal',
      sortable: true,
      sortValue: (row) => row.code,
      render: (row) => {
        const status = coverageStatus(row);
        return (
          <div>
            <div className="font-medium text-foreground">
              <span className="font-mono text-xs text-muted-foreground">{row.code}</span> · {row.name}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {isNewBranch(row.createdAt) ? <Badge variant="info">Nueva</Badge> : null}
              {status === 'sin_catalogo' ? <Badge variant="destructive">Sin catálogo</Badge> : null}
              {status === 'incompleto' ? <Badge variant="warning">Incompleto</Badge> : null}
              {row.isWarehouse ? <Badge variant="outline">Almacén</Badge> : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'country',
      header: 'País',
      sortable: true,
      sortValue: (row) => row.countryCode ?? '',
      render: (row) => row.countryCode ?? <span className="text-muted-foreground">Sin país</span>,
    },
    {
      key: 'eligible',
      header: 'Elegibles',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      sortable: true,
      sortValue: (row) => row.eligibleCount,
      render: (row) => formatNumber(row.eligibleCount),
    },
    {
      key: 'present',
      header: 'En catálogo',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      sortable: true,
      sortValue: (row) => row.presentCount,
      render: (row) => formatNumber(row.presentCount),
    },
    {
      key: 'missing',
      header: 'Faltan',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      sortable: true,
      sortValue: (row) => row.missingCount,
      render: (row) =>
        row.missingCount > 0 ? (
          <span className="font-semibold text-amber-700">{formatNumber(row.missingCount)}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      key: 'withStock',
      header: 'Con existencia',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      sortable: true,
      sortValue: (row) => row.withStockCount,
      render: (row) => formatNumber(row.withStockCount),
    },
    {
      key: 'createdAt',
      header: 'Creada',
      sortable: true,
      sortValue: (row) => row.createdAt,
      render: (row) => <span className="text-sm text-muted-foreground">{inventoryService.formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        if (!canEnable) return null;
        const status = coverageStatus(row);
        const nothingToDo = row.missingCount <= 0;
        return (
          <Button
            type="button"
            size="sm"
            variant={status === 'sin_catalogo' ? 'default' : 'outline'}
            onClick={() => openFor(row)}
            disabled={nothingToDo}
            title={
              nothingToDo
                ? row.eligibleCount > 0
                  ? 'Ya tiene todo el catálogo elegible'
                  : 'Sin productos elegibles (¿la sucursal tiene país?)'
                : `Habilitar catálogo en ${row.name}`
            }
            aria-label={`Habilitar catálogo en ${row.name}`}
          >
            <CubeIcon className="h-4 w-4" aria-hidden />
            Habilitar catálogo
          </Button>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <PageHeader subtitle="Qué productos ve el POS de cada sucursal y cuáles faltan por habilitar" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Alert role="note">
          <Info aria-hidden />
          <AlertTitle>Cómo funciona</AlertTitle>
          <AlertDescription>
            <p>{BRANCH_CATALOG_RULE_TEXT}</p>
            <p className="mt-1">{BRANCH_CATALOG_STOCK_NOTE}</p>
          </AlertDescription>
        </Alert>

        {coverage.isError ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden />
            <AlertTitle>No se pudo cargar la cobertura</AlertTitle>
            <AlertDescription>
              <p>{apiErrorMessage(coverage.error, 'Inténtalo de nuevo.')}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void coverage.refetch()}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="Sucursales con POS" value={totals.branches} />
          <SummaryCard label="Sin catálogo" value={totals.sinCatalogo} tone={totals.sinCatalogo > 0 ? 'danger' : 'muted'} />
          <SummaryCard label="Incompletas" value={totals.incompletas} tone={totals.incompletas > 0 ? 'warn' : 'muted'} />
          <SummaryCard label="Completas" value={totals.completas} tone="ok" />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código, nombre o país…"
                  className="pl-9"
                  aria-label="Buscar sucursal"
                />
              </div>
              <div className="flex items-center gap-3">
                {coverage.data?.generatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Calculado: {inventoryService.formatDateTime(coverage.data.generatedAt)}
                  </span>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => void coverage.refetch()} disabled={coverage.isFetching}>
                  <ArrowPathIcon className={`h-4 w-4 ${coverage.isFetching ? 'animate-spin' : ''}`} aria-hidden />
                  Actualizar
                </Button>
              </div>
            </div>

            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              Mostrando {formatNumber(visibleRows.length)} de {formatNumber(rows.length)}
            </p>

            <div className={coverage.isFetching && rows.length > 0 ? 'opacity-60 transition-opacity' : undefined} aria-busy={coverage.isFetching}>
              <DataTable
                columns={columns}
                data={visibleRows}
                isLoading={coverage.isLoading}
                getRowKey={(row) => row.branchId}
                minWidthClassName="min-w-[960px]"
                emptyMessage={search ? 'Ninguna sucursal coincide con la búsqueda.' : 'No hay sucursales activas con POS.'}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Las sucursales se administran en{' '}
              <Link href="/admin/sucursales" className="underline underline-offset-2">
                Sucursales
              </Link>
              . Para habilitar solo algunos productos usa Productos → Catálogo → Acciones masivas → Habilitar en sucursal…
            </p>
          </CardContent>
        </Card>
      </div>

      <EnableBranchCatalogDialog
        open={!!dialogBranch}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        branch={dialogBranch}
      />
    </div>
  );
}

function SummaryCard({ label, value, tone = 'muted' }: { label: string; value: number; tone?: 'muted' | 'danger' | 'warn' | 'ok' }) {
  const valueClass =
    tone === 'danger' ? 'text-destructive' : tone === 'warn' ? 'text-amber-700' : tone === 'ok' ? 'text-emerald-700' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${valueClass}`}>{formatNumber(value)}</p>
      </CardContent>
    </Card>
  );
}
