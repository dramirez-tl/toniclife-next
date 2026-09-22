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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { useKitReadiness } from '@/hooks/useKitAdmin';
import { useKitAvailability } from '@/hooks/useKitAvailability';
import { resolveStockMode } from '@/lib/kits/kit-availability';
import { useKitBranchChoice } from '@/stores/kit-branch-choice.store';
import {
  ProductComponentsSection,
  type ComponentInfo,
  type ComponentsSectionController,
  type ComponentsStockContext,
} from '../../ProductComponentsSection';
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

  const stockContext = useMemo<ComponentsStockContext | undefined>(() => {
    if (!supported || !branchId) return undefined;
    const byComponent = new Map<string, { available: number; onHand: number; reserved: number; isActive: boolean }>();
    for (const c of branchQuery.data?.components ?? []) {
      if (c.productId) byComponent.set(c.productId, { available: c.available, onHand: c.onHand, reserved: c.reserved, isActive: c.isActive });
    }
    return { branchName, byComponent, loading: branchQuery.isLoading };
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
    <ProductComponentsSection
      productId={productId}
      stockMode={stockMode}
      productType={productType ?? undefined}
      noun={productType === 'kit' ? 'kit' : 'paquete'}
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
  );
}
