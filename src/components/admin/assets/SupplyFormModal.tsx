'use client';

// SupplyFormModal - Alta y edición de un INSUMO de TI.
//
// Un insumo se controla por cantidad (pilas, cables, tóner): aquí se captura la
// ficha (qué es, dónde vive, cuál es su mínimo) y, solo al darlo de alta, la
// existencia inicial. Los movimientos posteriores van por SupplyMovementModal;
// el stock nunca se edita a mano.
//
// Misma protección que AssetFormModal: no se cierra con clic fuera ni con Esc
// sin confirmar si hay cambios sin guardar.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
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
import { confirmAction } from '@/lib/utils';
import { groupByRoot } from '@/lib/asset-select-options';
import { LabelCodeField } from './LabelCodeField';
import { AssetBarcode } from './AssetBarcode';
import { useAssetCategories, useAssetLocations, useAssetPurchases } from '@/hooks/useAssets';
import { useCreateSupply, useUpdateSupply } from '@/hooks/useSupplies';
import { useBranches } from '@/hooks/useBranches';
import { SUPPLY_UNIT_SUGGESTIONS, type SupplyDetail } from '@/types/supply';

interface SupplyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Insumo a editar; vacío = alta. */
  supply?: SupplyDetail | null;
  /** Etiqueta ya escaneada desde el listado: llega precargada. */
  defaultLabelCode?: string;
  onSaved?: (supply: SupplyDetail) => void;
}

interface FormState {
  labelCode: string;
  categoryId: string;
  name: string;
  brand: string;
  model: string;
  partNumber: string;
  sku: string;
  description: string;
  unit: string;
  minStock: string;
  branchId: string;
  locationId: string;
  notes: string;
  // Solo en el alta
  initialStock: string;
  initialUnitCost: string;
  purchaseId: string;
}

const EMPTY: FormState = {
  labelCode: '',
  categoryId: '',
  name: '',
  brand: '',
  model: '',
  partNumber: '',
  sku: '',
  description: '',
  unit: 'pieza',
  minStock: '0',
  branchId: '',
  locationId: '',
  notes: '',
  initialStock: '',
  initialUnitCost: '',
  purchaseId: '',
};

const UNIT_DATALIST_ID = 'supply-unit-suggestions';

/** Entero no negativo (para existencias y mínimos). */
function isNonNegativeInt(raw: string): boolean {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0;
}

export function SupplyFormModal({
  open,
  onOpenChange,
  supply,
  defaultLabelCode,
  onSaved,
}: SupplyFormModalProps) {
  const isEdit = !!supply;
  const [form, setForm] = useState<FormState>(EMPTY);

  // La etiqueta capturada sirve? (lo reporta LabelCodeField)
  const [labelUsable, setLabelUsable] = useState(true);

  // Solo categorías de INSUMO: las de equipo viven en AssetFormModal.
  const { data: categories = [] } = useAssetCategories({ isSupply: 'true' });
  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  // Todas las ubicaciones: hay que poder elegir las que NO son de sucursal
  // (corporativo) aunque no se haya elegido sucursal.
  const { data: locations = [] } = useAssetLocations({});
  const { data: purchasesData } = useAssetPurchases({ limit: 100 });

  const createMutation = useCreateSupply();
  const updateMutation = useUpdateSupply();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const branches = branchesData?.data ?? [];
  const purchases = purchasesData?.data ?? [];

  // Las categorías de insumo son planas (no cuelgan de un grupo como las de
  // equipo), así que aquí no se arma el árbol: un renglón por categoría y, si
  // alguien le puso grupo, ese nombre baja a la segunda línea.
  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.id,
        label: c.name,
        hint: c.parentName ?? undefined,
      })),
    [categories],
  );

  /**
   * Ubicaciones que aplican: las del sitio elegido. Sin sucursal se muestran las
   * que no pertenecen a ninguna (corporativo); con sucursal, las de esa sucursal.
   */
  const locationOptions = useMemo(() => {
    const applicable = form.branchId
      ? locations.filter((l) => l.branchId === form.branchId)
      : locations.filter((l) => l.isOffsite);
    return groupByRoot(applicable, (root) => root.name);
  }, [locations, form.branchId]);

  /**
   * Estado con el que abre el modal. Es la referencia contra la que se compara
   * para saber si hay cambios sin guardar: al derivarlo de las props nunca
   * queda desfasado (una foto tomada en otro efecto capturaría el `form` viejo
   * del closure —setForm no es inmediato— y todo cierre pediría confirmación).
   */
  const initialForm = useMemo<FormState>(
    () =>
      supply
        ? {
            ...EMPTY,
            labelCode: supply.supplyTag ?? '',
            categoryId: supply.categoryId,
            name: supply.name,
            brand: supply.brand ?? '',
            model: supply.model ?? '',
            partNumber: supply.partNumber ?? '',
            sku: supply.sku ?? '',
            description: supply.description ?? '',
            unit: supply.unit || 'pieza',
            minStock: String(supply.minStock ?? 0),
            branchId: supply.branchId ?? '',
            locationId: supply.locationId ?? '',
            notes: supply.notes ?? '',
          }
        : { ...EMPTY, labelCode: defaultLabelCode ?? '' },
    [supply, defaultLabelCode],
  );

  // Cargar el estado al abrir. Tiene que ser un efecto: el modal no se
  // desmonta al cerrarse, así que el formulario se vuelve a sembrar en cada
  // apertura (mismo patrón que AssetFormModal).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setLabelUsable(true);
    setForm(initialForm);
  }, [open, initialForm]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const hasUnsavedChanges = () => JSON.stringify(form) !== JSON.stringify(initialForm);

  /**
   * Único camino de cierre. Se llama desde Cancelar, la X y Esc; el clic fuera
   * ni siquiera llega aquí (está bloqueado en el DialogContent).
   */
  const requestClose = async () => {
    if (isSaving) return;
    if (hasUnsavedChanges()) {
      const ok = await confirmAction(
        'Hay cambios sin guardar en el insumo. ¿Cerrar y perderlos?',
      );
      if (!ok) return;
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!form.categoryId) {
      toast.error('Selecciona la categoría del insumo');
      return;
    }
    if (!form.name.trim()) {
      toast.error('El nombre del insumo es obligatorio');
      return;
    }
    if (!isEdit && form.labelCode.trim() && !labelUsable) {
      toast.error('Esa etiqueta no se puede usar. Corrige el número o déjalo vacío.');
      return;
    }
    if (!isNonNegativeInt(form.minStock || '0')) {
      toast.error('El mínimo debe ser un entero mayor o igual a cero');
      return;
    }
    if (!isEdit && form.initialStock && !isNonNegativeInt(form.initialStock)) {
      toast.error('La existencia inicial debe ser un entero mayor o igual a cero');
      return;
    }
    if (
      !isEdit &&
      form.initialUnitCost &&
      (!Number.isFinite(Number(form.initialUnitCost)) || Number(form.initialUnitCost) < 0)
    ) {
      toast.error('El costo unitario debe ser numérico');
      return;
    }

    const payload = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      partNumber: form.partNumber.trim() || null,
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      unit: form.unit.trim() || 'pieza',
      minStock: Number(form.minStock || 0),
      branchId: form.branchId || null,
      locationId: form.locationId || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit && supply) {
        const saved = await updateMutation.mutateAsync({ id: supply.id, dto: payload });
        toast.success(`Insumo ${supply.name} actualizado`);
        onOpenChange(false);
        onSaved?.(saved);
      } else {
        const initialStock = form.initialStock ? Number(form.initialStock) : 0;
        const created = await createMutation.mutateAsync({
          ...payload,
          labelCode: form.labelCode.trim() || null,
          initialStock,
          initialUnitCost:
            initialStock > 0 && form.initialUnitCost ? Number(form.initialUnitCost) : null,
          purchaseId: initialStock > 0 && form.purchaseId ? form.purchaseId : null,
        });
        toast.success(
          created.supplyTag
            ? `Insumo dado de alta con la etiqueta ${created.supplyTag}`
            : 'Insumo dado de alta.',
        );
        onOpenChange(false);
        onSaved?.(created);
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar el insumo');
    }
  };

  const previewCode = isEdit ? (supply?.supplyTag ?? '') : form.labelCode.trim();
  const hasInitialStock = !!form.initialStock && Number(form.initialStock) > 0;

  return (
    <Dialog open={open}>
      <DialogContent
        // Móvil: pantalla completa con el cuerpo scrolleando y el pie fijo.
        className="grid h-[100dvh] max-h-[100dvh] w-full max-w-full grid-rows-[auto_1fr_auto] gap-3 overflow-hidden rounded-none p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:gap-4 sm:rounded-lg sm:p-6"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          void requestClose();
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{isEdit ? `Editar ${supply?.name}` : 'Nuevo insumo'}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'La etiqueta y la existencia no se cambian aquí: la etiqueta desde la ficha, la existencia con un movimiento.'
                  : 'Escanea o teclea el folio de una etiqueta ya impresa para pegarla en el estante o caja. Puedes dejarlo en blanco.'}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => void requestClose()}
              className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="grid gap-6 overflow-y-auto py-2 pr-1">
          {/* ---------- Identificación ---------- */}
          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Identificación</h3>
            {!isEdit && (
              <LabelCodeField
                value={form.labelCode}
                onChange={(code) => set({ labelCode: code })}
                onValidityChange={({ usable }) => setLabelUsable(usable)}
                hint="Opcional. Se pega en el estante o la caja donde vive el insumo, no en cada pieza."
                autoFocus
              />
            )}
            {previewCode ? (
              <AssetBarcode value={previewCode} height={40} className="w-fit" />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Categoría *</Label>
                <SearchableSelect
                  className="h-12 sm:h-10"
                  options={categoryOptions}
                  value={form.categoryId}
                  onChange={(v) => set({ categoryId: v })}
                  placeholder="Busca la categoría"
                  showAllOption={false}
                />
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No hay categorías de insumo. Márcalas como &quot;Insumo&quot; en Activos →
                    Categorías.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Nombre del insumo *</Label>
                <Input
                  className="h-12 sm:h-10"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Pilas AA alcalinas"
                  maxLength={150}
                />
              </div>
              <div className="grid gap-2">
                <Label>Marca</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => set({ brand: e.target.value })}
                  maxLength={80}
                />
              </div>
              <div className="grid gap-2">
                <Label>Modelo</Label>
                <Input
                  value={form.model}
                  onChange={(e) => set({ model: e.target.value })}
                  maxLength={120}
                />
              </div>
              <div className="grid gap-2">
                <Label>Número de parte</Label>
                <Input
                  value={form.partNumber}
                  onChange={(e) => set({ partNumber: e.target.value })}
                  className="font-mono"
                  maxLength={80}
                />
              </div>
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => set({ sku: e.target.value })}
                  className="font-mono"
                  maxLength={80}
                />
              </div>
              <div className="grid gap-2">
                <Label>Unidad</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => set({ unit: e.target.value })}
                  list={UNIT_DATALIST_ID}
                  placeholder="pieza"
                  maxLength={20}
                />
                <datalist id={UNIT_DATALIST_ID}>
                  {SUPPLY_UNIT_SUGGESTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-2">
                <Label>Existencia mínima</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.minStock}
                  onChange={(e) => set({ minStock: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Al llegar a esta cantidad o menos, el insumo se marca &quot;Bajo mínimo&quot;.
                </p>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* ---------- Existencia inicial (solo alta) ---------- */}
          {!isEdit && (
            <section className="grid gap-4">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Existencia inicial
                <span className="ml-2 font-normal">· opcional, queda como primera entrada</span>
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.initialStock}
                    onChange={(e) => set({ initialStock: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Costo unitario</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.initialUnitCost}
                    onChange={(e) => set({ initialUnitCost: e.target.value })}
                    disabled={!hasInitialStock}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Factura de compra</Label>
                  <SearchableSelect
                    options={purchases.map((p) => ({
                      value: p.id,
                      label: p.invoiceNumber ?? 'Sin folio',
                      hint: [p.supplierName ?? 'Sin proveedor', p.invoiceDate]
                        .filter(Boolean)
                        .join(' · '),
                    }))}
                    value={form.purchaseId}
                    onChange={(v) => set({ purchaseId: v })}
                    placeholder="Busca la factura"
                    allLabel="Sin factura"
                    allValue=""
                    className="h-12 sm:h-10"
                    disabled={!hasInitialStock}
                  />
                  <p className="text-xs text-muted-foreground">
                    Las facturas se dan de alta en Activos → Facturas de compra.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ---------- Ubicación ---------- */}
          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Dónde se guarda</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Sucursal</Label>
                <SearchableSelect
                  className="h-12 sm:h-10"
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`,
                  }))}
                  value={form.branchId}
                  onChange={(v) => set({ branchId: v, locationId: '' })}
                  placeholder="Busca la sucursal"
                  allLabel="No está en una sucursal (corporativo)"
                  allValue=""
                />
              </div>
              <div className="grid gap-2">
                <Label>Ubicación física</Label>
                <SearchableSelect
                  className="h-12 sm:h-10"
                  options={locationOptions}
                  value={form.locationId}
                  onChange={(v) => set({ locationId: v })}
                  placeholder="Busca la ubicación"
                  allLabel="Sin ubicación"
                  allValue=""
                />
                {locationOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {form.branchId
                      ? 'Esa sucursal no tiene ubicaciones registradas todavía.'
                      : 'No hay sitios fuera de sucursal. Créalos en Activos → Ubicaciones.'}
                  </p>
                ) : null}
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

        <DialogFooter className="border-t border-border pt-3 sm:border-0 sm:pt-0">
          <Button
            variant="outline"
            onClick={() => void requestClose()}
            disabled={isSaving}
            className="h-12 sm:h-10"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="h-12 sm:h-10"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Guardar cambios' : 'Dar de alta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
