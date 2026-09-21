'use client';

// (8) Fiscal — zona CFDI (máximo cuidado).
//  - Claves SAT con el buscador existente (SatCodeSearch), exento de impuestos
//    y regla fiscal por defecto. Guardar exige un MOTIVO (>= 5) que SÍ viaja al
//    API como `fiscalReason` y queda en auditoría (antes se pedía y se tiraba).
//  - Reglas fiscales por país: cambiar "incluido en precio" o quitar una regla
//    también exige motivo y se envía (`reason`).

import { useCallback, useId, useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SatCodeSearch } from '@/components/admin/billing/SatCodeSearch';
import { useActiveTaxRules } from '@/hooks/useConfig';
import { productKeys, useAssignProductTax, useProductTaxes } from '@/hooks/useProducts';
import { productsAdminService, type AdminUpdateProductDto } from '@/services/products-admin.service';
import { isValidSatProductCode, isValidSatUnitCode } from '@/types/billing';
import type { ProductTax } from '@/types/product';
import { productAdminErrorMessage } from '../../lib/errors';
import { countryName } from '../../lib/labels';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';
import { SwitchField } from '../fields';
import { useAsyncConfirm } from '../useAsyncConfirm';
import { useSectionForm, type DirtyKeys } from '../useSectionForm';

const schema = z.object({
  satProductCode: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidSatProductCode(v), 'La clave de producto SAT tiene 8 dígitos'),
  satUnitCode: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidSatUnitCode(v), 'Clave de unidad SAT no válida (ej.: H87, E48)'),
  taxRuleId: z.string(),
  isTaxExempt: z.boolean(),
});

type FiscalValues = z.infer<typeof schema>;

const FIELD_LABEL: Record<keyof FiscalValues, string> = {
  satProductCode: 'Clave de producto SAT',
  satUnitCode: 'Clave de unidad SAT',
  taxRuleId: 'Regla fiscal por defecto',
  isTaxExempt: 'Exento de impuestos',
};

type TaxAction =
  | { type: 'toggle'; tax: ProductTax }
  | { type: 'remove'; tax: ProductTax };

function ReasonField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Motivo del cambio (mínimo 5 caracteres)</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={300}
        aria-required
        placeholder="Ej.: corrección de clave SAT indicada por Contabilidad"
      />
      <p className="text-xs text-gray-600">Queda registrado en el historial del producto junto con tu usuario.</p>
    </div>
  );
}

export function FiscalSection() {
  const { productId, product, readOnly, patchProduct, notifyWrite } = useProductForm();
  const queryClient = useQueryClient();
  const satProductId = useId();
  const satUnitId = useId();
  const taxRuleSelectId = useId();
  const reasonId = useId();
  const taxReasonId = useId();

  const { data: productTaxes = [], isLoading: taxesLoading } = useProductTaxes(productId);
  const { data: taxRules = [] } = useActiveTaxRules();
  const assignTax = useAssignProductTax();

  const saveConfirm = useAsyncConfirm<{ changed: string[] }, string>();
  const [saveReason, setSaveReason] = useState('');
  const [taxAction, setTaxAction] = useState<TaxAction | null>(null);
  const [taxReason, setTaxReason] = useState('');
  const [taxPending, setTaxPending] = useState(false);

  const values = useMemo<FiscalValues>(
    () => ({
      satProductCode: product?.satProductCode ?? '',
      satUnitCode: product?.satUnitCode ?? '',
      taxRuleId: product?.taxRuleId ?? '',
      isTaxExempt: product?.isTaxExempt ?? false,
    }),
    [product?.satProductCode, product?.satUnitCode, product?.taxRuleId, product?.isTaxExempt],
  );

  const requestReason = saveConfirm.request;
  const beforeSave = useCallback(
    async ({ dirty }: { values: FiscalValues; dirty: DirtyKeys<FiscalValues> }) => {
      const changed = (Object.keys(FIELD_LABEL) as (keyof FiscalValues)[])
        .filter((k) => dirty[k])
        .map((k) => FIELD_LABEL[k]);
      setSaveReason('');
      return requestReason({ changed });
    },
    [requestReason],
  );

  const section = useSectionForm<FiscalValues, string>({
    id: 'fiscal',
    schema,
    values,
    beforeSave,
    save: async ({ values: v, dirty, extra }) => {
      const dto: AdminUpdateProductDto = { fiscalReason: extra };
      if (dirty.satProductCode) dto.satProductCode = v.satProductCode || null;
      if (dirty.satUnitCode) dto.satUnitCode = v.satUnitCode || null;
      if (dirty.taxRuleId) dto.taxRuleId = v.taxRuleId || null;
      if (dirty.isTaxExempt) dto.isTaxExempt = v.isTaxExempt;
      await patchProduct(dto);
    },
  });

  const { control } = section.form;

  const productRules = useMemo(() => taxRules.filter((r) => r.appliesToProducts !== false), [taxRules]);
  const ruleOptions = useMemo(
    () =>
      productRules.map((r) => ({
        value: r.id,
        label: `${r.name} (${Number(r.rate).toFixed(2)}%)`,
        hint: r.countryCode ? countryName(r.countryCode.trim()) : undefined,
      })),
    [productRules],
  );

  const fiscalCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const r of productRules) if (r.countryCode) codes.add(r.countryCode.trim());
    for (const t of productTaxes) if (t.countryCode) codes.add(t.countryCode.trim());
    return Array.from(codes).sort();
  }, [productRules, productTaxes]);

  const runTaxAction = async () => {
    if (!taxAction) return;
    const reason = taxReason.trim();
    setTaxPending(true);
    try {
      if (taxAction.type === 'toggle') {
        await productsAdminService.updateProductTax(
          productId,
          taxAction.tax.taxRuleId,
          !taxAction.tax.isIncludedInPrice,
          reason,
        );
        toast.success(
          taxAction.tax.isIncludedInPrice ? 'El impuesto se sumará al precio' : 'El impuesto queda incluido en el precio',
        );
      } else {
        await productsAdminService.removeProductTax(productId, taxAction.tax.taxRuleId, reason);
        toast.success(`${taxAction.tax.taxRuleName} quitada`);
      }
      await queryClient.invalidateQueries({ queryKey: productKeys.taxes(productId) });
      notifyWrite();
      setTaxAction(null);
      setTaxReason('');
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo aplicar el cambio fiscal'));
    } finally {
      setTaxPending(false);
    }
  };

  const handleAssign = (taxRuleId: string) => {
    if (!taxRuleId) return;
    assignTax.mutate(
      { productId, taxRuleId },
      {
        onSuccess: () => {
          toast.success('Regla fiscal asignada');
          notifyWrite();
        },
        onError: (err) => toast.error(productAdminErrorMessage(err, 'No se pudo asignar la regla fiscal')),
      },
    );
  };

  return (
    <>
      <SectionCard
        title="Fiscal"
        description="Datos que usa la facturación (CFDI) y el cálculo de impuestos. Todo cambio pide motivo y queda en auditoría."
        isDirty={section.isDirty}
        isSaving={section.isSaving}
        onSave={() => void section.submit()}
        onDiscard={section.discard}
        saveLabel="Guardar con motivo"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={satProductId}>Clave de producto SAT</Label>
              <Controller
                control={control}
                name="satProductCode"
                render={({ field, fieldState }) => (
                  <>
                    <SatCodeSearch
                      id={satProductId}
                      kind="product"
                      value={field.value}
                      onChange={(code) => field.onChange(code)}
                      disabled={readOnly}
                    />
                    {fieldState.error ? (
                      <p className="text-xs font-medium text-red-700" role="alert">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={satUnitId}>Clave de unidad SAT</Label>
              <Controller
                control={control}
                name="satUnitCode"
                render={({ field, fieldState }) => (
                  <>
                    <SatCodeSearch
                      id={satUnitId}
                      kind="unit"
                      value={field.value}
                      onChange={(code) => field.onChange(code)}
                      disabled={readOnly}
                    />
                    {fieldState.error ? (
                      <p className="text-xs font-medium text-red-700" role="alert">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={taxRuleSelectId}>Regla fiscal por defecto</Label>
              <Controller
                control={control}
                name="taxRuleId"
                render={({ field }) => (
                  <SearchableSelect
                    id={taxRuleSelectId}
                    options={ruleOptions}
                    value={field.value}
                    onChange={field.onChange}
                    allLabel="Sin regla por defecto"
                    disabled={readOnly}
                    className="w-full"
                  />
                )}
              />
              <p className="text-xs text-gray-600">
                Las reglas por país de abajo tienen prioridad sobre esta.
              </p>
            </div>
            <SwitchField
              control={control}
              name="isTaxExempt"
              label="Exento de impuestos"
              help="El producto se vende y factura sin impuesto."
            />
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900">Reglas fiscales por país</h3>
            <p className="mb-3 text-xs text-gray-600">
              Se aplican al momento: asignar no pide motivo; cambiar «incluido en precio» o quitar una regla, sí.
            </p>
            {taxesLoading ? (
              <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando reglas…
              </p>
            ) : fiscalCountries.length === 0 ? (
              <p className="text-sm text-gray-700">No hay reglas fiscales configuradas.</p>
            ) : (
              <div className="space-y-4">
                {fiscalCountries.map((code) => {
                  const assigned = productTaxes.filter((t) => t.countryCode?.trim() === code && t.isActive !== false);
                  const assignedIds = new Set(assigned.map((t) => t.taxRuleId));
                  const available = productRules.filter(
                    (r) => r.countryCode?.trim() === code && !assignedIds.has(r.id),
                  );
                  return (
                    <section key={code} aria-label={`Reglas fiscales de ${countryName(code)}`} className="rounded-lg border border-gray-200">
                      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                        <h4 className="text-sm font-semibold text-gray-900">{countryName(code)}</h4>
                        {!readOnly && available.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-gray-600" aria-hidden />
                            <SearchableSelect
                              aria-label={`Agregar regla fiscal de ${countryName(code)}`}
                              options={available.map((r) => ({
                                value: r.id,
                                label: `${r.name} (${Number(r.rate).toFixed(2)}%)`,
                              }))}
                              value=""
                              onChange={handleAssign}
                              showAllOption={false}
                              placeholder="Agregar regla…"
                              disabled={assignTax.isPending}
                              className="w-56"
                            />
                          </div>
                        ) : null}
                      </header>
                      {assigned.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-700">Sin reglas asignadas en este país.</p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {assigned.map((tax) => (
                            <li key={tax.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {tax.taxType.toUpperCase()} · {tax.taxRuleName}
                                </p>
                                <p className="text-xs text-gray-600">{Number(tax.rate).toFixed(2)}%</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Label htmlFor={`${taxRuleSelectId}-${tax.id}`} className="text-xs text-gray-700">
                                  Incluido en el precio
                                </Label>
                                <Switch
                                  id={`${taxRuleSelectId}-${tax.id}`}
                                  checked={tax.isIncludedInPrice}
                                  disabled={readOnly}
                                  onCheckedChange={() => {
                                    setTaxReason('');
                                    setTaxAction({ type: 'toggle', tax });
                                  }}
                                />
                                {!readOnly ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-700 hover:text-red-800"
                                    onClick={() => {
                                      setTaxReason('');
                                      setTaxAction({ type: 'remove', tax });
                                    }}
                                    aria-label={`Quitar la regla ${tax.taxRuleName}`}
                                  >
                                    <X className="h-4 w-4" aria-hidden />
                                  </Button>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Motivo al guardar claves SAT / exención / regla por defecto */}
      <ConfirmDialog
        open={!!saveConfirm.pending}
        onOpenChange={(open) => {
          if (!open) saveConfirm.settle(false);
        }}
        title="Confirmar cambio fiscal"
        description="Estos datos afectan el cálculo de impuestos y los CFDI que se emitan a partir de ahora."
        confirmLabel="Guardar cambio fiscal"
        disabled={saveReason.trim().length < 5}
        onConfirm={() => saveConfirm.settle(saveReason.trim())}
      >
        <div className="space-y-3">
          <p>
            Vas a cambiar: <strong>{saveConfirm.pending?.payload.changed.join(', ')}</strong>.
          </p>
          <ReasonField id={reasonId} value={saveReason} onChange={setSaveReason} />
        </div>
      </ConfirmDialog>

      {/* Motivo al modificar / quitar una regla por país */}
      <ConfirmDialog
        open={!!taxAction}
        onOpenChange={(open) => {
          if (!open) setTaxAction(null);
        }}
        title={taxAction?.type === 'remove' ? 'Quitar regla fiscal' : 'Modificar regla fiscal'}
        confirmLabel={taxAction?.type === 'remove' ? 'Quitar regla' : 'Confirmar cambio'}
        destructive={taxAction?.type === 'remove'}
        isPending={taxPending}
        disabled={taxReason.trim().length < 5}
        onConfirm={runTaxAction}
      >
        <div className="space-y-3">
          {taxAction ? (
            <p>
              {taxAction.type === 'remove' ? (
                <>
                  Se quitará <strong>{taxAction.tax.taxRuleName}</strong> de este producto.
                </>
              ) : (
                <>
                  <strong>{taxAction.tax.taxRuleName}</strong> pasará de{' '}
                  <strong>{taxAction.tax.isIncludedInPrice ? 'incluido en el precio' : 'adicional al precio'}</strong> a{' '}
                  <strong>{taxAction.tax.isIncludedInPrice ? 'adicional al precio' : 'incluido en el precio'}</strong>.
                </>
              )}
            </p>
          ) : null}
          <ReasonField id={taxReasonId} value={taxReason} onChange={setTaxReason} />
        </div>
      </ConfirmDialog>
    </>
  );
}
