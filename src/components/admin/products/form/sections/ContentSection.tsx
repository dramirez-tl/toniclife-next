'use client';

// (2) Contenido en español — descripciones del producto (tabla products) y
// contenido enriquecido de la ficha pública (tabla product_content, idioma es).

import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { useProductContent, usePutProductContent } from '../../useProductsAdmin';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { TextAreaField, TextField } from '../fields';
import { textOrNull, useSectionForm } from '../useSectionForm';
import {
  BulletPreview,
  CONTENT_FORM_KEYS,
  CONTENT_LIMITS,
  ContentUnavailableNotice,
  contentFieldsSchema,
  contentToForm,
  formToContent,
} from './contentShared';

const schema = z.object({
  description: z.string().max(2000, 'Máximo 2000 caracteres'),
  longDescription: z.string().max(10000, 'Máximo 10000 caracteres'),
  ...contentFieldsSchema,
});

type ContentValues = z.infer<typeof schema>;

export function ContentSection() {
  const { mode, productId, product, patchProduct, notifyWrite } = useProductForm();
  const isEdit = mode === 'edit';
  const contentQuery = useProductContent(productId, isEdit);
  const putContent = usePutProductContent(productId);
  const contentReady = isEdit && contentQuery.isSuccess;

  const values = useMemo<ContentValues>(
    () => ({
      description: product?.description ?? '',
      longDescription: product?.longDescription ?? '',
      ...contentToForm(contentQuery.data?.es),
    }),
    [product?.description, product?.longDescription, contentQuery.data?.es],
  );

  const section = useSectionForm<ContentValues>({
    id: 'contenido',
    schema,
    values,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.description) dto.description = textOrNull(v.description);
      if (dirty.longDescription) dto.longDescription = textOrNull(v.longDescription);
      if (Object.keys(dto).length > 0) await patchProduct(dto);
      if (contentReady && CONTENT_FORM_KEYS.some((k) => dirty[k])) {
        await putContent.mutateAsync({ language: 'es', content: formToContent(v) });
        notifyWrite();
      }
    },
    toCreate: (v) => ({
      description: textOrNull(v.description) ?? undefined,
      longDescription: textOrNull(v.longDescription) ?? undefined,
    }),
  });

  const { control } = section.form;
  const benefits = useWatch({ control, name: 'benefits' });
  const richDisabled = !contentReady;

  return (
    <SectionCard
      title="Contenido (español)"
      description="Lo que lee el cliente en la tienda. Solo texto: sin HTML ni formato."
      isDirty={section.isDirty}
      isSaving={section.isSaving}
      onSave={() => void section.submit()}
      onDiscard={section.discard}
    >
      <div className="space-y-4">
        <TextAreaField
          control={control}
          name="description"
          label="Descripción"
          softMax={300}
          rows={3}
          help="Resumen breve para tarjetas y buscadores. Recomendado: hasta 300 caracteres."
          lang="es"
        />
        <TextAreaField
          control={control}
          name="longDescription"
          label="Descripción larga"
          rows={6}
          help="Texto principal de la ficha en la tienda. Los saltos de línea se respetan."
          lang="es"
        />

        {isEdit ? (
          <>
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Ficha pública</h3>
              <p className="text-xs text-gray-600">
                La tienda solo muestra los apartados que tengan contenido.
              </p>
            </div>
            {contentQuery.isError ? <ContentUnavailableNotice /> : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                control={control}
                name="tagline"
                label="Frase destacada"
                maxLength={CONTENT_LIMITS.tagline}
                disabled={richDisabled}
                help="Una línea bajo el nombre del producto."
              />
              <TextField
                control={control}
                name="presentation"
                label="Presentación"
                maxLength={CONTENT_LIMITS.presentation}
                disabled={richDisabled}
                placeholder="Ej.: 500 ml, 30 cápsulas"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextAreaField
                control={control}
                name="benefits"
                label="Beneficios"
                maxLength={CONTENT_LIMITS.long}
                rows={6}
                disabled={richDisabled}
                help={`Uno por línea, máximo ${CONTENT_LIMITS.bullets}.`}
                lang="es"
              />
              <BulletPreview text={benefits ?? ''} emptyLabel="Escribe un beneficio por línea para ver las viñetas." />
            </div>
            <TextAreaField
              control={control}
              name="ingredients"
              label="Ingredientes"
              maxLength={CONTENT_LIMITS.long}
              rows={4}
              disabled={richDisabled}
              lang="es"
            />
            <TextAreaField
              control={control}
              name="usageInstructions"
              label="Modo de uso"
              maxLength={CONTENT_LIMITS.long}
              rows={4}
              disabled={richDisabled}
              lang="es"
            />
            <TextAreaField
              control={control}
              name="warnings"
              label="Advertencias"
              maxLength={CONTENT_LIMITS.long}
              rows={3}
              disabled={richDisabled}
              help="Se muestran siempre visibles en la ficha de la tienda."
              lang="es"
            />
          </>
        ) : (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Beneficios, ingredientes, modo de uso, traducciones, SEO, imágenes y precios se capturan después
            de crear el producto.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
