'use client';

// (5) SEO y URL.
//  - La URL (slug) está BLOQUEADA por defecto y NUNCA se regenera al editar el
//    nombre. Para cambiarla hay que pulsar "Editar URL"; la anterior sigue
//    funcionando y redirige a la nueva (product_slug_history).
//  - Unicidad en vivo contra /catalog-admin/slug-check (retraso de 400 ms).
//  - Meta título 60 / meta descripción 160 en español e inglés con contador y
//    vista previa tipo buscador.

import { useEffect, useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { CheckCircle2, Loader2, Lock, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { productAdminErrorMessage } from '../../lib/errors';
import { buildProductSlug, isValidSlug } from '../../lib/slug';
import { useDeleteSlugHistory, useSlugCheck, useSlugHistory } from '../../useProductsAdmin';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { TextAreaField, TextField } from '../fields';
import { textOrNull, useSectionForm } from '../useSectionForm';

const META_TITLE_SOFT = 60;
const META_DESCRIPTION_SOFT = 160;

const schema = z.object({
  slug: z
    .string()
    .trim()
    .max(250, 'Máximo 250 caracteres')
    .refine((v) => v === '' || isValidSlug(v), 'Solo minúsculas, números y guiones (sin acentos ni espacios)'),
  metaTitle: z.string().max(200, 'Máximo 200 caracteres'),
  metaDescription: z.string().max(500, 'Máximo 500 caracteres'),
  metaTitleEn: z.string().max(200, 'Máximo 200 caracteres'),
  metaDescriptionEn: z.string().max(500, 'Máximo 500 caracteres'),
});

type SeoValues = z.infer<typeof schema>;

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

function SearchPreview({
  heading,
  path,
  title,
  description,
  lang,
}: {
  heading: string;
  path: string;
  title: string;
  description: string;
  lang: 'es' | 'en';
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3" lang={lang}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{heading}</p>
      <p className="truncate text-xs text-gray-700">{path}</p>
      <p className="truncate text-base text-[#1a0dab]">{truncate(title, META_TITLE_SOFT)} | Tonic Life</p>
      <p className="text-sm text-gray-700">
        {description ? truncate(description, 155) : 'Sin descripción: el buscador elegirá un fragmento de la página.'}
      </p>
    </div>
  );
}

export function SeoSection() {
  const { productId, product, patchProduct } = useProductForm();
  const [slugUnlocked, setSlugUnlocked] = useState(false);
  const [redirectToDelete, setRedirectToDelete] = useState<string | null>(null);
  const history = useSlugHistory(productId, true);
  const deleteRedirect = useDeleteSlugHistory(productId);
  const currentSlug = product?.slug ?? '';

  const values = useMemo<SeoValues>(
    () => ({
      slug: product?.slug ?? '',
      metaTitle: product?.metaTitle ?? '',
      metaDescription: product?.metaDescription ?? '',
      metaTitleEn: product?.metaTitleEn ?? '',
      metaDescriptionEn: product?.metaDescriptionEn ?? '',
    }),
    [product?.slug, product?.metaTitle, product?.metaDescription, product?.metaTitleEn, product?.metaDescriptionEn],
  );

  const section = useSectionForm<SeoValues>({
    id: 'seo',
    schema,
    values,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.slug && v.slug !== '' && v.slug !== currentSlug) dto.slug = v.slug;
      if (dirty.metaTitle) dto.metaTitle = textOrNull(v.metaTitle);
      if (dirty.metaDescription) dto.metaDescription = textOrNull(v.metaDescription);
      if (dirty.metaTitleEn) dto.metaTitleEn = textOrNull(v.metaTitleEn);
      if (dirty.metaDescriptionEn) dto.metaDescriptionEn = textOrNull(v.metaDescriptionEn);
      if (Object.keys(dto).length > 0) await patchProduct(dto);
      setSlugUnlocked(false);
    },
  });

  const { control, setValue } = section.form;
  const watched = useWatch({ control });
  const slugValue = (watched.slug ?? '').trim();
  const debouncedSlug = useDebounced(slugValue, 400);
  const slugChanged = slugValue !== currentSlug;
  const slugSettled = debouncedSlug === slugValue;
  const shouldCheck = slugUnlocked && slugChanged && slugSettled && isValidSlug(debouncedSlug);
  const check = useSlugCheck(debouncedSlug, productId, shouldCheck);

  const slugEmptied = slugChanged && slugValue === '' && currentSlug !== '';
  const slugBlocked =
    slugChanged &&
    (slugEmptied ||
      (slugValue !== '' && (!isValidSlug(slugValue) || !slugSettled || check.isFetching || check.data?.available === false)));

  const regenerated = buildProductSlug(product?.code ?? '', product?.name ?? '');

  const handleDeleteRedirect = async () => {
    if (!redirectToDelete) return;
    try {
      await deleteRedirect.mutateAsync(redirectToDelete);
      toast.success('Redirección eliminada');
      setRedirectToDelete(null);
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo eliminar la redirección'));
    }
  };

  const discard = () => {
    section.discard();
    setSlugUnlocked(false);
  };

  return (
    <>
      <SectionCard
        title="SEO y URL"
        description="Cómo se ve y dónde vive el producto en la tienda y en los buscadores."
        isDirty={section.isDirty}
        isSaving={section.isSaving}
        canSave={!slugBlocked}
        onSave={() => void section.submit()}
        onDiscard={discard}
      >
        <div className="space-y-6">
          {/* ---------- URL ---------- */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextField
                control={control}
                name="slug"
                label="URL del producto"
                mono
                maxLength={250}
                disabled={!slugUnlocked}
                className="flex-1"
                help={`Se publica como /es-mx/productos/${slugValue || '…'}`}
              />
              {!section.readOnly ? (
                slugUnlocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setValue('slug', regenerated, { shouldDirty: true, shouldValidate: true })}
                    disabled={!regenerated || regenerated === slugValue}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                    Regenerar desde clave y nombre
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setSlugUnlocked(true)}>
                    <Lock className="mr-2 h-4 w-4" aria-hidden />
                    Editar URL
                  </Button>
                )
              ) : null}
            </div>

            {slugUnlocked ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
                La URL anterior seguirá funcionando y redirigirá a la nueva. Aun así, cámbiala solo si es
                necesario: los enlaces ya compartidos y los buscadores tardan en actualizarse.
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                La URL no cambia cuando editas el nombre del producto. Convención: clave-nombre.
              </p>
            )}

            <div aria-live="polite" className="min-h-5 text-sm">
              {slugEmptied ? (
                <p className="flex items-center gap-1.5 text-red-700">
                  <XCircle className="h-4 w-4" aria-hidden /> La URL no puede quedar vacía.
                </p>
              ) : shouldCheck && check.isFetching ? (
                <p className="flex items-center gap-1.5 text-gray-700">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Comprobando disponibilidad…
                </p>
              ) : shouldCheck && check.isError ? (
                <p className="text-amber-800">
                  {productAdminErrorMessage(check.error, 'No se pudo comprobar la URL; se validará al guardar.')}
                </p>
              ) : shouldCheck && check.data ? (
                check.data.available ? (
                  <p className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> URL disponible.
                    {check.data.isRedirectOf === productId ? ' Era una URL anterior de este mismo producto.' : ''}
                  </p>
                ) : (
                  <p className="flex flex-wrap items-center gap-1.5 text-red-700">
                    <XCircle className="h-4 w-4" aria-hidden />
                    {check.data.isRedirectOf && check.data.isRedirectOf !== productId
                      ? 'Esa URL es una redirección vigente de otro producto.'
                      : 'Esa URL ya la usa otro producto.'}
                    {check.data.suggestion ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={() =>
                          setValue('slug', check.data?.suggestion ?? '', { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        Usar {check.data.suggestion}
                      </Button>
                    ) : null}
                  </p>
                )
              ) : null}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">URLs anteriores (redirecciones)</h3>
              {history.isLoading ? (
                <p className="text-sm text-gray-600">Cargando…</p>
              ) : history.isError ? (
                <p className="text-sm text-gray-700">No se pudo cargar el historial de URLs.</p>
              ) : (history.data ?? []).length === 0 ? (
                <p className="text-sm text-gray-600">Este producto no ha cambiado de URL.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {(history.data ?? []).map((entry) => (
                    <li key={entry.slug} className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-sm text-gray-900">{entry.slug}</p>
                        <p className="text-xs text-gray-600">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString('es-MX') : 'Fecha desconocida'}
                          {entry.createdByName ? ` · ${entry.createdByName}` : ''}
                        </p>
                      </div>
                      {!section.readOnly ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-700 hover:text-red-800"
                          onClick={() => setRedirectToDelete(entry.slug)}
                        >
                          Eliminar redirección
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ---------- Metadatos ---------- */}
          <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-5 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Español</h3>
              <TextField
                control={control}
                name="metaTitle"
                label="Meta título"
                softMax={META_TITLE_SOFT}
                maxLength={200}
                help="Recomendado: hasta 60 caracteres. Vacío = se usa el nombre del producto."
              />
              <TextAreaField
                control={control}
                name="metaDescription"
                label="Meta descripción"
                softMax={META_DESCRIPTION_SOFT}
                maxLength={500}
                rows={3}
                help="Recomendado: hasta 160 caracteres. Vacío = se usa la descripción."
                lang="es"
              />
              <SearchPreview
                heading="Vista previa en buscadores"
                lang="es"
                path={`/es-mx/productos/${slugValue || '…'}`}
                title={watched.metaTitle?.trim() || product?.name || ''}
                description={watched.metaDescription?.trim() || product?.description || ''}
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Inglés</h3>
              <TextField
                control={control}
                name="metaTitleEn"
                label="Meta título (inglés)"
                softMax={META_TITLE_SOFT}
                maxLength={200}
                help="Vacío = nombre en inglés o, si no hay, el español."
              />
              <TextAreaField
                control={control}
                name="metaDescriptionEn"
                label="Meta descripción (inglés)"
                softMax={META_DESCRIPTION_SOFT}
                maxLength={500}
                rows={3}
                lang="en"
              />
              <SearchPreview
                heading="Vista previa en buscadores"
                lang="en"
                path={`/en-us/productos/${slugValue || '…'}`}
                title={watched.metaTitleEn?.trim() || product?.nameEn || product?.name || ''}
                description={watched.metaDescriptionEn?.trim() || product?.descriptionEn || product?.description || ''}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!redirectToDelete}
        onOpenChange={(open) => {
          if (!open) setRedirectToDelete(null);
        }}
        title="Eliminar redirección"
        description="Los enlaces antiguos con esta URL dejarán de llevar al producto y mostrarán «página no encontrada»."
        confirmLabel="Eliminar redirección"
        destructive
        isPending={deleteRedirect.isPending}
        onConfirm={handleDeleteRedirect}
      >
        <p className="break-all font-mono">{redirectToDelete}</p>
      </ConfirmDialog>
    </>
  );
}
