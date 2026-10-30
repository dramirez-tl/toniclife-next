'use client';

// (4) Clasificación y tienda — categoría, visibilidad por canal (tienda / POS),
// a quién se vende en línea (products.online_audience, mig 177 — Bloque 2
// "dos tiendas", 28-oct-2026), destacado, orden en tienda, la personalización
// en la tienda (texto que el cliente escribe para estampar: máximo de caracteres
// y etiqueta del campo, mig 179, 30-oct-2026) y el panel "Dónde se vende" con
// las razones por país cuando el producto NO aparece en la tienda.

import { useId, useMemo } from 'react';
import Link from 'next/link';
import { Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCategories } from '@/hooks/useProducts';
import {
  PERSONALIZATION_DEFAULT_LABEL_ES,
  PERSONALIZATION_LABEL_MAX_LENGTH,
  PERSONALIZATION_MAX_LENGTH_LIMIT,
  personalizationCreatePayload,
  personalizationFormValues,
  personalizationMaxLengthError,
  personalizationPatch,
} from '@/lib/product-personalization';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { ONLINE_AUDIENCE_HELP, ONLINE_AUDIENCE_OPTIONS, SELLABLE_TYPES, productTypeLabel } from '../../lib/labels';
import { useStorefrontStatus } from '../../useProductsAdmin';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { StorefrontStatusPanel } from '../StorefrontStatusPanel';
import { FieldFrame, SwitchField, TextField } from '../fields';
import { useSectionForm } from '../useSectionForm';

const schema = z
  .object({
    categoryId: z.string(),
    isVisibleEcommerce: z.boolean(),
    // Mismos valores que products.online_audience (CHECK de la mig 177).
    onlineAudience: z.enum(['none', 'members', 'public']),
    availableInPos: z.boolean(),
    isFeatured: z.boolean(),
    sortOrder: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{1,6}$/.test(v), 'Número entero entre 0 y 999999'),
    // Personalización en la tienda (mig 179). El máximo solo se valida con el
    // interruptor encendido: apagado, el campo está oculto y no debe bloquear.
    personalizationEnabled: z.boolean(),
    personalizationMaxLength: z.string(),
    personalizationLabel: z
      .string()
      .trim()
      .max(PERSONALIZATION_LABEL_MAX_LENGTH, `Máximo ${PERSONALIZATION_LABEL_MAX_LENGTH} caracteres`),
  })
  .superRefine((v, ctx) => {
    const message = v.personalizationEnabled ? personalizationMaxLengthError(v.personalizationMaxLength) : null;
    if (message) ctx.addIssue({ code: 'custom', path: ['personalizationMaxLength'], message });
  });

type StoreValues = z.infer<typeof schema>;

export function StoreSection() {
  const { mode, productId, product, patchProduct, goToSection, hasKitSection } = useProductForm();
  const categorySelectId = useId();
  const audienceSelectId = useId();
  const { data: categories = [] } = useCategories({ isActive: true });
  const status = useStorefrontStatus(productId, mode === 'edit');

  // Audiencia en línea (Bloque 2): los kits de inscripción quedan fuera (siguen
  // por "Inscripción en línea" de la sección Kit); los paquetes SÍ la tienen
  // aunque sus interruptores de canal vivan en la sección Paquete. En el alta
  // solo se oculta cuando se está creando un kit (`?tipo=kit`).
  const showAudience = product ? product.productType !== 'kit' : !hasKitSection;
  // Personalización en la tienda (mig 179): misma regla que la audiencia (nunca
  // en kits de inscripción).
  const showPersonalization = showAudience;

  // Kits y paquetes: "Punto de venta" e "Inscripción en línea" se editan en la
  // sección Kit (un solo formulario por campo); un kit nuevo nace fuera de ambos.
  const savedPersonalization = personalizationFormValues(product);
  const values = useMemo<StoreValues>(
    () => ({
      categoryId: product?.categoryId ?? '',
      isVisibleEcommerce: product?.isVisibleEcommerce ?? !hasKitSection,
      // Default de BD (fail-closed): nada sale al público hasta marcarlo aquí.
      onlineAudience: product?.onlineAudience ?? 'members',
      availableInPos: product?.availableInPos ?? !hasKitSection,
      isFeatured: product?.isFeatured ?? false,
      sortOrder: String(product?.sortOrder ?? 0),
      personalizationEnabled: savedPersonalization.personalizationEnabled,
      personalizationMaxLength: savedPersonalization.personalizationMaxLength,
      personalizationLabel: savedPersonalization.personalizationLabel,
    }),
    [
      product?.categoryId,
      product?.isVisibleEcommerce,
      product?.onlineAudience,
      product?.availableInPos,
      product?.isFeatured,
      product?.sortOrder,
      savedPersonalization.personalizationEnabled,
      savedPersonalization.personalizationMaxLength,
      savedPersonalization.personalizationLabel,
      hasKitSection,
    ],
  );

  const section = useSectionForm<StoreValues>({
    id: 'tienda',
    schema,
    values,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.categoryId) dto.categoryId = v.categoryId || null;
      if (dirty.isVisibleEcommerce && !hasKitSection) dto.isVisibleEcommerce = v.isVisibleEcommerce;
      if (dirty.onlineAudience && showAudience) dto.onlineAudience = v.onlineAudience;
      if (dirty.availableInPos && !hasKitSection) dto.availableInPos = v.availableInPos;
      if (dirty.isFeatured) dto.isFeatured = v.isFeatured;
      if (dirty.sortOrder) dto.sortOrder = v.sortOrder === '' ? 0 : Number(v.sortOrder);
      // Personalización (mig 179): solo las claves cuyo valor efectivo cambió
      // (interruptor apagado = máximo en null; etiqueta vacía = null).
      if (
        showPersonalization &&
        (dirty.personalizationEnabled || dirty.personalizationMaxLength || dirty.personalizationLabel)
      ) {
        Object.assign(dto, personalizationPatch(product, v));
      }
      await patchProduct(dto);
    },
    toCreate: (v) => ({
      categoryId: v.categoryId || undefined,
      ...(hasKitSection ? {} : { isVisibleEcommerce: v.isVisibleEcommerce, availableInPos: v.availableInPos }),
      ...(showAudience ? { onlineAudience: v.onlineAudience } : {}),
      // Solo viaja cuando se enciende: un alta sin personalización no toca la mig 179.
      ...(showPersonalization ? personalizationCreatePayload(v) : {}),
      isFeatured: v.isFeatured,
      sortOrder: v.sortOrder === '' ? 0 : Number(v.sortOrder),
    }),
  });

  const { control } = section.form;
  const personalizationEnabled = useWatch({ control, name: 'personalizationEnabled' });
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
          {hasKitSection ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              El punto de venta y la inscripción en línea de un {product?.productType === 'pack' ? 'paquete' : 'kit'} se
              encienden en la sección{' '}
              <button type="button" className="font-medium text-[#3E667D] underline" onClick={() => goToSection('kit')}>
                {product?.productType === 'pack' ? 'Paquete' : 'Kit'}
              </button>
              .
            </p>
          ) : (
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
          )}
          {showAudience ? (
            <Controller
              control={control}
              name="onlineAudience"
              render={({ field, fieldState }) => (
                <FieldFrame
                  id={audienceSelectId}
                  label="Se vende en línea a"
                  error={fieldState.error?.message}
                  help={
                    notSellableType
                      ? `La tienda no vende productos de tipo "${productTypeLabel(product?.productType)}" aunque se marque una audiencia.`
                      : `${ONLINE_AUDIENCE_HELP[field.value]} Además debe estar activo, visible en tienda, tener URL y precio público vigente en el país.`
                  }
                >
                  <SearchableSelect
                    id={audienceSelectId}
                    options={ONLINE_AUDIENCE_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    showAllOption={false}
                    disabled={section.readOnly}
                    className="w-full"
                    aria-invalid={!!fieldState.error}
                    aria-describedby={fieldState.error ? `${audienceSelectId}-error` : `${audienceSelectId}-help`}
                  />
                </FieldFrame>
              )}
            />
          ) : null}
          {hasKitSection ? null : (
            <SwitchField
              control={control}
              name="availableInPos"
              label="Disponible en POS"
              help="El punto de venta lo ofrece en los países donde tenga precio."
            />
          )}
          <SwitchField
            control={control}
            name="isFeatured"
            label="Destacado"
            help="Sube al inicio del catálogo y puede aparecer en la portada de la tienda."
          />
        </fieldset>

        {showPersonalization ? (
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-semibold text-gray-900">Personalización en la tienda</legend>
            <SwitchField
              control={control}
              name="personalizationEnabled"
              label="El cliente puede escribir un texto (nombre a estampar)"
              help={
                notSellableType
                  ? `La tienda no vende productos de tipo "${productTypeLabel(product?.productType)}": el campo no se mostrará aunque este interruptor esté encendido.`
                  : 'En la ficha de la tienda aparece un campo opcional. El texto llega en el pedido y en Inventario · Entregas a domicilio para que Almacén lo estampe antes de enviar.'
              }
            />
            {personalizationEnabled ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField
                  control={control}
                  name="personalizationMaxLength"
                  label="Máximo de caracteres"
                  required
                  inputMode="numeric"
                  help={`Entero entre 1 y ${PERSONALIZATION_MAX_LENGTH_LIMIT}. Se cuentan caracteres visibles, espacios incluidos.`}
                />
                <TextField
                  control={control}
                  name="personalizationLabel"
                  label="Etiqueta del campo"
                  maxLength={PERSONALIZATION_LABEL_MAX_LENGTH}
                  placeholder={PERSONALIZATION_DEFAULT_LABEL_ES}
                  help={`Vacío = la etiqueta por defecto de la tienda ("${PERSONALIZATION_DEFAULT_LABEL_ES}" en español, "Add your name" en inglés).`}
                />
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {mode === 'edit' ? (
          <div>
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Dónde se vende</h3>
            <p className="mb-3 text-xs text-gray-600">
              Un producto aparece en la tienda de un país cuando está activo, visible en tienda, es producto
              o paquete, tiene URL y precio público vigente en ese país. A quién aparece lo decide
              &quot;Se vende en línea a&quot;. Refleja lo guardado, no los cambios pendientes.
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
