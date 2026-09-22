'use client';

// (10) Inventario — control de existencias y lotes (con confirmación: cambia
// cómo se descuenta el stock en TODAS las sucursales), alertas por defecto
// (mínimo / máximo / punto y cantidad de reorden), propiedades físicas y el
// inventario por sucursal. Todos los numéricos se pueden vaciar (null).

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { TriangleAlert } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useKitAvailability } from '@/hooks/useKitAvailability';
import { resolveStockMode } from '@/lib/kits/kit-availability';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { KitAvailabilityByBranch } from '../../KitAvailabilityByBranch';
import { ProductInventoryByBranch } from '../../ProductInventoryByBranch';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { SwitchField, TextField } from '../fields';
import { numberOrNull, toFormText, useSectionForm } from '../useSectionForm';

const optionalNumber = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), message);

const schema = z
  .object({
    tracksInventory: z.boolean(),
    tracksLots: z.boolean(),
    minStockAlert: optionalNumber('Número mayor o igual a 0'),
    maxStockLevel: optionalNumber('Número mayor o igual a 0'),
    reorderPoint: optionalNumber('Número mayor o igual a 0'),
    reorderQuantity: optionalNumber('Número mayor o igual a 0'),
    weightKg: optionalNumber('Peso no válido'),
    volumeCm3: optionalNumber('Volumen no válido'),
  })
  .refine(
    (v) => v.minStockAlert === '' || v.maxStockLevel === '' || Number(v.maxStockLevel) >= Number(v.minStockAlert),
    { path: ['maxStockLevel'], message: 'El máximo no puede ser menor que el mínimo' },
  );

type InventoryValues = z.infer<typeof schema>;
type ToggleField = 'tracksInventory' | 'tracksLots';

const TOGGLE_INFO: Record<ToggleField, { title: string; on: string; off: string }> = {
  tracksInventory: {
    title: 'Controla inventario',
    on: 'El sistema llevará el conteo de existencias y las ventas descontarán stock automáticamente.',
    off: 'El sistema dejará de rastrear existencias y las ventas no afectarán el stock.',
  },
  tracksLots: {
    title: 'Controla lotes',
    on: 'Cada entrada de inventario pedirá número de lote y fecha de caducidad.',
    off: 'Ya no se podrá rastrear por lote ni por fecha de caducidad. Las entradas existentes conservan sus datos.',
  },
};

export function InventorySection() {
  const { mode, productId, product, patchProduct } = useProductForm();
  const [pendingToggle, setPendingToggle] = useState<{ field: ToggleField; next: boolean } | null>(null);

  const values = useMemo<InventoryValues>(
    () => ({
      tracksInventory: product?.tracksInventory ?? true,
      tracksLots: product?.tracksLots ?? false,
      minStockAlert: toFormText(product?.minStockAlert),
      maxStockLevel: toFormText(product?.maxStockLevel),
      reorderPoint: toFormText(product?.reorderPoint),
      reorderQuantity: toFormText(product?.reorderQuantity),
      weightKg: toFormText(product?.weightKg),
      volumeCm3: toFormText(product?.volumeCm3),
    }),
    [
      product?.tracksInventory,
      product?.tracksLots,
      product?.minStockAlert,
      product?.maxStockLevel,
      product?.reorderPoint,
      product?.reorderQuantity,
      product?.weightKg,
      product?.volumeCm3,
    ],
  );

  const section = useSectionForm<InventoryValues>({
    id: 'inventario',
    schema,
    values,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.tracksInventory) dto.tracksInventory = v.tracksInventory;
      if (dirty.tracksLots) dto.tracksLots = v.tracksLots;
      if (dirty.minStockAlert) dto.minStockAlert = numberOrNull(v.minStockAlert);
      if (dirty.maxStockLevel) dto.maxStockLevel = numberOrNull(v.maxStockLevel);
      if (dirty.reorderPoint) dto.reorderPoint = numberOrNull(v.reorderPoint);
      if (dirty.reorderQuantity) dto.reorderQuantity = numberOrNull(v.reorderQuantity);
      if (dirty.weightKg) dto.weightKg = numberOrNull(v.weightKg);
      if (dirty.volumeCm3) dto.volumeCm3 = numberOrNull(v.volumeCm3);
      await patchProduct(dto);
    },
    toCreate: (v) => ({
      tracksInventory: v.tracksInventory,
      tracksLots: v.tracksLots,
      minStockAlert: numberOrNull(v.minStockAlert) ?? undefined,
      maxStockLevel: numberOrNull(v.maxStockLevel) ?? undefined,
      reorderPoint: numberOrNull(v.reorderPoint) ?? undefined,
      reorderQuantity: numberOrNull(v.reorderQuantity) ?? undefined,
      weightKg: numberOrNull(v.weightKg) ?? undefined,
      volumeCm3: numberOrNull(v.volumeCm3) ?? undefined,
    }),
  });

  const { control, setValue } = section.form;

  // Kits y paquetes: la existencia que cuenta depende de cómo se surten. Un kit
  // que SE ARMA no tiene existencia propia (el POS la ignora): en su lugar se
  // muestra la disponibilidad por sucursal (contrato kits §5.2). Si el servidor
  // aún no la calcula (404) se vuelve a la tabla de existencias con un aviso.
  const kitStockMode = mode === 'edit' && product ? resolveStockMode(product) : null;
  const isAssembledKit = kitStockMode === 'assemble_on_sale';
  const availabilityProbe = useKitAvailability(productId, undefined, isAssembledKit);
  const availabilityMissing = isAssembledKit && availabilityProbe.data === null;
  const showOwnStock = mode === 'edit' && !!product && (!isAssembledKit || availabilityMissing);

  // En la ficha, encender/apagar pide confirmación; en el alta no hay nada que proteger aún.
  const guardToggle = (field: ToggleField) => (next: boolean) => {
    if (mode === 'create') return true;
    setPendingToggle({ field, next });
    return false;
  };

  const info = pendingToggle ? TOGGLE_INFO[pendingToggle.field] : null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Inventario"
        description="Valores por defecto del producto; cada sucursal puede ajustar los suyos abajo."
        isDirty={section.isDirty}
        isSaving={section.isSaving}
        onSave={() => void section.submit()}
        onDiscard={section.discard}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SwitchField
              control={control}
              name="tracksInventory"
              label="Controla inventario"
              help="Apágalo solo en servicios o productos virtuales."
              onBeforeChange={guardToggle('tracksInventory')}
            />
            <SwitchField
              control={control}
              name="tracksLots"
              label="Controla lotes"
              help="Trazabilidad por lote y caducidad en cada entrada."
              onBeforeChange={guardToggle('tracksLots')}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Alertas y reorden (por defecto)</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField control={control} name="minStockAlert" label="Stock mínimo" type="number" inputMode="decimal" step="0.01" help="Vacío = sin alerta." />
              <TextField control={control} name="maxStockLevel" label="Stock máximo" type="number" inputMode="decimal" step="0.01" />
              <TextField control={control} name="reorderPoint" label="Punto de reorden" type="number" inputMode="decimal" step="0.01" />
              <TextField control={control} name="reorderQuantity" label="Cantidad de reorden" type="number" inputMode="decimal" step="0.01" />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Propiedades físicas</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={control} name="weightKg" label="Peso (kg)" type="number" inputMode="decimal" step="0.001" />
              <TextField control={control} name="volumeCm3" label="Volumen (cm³)" type="number" inputMode="decimal" step="0.01" />
            </div>
          </fieldset>
        </div>
      </SectionCard>

      {mode === 'edit' && product && kitStockMode ? (
        // Prearmado: la tabla por sucursal es la de existencias propias de
        // abajo (una sola); aquí solo el resumen y el aviso "sin respaldo".
        <KitAvailabilityByBranch
          productId={productId}
          productCode={product.code}
          stockMode={kitStockMode}
          showBranchTable={isAssembledKit}
        />
      ) : null}

      {availabilityMissing && product ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>{product.code} se arma al vender:</strong> la existencia propia de abajo NO cuenta para venderlo; el POS
            solo mira sus componentes. Se muestra mientras el servidor no calcule la disponibilidad por sucursal.
          </p>
        </div>
      ) : null}

      {showOwnStock && product ? (
        <ProductInventoryByBranch
          productId={productId}
          defaults={{
            minStockAlert: Number(product.minStockAlert) || 0,
            maxStockLevel: Number(product.maxStockLevel) || 0,
            reorderPoint: Number(product.reorderPoint) || 0,
            reorderQuantity: Number(product.reorderQuantity) || 0,
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
        title={`${pendingToggle?.next ? 'Activar' : 'Desactivar'}: ${info?.title ?? ''}`}
        description="Afecta cómo se gestionan las existencias de este producto en todas las sucursales. El cambio se aplica al guardar la sección."
        confirmLabel={pendingToggle?.next ? 'Sí, activar' : 'Sí, desactivar'}
        destructive={pendingToggle?.next === false}
        onConfirm={() => {
          if (pendingToggle) {
            setValue(pendingToggle.field, pendingToggle.next, { shouldDirty: true, shouldValidate: true });
          }
          setPendingToggle(null);
        }}
      >
        <p>{pendingToggle?.next ? info?.on : info?.off}</p>
      </ConfirmDialog>
    </div>
  );
}
