'use client';

// (1) Información básica — nombre, nombre corto, clave, código de barras,
// marca, unidad y tipo. Cambiar la CLAVE exige confirmación fuerte (es llave
// operativa de POS, sync legacy y cargas masivas). El tipo queda bloqueado en
// kits de inscripción.

import { useCallback, useId, useMemo } from 'react';
import Link from 'next/link';
import { Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { KitPosition, ProductType } from '@/types/product';
import type { AdminUpdateProductDto } from '@/services/products-admin.service';
import { PRODUCT_TYPE_LABEL } from '../../lib/labels';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { SwitchField, TextField } from '../fields';
import { useAsyncConfirm } from '../useAsyncConfirm';
import { textOrNull, toFormText, useSectionForm } from '../useSectionForm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
  shortName: z.string().trim().max(50, 'Máximo 50 caracteres'),
  code: z
    .string()
    .trim()
    .min(1, 'La clave es obligatoria')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/, 'Solo mayúsculas, números, punto, guion y guion bajo'),
  barcode: z.string().trim().max(50, 'Máximo 50 caracteres'),
  brand: z.string().trim().max(100, 'Máximo 100 caracteres'),
  unitId: z
    .string()
    .trim()
    .refine((v) => v === '' || UUID_RE.test(v), 'Debe ser un identificador UUID válido'),
  productType: z.string().min(1, 'Elige un tipo'),
  kitPosition: z.string(),
  kitDeductsInventory: z.boolean(),
});

type BasicValues = z.infer<typeof schema>;

const CREATE_TYPES = ['finished_good', 'pack', 'raw_material', 'virtual', 'service'];

export function BasicSection() {
  const { mode, product, patchProduct } = useProductForm();
  const typeSelectId = useId();
  const positionSelectId = useId();
  const codeConfirm = useAsyncConfirm<{ from: string; to: string }, true>();

  const isEnrollmentKit = product?.isEnrollmentKit === true;
  const currentCode = product?.code ?? '';

  const values = useMemo<BasicValues>(
    () => ({
      name: product?.name ?? '',
      shortName: product?.shortName ?? '',
      code: product?.code ?? '',
      barcode: product?.barcode ?? '',
      brand: mode === 'create' ? 'Tonic Life' : toFormText(product?.brand),
      unitId: product?.unitId ?? '',
      productType: product?.productType ?? 'finished_good',
      kitPosition: product?.kitPosition ?? '',
      kitDeductsInventory: product?.kitDeductsInventory ?? false,
    }),
    [mode, product],
  );

  const requestCodeConfirm = codeConfirm.request;
  const beforeSave = useCallback(
    async ({ values: next, dirty }: { values: BasicValues; dirty: Partial<Record<keyof BasicValues, boolean>> }) => {
      if (!dirty.code || next.code === currentCode) return true as const;
      return requestCodeConfirm({ from: currentCode, to: next.code });
    },
    [currentCode, requestCodeConfirm],
  );

  const section = useSectionForm<BasicValues, true>({
    id: 'basica',
    schema,
    values,
    beforeSave,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.name) dto.name = v.name;
      if (dirty.shortName) dto.shortName = textOrNull(v.shortName);
      if (dirty.code && v.code !== currentCode) {
        dto.code = v.code;
        dto.confirmCodeChange = true;
      }
      if (dirty.barcode) dto.barcode = textOrNull(v.barcode);
      if (dirty.brand) dto.brand = textOrNull(v.brand);
      if (dirty.unitId) dto.unitId = textOrNull(v.unitId);
      if (dirty.productType) dto.productType = v.productType as ProductType;
      if (dirty.kitPosition || dirty.productType) {
        dto.kitPosition = v.productType === 'kit' && v.kitPosition ? (v.kitPosition as KitPosition) : null;
      }
      if (dirty.kitDeductsInventory || dirty.productType) {
        dto.kitDeductsInventory =
          v.productType === 'kit' || v.productType === 'pack' ? v.kitDeductsInventory : false;
      }
      await patchProduct(dto);
    },
    toCreate: (v) => ({
      name: v.name,
      code: v.code,
      shortName: textOrNull(v.shortName) ?? undefined,
      barcode: textOrNull(v.barcode) ?? undefined,
      brand: textOrNull(v.brand) ?? undefined,
      unitId: textOrNull(v.unitId) ?? undefined,
      productType: v.productType as ProductType,
      kitDeductsInventory: v.productType === 'pack' ? v.kitDeductsInventory : false,
    }),
  });

  const { control } = section.form;
  const productType = useWatch({ control, name: 'productType' });

  const typeOptions = useMemo(() => {
    const codes = [...CREATE_TYPES];
    // Kits y promociones se crean en su propio módulo; solo se listan si el producto YA lo es.
    const own = product?.productType;
    if (own && !codes.includes(own)) codes.push(own);
    return codes.map((code) => ({ value: code, label: PRODUCT_TYPE_LABEL[code] ?? code }));
  }, [product?.productType]);

  return (
    <>
      <SectionCard
        title="Información básica"
        description="Datos con los que el producto se identifica en el admin, el POS y la tienda."
        isDirty={section.isDirty}
        isSaving={section.isSaving}
        onSave={() => void section.submit()}
        onDiscard={section.discard}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            control={control}
            name="name"
            label="Nombre del producto"
            required
            maxLength={200}
            className="md:col-span-2"
            placeholder="Ej.: Crema Corporal Spectra 500 ml"
            help={
              mode === 'edit'
                ? 'Cambiar el nombre NO cambia la URL de la tienda; eso se hace en "SEO y URL".'
                : undefined
            }
          />
          <TextField
            control={control}
            name="shortName"
            label="Nombre corto"
            maxLength={50}
            help="Para listados y tickets."
          />
          <TextField
            control={control}
            name="code"
            label="Clave"
            required
            maxLength={50}
            mono
            uppercase
            help={
              mode === 'edit'
                ? 'Llave operativa del POS y del sistema anterior. Cambiarla pide confirmación.'
                : 'Siempre en mayúsculas. Es la llave del producto en POS e inventario.'
            }
          />
          <TextField
            control={control}
            name="barcode"
            label="Código de barras"
            maxLength={50}
            mono
            inputMode="numeric"
            help="Déjalo vacío si el producto no tiene."
          />
          <TextField control={control} name="brand" label="Marca" maxLength={100} />
          <TextField
            control={control}
            name="unitId"
            label="Unidad (identificador)"
            mono
            help="Identificador de la unidad de medida. Déjalo vacío para quitarla."
          />

          <div className="space-y-1.5">
            <Label htmlFor={typeSelectId}>Tipo de producto</Label>
            <Controller
              control={control}
              name="productType"
              render={({ field }) => (
                <SearchableSelect
                  id={typeSelectId}
                  options={typeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  showAllOption={false}
                  disabled={section.readOnly || isEnrollmentKit}
                  className="w-full"
                />
              )}
            />
            <p className="text-xs text-gray-600">
              {isEnrollmentKit ? (
                <>
                  Es un kit de inscripción: el tipo no se cambia aquí. Se administra en{' '}
                  <Link href={`/admin/kits/${product?.id ?? ''}`} className="font-medium text-[#3E667D] underline">
                    Kits
                  </Link>
                  .
                </>
              ) : (
                'La tienda pública solo vende "Producto terminado" y "Paquete".'
              )}
            </p>
          </div>

          {productType === 'kit' ? (
            <div className="space-y-1.5">
              <Label htmlFor={positionSelectId}>Posición del kit (rango)</Label>
              <Controller
                control={control}
                name="kitPosition"
                render={({ field }) => (
                  <SearchableSelect
                    id={positionSelectId}
                    options={[
                      { value: 'basic', label: 'Básico' },
                      { value: 'premium', label: 'Premium' },
                      { value: 'preferred', label: 'Preferente' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    allLabel="Sin posición"
                    disabled={section.readOnly || isEnrollmentKit}
                    className="w-full"
                  />
                )}
              />
            </div>
          ) : null}

          {productType === 'kit' || productType === 'pack' ? (
            <SwitchField
              control={control}
              name="kitDeductsInventory"
              label="Descuenta inventario de sus componentes"
              help='Al venderse se descuenta el stock de cada componente (sección "Componentes"), no el del paquete.'
              className="md:col-span-2"
            />
          ) : null}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!codeConfirm.pending}
        onOpenChange={(open) => {
          if (!open) codeConfirm.settle(false);
        }}
        title="Cambiar la clave del producto"
        description="La clave es la llave del producto en el POS, el inventario, la sincronización con el sistema anterior y las cargas masivas."
        confirmText={codeConfirm.pending?.payload.from}
        confirmLabel="Cambiar clave"
        destructive
        onConfirm={() => codeConfirm.settle(true)}
      >
        <p>
          La clave pasará de <span className="font-mono font-semibold">{codeConfirm.pending?.payload.from}</span> a{' '}
          <span className="font-mono font-semibold">{codeConfirm.pending?.payload.to}</span>. El cambio queda
          registrado en el historial.
        </p>
      </ConfirmDialog>
    </>
  );
}
