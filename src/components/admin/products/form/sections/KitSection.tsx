'use client';

// (2) Kit — el editor único del kit/paquete dentro de la ficha (contrato de
// kits §5.2, sustituye a /admin/kits/[id]):
//   1. ¿Cómo se surte? (Se arma al vender / Prearmado) con confirmación; al
//      409 KIT_MODE_HAS_OWN_STOCK ofrece "Vaciar existencia propia" y reintenta.
//   2. Inscripción (solo kit): es kit de inscripción + posición.
//   3. Dónde se ofrece: POS, inscripción en línea, genera comisión.
//   4. Vigencia: la del precio (liga a Precios).
//   5. Bono de inscripción (KitBonusesSection).
//   6. Listo para vender (KitReadinessPanel).
// Guarda con el PATCH de producto de la ficha (expectedUpdatedAt / PRD_STALE).
// Editable con products:kits_manage O products:update; sin ninguno, lectura.

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useInvalidateKitAdmin, useKitReadiness } from '@/hooks/useKitAdmin';
import { STOCK_MODE_HELP, STOCK_MODE_LABEL, resolveStockMode, type KitStockMode } from '@/lib/kits/kit-availability';
import { modeChangeConsequence, ownStockFromDetails, type OwnStockSummary } from '@/lib/kits/kit-editor';
import { patchWarnings, type AdminUpdateProductDto } from '@/services/products-admin.service';
import type { KitPosition } from '@/types/product';
import { KitBonusesSection } from '../../KitBonusesSection';
import { KitClearOwnStockDialog } from '../../KitClearOwnStockDialog';
import { KitConfirmDialog } from '../../KitConfirmDialog';
import { parseProductAdminError } from '../../lib/errors';
import { useProductPermissions } from '../../lib/permissions';
import { KitReadinessPanel } from '../KitReadinessPanel';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { SwitchField } from '../fields';
import { useAsyncConfirm } from '../useAsyncConfirm';
import { useSectionForm } from '../useSectionForm';

const STOCK_MODES: KitStockMode[] = ['assemble_on_sale', 'prebuilt'];

const POSITION_OPTIONS = [
  { value: 'basic', label: 'Básico' },
  { value: 'premium', label: 'Premium' },
  { value: 'preferred', label: 'Preferente' },
];

const schema = z
  .object({
    kitStockMode: z.enum(['assemble_on_sale', 'prebuilt']),
    isEnrollmentKit: z.boolean(),
    kitPosition: z.string(),
    availableInPos: z.boolean(),
    isVisibleEcommerce: z.boolean(),
    qualifiesForCommission: z.boolean(),
  })
  .refine((v) => !v.isEnrollmentKit || v.kitPosition !== '', {
    path: ['kitPosition'],
    message: 'Un kit de inscripción necesita posición (básico, premium o preferente).',
  });

type KitValues = z.infer<typeof schema>;

export function KitSection() {
  const { mode, productId, product, readOnly, createType, patchProduct, goToSection, requestToggleActive } = useProductForm();
  const permissions = useProductPermissions();
  const modeGroupId = useId();
  const positionId = useId();
  const isEdit = mode === 'edit';
  const productType = isEdit ? (product?.productType ?? 'kit') : (createType ?? 'kit');
  const isKit = productType === 'kit';
  const noun = isKit ? 'kit' : 'paquete';

  const readiness = useKitReadiness(productId, isEdit);
  const invalidateKitAdmin = useInvalidateKitAdmin(productId);

  // Sin products:kits_manage ni products:update los campos sensibles son de lectura.
  const locked = readOnly || !permissions.canManageKits;

  const values = useMemo<KitValues>(
    () => ({
      kitStockMode: (isEdit && product ? resolveStockMode(product) : null) ?? 'assemble_on_sale',
      isEnrollmentKit: isEdit ? (product?.isEnrollmentKit ?? false) : isKit,
      kitPosition: product?.kitPosition ?? '',
      availableInPos: product?.availableInPos ?? false,
      isVisibleEcommerce: product?.isVisibleEcommerce ?? false,
      qualifiesForCommission: product?.qualifiesForCommission ?? true,
    }),
    [isEdit, isKit, product],
  );

  // ---------- Confirmaciones ----------
  const modeConfirm = useAsyncConfirm<{ to: KitStockMode }, true>();
  const skipModeConfirm = useRef(false);
  const [enrollmentConfirm, setEnrollmentConfirm] = useState(false);
  const [ownStockConflict, setOwnStockConflict] = useState<OwnStockSummary | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const requestModeConfirm = modeConfirm.request;
  const beforeSave = useCallback(
    async ({ values: next, dirty }: { values: KitValues; dirty: Partial<Record<keyof KitValues, boolean>> }) => {
      if (!dirty.kitStockMode || skipModeConfirm.current) {
        skipModeConfirm.current = false;
        return true as const;
      }
      return requestModeConfirm({ to: next.kitStockMode });
    },
    [requestModeConfirm],
  );

  const section = useSectionForm<KitValues, true>({
    id: 'kit',
    schema,
    values,
    beforeSave,
    save: async ({ values: v, dirty }) => {
      const dto: AdminUpdateProductDto = {};
      if (dirty.kitStockMode) dto.kitStockMode = v.kitStockMode;
      if (isKit && dirty.isEnrollmentKit) dto.isEnrollmentKit = v.isEnrollmentKit;
      if (isKit && (dirty.kitPosition || dirty.isEnrollmentKit)) {
        dto.kitPosition = v.kitPosition ? (v.kitPosition as KitPosition) : null;
      }
      if (dirty.availableInPos) dto.availableInPos = v.availableInPos;
      if (dirty.isVisibleEcommerce) dto.isVisibleEcommerce = v.isVisibleEcommerce;
      if (dirty.qualifiesForCommission) dto.qualifiesForCommission = v.qualifiesForCommission;
      try {
        const updated = await patchProduct(dto);
        for (const warning of patchWarnings(updated)) toast.warning(warning);
        invalidateKitAdmin();
      } catch (err) {
        const body = parseProductAdminError(err);
        if (body.code === 'KIT_MODE_HAS_OWN_STOCK') {
          setOwnStockConflict(ownStockFromDetails(body.details) ?? readiness.data?.ownStock ?? { rows: 0, units: 0 });
        }
        throw err;
      }
    },
    toCreate: (v) => ({
      kitStockMode: v.kitStockMode,
      ...(isKit
        ? { isEnrollmentKit: v.isEnrollmentKit, kitPosition: v.kitPosition ? (v.kitPosition as KitPosition) : undefined }
        : {}),
      availableInPos: v.availableInPos,
      isVisibleEcommerce: v.isVisibleEcommerce,
      qualifiesForCommission: v.qualifiesForCommission,
    }),
    successMessage: `Kit: cambios guardados`,
  });

  const { control, setValue } = section.form;
  const isEnrollmentKit = useWatch({ control, name: 'isEnrollmentKit' });
  const stockMode = useWatch({ control, name: 'kitStockMode' });

  // Tras vaciar la existencia propia se reintenta el guardado sin volver a preguntar.
  const retryAfterClear = () => {
    setOwnStockConflict(null);
    skipModeConfirm.current = true;
    void section.submit();
  };

  const guardEnrollment = (next: boolean) => {
    if (!next || mode === 'create') return true;
    setEnrollmentConfirm(true);
    return false;
  };

  const currentMode = isEdit && product ? resolveStockMode(product) : null;
  const ownStock = readiness.data?.ownStock ?? null;

  return (
    <>
      <SectionCard
        title={isKit ? 'Kit' : 'Paquete'}
        description={
          isKit
            ? 'Cómo se surte, si inscribe distribuidores, dónde se ofrece, su bono y si ya está listo para vender.'
            : 'Cómo se surte, dónde se ofrece y si ya está listo para vender.'
        }
        isDirty={section.isDirty}
        isSaving={section.isSaving}
        onSave={() => void section.submit()}
        onDiscard={section.discard}
      >
        <div className="space-y-8">
          {locked && !readOnly ? (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">
              Cómo se surte, la inscripción y la posición del kit requieren el permiso products:kits_manage. Puedes verlos, no cambiarlos.
            </p>
          ) : null}

          {/* 1. ¿Cómo se surte? */}
          <fieldset>
            <legend id={modeGroupId} className="mb-2 text-sm font-semibold text-gray-900">
              ¿Cómo se surte este {noun}?
            </legend>
            <Controller
              control={control}
              name="kitStockMode"
              render={({ field }) => (
                <RadioGroup
                  aria-labelledby={modeGroupId}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as KitStockMode)}
                  disabled={locked}
                  className="gap-2"
                >
                  {STOCK_MODES.map((m) => {
                    const id = `${modeGroupId}-${m}`;
                    return (
                      <label
                        key={m}
                        htmlFor={id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                          field.value === m ? 'border-[#3E667D] bg-[#3E667D]/5' : 'border-gray-200'
                        } ${locked ? 'cursor-default opacity-80' : ''}`}
                      >
                        <RadioGroupItem id={id} value={m} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">{STOCK_MODE_LABEL[m]}</span>
                          <span className="block text-xs text-gray-600">{STOCK_MODE_HELP[m]}</span>
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              )}
            />
            {isEdit && currentMode === 'assemble_on_sale' && ownStock && ownStock.units > 0 ? (
              <p className="mt-2 text-xs text-amber-800">
                Tiene {ownStock.units} piezas propias en {ownStock.rows} sucursales que ninguna venta usa (existencia fantasma).{' '}
                {!locked ? (
                  <button type="button" className="font-medium underline" onClick={() => setClearOpen(true)}>
                    Vaciar existencia propia
                  </button>
                ) : null}
              </p>
            ) : null}
            {isEdit && stockMode !== currentMode && stockMode === 'prebuilt' ? (
              <p className="mt-2 text-xs text-gray-600">Como prearmado arranca en 0: registra una entrada de inventario.</p>
            ) : null}
          </fieldset>

          {/* 2. Inscripción (solo kit) */}
          {isKit ? (
            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-semibold text-gray-900">Inscripción</legend>
              <SwitchField
                control={control}
                name="isEnrollmentKit"
                label="Es kit de inscripción"
                help="Al cobrarlo, el distribuidor pendiente queda activo con la posición del kit."
                disabled={locked}
                onBeforeChange={guardEnrollment}
              />
              <div className="space-y-1.5 md:max-w-sm">
                <Label htmlFor={positionId}>
                  Posición{isEnrollmentKit ? <span className="text-red-600" aria-hidden> *</span> : null}
                </Label>
                <Controller
                  control={control}
                  name="kitPosition"
                  render={({ field, fieldState }) => (
                    <>
                      <SearchableSelect
                        id={positionId}
                        options={POSITION_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        allLabel="Sin posición"
                        disabled={locked}
                        aria-invalid={!!fieldState.error}
                        className="w-full"
                      />
                      {fieldState.error ? (
                        <p className="text-xs font-medium text-red-700" role="alert">
                          {fieldState.error.message}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600">
                          {isEnrollmentKit ? 'Rango con el que queda el distribuidor al inscribirse con este kit.' : 'Solo aplica a kits de inscripción.'}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>
            </fieldset>
          ) : null}

          {/* 3. Dónde se ofrece */}
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-semibold text-gray-900">Dónde se ofrece</legend>
            <SwitchField
              control={control}
              name="availableInPos"
              label="Punto de venta"
              help="El POS lo ofrece en los países donde tenga precio vigente."
            />
            <SwitchField
              control={control}
              name="isVisibleEcommerce"
              label="Inscripción en línea (panel del distribuidor)"
              help="Los kits de inscripción no aparecen en la tienda: se ofrecen al registrar distribuidores en línea."
            />
            <SwitchField
              control={control}
              name="qualifiesForCommission"
              label="Genera comisión"
              help="Sin efecto mientras el valor de negocio del kit sea 0."
            />
          </fieldset>

          {/* 4. Vigencia */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h3 className="text-sm font-semibold text-gray-900">Vigencia</h3>
            <p className="mt-1 text-sm text-gray-700">
              La vigencia de una promoción es la de su precio: ponle fecha de fin en Precios y el kit dejará de ofrecerse solo.
            </p>
            {isEdit ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => goToSection('precios')}>
                Ir a Precios
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {/* 5. Bono de inscripción */}
      {isEdit && isKit ? (
        <div className="mt-6">
          <KitBonusesSection kitId={productId} isEnrollmentKit={product?.isEnrollmentKit === true} readOnly={locked} onChanged={invalidateKitAdmin} />
        </div>
      ) : null}

      {/* 6. Listo para vender */}
      {isEdit ? (
        <div className="mt-6">
          <SectionCard
            title="Listo para vender"
            description="Lo que impide activarlo (en rojo) y lo que conviene revisar (en ámbar). Refleja lo guardado, no los cambios pendientes."
          >
            <KitReadinessPanel
              readiness={readiness.data}
              isLoading={readiness.isLoading}
              isError={readiness.isError}
              onGoToSection={goToSection}
              onActivate={requestToggleActive}
              canToggleActive={permissions.canDelete && permissions.canUpdate}
              currentSection="kit"
            />
          </SectionCard>
        </div>
      ) : null}

      {/* Confirmación del cambio de modo */}
      <KitConfirmDialog
        open={!!modeConfirm.pending}
        onOpenChange={(open) => {
          if (!open) modeConfirm.settle(false);
        }}
        title={`Cambiar a "${modeConfirm.pending ? STOCK_MODE_LABEL[modeConfirm.pending.payload.to] : ''}"`}
        description="Este cambio afecta cómo se descuenta el inventario."
        confirmLabel="Sí, cambiar"
        onConfirm={() => modeConfirm.settle(true)}
      >
        <p>{modeConfirm.pending ? modeChangeConsequence(modeConfirm.pending.payload.to, ownStock) : ''}</p>
        {modeConfirm.pending?.payload.to === 'assemble_on_sale' && ownStock && ownStock.units > 0 ? (
          <p className="mt-2 text-xs text-gray-600">
            El sistema no lo permitirá mientras haya existencia propia: podrás dejarla en cero en el siguiente paso.
          </p>
        ) : null}
      </KitConfirmDialog>

      {/* 409 KIT_MODE_HAS_OWN_STOCK: ofrecer vaciar y reintentar */}
      <KitConfirmDialog
        open={!!ownStockConflict}
        onOpenChange={(open) => {
          if (!open) setOwnStockConflict(null);
        }}
        title="Tiene existencia propia"
        description={ownStockConflict ? modeChangeConsequence('assemble_on_sale', ownStockConflict) : ''}
        hideConfirm
        cancelLabel="Ahora no"
        onConfirm={() => setOwnStockConflict(null)}
        extraAction={
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setOwnStockConflict(null);
              setClearOpen(true);
            }}
          >
            Vaciar existencia propia
          </Button>
        }
      >
        <p>Se deja en cero con un movimiento de salida por sucursal y después se vuelve a guardar el cambio.</p>
      </KitConfirmDialog>

      <KitClearOwnStockDialog
        productId={productId}
        productCode={product?.code ?? ''}
        open={clearOpen}
        onOpenChange={setClearOpen}
        onCleared={() => {
          if (section.isDirty) retryAfterClear();
          else invalidateKitAdmin();
        }}
      />

      {/* Confirmación de "Es kit de inscripción" */}
      <KitConfirmDialog
        open={enrollmentConfirm}
        onOpenChange={setEnrollmentConfirm}
        title="Marcar como kit de inscripción"
        description="Al cobrarlo, el distribuidor pendiente queda activo con la posición del kit. Necesita posición (básico, premium o preferente) y su bono se captura abajo."
        confirmLabel="Sí, es de inscripción"
        onConfirm={() => {
          setValue('isEnrollmentKit', true, { shouldDirty: true, shouldValidate: true });
          setEnrollmentConfirm(false);
        }}
      />
    </>
  );
}
