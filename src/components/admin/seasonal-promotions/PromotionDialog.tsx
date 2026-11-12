'use client';

// Alta / edición de UNA promoción dentro de una temporada (mig 186), en un
// diálogo: tipo (3x2, precio especial, %, regalo por compra) con sus campos,
// productos elegibles (y regalos), canales, países (subconjunto de la
// temporada), ventana propia opcional, prioridad, tope por venta, regla de
// puntos y "sin bono" para el kit. El arte se sube en edición.

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ArtZoom } from './ArtZoom';
import { useProducts } from '@/hooks/useProducts';
import {
  useCreateSeasonPromotion,
  useDeleteSeasonPromotion,
  useUpdateSeasonPromotion,
  useUploadPromotionImage,
} from '@/hooks/useSeasonalPromotions';
import type { Product } from '@/types/product';
import type { PromoSeason, SeasonPromotion, SeasonalPromoChannel } from '@/types/seasonal-promotion';
import {
  CHANNEL_OPTIONS,
  EMPTY_PROMOTION_FORM,
  FLAGS,
  POINTS_MODE_OPTIONS,
  PROMO_TYPE_OPTIONS,
  type PromotionFormValues,
  type PromotionProductRow,
  apiErrorMessage,
  formFromPromotion,
  toInputStamp,
  toPromotionPayload,
  validatePromotionForm,
  windowLabel,
} from '@/lib/seasonal-promotions';

interface PromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season: PromoSeason;
  /** Ausente = crear. */
  promotion?: SeasonPromotion | null;
  readOnly?: boolean;
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_MAX_BYTES = 7 * 1024 * 1024;

export function PromotionDialog({
  open,
  onOpenChange,
  season,
  promotion,
  readOnly = false,
}: PromotionDialogProps) {
  // Se remonta por `key` desde el padre (promotion.id / 'new'): el estado
  // inicial se toma UNA vez.
  const [form, setForm] = useState<PromotionFormValues>(() =>
    promotion
      ? formFromPromotion(promotion)
      : {
          ...EMPTY_PROMOTION_FORM,
          startsAt: toInputStamp(season.startsAt),
          endsAt: toInputStamp(season.endsAt),
        },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const uid = useId();
  const inputId = (name: string) => `${uid}-${name}`;
  const set = (patch: Partial<PromotionFormValues>) => {
    setForm((f) => ({ ...f, ...patch }));
    if (errors.length > 0) setErrors([]);
  };

  const create = useCreateSeasonPromotion(season.id);
  const update = useUpdateSeasonPromotion(season.id);
  const remove = useDeleteSeasonPromotion(season.id);
  const uploadImage = useUploadPromotionImage(season.id);
  const isSaving = create.isPending || update.isPending;
  const mode: 'create' | 'edit' = promotion ? 'edit' : 'create';

  const seasonCountryCodes = season.countries.map((c) => c.code);
  const seasonCtx = { startsAt: season.startsAt, endsAt: season.endsAt, countryCodes: seasonCountryCodes };

  // -------- buscador de productos (2+ caracteres, 300 ms) --------
  const [productSearch, setProductSearch] = useState('');
  const [term, setTerm] = useState('');
  const [searchTarget, setSearchTarget] = useState<'eligible' | 'gifts'>('eligible');
  useEffect(() => {
    const t = setTimeout(() => setTerm(productSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearch]);
  const searchEnabled = term.length >= 2;
  const { data: productResults, isFetching: searching } = useProducts(
    { search: term, isActive: true, limit: 12 },
    { enabled: searchEnabled && !readOnly },
  );
  const results = searchEnabled ? (productResults?.data ?? []) : [];

  const addProduct = (p: Product) => {
    const row: PromotionProductRow = {
      productId: p.id,
      sku: p.code,
      name: p.name,
      productActive: p.isActive,
      quantity: '1',
    };
    const already =
      form.eligible.some((x) => x.productId === p.id) || form.gifts.some((x) => x.productId === p.id);
    if (already) {
      toast.warning('Ese producto ya está en la promoción');
      return;
    }
    if (searchTarget === 'gifts') set({ gifts: [...form.gifts, row] });
    else set({ eligible: [...form.eligible, row] });
    setProductSearch('');
  };
  const removeEligible = (id: string) => set({ eligible: form.eligible.filter((x) => x.productId !== id) });
  const removeGift = (id: string) => set({ gifts: form.gifts.filter((x) => x.productId !== id) });
  const setGiftQty = (id: string, quantity: string) =>
    set({ gifts: form.gifts.map((g) => (g.productId === id ? { ...g, quantity } : g)) });

  const toggleChannel = (ch: SeasonalPromoChannel, on: boolean) =>
    set({ channels: on ? [...new Set([...form.channels, ch])] : form.channels.filter((c) => c !== ch) });
  const toggleCountry = (id: string, on: boolean) =>
    set({
      countryIds: on ? [...new Set([...form.countryIds, id])] : form.countryIds.filter((c) => c !== id),
    });

  // -------- arte (solo en edición) --------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const canUpload = !!promotion && !readOnly;
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !promotion) return;
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
      const saved = await uploadImage.mutateAsync({ id: promotion.id, file, onProgress: setUploadProgress });
      set({ imageUrl: saved.imageUrl ?? '' });
      toast.success('Arte de la promoción subido.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo subir el arte.'));
    }
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    const problems = validatePromotionForm(form, seasonCtx);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    const payload = toPromotionPayload(form, mode);
    try {
      if (promotion) {
        const saved = await update.mutateAsync({ id: promotion.id, dto: payload });
        toast.success(`Promoción ${saved.code} guardada`);
      } else {
        const saved = await create.mutateAsync(payload);
        toast.success(`Promoción ${saved.code} agregada a ${season.name}`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo guardar la promoción'));
    }
  };

  const handleDelete = async () => {
    if (!promotion) return;
    try {
      await remove.mutateAsync(promotion.id);
      toast.success(`Promoción ${promotion.code} borrada`);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo borrar la promoción'));
    }
  };

  const typeOption = PROMO_TYPE_OPTIONS.find((o) => o.value === form.type);
  const showKitBonus = form.type === 'fixed_price' || form.type === 'percent_off';
  const hasKitEligible = form.eligible.some((e) => /kit|KPM|KB|KI/i.test(e.sku) || /kit/i.test(e.name));

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !isSaving && onOpenChange(o)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {promotion ? `Editar promoción · ${promotion.code}` : 'Nueva promoción'}
            </DialogTitle>
            <DialogDescription>
              Temporada {season.name} · {windowLabel(season.startsAt, season.endsAt)} ·{' '}
              {season.countries.map((c) => c.code).join(', ')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Tipo y nombre */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('type')}>Tipo de promoción</Label>
                <SearchableSelect
                  id={inputId('type')}
                  options={PROMO_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={form.type}
                  onChange={(v) => set({ type: v as PromotionFormValues['type'] })}
                  showAllOption={false}
                  disabled={readOnly || mode === 'edit'}
                />
                <p className="text-xs text-gray-500">{typeOption?.hint}</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('name')}>
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={inputId('name')}
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="3x2 en tés · Kit Premium a $2,000"
                  maxLength={150}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Config por tipo */}
            {form.type === 'nxm' && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={inputId('buy')}>Lleva</Label>
                  <Input
                    id={inputId('buy')}
                    inputMode="numeric"
                    value={form.buy}
                    onChange={(e) => set({ buy: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={inputId('pay')}>Paga</Label>
                  <Input
                    id={inputId('pay')}
                    inputMode="numeric"
                    value={form.pay}
                    onChange={(e) => set({ pay: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch
                    id={inputId('same')}
                    checked={form.sameProductOnly}
                    onCheckedChange={(v) => set({ sameProductOnly: v })}
                    disabled={readOnly}
                  />
                  <Label htmlFor={inputId('same')} className="text-sm">
                    Solo piezas idénticas
                  </Label>
                </div>
                <p className="text-xs text-gray-500 md:col-span-3">
                  {form.sameProductOnly
                    ? 'Cada producto cuenta por separado: 3 Legline Té = 1 gratis; 2 Legline + 1 Pp Té no forman grupo.'
                    : 'Se pueden mezclar productos de la lista; las piezas gratis son las más baratas del grupo.'}
                </p>
              </div>
            )}
            {form.type === 'percent_off' && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={inputId('percent')}>Descuento (%)</Label>
                  <Input
                    id={inputId('percent')}
                    inputMode="decimal"
                    value={form.percent}
                    onChange={(e) => set({ percent: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}
            {form.type === 'fixed_price' && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <p className="text-sm font-medium text-gray-800">
                  Precio especial por país (precio final al cliente)
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {season.countries.map((c) => (
                    <div key={c.id} className="grid gap-1.5">
                      <Label htmlFor={inputId(`price-${c.code}`)}>
                        {FLAGS[c.code] ?? ''} {c.code} — {c.name}
                      </Label>
                      <Input
                        id={inputId(`price-${c.code}`)}
                        inputMode="decimal"
                        value={form.prices[c.code] ?? ''}
                        onChange={(e) => set({ prices: { ...form.prices, [c.code]: e.target.value } })}
                        placeholder="Vacío = no aplica aquí"
                        disabled={readOnly}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Con IVA incluido en México/Frontera (como el precio de lista). Si el precio especial es
                  mayor que el precio del cliente, no se aplica.
                </p>
              </div>
            )}
            {form.type === 'gift_with_purchase' && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={inputId('minQuantity')}>Piezas mínimas (de los elegibles)</Label>
                  <Input
                    id={inputId('minQuantity')}
                    inputMode="numeric"
                    value={form.minQuantity}
                    onChange={(e) => set({ minQuantity: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={inputId('minAmount')}>o monto mínimo ($)</Label>
                  <Input
                    id={inputId('minAmount')}
                    inputMode="decimal"
                    value={form.minAmount}
                    onChange={(e) => set({ minAmount: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch
                    id={inputId('repeat')}
                    checked={form.repeat}
                    onCheckedChange={(v) => set({ repeat: v })}
                    disabled={readOnly}
                  />
                  <Label htmlFor={inputId('repeat')} className="text-sm">
                    Repite por cada múltiplo
                  </Label>
                </div>
              </div>
            )}

            {/* Productos */}
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">
                  {form.type === 'gift_with_purchase'
                    ? 'Productos que hay que comprar'
                    : 'Productos de la promoción'}{' '}
                  <span className="font-normal text-gray-500">({form.eligible.length})</span>
                </p>
                {form.type === 'gift_with_purchase' && !readOnly && (
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      className={`rounded-full px-2.5 py-1 ${searchTarget === 'eligible' ? 'bg-[#3E667D] text-white' : 'bg-gray-100 text-gray-700'}`}
                      onClick={() => setSearchTarget('eligible')}
                    >
                      Agregar a elegibles
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-2.5 py-1 ${searchTarget === 'gifts' ? 'bg-[#3E667D] text-white' : 'bg-gray-100 text-gray-700'}`}
                      onClick={() => setSearchTarget('gifts')}
                    >
                      Agregar a regalos
                    </button>
                  </div>
                )}
              </div>
              {!readOnly && (
                <div className="relative">
                  <Label htmlFor={inputId('search')} className="sr-only">
                    Buscar producto
                  </Label>
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id={inputId('search')}
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    placeholder={`Buscar por clave o nombre y agregar ${searchTarget === 'gifts' ? 'como regalo' : ''} (mínimo 2 caracteres)…`}
                    className="bg-white pl-9"
                    autoComplete="off"
                  />
                  {searchEnabled && (
                    <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
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
                                onClick={() => addProduct(p)}
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
              {form.eligible.length === 0 ? (
                <p className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-3 text-center text-xs text-gray-500">
                  Sin productos: la promoción no aplicará a nada.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {form.eligible.map((e) => (
                    <Badge
                      key={e.productId}
                      variant="outline"
                      className={`gap-1 ${e.productActive === false ? 'border-red-200 bg-red-50 text-red-800' : 'border-gray-300 bg-white text-gray-800'}`}
                      title={e.sku}
                    >
                      <span className="font-mono text-[11px] text-gray-500">{e.sku}</span> {e.name}
                      {!readOnly && (
                        <button
                          type="button"
                          className="ml-0.5 text-gray-400 hover:text-red-600"
                          onClick={() => removeEligible(e.productId)}
                          aria-label={`Quitar ${e.name}`}
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}

              {form.type === 'gift_with_purchase' && (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Regalos <span className="font-normal text-gray-500">({form.gifts.length})</span>
                  </p>
                  {form.gifts.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Agrega el producto que se regala (se entrega en $0 si hay existencia).
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {form.gifts.map((g) => (
                        <li
                          key={g.productId}
                          className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{g.name}</p>
                            <p className="font-mono text-xs text-gray-600">{g.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={inputId(`gq-${g.productId}`)} className="text-xs text-gray-700">
                              Piezas
                            </Label>
                            <Input
                              id={inputId(`gq-${g.productId}`)}
                              inputMode="decimal"
                              value={g.quantity}
                              onChange={(e) => setGiftQty(g.productId, e.target.value)}
                              className="h-9 w-20 text-right"
                              disabled={readOnly}
                            />
                          </div>
                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 text-red-700"
                              onClick={() => removeGift(g.productId)}
                              aria-label={`Quitar ${g.name}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>

            {/* Canales y países */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-800">Canales</p>
                {CHANNEL_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-start gap-2 text-sm text-gray-800">
                    <Checkbox
                      checked={form.channels.includes(o.value)}
                      onCheckedChange={(v) => toggleChannel(o.value, v === true)}
                      disabled={readOnly}
                      className="mt-0.5"
                    />
                    <span>
                      {o.label}
                      <span className="block text-xs text-gray-500">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-800">Países</p>
                <p className="text-xs text-gray-500">
                  Sin marcar ninguno aplica en todos los de la temporada.
                </p>
                {season.countries.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <Checkbox
                      checked={form.countryIds.includes(c.id)}
                      onCheckedChange={(v) => toggleCountry(c.id, v === true)}
                      disabled={readOnly}
                    />
                    <span>
                      {FLAGS[c.code] ?? ''} {c.code} — {c.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ventana propia */}
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Switch
                  id={inputId('own')}
                  checked={form.useOwnWindow}
                  onCheckedChange={(v) => set({ useOwnWindow: v })}
                  disabled={readOnly}
                />
                <Label htmlFor={inputId('own')} className="text-sm">
                  Esta promoción tiene su propio día u horario dentro de la temporada
                </Label>
              </div>
              {form.useOwnWindow ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor={inputId('startsAt')}>Inicia (hora local)</Label>
                    <Input
                      id={inputId('startsAt')}
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => set({ startsAt: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={inputId('endsAt')}>Termina (hora local)</Label>
                    <Input
                      id={inputId('endsAt')}
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => set({ endsAt: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Usa la ventana de la temporada: {windowLabel(season.startsAt, season.endsAt)}.
                </p>
              )}
            </div>

            {/* Reglas finas */}
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('priority')}>Prioridad</Label>
                <Input
                  id={inputId('priority')}
                  inputMode="numeric"
                  value={form.priority}
                  onChange={(e) => set({ priority: e.target.value })}
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500">
                  Menor = se evalúa primero; un producto entra a una sola promoción.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('maxPerSale')}>Tope por venta</Label>
                <Input
                  id={inputId('maxPerSale')}
                  inputMode="numeric"
                  value={form.maxPerSale}
                  onChange={(e) => set({ maxPerSale: e.target.value })}
                  placeholder="Sin tope"
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500">
                  Grupos (3x2), piezas (% / precio) o regalos por ticket.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('pointsMode')}>Puntos</Label>
                <SearchableSelect
                  id={inputId('pointsMode')}
                  options={POINTS_MODE_OPTIONS}
                  value={form.pointsMode}
                  onChange={(v) => set({ pointsMode: v as PromotionFormValues['pointsMode'] })}
                  showAllOption={false}
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500">Las piezas gratis y los regalos nunca dan puntos.</p>
              </div>
              {showKitBonus && (
                <div className="flex items-start gap-3 md:col-span-3">
                  <Switch
                    id={inputId('kitBonus')}
                    checked={form.excludesKitBonus}
                    onCheckedChange={(v) => set({ excludesKitBonus: v })}
                    disabled={readOnly}
                  />
                  <Label htmlFor={inputId('kitBonus')} className="text-sm">
                    Sin bono: el kit de inscripción vendido con esta promoción NO genera Bono de Inscripción
                    al patrocinador
                    {hasKitEligible && !form.excludesKitBonus && (
                      <span className="block text-xs text-amber-800">
                        Hay un kit entre los productos: revisa si la promoción “no incluye bono”.
                      </span>
                    )}
                  </Label>
                </div>
              )}
            </div>

            {/* Descripción, arte y estado */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('description')}>Descripción / leyenda</Label>
                <Textarea
                  id={inputId('description')}
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={3}
                  maxLength={4000}
                  placeholder="Válido solo el 14 de noviembre · No es paquete · Hasta agotar existencias"
                  disabled={readOnly}
                />
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
                  <Switch
                    id={inputId('active')}
                    checked={form.isActive}
                    onCheckedChange={(v) => set({ isActive: v })}
                    disabled={readOnly}
                  />
                  <Label htmlFor={inputId('active')} className="text-sm">
                    {form.isActive ? 'Activa' : 'Inactiva (no se aplica ni se muestra)'}
                  </Label>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={inputId('imageUrl')}>Arte de la promoción</Label>
                <div className="flex items-start gap-3">
                  {form.imageUrl.trim() ? (
                    // Al pulsar la vista previa el arte se ve en grande.
                    <ArtZoom
                      thumbSrc={
                        promotion?.imageThumbnailUrl && form.imageUrl === promotion.imageUrl
                          ? promotion.imageThumbnailUrl
                          : form.imageUrl.trim()
                      }
                      fullSrc={form.imageUrl.trim()}
                      title={form.name.trim() || 'Promoción'}
                      caption="Arte de la promoción"
                      className="aspect-video w-36 rounded-lg border"
                    />
                  ) : (
                    <div className="flex aspect-video w-36 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                      <PhotoIcon className="h-5 w-5 text-gray-400" />
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
                          aria-label="Elegir arte de la promoción"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!canUpload || uploadImage.isPending}
                          title={canUpload ? undefined : 'Guarda la promoción y después sube el arte'}
                        >
                          {uploadImage.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                          )}
                          {uploadImage.isPending
                            ? `Subiendo… ${uploadProgress}%`
                            : form.imageUrl.trim()
                              ? 'Reemplazar'
                              : 'Subir arte'}
                        </Button>
                        {form.imageUrl.trim() !== '' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-700"
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
                        ? 'JPG, PNG o WebP ≤ 7 MB; queda guardado al instante.'
                        : 'Guarda la promoción y después sube su arte (Marketing).'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div
                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                <p className="font-semibold">Revisa estos datos:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {promotion && !readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:text-red-800"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSaving}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Borrar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                {readOnly ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!readOnly && (
                <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {promotion ? 'Guardar cambios' : 'Agregar promoción'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {promotion && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Borrar la promoción ${promotion.code}`}
          description="Solo se puede borrar si ninguna venta la usó; si ya se usó, desactívala para conservar el historial."
          confirmLabel="Borrar"
          destructive
          isPending={remove.isPending}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
