'use client';

// AssetFormModal - Alta y edición de un activo de TI.
//
// Secciones: Identificación · Características técnicas (dinámicas por categoría)
// · Compra y factura · Ubicación. Validación imperativa, sin zod.
//
// Cada activo es UNA pieza con UNA etiqueta. Para dar de alta muchos equipos
// iguales se usa la carga masiva CSV, no un campo de cantidad.
//
// Un equipo puede NO estar en ninguna sucursal (el corporativo de Irapuato):
// en ese caso se deja la sucursal vacía y se elige la ubicación del sitio.
//
// El modal NO se cierra al hacer clic fuera ni con Esc: se captura mucho dato y
// perderlo por un clic accidental es carísimo. Solo cierra por Cancelar o por la
// X, y si hay cambios sin guardar pide confirmación.
//
// La factura se puede crear SIN salir del formulario (panel "Nueva factura"),
// así no hay que ir a otra pantalla y perder lo ya capturado.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Upload, X } from 'lucide-react';
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
import {
  SpecFieldsRenderer,
  reconcileSpecs,
  validateSpecs,
} from './SpecFieldsRenderer';
import {
  useAssetCategories,
  useAssetLocations,
  useAssetPurchases,
  useCreateAsset,
  useCreateAssetPurchase,
  useUpdateAsset,
  useUploadPurchaseFile,
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
  /** Etiqueta ya escaneada desde el listado: llega precargada. */
  defaultLabelCode?: string;
  onSaved?: () => void;
}

interface FormState {
  labelCode: string;
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
}

const EMPTY: FormState = {
  labelCode: '',
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
};

/** Datos mínimos para dar de alta una factura sin salir del formulario. */
interface InvoiceDraft {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string;
  currencyCode: string;
}

const EMPTY_INVOICE: InvoiceDraft = {
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: '',
  totalAmount: '',
  currencyCode: 'MXN',
};

const INVOICE_MIME = [
  'application/pdf',
  'application/xml',
  'text/xml',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function AssetFormModal({
  open,
  onOpenChange,
  asset,
  defaultPurchaseId,
  defaultLabelCode,
  onSaved,
}: AssetFormModalProps) {
  const isEdit = !!asset;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [specs, setSpecs] = useState<SpecValues>({});

  // Panel de "Nueva factura" embebido en el propio formulario
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDraft>(EMPTY_INVOICE);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const invoiceFileRef = useRef<HTMLInputElement>(null);

  // La etiqueta capturada sirve? (lo reporta LabelCodeField)
  const [labelUsable, setLabelUsable] = useState(true);

  // Snapshot para saber si hay cambios sin guardar
  const initialSnapshot = useRef('');

  const { data: categories = [] } = useAssetCategories({ leafOnly: 'true' });
  const { data: branchesData } = useBranches({ limit: 200, isActive: true });
  // Todas las ubicaciones: hay que poder elegir las que NO son de sucursal
  // (corporativo) aunque no se haya elegido sucursal.
  const { data: locations = [] } = useAssetLocations({});
  const { data: purchasesData } = useAssetPurchases({ limit: 100 });

  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const createPurchaseMutation = useCreateAssetPurchase();
  const uploadInvoiceMutation = useUploadPurchaseFile();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSavingInvoice =
    createPurchaseMutation.isPending || uploadInvoiceMutation.isPending;

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

  /**
   * Ubicaciones que aplican: las del sitio elegido. Sin sucursal se muestran las
   * que no pertenecen a ninguna (corporativo); con sucursal, las de esa sucursal.
   */
  const locationOptions = useMemo(() => {
    const applicable = form.branchId
      ? locations.filter((l) => l.branchId === form.branchId)
      : locations.filter((l) => l.isOffsite);
    // El sitio se vuelve encabezado y sus departamentos cuelgan debajo, en vez
    // de repetir "Corporativo Irapuato" en los 16 renglones.
    return groupByRoot(applicable, (root) => root.name);
  }, [locations, form.branchId]);

  /** Las categorías raíz encabezan; sus tipos de equipo van debajo. */
  const categoryOptions = useMemo(
    () => groupByRoot(categories, (root) => root.name),
    [categories],
  );

  // Cargar el estado al abrir
  useEffect(() => {
    if (!open) return;
    setNewInvoiceOpen(false);
    setInvoice(EMPTY_INVOICE);
    setInvoiceFile(null);
    setLabelUsable(true);
    if (asset) {
      setForm({
        labelCode: asset.assetTag ?? '',
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
      });
      setSpecs(asset.specifications ?? {});
    } else {
      setForm({
        ...EMPTY,
        purchaseId: defaultPurchaseId ?? '',
        labelCode: defaultLabelCode ?? '',
      });
      setSpecs({});
    }
  }, [open, asset, defaultPurchaseId, defaultLabelCode]);

  // Guarda la foto del estado recién cargado para poder detectar cambios.
  useEffect(() => {
    if (open) initialSnapshot.current = JSON.stringify({ form, specs });
    // Solo al abrir: no queremos re-tomar la foto en cada tecleo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset?.id]);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const hasUnsavedChanges = () =>
    initialSnapshot.current !== JSON.stringify({ form, specs });

  /**
   * Único camino de cierre. Se llama desde Cancelar, la X y Esc; el clic fuera
   * ni siquiera llega aquí (está bloqueado en el DialogContent).
   */
  const requestClose = async () => {
    if (isSaving || isSavingInvoice) return;
    if (hasUnsavedChanges()) {
      const ok = await confirmAction(
        'Hay cambios sin guardar en el activo. ¿Cerrar y perderlos?',
      );
      if (!ok) return;
    }
    onOpenChange(false);
  };

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

  /** Al elegir una factura existente, hereda su fecha y moneda si están vacías. */
  const handlePurchaseChange = (purchaseId: string) => {
    const p = purchases.find((x) => x.id === purchaseId);
    set({
      purchaseId,
      purchaseDate: form.purchaseDate || p?.invoiceDate || '',
      currencyCode: form.currencyCode || p?.currencyCode || 'MXN',
    });
  };

  const pickInvoiceFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!INVOICE_MIME.includes(file.type)) {
      toast.error('Solo se aceptan PDF, XML, JPG, PNG o WEBP');
      if (invoiceFileRef.current) invoiceFileRef.current.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('El archivo supera los 20 MB');
      if (invoiceFileRef.current) invoiceFileRef.current.value = '';
      return;
    }
    setInvoiceFile(file);
  };

  /**
   * Crea la factura y (si se eligió) sube el archivo, SIN cerrar ni tocar el
   * resto del formulario. Al terminar la deja seleccionada.
   */
  const handleSaveInvoice = async () => {
    if (!invoice.supplierName.trim() && !invoice.invoiceNumber.trim()) {
      toast.error('Captura al menos el proveedor o el folio de la factura');
      return;
    }
    if (invoice.totalAmount && !Number.isFinite(Number(invoice.totalAmount))) {
      toast.error('El total de la factura debe ser numérico');
      return;
    }
    try {
      const created = await createPurchaseMutation.mutateAsync({
        supplierName: invoice.supplierName.trim() || null,
        invoiceNumber: invoice.invoiceNumber.trim() || null,
        invoiceDate: invoice.invoiceDate || null,
        totalAmount: invoice.totalAmount ? Number(invoice.totalAmount) : null,
        currencyCode: invoice.currencyCode || null,
      });

      if (invoiceFile) {
        try {
          await uploadInvoiceMutation.mutateAsync({
            purchaseId: created.id,
            file: invoiceFile,
          });
        } catch {
          // La factura ya quedó creada y enlazada: el archivo se puede subir
          // después desde Facturas de compra, sin perder nada de lo capturado.
          toast.warning(
            'La factura se creó y quedó seleccionada, pero el archivo no se pudo subir. Súbelo después desde Facturas de compra.',
          );
        }
      }

      set({
        purchaseId: created.id,
        purchaseDate: form.purchaseDate || created.invoiceDate || '',
        currencyCode: form.currencyCode || created.currencyCode || 'MXN',
      });
      setNewInvoiceOpen(false);
      setInvoice(EMPTY_INVOICE);
      setInvoiceFile(null);
      if (invoiceFileRef.current) invoiceFileRef.current.value = '';
      toast.success(
        `Factura ${created.invoiceNumber ?? created.supplierName ?? ''} creada y seleccionada`,
      );
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo crear la factura');
    }
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
    if (!isEdit && form.labelCode.trim() && !labelUsable) {
      toast.error('Esa etiqueta no se puede usar. Corrige el número o déjalo vacío.');
      return;
    }
    const specError = validateSpecs(specTemplate, specs);
    if (specError) {
      toast.error(specError);
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
        const created = await createMutation.mutateAsync({
          ...payload,
          labelCode: form.labelCode.trim() || null,
        });
        toast.success(
          created.assetTag
            ? `Activo dado de alta con la etiqueta ${created.assetTag}`
            : 'Activo dado de alta. Recuerda vincularle una etiqueta.',
        );
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
    <Dialog open={open}>
      <DialogContent
        // Móvil: pantalla completa con el cuerpo scrolleando y el pie fijo, para
        // que "Dar de alta" siempre quede al alcance del pulgar.
        className="grid h-[100dvh] max-h-[100dvh] w-full max-w-full grid-rows-[auto_1fr_auto] gap-3 overflow-hidden rounded-none p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:gap-4 sm:rounded-lg sm:p-6"
        showCloseButton={false}
        // Clic fuera: NO cierra. Se captura demasiado dato como para perderlo
        // por un clic accidental en el fondo.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          void requestClose();
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>
                {isEdit ? `Editar ${asset?.assetTag}` : 'Nuevo activo'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'La etiqueta vinculada no cambia al editar.'
                  : 'Escanea o teclea el folio de una etiqueta ya impresa. Puedes dejarlo en blanco y vincularla después.'}
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
                autoFocus
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Categoría *</Label>
                <SearchableSelect
                  className="h-12 sm:h-10"
                  options={categoryOptions}
                  value={form.categoryId}
                  onChange={handleCategoryChange}
                  placeholder="Busca la categoría"
                  showAllOption={false}
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre del equipo *</Label>
                <Input
                  className="h-12 sm:h-10"
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
                  className="h-12 sm:h-10"
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
                  className="h-12 sm:h-10"
                  options={ASSET_CONDITIONS.map((c) => ({
                    value: c,
                    label: ASSET_CONDITION_LABELS[c],
                  }))}
                  value={form.condition}
                  onChange={(v) => set({ condition: v as AssetCondition })}
                  showAllOption={false}
                />
              </div>
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
                <div className="flex gap-2">
                  <SearchableSelect
                    options={purchases.map((p) => ({
                      value: p.id,
                      // El folio es lo que se busca; proveedor y fecha son el
                      // contexto para desempatar y van en la segunda línea.
                      label: p.invoiceNumber ?? 'Sin folio',
                      hint: [p.supplierName ?? 'Sin proveedor', p.invoiceDate]
                        .filter(Boolean)
                        .join(' · '),
                    }))}
                    value={form.purchaseId}
                    onChange={handlePurchaseChange}
                    placeholder="Busca la factura"
                    allLabel="Sin factura"
                    allValue=""
                    className="h-12 flex-1 sm:h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewInvoiceOpen((v) => !v)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Una misma factura puede cubrir varios equipos: se sube una sola vez.
                  Con &quot;Nueva&quot; la das de alta aquí mismo, sin perder lo que ya
                  capturaste.
                </p>

                {newInvoiceOpen && (
                  <div className="mt-1 grid gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Nueva factura</p>
                      <button
                        type="button"
                        onClick={() => setNewInvoiceOpen(false)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Cerrar el panel de nueva factura"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Proveedor</Label>
                        <Input
                          value={invoice.supplierName}
                          onChange={(e) =>
                            setInvoice((p) => ({ ...p, supplierName: e.target.value }))
                          }
                          placeholder="CompuSoluciones SA de CV"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Folio</Label>
                        <Input
                          value={invoice.invoiceNumber}
                          onChange={(e) =>
                            setInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))
                          }
                          className="font-mono"
                          placeholder="A-12345"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Fecha</Label>
                        <Input
                          type="date"
                          value={invoice.invoiceDate}
                          onChange={(e) =>
                            setInvoice((p) => ({ ...p, invoiceDate: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Total</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={invoice.totalAmount}
                          onChange={(e) =>
                            setInvoice((p) => ({ ...p, totalAmount: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={invoiceFileRef}
                        type="file"
                        accept={INVOICE_MIME.join(',')}
                        className="hidden"
                        onChange={(e) => pickInvoiceFile(e.target.files)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => invoiceFileRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {invoiceFile ? 'Cambiar archivo' : 'Adjuntar PDF / XML'}
                      </Button>
                      {invoiceFile ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {invoiceFile.name}
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceFile(null);
                              if (invoiceFileRef.current) invoiceFileRef.current.value = '';
                            }}
                            aria-label="Quitar el archivo"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Opcional</span>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleSaveInvoice()}
                        disabled={isSavingInvoice}
                      >
                        {isSavingInvoice ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Crear y seleccionar
                      </Button>
                    </div>
                  </div>
                )}
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
                <p className="text-xs text-muted-foreground">
                  {form.branchId
                    ? 'El equipo está en esta sucursal.'
                    : 'Sin sucursal: elige abajo el sitio, por ejemplo Corporativo Irapuato.'}
                </p>
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
            disabled={isSaving || isSavingInvoice}
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
