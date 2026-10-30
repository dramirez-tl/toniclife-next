'use client';

// (6) Variantes (ropa, mig 178, 30-oct-2026): a qué FAMILIA pertenece el
// producto y qué variante es (para quién, color con muestra y talla); abajo,
// las variantes hermanas de la familia. Cada talla sigue siendo un producto con
// su clave, su precio y su existencia: aquí solo se agrupan para que la tienda
// arme los selectores de género/color/talla y muestre la guía de tallas.
// Solo en la ficha (no en el alta) y nunca en kits de inscripción
// (hasVariantsSection). Guarda SOLO los campos tocados; `null` vacía.

import { useId, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Shirt, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  OTHER_SIZE_OPTION,
  SIZE_PRESETS,
  VARIANT_GENDER_OPTIONS,
  guideHasMeasures,
  isMigrationPendingError,
  normalizeColorHex,
  sizeFromSelect,
  sizeSelectState,
  variantGenderLabel,
} from '@/lib/product-families';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { isProductOnlineAudience } from '@/types/product';
import type { FamilyVariant } from '@/types/product-family';
import { FamilyDialog } from '../../families/FamilyDialog';
import { productAdminErrorMessage } from '../../lib/errors';
import { ONLINE_AUDIENCE_LABEL } from '../../lib/labels';
import {
  useFamilyVariants,
  useInvalidateProductFamilies,
  useProductFamilies,
  useSizeGuides,
} from '../../useProductFamilies';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { FieldFrame, TextField } from '../fields';
import { textOrNull, useSectionForm } from '../useSectionForm';

const schema = z
  .object({
    familyId: z.string(),
    // Mismos valores que products.variant_gender (CHECK de la mig 178); '' = sin indicar.
    variantGender: z.enum(['', 'mujer', 'hombre', 'unisex']),
    variantColor: z.string().trim().max(60, 'Máximo 60 caracteres'),
    variantColorHex: z
      .string()
      .trim()
      .refine((v) => v === '' || normalizeColorHex(v) !== null, 'Usa el formato #RRGGBB'),
    sizePreset: z.string(),
    sizeOther: z
      .string()
      .trim()
      .max(20, 'Máximo 20 caracteres')
      .refine((v) => !/\s/.test(v), 'Sin espacios'),
  })
  .refine((v) => v.sizePreset !== OTHER_SIZE_OPTION || v.sizeOther !== '', {
    path: ['sizeOther'],
    message: 'Escribe la talla',
  });

type VariantValues = z.infer<typeof schema>;

const SIZE_OPTIONS = [
  ...SIZE_PRESETS.map((s) => ({ value: s, label: s })),
  { value: OTHER_SIZE_OPTION, label: 'Otra…' },
];

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

const ROW_CLASS = 'border-b border-border transition-colors hover:bg-muted/50';
const CURRENT_ROW_CLASS = 'border-b border-border bg-[#C8DDF2]/30';

export function VariantsSection() {
  const { productId, product, patchProduct } = useProductForm();
  const familySelectId = useId();
  const genderSelectId = useId();
  const hexId = useId();
  const sizeSelectId = useId();
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const invalidateFamilies = useInvalidateProductFamilies();

  const savedFamilyId = product?.familyId ?? '';
  const sizeState = sizeSelectState(product?.variantSize);
  const values = useMemo<VariantValues>(
    () => ({
      familyId: savedFamilyId,
      variantGender: product?.variantGender ?? '',
      variantColor: product?.variantColor ?? '',
      variantColorHex: product?.variantColorHex ?? '',
      sizePreset: sizeState.preset,
      sizeOther: sizeState.other,
    }),
    [
      savedFamilyId,
      product?.variantGender,
      product?.variantColor,
      product?.variantColorHex,
      sizeState.preset,
      sizeState.other,
    ],
  );

  const section = useSectionForm<VariantValues>({
    id: 'variantes',
    schema,
    values,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.familyId) dto.familyId = v.familyId || null;
      if (dirty.variantGender) dto.variantGender = v.variantGender === '' ? null : v.variantGender;
      if (dirty.variantColor) dto.variantColor = textOrNull(v.variantColor);
      if (dirty.variantColorHex) dto.variantColorHex = normalizeColorHex(v.variantColorHex);
      if (dirty.sizePreset || dirty.sizeOther) {
        dto.variantSize = sizeFromSelect({ preset: v.sizePreset, other: v.sizeOther });
      }
      await patchProduct(dto);
      // Hermanas y contadores de la familia (de la anterior y de la nueva).
      invalidateFamilies();
    },
  });

  const { control, setValue } = section.form;
  const familyId = useWatch({ control, name: 'familyId' });
  const sizePreset = useWatch({ control, name: 'sizePreset' });

  // Familias activas + la del producto aunque esté inactiva (no desaparece del selector).
  const familiesQuery = useProductFamilies({ includeInactive: true });
  const guidesQuery = useSizeGuides({ includeInactive: true });
  const variantsQuery = useFamilyVariants(familyId || null);
  const migrationPending = familiesQuery.isError && isMigrationPendingError(familiesQuery.error);

  const familyOptions = useMemo(
    () =>
      (familiesQuery.data ?? [])
        .filter((f) => f.isActive || f.id === familyId || f.id === savedFamilyId)
        .map((f) => ({
          value: f.id,
          label: f.isActive ? f.name : `${f.name} (inactiva)`,
          hint: `${f.code} · ${f.sizeGuideName ? `Guía: ${f.sizeGuideName}` : 'Sin guía de tallas'}`,
        })),
    [familiesQuery.data, familyId, savedFamilyId],
  );
  const selectedFamily = useMemo(
    () => (familiesQuery.data ?? []).find((f) => f.id === familyId) ?? null,
    [familiesQuery.data, familyId],
  );
  const selectedGuide = useMemo(
    () =>
      selectedFamily?.sizeGuideId
        ? ((guidesQuery.data ?? []).find((g) => g.id === selectedFamily.sizeGuideId) ?? null)
        : null,
    [guidesQuery.data, selectedFamily],
  );
  const guideWithoutMeasures = !!selectedGuide && !guideHasMeasures(selectedGuide);
  const familyChanged = familyId !== savedFamilyId;

  const columns: DataTableColumn<FamilyVariant>[] = [
    {
      key: 'code',
      header: 'Clave',
      render: (v) =>
        v.id === productId ? (
          <span className="font-mono font-semibold text-gray-900">{v.code}</span>
        ) : (
          <Link
            href={`/admin/productos/${v.id}/editar?seccion=variantes`}
            className="font-mono font-medium text-[#3E667D] underline-offset-2 hover:underline"
          >
            {v.code}
          </Link>
        ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (v) => (
        // Ancho acotado: el nombre se recorta (title completo) y las demás columnas quedan a la vista.
        <div className="flex max-w-[22rem] items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-gray-100">
            {v.imageUrl ? (
              <Image src={v.imageUrl} alt="" fill sizes="32px" className="object-cover" />
            ) : (
              <Shirt className="absolute inset-0 m-auto h-4 w-4 text-gray-500" aria-hidden />
            )}
          </div>
          <span className="min-w-0 truncate" title={v.name}>
            {v.name}
          </span>
          {v.id === productId ? <Badge variant="info">Este producto</Badge> : null}
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Para quién',
      render: (v) => variantGenderLabel(v.variantGender) || <span className="text-gray-500">-</span>,
    },
    {
      key: 'color',
      header: 'Color',
      render: (v) =>
        v.variantColor || v.variantColorHex ? (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span
              aria-hidden
              className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
              style={{ backgroundColor: normalizeColorHex(v.variantColorHex) ?? 'transparent' }}
            />
            {v.variantColor ?? v.variantColorHex}
          </span>
        ) : (
          <span className="text-gray-500">-</span>
        ),
    },
    {
      key: 'size',
      header: 'Talla',
      render: (v) => (v.variantSize ? <span className="font-mono">{v.variantSize}</span> : <span className="text-gray-500">-</span>),
    },
    {
      key: 'stock',
      header: 'Existencia',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (v) => <span className="tabular-nums">{formatNumber(v.stockTotal)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (v) => <Badge variant={v.isActive ? 'success' : 'secondary'}>{v.isActive ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'audience',
      header: 'En línea',
      render: (v) => (
        <span className="text-sm text-gray-700">
          {isProductOnlineAudience(v.onlineAudience) ? ONLINE_AUDIENCE_LABEL[v.onlineAudience] : v.onlineAudience}
        </span>
      ),
    },
  ];

  return (
    <>
      <SectionCard
        title="Variantes"
        description="A qué familia pertenece y qué variante es. Cada talla sigue siendo un producto con su clave, precio y existencia; la tienda agrupa a las hermanas en selectores de género, color y talla."
        isDirty={section.isDirty}
        isSaving={section.isSaving}
        onSave={() => void section.submit()}
        onDiscard={section.discard}
      >
        <div className="space-y-5">
          {migrationPending ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                {productAdminErrorMessage(familiesQuery.error, 'Falta aplicar la migración 178 en la base de datos.')}{' '}
                Mientras tanto no se pueden asignar familias ni variantes.
              </p>
            </div>
          ) : null}

          <Controller
            control={control}
            name="familyId"
            render={({ field }) => (
              <FieldFrame
                id={familySelectId}
                label="Familia"
                help={
                  selectedFamily
                    ? selectedFamily.sizeGuideName
                      ? `Guía de tallas de la familia: ${selectedFamily.sizeGuideName}.`
                      : 'Esta familia no tiene guía de tallas; se le asigna en Familias y tallas.'
                    : 'Agrupa este producto con sus hermanas de otras tallas y colores; la tienda arma los selectores con ellas.'
                }
              >
                {/* El selector cede espacio al botón (min-w-0 + flex-1): sin esto el botón se salía de la tarjeta. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <SearchableSelect
                      id={familySelectId}
                      options={familyOptions}
                      value={field.value}
                      onChange={field.onChange}
                      allLabel="Sin familia"
                      placeholder="Buscar familia…"
                      disabled={section.readOnly || migrationPending}
                      className="w-full"
                    />
                  </div>
                  {section.readOnly ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setFamilyDialogOpen(true)}
                      disabled={migrationPending}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Nueva familia…
                    </Button>
                  )}
                </div>
              </FieldFrame>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller
              control={control}
              name="variantGender"
              render={({ field }) => (
                <FieldFrame id={genderSelectId} label="Para quién" help="Mujer, hombre o unisex; vacío si no aplica.">
                  <SearchableSelect
                    id={genderSelectId}
                    options={VARIANT_GENDER_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    allLabel="Sin indicar"
                    disabled={section.readOnly}
                    className="w-full"
                  />
                </FieldFrame>
              )}
            />
            <TextField
              control={control}
              name="variantColor"
              label="Color"
              maxLength={60}
              placeholder="Rosa pastel"
              help="Nombre del color tal como lo verá el cliente."
            />
            <Controller
              control={control}
              name="variantColorHex"
              render={({ field, fieldState }) => {
                const normalized = normalizeColorHex(field.value);
                const error = fieldState.error?.message;
                return (
                  <FieldFrame
                    id={hexId}
                    label="Muestra de color"
                    error={error}
                    help="Color aproximado para el selector de la tienda (#RRGGBB). Vacío si no aplica."
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="color"
                        aria-label="Elegir la muestra de color"
                        value={normalized ?? '#FFFFFF'}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        disabled={section.readOnly}
                        className="h-9 w-11 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <Input
                        id={hexId}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={() => {
                          field.onBlur();
                          const clean = normalizeColorHex(field.value);
                          if (clean && clean !== field.value) field.onChange(clean);
                        }}
                        maxLength={7}
                        placeholder="#F8C8DC"
                        className="w-32 font-mono"
                        autoComplete="off"
                        disabled={section.readOnly}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${hexId}-error` : `${hexId}-help`}
                      />
                      {normalized ? (
                        section.readOnly ? null : (
                          <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange('')}>
                            Quitar
                          </Button>
                        )
                      ) : (
                        <span className="text-xs text-gray-500">Sin muestra</span>
                      )}
                    </div>
                  </FieldFrame>
                );
              }}
            />
            <div className="space-y-4">
              <Controller
                control={control}
                name="sizePreset"
                render={({ field }) => (
                  <FieldFrame id={sizeSelectId} label="Talla" help="Se guarda en mayúsculas y sin espacios (CH, M, G, XL, 28…).">
                    <SearchableSelect
                      id={sizeSelectId}
                      options={SIZE_OPTIONS}
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        if (v !== OTHER_SIZE_OPTION) setValue('sizeOther', '', { shouldDirty: true, shouldValidate: true });
                      }}
                      allLabel="Sin talla"
                      disabled={section.readOnly}
                      className="w-full"
                    />
                  </FieldFrame>
                )}
              />
              {sizePreset === OTHER_SIZE_OPTION ? (
                <TextField
                  control={control}
                  name="sizeOther"
                  label="Otra talla"
                  required
                  maxLength={20}
                  mono
                  uppercase
                  placeholder="28, 30, UNITALLA…"
                />
              ) : null}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Variantes de la familia{selectedFamily ? `: ${selectedFamily.name}` : ''}
                </h3>
                <p className="text-xs text-gray-600">
                  Hermanas con las que la tienda arma los selectores. La clave abre su ficha en esta misma sección.
                </p>
              </div>
              <Link href="/admin/productos/familias" className="text-xs font-medium text-[#3E667D] underline">
                Familias y tallas
              </Link>
            </div>

            {familyChanged ? (
              <p className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900" role="status">
                {familyId
                  ? 'Se muestra la familia elegida; este producto se unirá a ella al guardar la sección.'
                  : 'Al guardar la sección, el producto dejará de pertenecer a su familia.'}
              </p>
            ) : null}

            {guideWithoutMeasures && selectedGuide ? (
              <p className="mb-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  La guía de tallas {selectedGuide.name} no tiene medidas; cárgalas en{' '}
                  <Link href="/admin/productos/familias?tab=guias" className="font-medium underline">
                    Familias y tallas
                  </Link>
                  .
                </span>
              </p>
            ) : null}

            {!familyId ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-600">
                Elige una familia para ver sus variantes.
              </p>
            ) : variantsQuery.isError ? (
              <p className="text-sm text-red-700" role="alert">
                {productAdminErrorMessage(variantsQuery.error, 'No se pudieron cargar las variantes de la familia.')}
              </p>
            ) : (
              <DataTable
                columns={columns}
                data={variantsQuery.data ?? []}
                isLoading={variantsQuery.isLoading}
                getRowKey={(v) => v.id}
                minWidthClassName="min-w-[860px]"
                emptyMessage="La familia todavía no tiene variantes."
                rowClassName={(v) => (v.id === productId ? CURRENT_ROW_CLASS : ROW_CLASS)}
              />
            )}
          </div>
        </div>
      </SectionCard>

      <FamilyDialog
        open={familyDialogOpen}
        onOpenChange={setFamilyDialogOpen}
        compact
        onSaved={(family) => setValue('familyId', family.id, { shouldDirty: true, shouldValidate: true })}
      />
    </>
  );
}
