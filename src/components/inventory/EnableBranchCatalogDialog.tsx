'use client';

// EnableBranchCatalogDialog — "Habilitar catálogo" del POS de una sucursal,
// sobre ConfirmDialog. Cada cambio de parámetros pide una VISTA PREVIA al API
// (POST …/catalog/enable con dryRun: true, no escribe nada) y muestra cuántos
// productos se crearían y por qué se omiten los demás; el botón principal
// repite la llamada con dryRun: false (una transacción, idempotente).
//
// Dos usos:
//  - Inventario → Catálogo por sucursal: `branch` fijo; modo Elegibles del país
//    o Copiar de otra sucursal.
//  - Productos → Catálogo → Acciones masivas → "Habilitar en sucursal…":
//    `fixedMode="products"` con la selección de la página; el usuario elige la
//    sucursal destino aquí (lista de cobertura: sucursales activas con POS).
//
// Las filas se crean con existencia 0: el diálogo lo dice siempre.

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useBranchCatalogCoverage, useBranchCatalogPreview, useEnableBranchCatalog } from '@/hooks/useInventory';
import { apiErrorMessage } from '@/lib/branches/branch-cash-register';
import {
  BRANCH_CATALOG_MODE_HELP,
  BRANCH_CATALOG_MODE_LABEL,
  BRANCH_CATALOG_SKIP_REASON_LABEL,
  BRANCH_CATALOG_STOCK_NOTE,
  BRANCH_CATALOG_WAREHOUSE_WARNING,
  buildEnableBranchCatalogDto,
  enableResultMessage,
  skippedSummary,
} from '@/lib/inventory/branch-catalog';
import type { BranchCatalogEnableMode, BranchCatalogEnableResult } from '@/types/inventory';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export interface EnableBranchCatalogBranch {
  id: string;
  code: string;
  name: string;
}

export interface EnableBranchCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sucursal destino. `null` = el usuario la elige aquí (desde Productos → Catálogo). */
  branch: EnableBranchCatalogBranch | null;
  /** `products` fija el modo a la lista `productIds` (sin radio de modo). */
  fixedMode?: 'products';
  /** Productos a habilitar (modo products). */
  productIds?: readonly string[];
  /** Tras habilitar (dryRun: false) con éxito. */
  onDone?: (result: BranchCatalogEnableResult) => void;
}

/** Modos que se ofrecen con la sucursal fija (elegir productos se hace desde Productos → Catálogo). */
const PICKABLE_MODES: BranchCatalogEnableMode[] = ['eligible', 'copy_from_branch'];

export function EnableBranchCatalogDialog(props: EnableBranchCatalogDialogProps) {
  // El cuerpo se monta al abrir: modo, origen y destino arrancan limpios cada vez.
  if (!props.open) return null;
  return <EnableBranchCatalogDialogOpen {...props} />;
}

function EnableBranchCatalogDialogOpen({
  open,
  onOpenChange,
  branch,
  fixedMode,
  productIds,
  onDone,
}: EnableBranchCatalogDialogProps) {
  const ids = useId();
  const [targetId, setTargetId] = useState(branch?.id ?? '');
  const [mode, setMode] = useState<BranchCatalogEnableMode>(fixedMode ?? 'eligible');
  const [sourceBranchId, setSourceBranchId] = useState('');

  // Cobertura: sucursales activas con POS, para elegir destino y/u origen.
  const coverage = useBranchCatalogCoverage();
  const rows = useMemo(() => coverage.data?.data ?? [], [coverage.data]);
  const target: EnableBranchCatalogBranch | null = useMemo(() => {
    if (branch) return branch;
    const row = rows.find((r) => r.branchId === targetId);
    return row ? { id: row.branchId, code: row.code, name: row.name } : null;
  }, [branch, rows, targetId]);

  const targetOptions = useMemo(
    () =>
      rows.map((r) => ({
        value: r.branchId,
        label: `${r.code} · ${r.name}`,
        hint: `${r.countryCode ?? 'Sin país'} · ${formatNumber(r.presentCount)} en catálogo${
          r.missingCount > 0 ? ` · faltan ${formatNumber(r.missingCount)}` : ''
        }`,
      })),
    [rows],
  );
  // Origen para copiar: otra sucursal que sí tenga catálogo.
  const sourceOptions = useMemo(
    () =>
      rows
        .filter((r) => r.branchId !== targetId && r.presentCount > 0)
        .map((r) => ({
          value: r.branchId,
          label: `${r.code} · ${r.name}`,
          hint: `${r.countryCode ?? 'Sin país'} · ${formatNumber(r.presentCount)} en catálogo`,
        })),
    [rows, targetId],
  );

  const dto = useMemo(
    () => buildEnableBranchCatalogDto({ mode, sourceBranchId, productIds, dryRun: true }),
    [mode, sourceBranchId, productIds],
  );
  const preview = useBranchCatalogPreview(target?.id ?? null, dto);
  const enable = useEnableBranchCatalog();
  const result = preview.data;
  const toCreate = result?.toCreate ?? 0;
  const canConfirm = !!target && !!dto && !!result && toCreate > 0 && !preview.isFetching;

  const handleConfirm = async () => {
    if (!target || !dto) return;
    try {
      const done = await enable.mutateAsync({ branchId: target.id, dto: { ...dto, dryRun: false } });
      toast.success(enableResultMessage(done), { duration: 8000 });
      onDone?.(done);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'No se pudo habilitar el catálogo'), { duration: 8000 });
    }
  };

  const selectedCount = fixedMode === 'products' ? (dto?.productIds?.length ?? 0) : 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={target ? `Habilitar catálogo en ${target.code} · ${target.name}` : 'Habilitar catálogo en una sucursal'}
      description="Crea las filas de existencias que faltan para que el POS muestre los productos. No cambia existencias ni filas que ya existen."
      confirmLabel={toCreate > 0 ? `Habilitar ${formatNumber(toCreate)} ${toCreate === 1 ? 'producto' : 'productos'}` : 'Habilitar'}
      isPending={enable.isPending}
      disabled={!canConfirm}
      onConfirm={handleConfirm}
      contentClassName="sm:max-w-2xl"
    >
      <div className="space-y-4">
        {/* Destino (solo cuando no viene fijo) */}
        {!branch ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-target`}>Sucursal destino</Label>
            <SearchableSelect
              id={`${ids}-target`}
              options={targetOptions}
              value={targetId}
              onChange={setTargetId}
              showAllOption={false}
              placeholder={coverage.isLoading ? 'Cargando sucursales…' : 'Elige la sucursal'}
              disabled={coverage.isLoading || enable.isPending}
              className="w-full"
            />
            {coverage.isError ? (
              <p className="text-xs text-destructive" role="alert">
                {apiErrorMessage(coverage.error, 'No se pudieron cargar las sucursales con POS')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Solo sucursales activas con POS.</p>
            )}
          </div>
        ) : null}

        {/* Modo */}
        {fixedMode === 'products' ? (
          <p className="text-sm">
            <span className="font-semibold">{formatNumber(selectedCount)}</span>{' '}
            {selectedCount === 1 ? 'producto seleccionado' : 'productos seleccionados'} de esta página.{' '}
            <span className="text-muted-foreground">{BRANCH_CATALOG_MODE_HELP.products}</span>
          </p>
        ) : (
          <fieldset className="space-y-2" disabled={enable.isPending}>
            <legend className="text-sm font-medium">Qué habilitar</legend>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v === 'copy_from_branch' ? 'copy_from_branch' : 'eligible')}
              className="gap-3"
            >
              {PICKABLE_MODES.map((option) => (
                <div key={option} className="flex items-start gap-3">
                  <RadioGroupItem id={`${ids}-mode-${option}`} value={option} className="mt-1" />
                  <div className="text-sm">
                    <Label htmlFor={`${ids}-mode-${option}`} className="font-medium leading-snug">
                      {BRANCH_CATALOG_MODE_LABEL[option]}
                    </Label>
                    <p className="text-muted-foreground">{BRANCH_CATALOG_MODE_HELP[option]}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {mode === 'copy_from_branch' ? (
              <div className="space-y-1.5 pl-7">
                <Label htmlFor={`${ids}-source`}>Sucursal de la que se copia</Label>
                <SearchableSelect
                  id={`${ids}-source`}
                  options={sourceOptions}
                  value={sourceBranchId}
                  onChange={setSourceBranchId}
                  showAllOption={false}
                  placeholder={coverage.isLoading ? 'Cargando sucursales…' : 'Elige la sucursal origen'}
                  disabled={coverage.isLoading}
                  className="w-full"
                />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              ¿Solo algunos productos? En{' '}
              <Link href="/admin/productos" className="underline underline-offset-2">
                Productos → Catálogo
              </Link>{' '}
              selecciónalos y usa Acciones masivas → Habilitar en sucursal…
            </p>
          </fieldset>
        )}

        {/* Vista previa */}
        {target && dto ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3" aria-live="polite" aria-busy={preview.isFetching}>
            {preview.isError ? (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden />
                <AlertTitle>No se pudo calcular la vista previa</AlertTitle>
                <AlertDescription>{apiErrorMessage(preview.error, 'Inténtalo de nuevo.')}</AlertDescription>
              </Alert>
            ) : null}
            {!result && preview.isFetching ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Calculando la vista previa…
              </p>
            ) : null}
            {result ? (
              <div className={preview.isFetching ? 'opacity-60 transition-opacity' : undefined}>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <PreviewStat label="Elegibles" value={result.eligible} />
                  <PreviewStat
                    label="Ya en catálogo"
                    value={result.alreadyPresent}
                    hint={result.inactiveRows > 0 ? `${formatNumber(result.inactiveRows)} con fila inactiva` : undefined}
                  />
                  <PreviewStat label="A crear" value={result.toCreate} emphasis />
                  <PreviewStat label="Omitidos" value={result.skipped.total} />
                </dl>
                {result.skipped.total > 0 ? (
                  <div className="mt-3 text-sm">
                    <p>
                      <span className="font-medium">Omitidos:</span> {skippedSummary(result.skipped)}.
                    </p>
                    {result.skipped.sample.length > 0 ? (
                      <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-muted-foreground">
                        {result.skipped.sample.map((s) => (
                          <li key={s.productId}>
                            {s.code ? <span className="font-mono">{s.code}</span> : null}
                            {s.code && s.name ? ' · ' : null}
                            {s.name ?? (s.code ? null : s.productId)} — {BRANCH_CATALOG_SKIP_REASON_LABEL[s.reason] ?? s.reason}
                          </li>
                        ))}
                        {result.skipped.total > result.skipped.sample.length ? (
                          <li className="list-none">… y {formatNumber(result.skipped.total - result.skipped.sample.length)} más</li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {result.toCreate === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nada que crear: {result.eligible > 0 ? 'todos los elegibles ya están en el catálogo de la sucursal.' : 'ningún producto cumple la regla para esta sucursal.'}
                  </p>
                ) : null}
                {result.warnings.includes('warehouse') ? (
                  <Alert className="mt-3">
                    <AlertTriangle aria-hidden />
                    <AlertDescription>{BRANCH_CATALOG_WAREHOUSE_WARNING}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {!target
              ? 'Elige la sucursal destino para ver la vista previa.'
              : mode === 'copy_from_branch'
                ? 'Elige la sucursal origen para ver la vista previa.'
                : 'No hay productos seleccionados.'}
          </p>
        )}

        <Alert role="note">
          <Info aria-hidden />
          <AlertDescription>{BRANCH_CATALOG_STOCK_NOTE}</AlertDescription>
        </Alert>
      </div>
    </ConfirmDialog>
  );
}

function PreviewStat({ label, value, hint, emphasis }: { label: string; value: number; hint?: string; emphasis?: boolean }) {
  return (
    <div className="rounded-md bg-background px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-lg font-semibold ${emphasis ? 'text-primary' : 'text-foreground'}`}>{formatNumber(value)}</dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}
