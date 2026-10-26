'use client';

// Formulario de una campaña de membresía (crear y editar), mig 168:
// "Compra N puntos en producto y tu membresía es GRATIS".
//
// Secciones: Datos generales · Condición · Beneficio (posición, regalos a $0,
// cupón de primera recompra) · Dónde aplica (sucursales; vacío = apagada).
// El estado vive en texto tal como se teclea y se convierte a DTO al guardar
// (lib/membership-campaigns: validación + payload, con pruebas).
//
// Quien lo monta decide el `initial` (vacío o la campaña del servidor) y, en
// edición, lo vuelve a montar con `key` cuando cambia la campaña: así no hay
// setState dentro de efectos.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ArrowUpTrayIcon,
  IdentificationIcon,
  AdjustmentsHorizontalIcon,
  GiftIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  TicketIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCountries } from '@/hooks/useConfig';
import { useActiveBranches } from '@/hooks/useBranches';
import { useProducts } from '@/hooks/useProducts';
import { useUploadMembershipCampaignImage } from '@/hooks/useMembershipCampaigns';
import type { Product } from '@/types/product';
import type {
  CreateMembershipCampaignDto,
  MembershipAppliesTo,
  MembershipCampaignBranch,
  MembershipCouponChannel,
  MembershipPosition,
} from '@/types/membership-campaign';
import {
  APPLIES_TO_OPTIONS,
  COUPON_CHANNEL_OPTIONS,
  POSITION_OPTIONS,
  type MembershipCampaignFormValues,
  apiErrorMessage,
  toMembershipPayload,
  validateMembershipForm,
} from '@/lib/membership-campaigns';

interface MembershipCampaignFormProps {
  mode: 'create' | 'edit';
  /** En edición: habilita "Subir imagen" (POST /membership-campaigns/:id/image). */
  campaignId?: string;
  initial: MembershipCampaignFormValues;
  /** Sucursales ya guardadas: para mostrar quién y cuándo las habilitó. */
  savedBranches?: MembershipCampaignBranch[];
  /** Sin `products:update`: todo deshabilitado y sin botón de guardar. */
  readOnly?: boolean;
  isSaving: boolean;
  onSubmit: (payload: CreateMembershipCampaignDto) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
}

const formatEnabledAt = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_MAX_BYTES = 7 * 1024 * 1024;

export function MembershipCampaignForm({
  mode,
  campaignId,
  initial,
  savedBranches = [],
  readOnly = false,
  isSaving,
  onSubmit,
  submitLabel,
  cancelHref,
}: MembershipCampaignFormProps) {
  const uid = useId();
  const [form, setForm] = useState<MembershipCampaignFormValues>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (patch: Partial<MembershipCampaignFormValues>) => {
    setForm((f) => ({ ...f, ...patch }));
    if (errors.length > 0) setErrors([]);
  };

  // -------- imagen: en edición se sube al API (S3) y queda guardada al instante --------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadMembershipCampaignImage();
  const [uploadProgress, setUploadProgress] = useState(0);
  const canUpload = !!campaignId && !readOnly;
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file || !campaignId) return;
    if (!IMAGE_TYPES.has(file.type)) {
      toast.error('La imagen debe ser JPG, PNG o WebP.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      toast.error(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 7 MB.`);
      return;
    }
    setUploadProgress(0);
    try {
      const saved = await uploadImage.mutateAsync({
        id: campaignId,
        file,
        onProgress: setUploadProgress,
      });
      set({ imageUrl: saved.imageUrl ?? '' });
      toast.success('Imagen subida; el POS ya la muestra al ofrecer la campaña.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo subir la imagen.'));
    }
  };

  const { data: countries } = useCountries();
  const { data: activeBranches } = useActiveBranches();

  // -------- regalos: buscador de productos (2+ caracteres, 300 ms) --------
  const [productSearch, setProductSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(productSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearch]);
  const searchEnabled = term.length >= 2;
  const { data: productResults, isFetching: searching } = useProducts(
    { search: term, isActive: true, limit: 10 },
    { enabled: searchEnabled && !readOnly },
  );
  const results = searchEnabled ? (productResults?.data ?? []) : [];

  const addGift = (p: Product) => {
    if (form.gifts.some((g) => g.productId === p.id)) {
      toast.warning('Ese producto ya está en los regalos');
      return;
    }
    set({
      gifts: [
        ...form.gifts,
        { productId: p.id, sku: p.code, name: p.name, quantity: '1', productActive: p.isActive },
      ],
    });
    setProductSearch('');
  };
  const removeGift = (productId: string) =>
    set({ gifts: form.gifts.filter((g) => g.productId !== productId) });
  const setGiftQty = (productId: string, quantity: string) =>
    set({ gifts: form.gifts.map((g) => (g.productId === productId ? { ...g, quantity } : g)) });

  // -------- sucursales --------
  // Solo las del país de la campaña (el país es el de la sucursal). Las que
  // no traen país se dejan pasar para no esconder nada por un dato faltante.
  const countryBranches = useMemo(
    () =>
      (activeBranches ?? []).filter(
        (b) => !form.countryId || !b.countryId || b.countryId === form.countryId,
      ),
    [activeBranches, form.countryId],
  );
  // Nombres: catálogo activo + las ya guardadas (una sucursal fuera del
  // alcance de la sesión o inactiva debe mostrar su nombre, no el UUID).
  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of activeBranches ?? []) m.set(b.id, b.name);
    for (const b of savedBranches) if (!m.has(b.branchId)) m.set(b.branchId, b.branchName);
    return m;
  }, [activeBranches, savedBranches]);
  const savedById = useMemo(
    () => new Map(savedBranches.map((b) => [b.branchId, b] as const)),
    [savedBranches],
  );
  const selectedSavedBranches = form.branchIds
    .map((id) => savedById.get(id))
    .filter((b): b is MembershipCampaignBranch => !!b);

  const addBranch = (id: string) => {
    if (!id || form.branchIds.includes(id)) return;
    set({ branchIds: [...form.branchIds, id] });
  };
  const removeBranch = (id: string) => set({ branchIds: form.branchIds.filter((x) => x !== id) });
  const enableAll = () =>
    set({ branchIds: Array.from(new Set([...form.branchIds, ...countryBranches.map((b) => b.id)])) });
  const clearAll = () => set({ branchIds: [] });

  // -------- guardar --------
  const hasCoupon = form.couponPercent.trim() !== '';
  const activeWithoutBranches = form.isActive && form.branchIds.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const found = validateMembershipForm(form);
    if (found.length > 0) {
      setErrors(found);
      toast.error(found[0]);
      return;
    }
    await onSubmit(toMembershipPayload(form));
  };

  const inputId = (name: string) => `${uid}-${name}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {readOnly && (
        <div className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Solo lectura: para editar campañas de membresía necesitas el permiso products:update.</p>
        </div>
      )}

      {/* ============ DATOS GENERALES ============ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <IdentificationIcon className="h-5 w-5 text-[#3E667D]" />
            <div>
              <h2 className="text-lg font-semibold">Datos generales</h2>
              <p className="text-xs text-gray-500">Cómo se identifica y cuándo está vigente.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('code')}>
                Código <span className="text-red-500">*</span>
              </Label>
              <Input
                id={inputId('code')}
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                placeholder="MEMB1650"
                className="font-mono uppercase"
                maxLength={40}
                disabled={readOnly}
                required
              />
              <p className="text-xs text-gray-500">
                Único; letras, números, guion y guion bajo. Sale en el ticket y en los reportes.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('name')}>
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id={inputId('name')}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Compra 1,650 puntos y tu membresía es gratis"
                maxLength={150}
                disabled={readOnly}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={inputId('description')}>Descripción</Label>
            <Textarea
              id={inputId('description')}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              maxLength={2000}
              placeholder="Lo que ve el cajero en el POS al ofrecerla"
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('imageUrl')}>Imagen de la campaña</Label>
              <div className="flex items-start gap-3">
                {form.imageUrl.trim() ? (
                  <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                    {/* URL libre (cualquier host): next/image exige dominios registrados. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl.trim()} alt="" className="h-20 w-32 object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-32 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                    <PhotoIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  {!readOnly && (
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={IMAGE_ACCEPT}
                        className="hidden"
                        onChange={(e) => void handleImageFile(e)}
                        aria-label="Elegir imagen de la campaña"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canUpload || uploadImage.isPending}
                        title={canUpload ? undefined : 'Crea la campaña y después sube la imagen'}
                      >
                        {uploadImage.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                        )}
                        {uploadImage.isPending
                          ? `Subiendo… ${uploadProgress}%`
                          : form.imageUrl.trim()
                            ? 'Reemplazar imagen'
                            : 'Subir imagen'}
                      </Button>
                      {form.imageUrl.trim() !== '' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-700 hover:text-red-800"
                          onClick={() => set({ imageUrl: '' })}
                          disabled={uploadImage.isPending}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Quitar
                        </Button>
                      )}
                    </div>
                  )}
                  <Input
                    id={inputId('imageUrl')}
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => set({ imageUrl: e.target.value })}
                    placeholder="o pega una liga https://…"
                    maxLength={1000}
                    disabled={readOnly || uploadImage.isPending}
                  />
                  <p className="text-xs text-gray-500">
                    {canUpload
                      ? 'JPG, PNG o WebP, máximo 7 MB. Al subirla queda guardada de inmediato; “Quitar” se aplica al guardar.'
                      : mode === 'create' && !readOnly
                        ? 'Crea la campaña y después sube el archivo (o pega una liga). Se muestra en el POS al ofrecer la campaña.'
                        : 'Se muestra en el POS al ofrecer la campaña.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('country')}>
                País <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                id={inputId('country')}
                options={(countries ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                value={form.countryId}
                onChange={(v) => set({ countryId: v, branchIds: v === form.countryId ? form.branchIds : [] })}
                placeholder="Elegir país…"
                showAllOption={false}
                disabled={readOnly || mode === 'edit'}
              />
              <p className="text-xs text-gray-500">
                {mode === 'edit'
                  ? 'El país no se cambia: crea otra campaña para otro país.'
                  : 'El país de la sucursal donde se cobra. Al cambiarlo se limpian las sucursales.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('validFrom')}>Vigente desde</Label>
              <Input
                id={inputId('validFrom')}
                type="date"
                value={form.validFrom}
                onChange={(e) => set({ validFrom: e.target.value })}
                disabled={readOnly}
              />
              <p className="text-xs text-gray-500">Vacío = desde ya.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('validTo')}>Vigente hasta</Label>
              <Input
                id={inputId('validTo')}
                type="date"
                value={form.validTo}
                onChange={(e) => set({ validTo: e.target.value })}
                disabled={readOnly}
              />
              <p className="text-xs text-gray-500">Vacío = sin fin.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('sortOrder')}>Orden</Label>
              <Input
                id={inputId('sortOrder')}
                type="number"
                step={1}
                value={form.sortOrder}
                onChange={(e) => set({ sortOrder: e.target.value })}
                disabled={readOnly}
              />
              <p className="text-xs text-gray-500">Si varias aplican, el POS ofrece primero la de menor orden.</p>
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor={inputId('isActive')}>Activa</Label>
              <label className="flex cursor-pointer items-center gap-2 pt-1.5">
                <Switch
                  id={inputId('isActive')}
                  checked={form.isActive}
                  onCheckedChange={(v) => set({ isActive: v })}
                  disabled={readOnly}
                />
                <span className="text-sm text-gray-700">{form.isActive ? 'Sí' : 'No'}</span>
              </label>
              <p className="text-xs text-gray-500">Además de activa debe estar habilitada en alguna sucursal.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ CONDICIÓN ============ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-[#3E667D]" />
            <div>
              <h2 className="text-lg font-semibold">Condición</h2>
              <p className="text-xs text-gray-500">
                Qué debe juntar el ticket y a quién se le ofrece. Sin bono de patrocinio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('minPoints')}>
                Puntos mínimos en una compra <span className="text-red-500">*</span>
              </Label>
              <Input
                id={inputId('minPoints')}
                type="text"
                inputMode="decimal"
                value={form.minPoints}
                onChange={(e) => set({ minPoints: e.target.value })}
                placeholder="1650"
                className="max-w-[200px]"
                disabled={readOnly}
                required
              />
              <p className="text-xs text-gray-500">
                Puntos de PRODUCTO en UNA sola venta del POS (no se acumulan entre ventas ni cuentan los
                kits).
              </p>
            </div>

            <div className="grid gap-2">
              <Label>A quién aplica</Label>
              <RadioGroup
                value={form.appliesTo}
                onValueChange={(v) => set({ appliesTo: v as MembershipAppliesTo })}
                disabled={readOnly}
                className="gap-2"
              >
                {APPLIES_TO_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    htmlFor={inputId(`applies-${o.value}`)}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                      form.appliesTo === o.value ? 'border-[#3E667D] bg-[#C8DDF2]/20' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <RadioGroupItem value={o.value} id={inputId(`applies-${o.value}`)} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{o.label}</span>
                      <span className="block text-xs text-gray-500">{o.description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ BENEFICIO ============ */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <GiftIcon className="h-5 w-5 text-[#3E667D]" />
            <div>
              <h2 className="text-lg font-semibold">Beneficio</h2>
              <p className="text-xs text-gray-500">
                Lo que recibe al cobrar la venta. Si la venta se cancela, se anula todo.
              </p>
            </div>
          </div>

          <div className="grid gap-1.5 md:max-w-sm">
            <Label htmlFor={inputId('position')}>Posición que otorga</Label>
            <SearchableSelect
              id={inputId('position')}
              options={POSITION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={form.grantPosition}
              onChange={(v) => set({ grantPosition: (v || 'premium') as MembershipPosition })}
              showAllOption={false}
              disabled={readOnly}
            />
            <p className="text-xs text-gray-500">Sin pagar kit: el ticket no lleva el kit de inscripción.</p>
          </div>

          {/* Regalos */}
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Regalos ({form.gifts.length})</p>
              <p className="text-xs text-gray-500">
                Catálogo, lista de precios, shaker, mochila… Se entregan a $0 y descuentan existencia de la
                sucursal; si no hay existencia la venta sigue y el ticket lo marca.
              </p>
            </div>

            {!readOnly && (
              <div className="relative">
                <Label htmlFor={inputId('giftSearch')} className="sr-only">
                  Buscar producto para regalar
                </Label>
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id={inputId('giftSearch')}
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  placeholder="Buscar producto para agregar (mínimo 2 caracteres)…"
                  className="bg-white pl-9"
                  autoComplete="off"
                />
                {searchEnabled && (
                  <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {searching && results.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-600" role="status">
                        Buscando…
                      </p>
                    ) : results.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-700">Sin resultados para «{term}».</p>
                    ) : (
                      <ul>
                        {results.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => addGift(p)}
                              className="flex min-h-11 w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                            >
                              <span>
                                <span className="block text-sm font-medium text-gray-900">{p.name}</span>
                                <span className="block font-mono text-xs text-gray-600">{p.code}</span>
                              </span>
                              <PlusIcon className="h-4 w-4 text-[#3E667D]" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {form.gifts.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500">
                Sin regalos: la campaña solo otorga la posición{hasCoupon ? ' y el cupón' : ''}.
              </div>
            ) : (
              <ol className="space-y-2">
                {form.gifts.map((g) => (
                  <li
                    key={g.productId}
                    className={`flex flex-wrap items-center gap-3 rounded-md border bg-white p-3 ${
                      g.productActive === false ? 'border-red-200 bg-red-50/40' : 'border-gray-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {g.name}
                        {g.productActive === false && (
                          <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
                            Inactivo: no se entregará
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-gray-600">{g.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={inputId(`qty-${g.productId}`)} className="text-xs text-gray-700">
                        Cantidad
                      </Label>
                      <Input
                        id={inputId(`qty-${g.productId}`)}
                        type="text"
                        inputMode="decimal"
                        value={g.quantity}
                        onChange={(e) => setGiftQty(g.productId, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        className="h-9 w-24 text-right"
                        disabled={readOnly}
                        autoComplete="off"
                      />
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-red-700 hover:text-red-800"
                        onClick={() => removeGift(g.productId)}
                        aria-label={`Quitar ${g.name}`}
                        title="Quitar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Cupón */}
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-[#3E667D]" />
              <p className="text-sm font-semibold text-gray-800">Cupón de primera recompra</p>
            </div>
            <p className="text-xs text-gray-500">
              Un cupón de UN solo uso que se genera al cobrar. Deja el porcentaje vacío si la campaña no da
              cupón.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('couponPercent')}>Descuento (%)</Label>
                <Input
                  id={inputId('couponPercent')}
                  type="text"
                  inputMode="decimal"
                  value={form.couponPercent}
                  onChange={(e) => set({ couponPercent: e.target.value })}
                  placeholder="Vacío = sin cupón"
                  className="bg-white"
                  disabled={readOnly}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('couponValidDays')}>Vigencia (días)</Label>
                <Input
                  id={inputId('couponValidDays')}
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  value={form.couponValidDays}
                  onChange={(e) => set({ couponValidDays: e.target.value })}
                  className="bg-white"
                  disabled={readOnly || !hasCoupon}
                />
                <p className="text-xs text-gray-500">Desde la venta (default 90).</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('couponChannel')}>Canal</Label>
                <SearchableSelect
                  id={inputId('couponChannel')}
                  options={COUPON_CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={form.couponChannel}
                  onChange={(v) => set({ couponChannel: (v || 'all') as MembershipCouponChannel })}
                  showAllOption={false}
                  disabled={readOnly || !hasCoupon}
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ DÓNDE APLICA ============ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D]" />
              <div>
                <h2 className="text-lg font-semibold">Dónde aplica</h2>
                <p className="text-xs text-gray-500">
                  Sucursales donde el POS la ofrece. Sin sucursales = apagada; enciéndela poco a poco.
                </p>
              </div>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={enableAll}
                  disabled={countryBranches.length === 0 || !form.countryId}
                >
                  Habilitar en todas ({countryBranches.length})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-700 hover:text-red-800"
                  onClick={clearAll}
                  disabled={form.branchIds.length === 0}
                >
                  Quitar todas
                </Button>
              </div>
            )}
          </div>

          {!form.countryId ? (
            <p className="text-sm text-gray-500">Elige primero el país en Datos generales.</p>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor={inputId('branch')}>Sucursales habilitadas ({form.branchIds.length})</Label>
              {!readOnly && (
                <SearchableSelect
                  id={inputId('branch')}
                  options={countryBranches
                    .filter((b) => !form.branchIds.includes(b.id))
                    .map((b) => ({ value: b.id, label: b.name, hint: b.code }))}
                  value=""
                  onChange={addBranch}
                  placeholder="Agregar sucursal…"
                  showAllOption={false}
                />
              )}
              {form.branchIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.branchIds.map((id) => (
                    <Badge
                      key={id}
                      variant="outline"
                      className="gap-1 border-[#a7c1e2] bg-[#C8DDF2]/30 text-[#2f5165]"
                    >
                      {branchNameById.get(id) ?? id}
                      {!readOnly && (
                        <button
                          type="button"
                          className="ml-0.5 text-[#2f5165]/60 hover:text-red-600"
                          onClick={() => removeBranch(id)}
                          title="Quitar sucursal"
                          aria-label={`Quitar ${branchNameById.get(id) ?? id}`}
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    <strong>Apagada.</strong> Sin sucursales el POS no la ofrece en ninguna, aunque esté
                    activa.
                  </p>
                </div>
              )}
              {selectedSavedBranches.length > 0 && (
                <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 bg-gray-50/60 text-xs text-gray-600">
                  {selectedSavedBranches.map((b) => (
                    <li key={b.branchId} className="flex flex-wrap items-center gap-x-2 px-3 py-1.5">
                      <span className="font-medium text-gray-800">{b.branchName}</span>
                      <span className="font-mono text-gray-400">{b.branchCode}</span>
                      <span>· habilitada el {formatEnabledAt(b.enabledAt)}</span>
                      {b.enabledByName && <span>por {b.enabledByName}</span>}
                      {b.note && <span className="italic text-gray-500">· {b.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p className="font-semibold">Revisa estos datos:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {activeWithoutBranches && !readOnly && (
        <p className="text-xs text-amber-800">
          La campaña quedará activa pero sin sucursales: no se ofrecerá hasta que habilites al menos una.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Link href={cancelHref}>
          <Button type="button" variant="ghost">
            {readOnly ? 'Volver' : 'Cancelar'}
          </Button>
        </Link>
        {!readOnly && (
          <Button type="submit" variant="default" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
