'use client';

// AssetFormModal - Alta y edición de un activo de TI.
//
// Secciones: Identificación · Características técnicas (dinámicas por categoría)
// · Compra y factura · Ubicación. Validación imperativa, sin zod.
//
// En el alta permite capturar CANTIDAD para dar de golpe N equipos idénticos
// (los 20 mouse de la misma factura); cada uno recibe su propia etiqueta.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  SpecFieldsRenderer,
  reconcileSpecs,
  validateSpecs,
} from './SpecFieldsRenderer';
import {
  useAssetCategories,
  useAssetLocations,
  useAssetPurchases,
  useBulkCreateAssets,
  useUpdateAsset,
} from '@/hooks/useAssets';
import { useBranches } from '@/hooks/useBranches';
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  type AssetCondition,
  type AssetDetail,
  type AssetStatus,
  type SpecValues,
} from '@/types/asset';

interface AssetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Activo a editar; vacío = alta. */
  asset?: AssetDetail | null;
  /** Preselecciona la factura (al dar de alta desde el detalle de una factura). */
  defaultPurchaseId?: string;
  onSaved?: () => void;
}

interface FormState {
  categoryId: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  partNumber: string;
  legacyTag: string;
  manufacturerTag: string;
  status: AssetStatus;
  condition: AssetCondition;
  purchaseId: string;
  purchaseDate: string;
  purchaseCost: string;
  currencyCode: string;
  usefulLifeMonths: string;
  warrantyUntil: string;
  warrantyProvider: string;
  branchId: string;
  locationId: string;
  notes: string;
  count: string;
}

const EMPTY: FormState = {
  categoryId: '',
  name: '',
  brand: '',
  model: '',
  serialNumber: '',
  partNumber: '',
  legacyTag: '',
  manufacturerTag: '',
  status: 'available',
  condition: 'good',
  purchaseId: '',
  purchaseDate: '',
  purchaseCost: '',
  currencyCode: 'MXN',
  usefulLifeMonths: '',
  warrantyUntil: '',
  warrantyProvider: '',
  branchId: '',
  locationId: '',
  notes: '',
  count: '1',
};

export function AssetFormModal({
  open,
  onOpenChange,
  asset,
  defaultPurchaseId,
  onSaved,
}: AssetFormModalProps) {
  const isEdit = !!asset;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [specs, setSpecs] = useState<SpecValues>({});

  const { data: categories = [] } = useAssetCategories({ leafOnly: 'true' });
  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  const { data: locations = [] } = useAssetLocations(
    form.branchId ? { branchId: form.branchId } : {},
  );
  const { data: purchasesData } = useAssetPurchases({ limit: 100 });

  const createMutation = useBulkCreateAssets();
  const updateMutation = useUpdateAsset();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const branches = branchesData?.data ?? [];
  const purchases = purchasesData?.data ?? [];

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.categoryId),
    [categories, form.categoryId],
  );
  const specTemplate = useMemo(
    () => selectedCategory?.specTemplate ?? asset?.specTemplate ?? [],
    [selectedCategory, asset],
  );

  // Cargar el estado al abrir
  useEffect(() => {
    if (!open) return;
    if (asset) {
      setForm({
        categoryId: asset.categoryId,
        name: asset.name,
        brand: asset.brand ?? '',
        model: asset.model ?? '',
        serialNumber: asset.serialNumber ?? '',
        partNumber: asset.partNumber ?? '',
        legacyTag: asset.legacyTag ?? '',
        manufacturerTag: asset.manufacturerTag ?? '',
        status: asset.status,
        condition: asset.condition,
        purchaseId: asset.purchaseId ?? '',
        purchaseDate: asset.purchaseDate ?? '',
        purchaseCost: asset.purchaseCost !== null ? String(asset.purchaseCost) : '',
        currencyCode: asset.currencyCode ?? 'MXN',
        usefulLifeMonths:
          asset.usefulLifeMonths !== null ? String(asset.usefulLifeMonths) : '',
        warrantyUntil: asset.warrantyUntil ?? '',
        warrantyProvider: asset.warrantyProvider ?? '',
        branchId: asset.branchId ?? '',
        locationId: asset.locationId ?? '',
        notes: asset.notes ?? '',
        count: '1',
      });
      setSpecs(asset.specifications ?? {});
    } else {
      setForm({ ...EMPTY, purchaseId: defaultPurchaseId ?? '' });
      setSpecs({});
    }
  }, [open, asset, defaultPurchaseId]);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  /** Al cambiar de categoría: hereda la vida útil sugerida y descarta specs huérfanas. */
  const handleCategoryChange = (categoryId: string) => {
    const next = categories.find((c) => c.id === categoryId);
    const { kept, dropped } = reconcileSpecs(specs, next?.specTemplate ?? []);
    setSpecs(kept);
    if (dropped.length) {
      toast.info(
        `Se descartaron ${dropped.length} característica(s) que no aplican a la nueva categoría.`,
      );
    }
    set({
      categoryId,
      usefulLifeMonths:
        !isEdit && next?.defaultUsefulLifeMonths
          ? String(next.defaultUsefulLifeMonths)
          : form.usefulLifeMonths,
    });
  };

  const handleSubmit = async () => {
    if (!form.categoryId) {
      toast.error('Selecciona la categoría del equipo');
      return;
    }
    if (!form.name.trim()) {
      toast.error('El nombre del equipo es obligatorio');
      return;
    }
    const specError = validateSpecs(specTemplate, specs);
    if (specError) {
      toast.error(specError);
      return;
    }
    const count = Number(form.count) || 1;
    if (!isEdit && (count < 1 || count > 200)) {
      toast.error('La cantidad debe estar entre 1 y 200');
      return;
    }
    if (form.purchaseCost && !Number.isFinite(Number(form.purchaseCost))) {
      toast.error('El costo debe ser numérico');
      return;
    }

    const payload = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      partNumber: form.partNumber.trim() || null,
      legacyTag: form.legacyTag.trim() || null,
      manufacturerTag: form.manufacturerTag.trim() || null,
      specifications: specs,
      status: form.status,
      condition: form.condition,
      purchaseId: form.purchaseId || null,
      purchaseDate: form.purchaseDate || null,
      purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : null,
      currencyCode: form.currencyCode || null,
      usefulLifeMonths: form.usefulLifeMonths ? Number(form.usefulLifeMonths) : null,
      warrantyUntil: form.warrantyUntil || null,
      warrantyProvider: form.warrantyProvider.trim() || null,
      branchId: form.branchId || null,
      locationId: form.locationId || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit && asset) {
        await updateMutation.mutateAsync({ id: asset.id, dto: payload });
        toast.success(`Activo ${asset.assetTag} actualizado`);
      } else {
        const result = await createMutation.mutateAsync({ ...payload, count });
        toast.success(result.message);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar el activo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${asset?.assetTag}` : 'Nuevo activo'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'La etiqueta con código de barras no cambia al editar.'
              : 'La etiqueta (TI-000000) se genera automáticamente al guardar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {/* ---------- Identificación ---------- */}
          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Identificación</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Categoría *</Label>
                <SearchableSelect
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.parentName ? `${c.parentName} › ${c.name}` : c.name,
                  }))}
                  value={form.categoryId}
                  onChange={handleCategoryChange}
                  placeholder="Busca la categoría"
                  showAllOption={false}
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre del equipo *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Laptop Dell Latitude 5420"
                  maxLength={150}
                />
              </div>
              <div className="grid gap-2">
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => set({ brand: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Modelo</Label>
                <Input value={form.model} onChange={(e) => set({ model: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>
                  Número de serie
                  {selectedCategory?.requiresSerial ? (
                    <span className="ml-1 text-xs text-muted-foreground">(recomendado)</span>
                  ) : null}
                </Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) => set({ serialNumber: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label>Etiqueta del fabricante</Label>
                <Input
                  value={form.manufacturerTag}
                  onChange={(e) => set({ manufacturerTag: e.target.value })}
                  placeholder="Dell Service Tag / HP Product Number"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label>Etiqueta del inventario anterior</Label>
                <Input
                  value={form.legacyTag}
                  onChange={(e) => set({ legacyTag: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <SearchableSelect
                  options={ASSET_STATUSES.map((s) => ({
                    value: s,
                    label: ASSET_STATUS_LABELS[s],
                  }))}
                  value={form.status}
                  onChange={(v) => set({ status: v as AssetStatus })}
                  showAllOption={false}
                />
              </div>
              <div className="grid gap-2">
                <Label>Condición</Label>
                <SearchableSelect
                  options={ASSET_CONDITIONS.map((c) => ({
                    value: c,
                    label: ASSET_CONDITION_LABELS[c],
                  }))}
                  value={form.condition}
                  onChange={(v) => set({ condition: v as AssetCondition })}
                  showAllOption={false}
                />
              </div>
              {!isEdit && (
                <div className="grid gap-2">
                  <Label>Cantidad de equipos idénticos</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={form.count}
                    onChange={(e) => set({ count: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cada uno recibe su propia etiqueta. Con más de 1, la serie se deja vacía.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ---------- Características técnicas ---------- */}
          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Características técnicas
              {selectedCategory ? (
                <span className="ml-2 font-normal">· {selectedCategory.name}</span>
              ) : null}
            </h3>
            {form.categoryId ? (
              <SpecFieldsRenderer template={specTemplate} values={specs} onChange={setSpecs} />
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Selecciona primero una categoría para ver sus características.
              </p>
            )}
          </section>

          {/* ---------- Compra y vida útil ---------- */}
          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Compra y vida útil
              <span className="ml-2 font-normal">· todo opcional</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label>Factura de compra</Label>
                <SearchableSelect
                  options={purchases.map((p) => ({
                    value: p.id,
                    label: `${p.invoiceNumber ?? 'Sin folio'} — ${p.supplierName ?? 'Sin proveedor'}${
                      p.invoiceDate ? ` (${p.invoiceDate})` : ''
                    }`,
                  }))}
                  value={form.purchaseId}
                  onChange={(v) => set({ purchaseId: v })}
                  placeholder="Busca la factura"
                  allLabel="Sin factura"
                  allValue=""
                />
                <p className="text-xs text-muted-foreground">
                  Una misma factura puede cubrir varios equipos: se sube una sola vez.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Fecha de compra</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => set({ purchaseDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Costo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.purchaseCost}
                  onChange={(e) => set({ purchaseCost: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vida útil (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usefulLifeMonths}
                  onChange={(e) => set({ usefulLifeMonths: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Con la fecha de compra se calcula el % de vida útil restante.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Garantía hasta</Label>
                <Input
                  type="date"
                  value={form.warrantyUntil}
                  onChange={(e) => set({ warrantyUntil: e.target.value })}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Proveedor de la garantía</Label>
                <Input
                  value={form.warrantyProvider}
                  onChange={(e) => set({ warrantyProvider: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* ---------- Ubicación ---------- */}
          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Ubicación</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Sucursal</Label>
                <SearchableSelect
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`,
                  }))}
                  value={form.branchId}
                  onChange={(v) => set({ branchId: v, locationId: '' })}
                  placeholder="Busca la sucursal"
                  allLabel="Sin sucursal"
                  allValue=""
                />
              </div>
              <div className="grid gap-2">
                <Label>Ubicación física</Label>
                <SearchableSelect
                  options={locations.map((l) => ({ value: l.id, label: l.fullName }))}
                  value={form.locationId}
                  onChange={(v) => set({ locationId: v })}
                  placeholder={form.branchId ? 'Busca la ubicación' : 'Elige primero la sucursal'}
                  allLabel="Sin ubicación"
                  allValue=""
                  disabled={!form.branchId}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Guardar cambios' : 'Dar de alta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
