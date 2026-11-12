'use client';

// Formulario de una temporada de promociones (crear y editar), mig 186:
// nombre, código, descripción, arte, fecha-hora LOCAL de inicio y fin, países
// y estado. Las promociones se agregan desde el detalle (PromotionDialog).
// El estado vive en texto tal como se teclea y se convierte a DTO al guardar
// (lib/seasonal-promotions: validación + payload, con pruebas).

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  CheckIcon,
  GlobeAmericasIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveCountries } from '@/hooks/useConfig';
import { useUploadSeasonImage } from '@/hooks/useSeasonalPromotions';
import { ArtZoom } from './ArtZoom';
import type { CreatePromoSeasonDto } from '@/types/seasonal-promotion';
import {
  FLAGS,
  type SeasonFormValues,
  apiErrorMessage,
  toSeasonPayload,
  validateSeasonForm,
} from '@/lib/seasonal-promotions';

interface SeasonFormProps {
  mode: 'create' | 'edit';
  /** En edición: habilita "Subir arte" (POST /seasonal-promotions/seasons/:id/image). */
  seasonId?: string;
  imageThumbnailUrl?: string | null;
  initial: SeasonFormValues;
  /** Sin `products:seasonal_promos`: todo deshabilitado y sin botón de guardar. */
  readOnly?: boolean;
  isSaving: boolean;
  onSubmit: (payload: CreatePromoSeasonDto & { imageUrl?: string | null }) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_MAX_BYTES = 7 * 1024 * 1024;

export function SeasonForm({
  mode,
  seasonId,
  imageThumbnailUrl,
  initial,
  readOnly = false,
  isSaving,
  onSubmit,
  submitLabel,
  cancelHref,
}: SeasonFormProps) {
  const uid = useId();
  const inputId = (name: string) => `${uid}-${name}`;
  const [form, setForm] = useState<SeasonFormValues>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (patch: Partial<SeasonFormValues>) => {
    setForm((f) => ({ ...f, ...patch }));
    if (errors.length > 0) setErrors([]);
  };

  const { data: countries } = useActiveCountries();
  const countryById = new Map((countries ?? []).map((c) => [c.id, c]));
  const frontera = (countries ?? []).find((c) => c.code === 'FN');

  const addCountry = (id: string) => {
    if (!id || form.countryIds.includes(id)) return;
    const next = [...form.countryIds, id];
    // México incluye Frontera (misma operación, precios propios): se sugiere junto.
    const c = countryById.get(id);
    if (c?.code === 'MX' && frontera && !next.includes(frontera.id)) {
      next.push(frontera.id);
      toast.info('Se agregó también Frontera (FN); quítala si esta temporada no aplica allá.');
    }
    set({ countryIds: next });
  };
  const removeCountry = (id: string) => set({ countryIds: form.countryIds.filter((x) => x !== id) });

  // -------- arte: en edición se sube al API (S3) y queda guardado al instante --------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadSeasonImage();
  const [uploadProgress, setUploadProgress] = useState(0);
  const canUpload = !!seasonId && !readOnly;
  const [savedImage, setSavedImage] = useState<{ url: string; thumb: string | null }>({
    url: initial.imageUrl.trim(),
    thumb: imageThumbnailUrl ?? null,
  });
  const typedImageUrl = form.imageUrl.trim();
  const previewSrc = !typedImageUrl
    ? null
    : typedImageUrl === savedImage.url && savedImage.thumb
      ? savedImage.thumb
      : typedImageUrl;

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !seasonId) return;
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
      const saved = await uploadImage.mutateAsync({ id: seasonId, file, onProgress: setUploadProgress });
      set({ imageUrl: saved.imageUrl ?? '' });
      setSavedImage({ url: (saved.imageUrl ?? '').trim(), thumb: saved.imageThumbnailUrl ?? null });
      toast.success('Arte subido; el POS y la tienda ya lo muestran.');
    } catch (err) {
      const status = (err as { response?: { status?: number } } | null)?.response?.status;
      toast.error(
        status === 413
          ? 'El API rechazó la imagen por tamaño: el máximo es 7 MB.'
          : apiErrorMessage(err, 'No se pudo subir el arte.'),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const problems = validateSeasonForm(form);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    await onSubmit(toSeasonPayload(form, mode));
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-[#3E667D]" />
            <h2 className="text-base font-semibold text-gray-900">Datos de la temporada</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor={inputId('name')}>
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id={inputId('name')}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Buen Fin 2026"
                maxLength={150}
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('code')}>Código</Label>
              <Input
                id={inputId('code')}
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                placeholder="Se genera del nombre"
                maxLength={40}
                className="font-mono"
                disabled={readOnly}
              />
              <p className="text-xs text-gray-500">Para tickets y reportes. Vacío = se genera.</p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={inputId('description')}>Descripción</Label>
            <Textarea
              id={inputId('description')}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              maxLength={4000}
              placeholder="Lo que ve el cajero en el apartado de temporada del POS y la tienda en el anuncio"
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('startsAt')}>
                Inicia (fecha y hora local) <span className="text-red-500">*</span>
              </Label>
              <Input
                id={inputId('startsAt')}
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set({ startsAt: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('endsAt')}>
                Termina (fecha y hora local) <span className="text-red-500">*</span>
              </Label>
              <Input
                id={inputId('endsAt')}
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set({ endsAt: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Hora LOCAL de cada sucursal (y del país en la tienda): “13 nov 00:00 → 17 nov 23:59” empieza a
            medianoche en Puebla y a medianoche en Tijuana. Las promociones de adentro pueden tener su propio
            día u horario dentro de este rango.
          </p>

          <div className="grid gap-2">
            <Label htmlFor={inputId('country')}>
              <span className="inline-flex items-center gap-1">
                <GlobeAmericasIcon className="h-4 w-4 text-[#3E667D]" />
                Países donde corre ({form.countryIds.length}) <span className="text-red-500">*</span>
              </span>
            </Label>
            {!readOnly && (
              <SearchableSelect
                id={inputId('country')}
                options={(countries ?? [])
                  .filter((c) => !form.countryIds.includes(c.id))
                  .map((c) => ({
                    value: c.id,
                    label: `${FLAGS[c.code] ?? ''} ${c.code} — ${c.name}`.trim(),
                  }))}
                value=""
                onChange={addCountry}
                placeholder="Agregar país…"
                showAllOption={false}
              />
            )}
            {form.countryIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.countryIds.map((id) => {
                  const c = countryById.get(id);
                  return (
                    <Badge
                      key={id}
                      variant="outline"
                      className="gap-1 border-[#a7c1e2] bg-[#C8DDF2]/30 text-[#2f5165]"
                    >
                      {c ? `${FLAGS[c.code] ?? ''} ${c.code} — ${c.name}` : id}
                      {!readOnly && (
                        <button
                          type="button"
                          className="ml-0.5 text-[#2f5165]/60 hover:text-red-600"
                          onClick={() => removeCountry(id)}
                          title="Quitar país"
                          aria-label={`Quitar ${c?.name ?? id}`}
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-amber-800">
                Sin países la temporada no aplica en ningún POS ni tienda.
              </p>
            )}
            <p className="text-xs text-gray-500">
              México y Frontera (FN) son países distintos con precios propios: al elegir México se sugiere
              Frontera. Estados Unidos y los demás se agregan aparte.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('imageUrl')}>Arte de la temporada</Label>
              <div className="flex items-start gap-3">
                {previewSrc ? (
                  // Al pulsar la vista previa el arte se ve en grande.
                  <ArtZoom
                    thumbSrc={previewSrc}
                    fullSrc={typedImageUrl}
                    title={form.name.trim() || 'Temporada'}
                    caption="Arte de la temporada"
                    className="aspect-video w-44 rounded-lg border"
                  />
                ) : (
                  <div className="flex aspect-video w-44 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
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
                        aria-label="Elegir arte de la temporada"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canUpload || uploadImage.isPending}
                        title={canUpload ? undefined : 'Crea la temporada y después sube el arte'}
                      >
                        {uploadImage.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                        )}
                        {uploadImage.isPending
                          ? `Subiendo… ${uploadProgress}%`
                          : form.imageUrl.trim()
                            ? 'Reemplazar arte'
                            : 'Subir arte'}
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
                      ? 'JPG, PNG o WebP, máximo 7 MB. Al subirlo queda guardado de inmediato; “Quitar” se aplica al guardar.'
                      : mode === 'create' && !readOnly
                        ? 'Crea la temporada y después sube el arte (o pega una liga). Cada promoción puede tener el suyo.'
                        : 'Se muestra en el apartado de temporada del POS y en la tienda.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId('isActive')}>Estado</Label>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
                <Switch
                  id={inputId('isActive')}
                  checked={form.isActive}
                  onCheckedChange={(v) => set({ isActive: v })}
                  disabled={readOnly}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{form.isActive ? 'Activa' : 'Inactiva'}</p>
                  <p className="text-xs text-gray-500">
                    Inactiva = ni el POS ni la tienda la toman, aunque esté en fechas. Útil para prepararla.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
