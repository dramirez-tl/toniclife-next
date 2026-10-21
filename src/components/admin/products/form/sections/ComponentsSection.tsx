'use client';

// (9) Componentes — kits y paquetes usan el compositor compartido; las
// promociones se componen (global o por país) en su propio módulo.
//
// Para kits/paquetes (contrato kits §5.2) se agrega, SOLO LECTURA:
//  - estado y existencia TOTAL de cada componente y el aviso de precio por país
//    (GET /products/:id/kit-availability sin sucursal);
//  - la existencia en la sucursal elegida (misma elección que Inventario ›
//    Disponibilidad) y el encabezado "Con esta receta hoy se pueden vender N";
//  - el candado "Hay N ventas/pedidos sin cobrar" (GET /products/:id/kit-readiness).
// La ficha edita la receta GLOBAL (`?countryId=global`), que es la que reemplaza
// PUT components/bulk. Si el servidor aún no expone la disponibilidad (404) el
// selector de sucursal no aparece.
//
// "Composición por sucursal" (CEDEAS, mig 167): una sucursal puede tener su
// PROPIA composición de este kit (p. ej. cambiar un componente agotado por
// otro) sin afectar a las demás; el POS, las entregas y la disponibilidad de
// esa sucursal la usan en lugar de la general. "Crear composición propia"
// copia la que la sucursal usa hoy (la de su país o la global) y después se
// edita solo en ese alcance; "Volver a la composición general" la borra.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { useKitReadiness } from '@/hooks/useKitAdmin';
import { useKitAvailability } from '@/hooks/useKitAvailability';
import { useKitComponents, useReplaceKitComponents } from '@/hooks/useKits';
import { resolveStockMode } from '@/lib/kits/kit-availability';
import { effectiveRecipeForBranch } from '@/lib/kits/kit-editor';
import { useKitBranchChoice } from '@/stores/kit-branch-choice.store';
import type { KitComponentsScope } from '@/services/kits.service';
import {
  ProductComponentsSection,
  type ComponentInfo,
  type ComponentsSectionController,
  type ComponentsStockContext,
} from '../../ProductComponentsSection';
import { productAdminErrorMessage } from '../../lib/errors';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';

export function ComponentsSection() {
  const { productId, product, readOnly, notifyWrite, registerSection, setSectionDirty, goToSection } = useProductForm();
  const unregister = useRef<(() => void) | null>(null);

  const bind = useCallback<ComponentsSectionController['bind']>(
    (handle) => {
      unregister.current?.();
      unregister.current = registerSection('componentes', handle);
    },
    [registerSection],
  );
  const onDirtyChange = useCallback((dirty: boolean) => setSectionDirty('componentes', dirty), [setSectionDirty]);
  const controller = useMemo(() => ({ bind, onDirtyChange }), [bind, onDirtyChange]);

  useEffect(
    () => () => {
      unregister.current?.();
      unregister.current = null;
      setSectionDirty('componentes', false);
    },
    [setSectionDirty],
  );

  // ---------- Existencias por sucursal (kits y paquetes) ----------
  const productType = product?.productType === 'kit' || product?.productType === 'pack' ? product.productType : null;
  const isKitOrPack = productType !== null;
  const stockMode = product ? resolveStockMode(product) : null;
  const noun = productType === 'kit' ? 'kit' : 'paquete';
  const branchId = useKitBranchChoice((s) => s.branchId);
  const setBranchId = useKitBranchChoice((s) => s.setBranchId);
  const { data: branches = [] } = useActiveBranches();
  // Sonda sin sucursal (compartida con Inventario): `null` = el servidor aún no calcula disponibilidad.
  const probe = useKitAvailability(productId, undefined, isKitOrPack);
  const supported = isKitOrPack && probe.data !== null && !probe.isError;
  const branchQuery = useKitAvailability(productId, branchId || undefined, supported && !!branchId);
  const readiness = useKitReadiness(productId, isKitOrPack);

  const branchOptions = useMemo(
    () =>
      [...branches]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ value: b.id, label: `${b.code ? `${b.code} · ` : ''}${b.name}${b.isWarehouse ? ' (almacén)' : ''}` })),
    [branches],
  );
  const branchName = branches.find((b) => b.id === branchId)?.name ?? 'la sucursal';

  const toStockContext = (
    name: string,
    data: { components?: Array<{ productId?: string | null; available: number; onHand: number; reserved: number; isActive: boolean }> } | null | undefined,
    loading: boolean,
  ): ComponentsStockContext => {
    const byComponent = new Map<string, { available: number; onHand: number; reserved: number; isActive: boolean }>();
    for (const c of data?.components ?? []) {
      if (c.productId) byComponent.set(c.productId, { available: c.available, onHand: c.onHand, reserved: c.reserved, isActive: c.isActive });
    }
    return { branchName: name, byComponent, loading };
  };

  const stockContext = useMemo<ComponentsStockContext | undefined>(() => {
    if (!supported || !branchId) return undefined;
    return toStockContext(branchName, branchQuery.data, branchQuery.isLoading);
  }, [supported, branchId, branchQuery.data, branchQuery.isLoading, branchName]);

  // Estado y existencia total por componente (detalle sin sucursal = suma del universo del kit).
  const componentInfo = useMemo<Map<string, ComponentInfo> | undefined>(() => {
    if (!supported) return undefined;
    const map = new Map<string, ComponentInfo>();
    for (const c of probe.data?.components ?? []) {
      if (c.productId) map.set(c.productId, { isActive: c.isActive, totalAvailable: c.available, hasPriceInKitCountries: c.hasPriceInKitCountries });
    }
    return map;
  }, [supported, probe.data]);

  // ---------- Composición propia por sucursal (mig 167) ----------
  const [compBranchId, setCompBranchId] = useState('');
  const [confirmDrop, setConfirmDrop] = useState(false);
  const compBranch = branches.find((b) => b.id === compBranchId);
  const compBranchName = compBranch?.name ?? 'la sucursal';
  const compScope = useMemo<KitComponentsScope>(() => (compBranchId ? { branchId: compBranchId } : 'all'), [compBranchId]);
  const compEnabled = isKitOrPack && !!compBranchId;
  const ownRows = useKitComponents(compEnabled ? productId : undefined, compScope);
  const allRows = useKitComponents(compEnabled ? productId : undefined, 'all');
  const replaceForBranch = useReplaceKitComponents(productId);
  const hasOwn = (ownRows.data?.length ?? 0) > 0;
  // Lo que la sucursal usa hoy sin composición propia (la de su país o la global).
  const inherited = useMemo(
    () => effectiveRecipeForBranch(allRows.data ?? [], compBranch?.countryId ?? null),
    [allRows.data, compBranch?.countryId],
  );
  const compStock = useKitAvailability(productId, compBranchId || undefined, supported && compEnabled && hasOwn);
  const compStockContext = useMemo<ComponentsStockContext | undefined>(() => {
    if (!supported || !compEnabled || !hasOwn) return undefined;
    return toStockContext(compBranchName, compStock.data, compStock.isLoading);
  }, [supported, compEnabled, hasOwn, compBranchName, compStock.data, compStock.isLoading]);
  const chooseCompBranch = (id: string) => {
    setCompBranchId(id);
    setConfirmDrop(false);
  };

  const createOwn = async () => {
    if (!compBranchId || inherited.length === 0) return;
    try {
      await replaceForBranch.mutateAsync({
        branchId: compBranchId,
        components: inherited.map((r, i) => ({
          componentProductId: r.componentProductId as string,
          quantity: Number(r.quantity),
          sortOrder: i,
        })),
      });
      toast.success(`Composición propia creada para ${compBranchName}: edítala abajo`);
      notifyWrite();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo crear la composición propia'));
    }
  };

  const dropOwn = async () => {
    if (!compBranchId) return;
    try {
      await replaceForBranch.mutateAsync({ branchId: compBranchId, components: [] });
      setConfirmDrop(false);
      toast.success(`${compBranchName} vuelve a usar la composición general`);
      notifyWrite();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo quitar la composición propia'));
    }
  };

  if (product?.productType === 'promotional') {
    return (
      <SectionCard
        title="Componentes de la promoción"
        description="Las promociones se administran en su propio módulo, donde la composición se define global o por país junto con sus reglas de canje y vigencias."
      >
        <Link
          href={`/admin/promociones/${productId}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-[#3E667D] underline underline-offset-2"
        >
          Abrir el editor de la promoción
        </Link>
      </SectionCard>
    );
  }

  const toolbar = supported ? (
    <div className="flex flex-col gap-1 sm:max-w-md">
      <label htmlFor={`components-branch-${productId}`} className="text-xs font-medium text-gray-600">
        Ver existencias en la sucursal
      </label>
      <SearchableSelect
        id={`components-branch-${productId}`}
        options={branchOptions}
        value={branchId}
        onChange={setBranchId}
        allLabel="Elige una sucursal…"
        allValue=""
        className="w-full"
        aria-describedby={`components-branch-help-${productId}`}
      />
      <p id={`components-branch-help-${productId}`} className="text-xs text-gray-500">
        Solo lectura: cuánto hay hoy de cada componente ahí y cuántos {productType === 'kit' ? 'kits' : 'paquetes'} salen con esta receta.
      </p>
    </div>
  ) : undefined;

  return (
    <>
      <ProductComponentsSection
        productId={productId}
        stockMode={stockMode}
        productType={productType ?? undefined}
        noun={noun}
        readOnly={readOnly}
        controller={controller}
        onSaved={notifyWrite}
        toolbar={toolbar}
        stockContext={stockContext}
        componentInfo={componentInfo}
        recipeLock={readiness.data?.recipeLock ?? null}
        onGoToKit={() => goToSection('kit')}
        scope={isKitOrPack ? 'global' : 'all'}
      />

      {isKitOrPack ? (
        <SectionCard
          title="Composición por sucursal"
          description={`Una sucursal puede tener su propia composición de este ${noun} (por ejemplo, cambiar un componente agotado por otro) sin afectar a las demás. Las sucursales sin composición propia usan la de su país o la general.`}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:max-w-md">
              <label htmlFor={`components-own-branch-${productId}`} className="text-xs font-medium text-gray-600">
                Sucursal
              </label>
              <SearchableSelect
                id={`components-own-branch-${productId}`}
                options={branchOptions}
                value={compBranchId}
                onChange={chooseCompBranch}
                allLabel="Elige una sucursal…"
                allValue=""
                className="w-full"
              />
            </div>

            {!compBranchId ? (
              <p className="text-sm text-gray-600">Elige una sucursal para ver qué composición usa hoy.</p>
            ) : ownRows.isLoading || allRows.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando…
              </p>
            ) : hasOwn ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#a7c1e2] bg-[#C8DDF2]/20 px-3 py-2 text-sm text-[#2f5165]">
                  <span>
                    <strong>{compBranchName}</strong> tiene composición propia: lo que guardes abajo solo aplica a esa sucursal.
                  </span>
                  {!readOnly ? (
                    confirmDrop ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span>¿Volver a la composición general?</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => void dropOwn()}
                          disabled={replaceForBranch.isPending}
                        >
                          Sí, quitar la propia
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDrop(false)}>
                          No
                        </Button>
                      </span>
                    ) : (
                      <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDrop(true)}>
                        Volver a la composición general
                      </Button>
                    )
                  ) : null}
                </div>
                <ProductComponentsSection
                  key={compBranchId}
                  productId={productId}
                  stockMode={stockMode}
                  noun={noun}
                  readOnly={readOnly}
                  onSaved={notifyWrite}
                  stockContext={compStockContext}
                  componentInfo={componentInfo}
                  recipeLock={readiness.data?.recipeLock ?? null}
                  scope={compScope}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  <strong>{compBranchName}</strong> usa la composición general
                  {inherited.length > 0 ? ` (${inherited.length} ${inherited.length === 1 ? 'componente' : 'componentes'}):` : '.'}
                </p>
                {inherited.length > 0 ? (
                  <ul className="divide-y rounded-md border border-gray-200 text-sm text-gray-700">
                    {inherited.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                        <span>{r.componentProductName ?? r.componentProductCode ?? 'Componente'}</span>
                        <span className="font-mono text-xs text-gray-600">
                          {r.componentProductCode} × {Number(r.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-amber-800">
                    Este {noun} no tiene componentes para esa sucursal: agrégalos arriba antes de crear una composición propia.
                  </p>
                )}
                {!readOnly ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void createOwn()}
                    disabled={replaceForBranch.isPending || inherited.length === 0}
                    aria-busy={replaceForBranch.isPending}
                  >
                    {replaceForBranch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Crear composición propia para {compBranchName}
                  </Button>
                ) : null}
                <p className="text-xs text-gray-600">
                  Se copia la composición que la sucursal usa hoy y después la editas solo para ella; las demás sucursales no cambian.
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
