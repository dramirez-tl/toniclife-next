'use client';

// (9) Componentes — kits y paquetes usan el compositor compartido; las
// promociones se componen (global o por país) en su propio módulo.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ProductComponentsSection, type ComponentsSectionController } from '../../ProductComponentsSection';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';

export function ComponentsSection() {
  const { productId, product, readOnly, notifyWrite, registerSection, setSectionDirty } = useProductForm();
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

  return (
    <ProductComponentsSection
      productId={productId}
      deductsInventory={product?.kitDeductsInventory ?? false}
      noun={product?.productType === 'kit' ? 'kit' : 'paquete'}
      readOnly={readOnly}
      controller={controller}
      onSaved={notifyWrite}
    />
  );
}
