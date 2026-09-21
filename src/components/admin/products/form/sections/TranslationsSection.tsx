'use client';

// (3) Traducciones al inglés — lado a lado con el español de referencia e
// indicador "{n} de {m} campos traducidos". Un campo vacío en inglés hace que
// la tienda EN muestre el texto en español.

import { useMemo, type ReactNode } from 'react';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { useProductContent, usePutProductContent } from '../../useProductsAdmin';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { TextAreaField, TextField } from '../fields';
import { textOrNull, useSectionForm } from '../useSectionForm';
import {
  CONTENT_FORM_KEYS,
  CONTENT_LIMITS,
  ContentUnavailableNotice,
  contentFieldsSchema,
  contentToForm,
  formToContent,
} from './contentShared';

const schema = z.object({
  nameEn: z.string().max(200, 'Máximo 200 caracteres'),
  shortNameEn: z.string().max(50, 'Máximo 50 caracteres'),
  descriptionEn: z.string().max(2000, 'Máximo 2000 caracteres'),
  longDescriptionEn: z.string().max(10000, 'Máximo 10000 caracteres'),
  ...contentFieldsSchema,
});

type TranslationValues = z.infer<typeof schema>;

function Reference({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3" lang="es">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">{label} · español</p>
      {text ? (
        <p className="whitespace-pre-line break-words text-sm text-gray-800">{text}</p>
      ) : (
        <p className="text-sm text-gray-600">Sin texto en español.</p>
      )}
    </div>
  );
}

function Pair({ reference, children }: { reference: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-gray-100 pb-4 last:border-b-0 md:grid-cols-2">
      {reference}
      <div>{children}</div>
    </div>
  );
}

export function TranslationsSection() {
  const { productId, product, patchProduct, notifyWrite } = useProductForm();
  const contentQuery = useProductContent(productId, true);
  const putContent = usePutProductContent(productId);
  const contentReady = contentQuery.isSuccess;
  const es = useMemo(() => contentToForm(contentQuery.data?.es), [contentQuery.data?.es]);

  const values = useMemo<TranslationValues>(
    () => ({
      nameEn: product?.nameEn ?? '',
      shortNameEn: product?.shortNameEn ?? '',
      descriptionEn: product?.descriptionEn ?? '',
      longDescriptionEn: product?.longDescriptionEn ?? '',
      ...contentToForm(contentQuery.data?.en),
    }),
    [product?.nameEn, product?.shortNameEn, product?.descriptionEn, product?.longDescriptionEn, contentQuery.data?.en],
  );

  const section = useSectionForm<TranslationValues>({
    id: 'traducciones',
    schema,
    values,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.nameEn) dto.nameEn = textOrNull(v.nameEn);
      if (dirty.shortNameEn) dto.shortNameEn = textOrNull(v.shortNameEn);
      if (dirty.descriptionEn) dto.descriptionEn = textOrNull(v.descriptionEn);
      if (dirty.longDescriptionEn) dto.longDescriptionEn = textOrNull(v.longDescriptionEn);
      if (Object.keys(dto).length > 0) await patchProduct(dto);
      if (contentReady && CONTENT_FORM_KEYS.some((k) => dirty[k])) {
        await putContent.mutateAsync({ language: 'en', content: formToContent(v) });
        notifyWrite();
      }
    },
  });

  const { control } = section.form;
  const current = useWatch({ control });

  // Solo cuentan los campos que TIENEN texto en español (lo demás no hay qué traducir).
  const progress = useMemo(() => {
    const pairs: [string, string | undefined][] = [
      [product?.name ?? '', current.nameEn],
      [product?.shortName ?? '', current.shortNameEn],
      [product?.description ?? '', current.descriptionEn],
      [product?.longDescription ?? '', current.longDescriptionEn],
      ...CONTENT_FORM_KEYS.map((k): [string, string | undefined] => [es[k], current[k]]),
    ];
    const translatable = pairs.filter(([source]) => source.trim() !== '');
    const done = translatable.filter(([, target]) => (target ?? '').trim() !== '').length;
    return { done, total: translatable.length };
  }, [current, es, product?.name, product?.shortName, product?.description, product?.longDescription]);

  const richDisabled = !contentReady;

  return (
    <SectionCard
      title="Traducciones (inglés)"
      description="Textos de la tienda en inglés. Si un campo queda vacío, la tienda muestra el español."
      isDirty={section.isDirty}
      isSaving={section.isSaving}
      onSave={() => void section.submit()}
      onDiscard={section.discard}
      actions={
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            progress.total > 0 && progress.done === progress.total
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
          aria-live="polite"
        >
          {progress.done} de {progress.total} campos traducidos
        </span>
      }
    >
      <div className="space-y-4">
        <Pair reference={<Reference label="Nombre" text={product?.name ?? ''} />}>
          <TextField control={control} name="nameEn" label="Nombre (inglés)" maxLength={200} />
        </Pair>
        <Pair reference={<Reference label="Nombre corto" text={product?.shortName ?? ''} />}>
          <TextField control={control} name="shortNameEn" label="Nombre corto (inglés)" maxLength={50} />
        </Pair>
        <Pair reference={<Reference label="Descripción" text={product?.description ?? ''} />}>
          <TextAreaField control={control} name="descriptionEn" label="Descripción (inglés)" softMax={300} rows={3} lang="en" />
        </Pair>
        <Pair reference={<Reference label="Descripción larga" text={product?.longDescription ?? ''} />}>
          <TextAreaField control={control} name="longDescriptionEn" label="Descripción larga (inglés)" rows={6} lang="en" />
        </Pair>

        {contentQuery.isError ? <ContentUnavailableNotice /> : null}

        <Pair reference={<Reference label="Frase destacada" text={es.tagline} />}>
          <TextField
            control={control}
            name="tagline"
            label="Frase destacada (inglés)"
            maxLength={CONTENT_LIMITS.tagline}
            disabled={richDisabled}
          />
        </Pair>
        <Pair reference={<Reference label="Presentación" text={es.presentation} />}>
          <TextField
            control={control}
            name="presentation"
            label="Presentación (inglés)"
            maxLength={CONTENT_LIMITS.presentation}
            disabled={richDisabled}
          />
        </Pair>
        <Pair reference={<Reference label="Beneficios" text={es.benefits} />}>
          <TextAreaField
            control={control}
            name="benefits"
            label="Beneficios (inglés)"
            maxLength={CONTENT_LIMITS.long}
            rows={6}
            disabled={richDisabled}
            help="Uno por línea, en el mismo orden que en español."
            lang="en"
          />
        </Pair>
        <Pair reference={<Reference label="Ingredientes" text={es.ingredients} />}>
          <TextAreaField
            control={control}
            name="ingredients"
            label="Ingredientes (inglés)"
            maxLength={CONTENT_LIMITS.long}
            rows={4}
            disabled={richDisabled}
            lang="en"
          />
        </Pair>
        <Pair reference={<Reference label="Modo de uso" text={es.usageInstructions} />}>
          <TextAreaField
            control={control}
            name="usageInstructions"
            label="Modo de uso (inglés)"
            maxLength={CONTENT_LIMITS.long}
            rows={4}
            disabled={richDisabled}
            lang="en"
          />
        </Pair>
        <Pair reference={<Reference label="Advertencias" text={es.warnings} />}>
          <TextAreaField
            control={control}
            name="warnings"
            label="Advertencias (inglés)"
            maxLength={CONTENT_LIMITS.long}
            rows={3}
            disabled={richDisabled}
            lang="en"
          />
        </Pair>
      </div>
    </SectionCard>
  );
}
