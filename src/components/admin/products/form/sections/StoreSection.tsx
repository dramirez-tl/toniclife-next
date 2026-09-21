'use client';

// (4) Clasificación y tienda — categoría, visibilidad por canal (tienda / POS),
// destacado, orden en tienda y el panel "Dónde se vende" con las razones por
// país cuando el producto NO aparece en la tienda.

import { useId, useMemo } from 'react';
import Link from 'next/link';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCategories } from '@/hooks/useProducts';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { SELLABLE_TYPES, productTypeLabel } from '../../lib/labels';
import { useStorefrontStatus } from '../../useProductsAdmin';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { StorefrontStatusPanel } from '../StorefrontStatusPanel';
import { SwitchField, TextField } from '../fields';
import { useSectionForm } from '../useSectionForm';

const schema = z.object({
  categoryId: z.string(),
  isVisibleEcommerce: z.boolean(),
  availableInPos: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{1,6}$/.test(v), 'Número entero entre 0 y 999999'),
});

type StoreValues = z.infer<typeof schema>;

export function StoreSection() {
  const { mode, productId, product, patchProduct, goToSection } = useProductForm();
  const categorySelectId = useId();
  const { data: categories = [] } = useCategories({ isActive: true });
  const status = useStorefrontStatus(productId, mode === 'edit');

  const values = useMemo<StoreValues>(
    () => ({
      categoryId: product?.categoryId ?? '',
      isVisibleEcommerce: product?.isVisibleEcommerce ?? true,
      availableInPos: product?.availableInPos ?? true,
      isFeatured: product?.isFeatured ?? false,
      sortOrder: String(product?.sortOrder ?? 0),
    }),
    [product?.categoryId, product?.isVisibleEcommerce, product?.availableInPos, product?.isFeatured, product?.sortOrder],
  );

  const section = useSectionForm<StoreValues>({
    id: 'tienda',
    schema,
    values,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.categoryId) dto.categoryId = v.categoryId || null;
      if (dirty.isVisibleEcommerce) dto.isVisibleEcommerce = v.isVisibleEcommerce;
      if (dirty.availableInPos) dto.availableInPos = v.availableInPos;
      if (dirty.isFeatured) dto.isFeatured = v.isFeatured;
      if (dirty.sortOrder) dto.sortOrder = v.sortOrder === '' ? 0 : Number(v.sortOrder);
      await patchProduct(dto);
    },
    toCreate: (v) => ({
      categoryId: v.categoryId || undefined,
      isVisibleEcommerce: v.isVisibleEcommerce,
      availableInPos: v.availableInPos,
      isFeatured: v.isFeatured,
      sortOrder: v.sortOrder === '' ? 0 : Number(v.sortOrder),
    }),
  });

  const { control } = section.form;
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );
  const notSellableType = !!product && !SELLABLE_TYPES.includes(product.productType);

  return (
    <SectionCard
      title="Clasificación y tienda"
      description="En qué categoría vive el producto y en qué canales se ofrece."
      isDirty={section.isDirty}
      isSaving={section.isSaving}
      onSave={() => void section.submit()}
      onDiscard={section.discard}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={categorySelectId}>Categoría</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SearchableSelect
                  id={categorySelectId}
                  options={categoryOptions}
                  value={field.value}
                  onChange={field.onChange}
                  allLabel="Sin categoría"
                  disabled={section.readOnly}
                  className="w-full"
                />
              )}
            />
            <p className="text-xs text-gray-600">
              Las categorías se administran en{' '}
              <Link href="/admin/configuracion/catalogos" className="font-medium text-[#3E667D] underline">
                Configuración · Catálogos
              </Link>
              .
            </p>
          </div>
          <TextField
            control={control}
            name="sortOrder"
            label="Orden en tienda"
            inputMode="numeric"
            help='Menor número = aparece antes en el orden "Destacados".'
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-semibold text-gray-900">Visibilidad por canal</legend>
          <SwitchField
            control={control}
            name="isVisibleEcommerce"
            label="Visible en tienda"
            help={
              notSellableType
                ? `La tienda no vende productos de tipo "${productTypeLabel(product?.productType)}" aunque este interruptor esté encendido.`
                : 'Además debe estar activo, tener URL y precio público vigente en el país.'
            }
          />
          <SwitchField
            control={control}
            name="availableInPos"
            label="Disponible en POS"
            help="El punto de venta lo ofrece en los países donde tenga precio."
          />
          <SwitchField
            control={control}
            name="isFeatured"
            label="Destacado"
            help="Sube al inicio del catálogo y puede aparecer en la portada de la tienda."
          />
        </fieldset>

        {mode === 'edit' ? (
          <div>
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Dónde se vende</h3>
            <p className="mb-3 text-xs text-gray-600">
              Un producto aparece en la tienda de un país cuando está activo, visible en tienda, es producto
              o paquete, tiene URL y precio público vigente en ese país. Refleja lo guardado, no los cambios
              pendientes.
            </p>
            <StorefrontStatusPanel
              entries={status.data}
              isLoading={status.isLoading}
              isError={status.isError}
              onGoToSection={goToSection}
            />
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
