'use client';

// ProductImagesManager — galería del producto (sin dependencias nuevas):
//  - zona de soltar múltiple (JPG/PNG/WEBP <= 10 MB) con avance por archivo y
//    resumen "{ok} subidas, {fail} rechazadas" con el motivo de cada rechazo;
//  - orden con botones "Mover antes / después" (línea base accesible) y
//    arrastrar-soltar nativo como mejora → PUT /products/:id/images/order
//    (la primera queda como principal);
//  - estrella "Principal", texto alternativo en línea (sugerencia = nombre);
//  - borrar SIEMPRE con ConfirmDialog;
//  - aviso si la imagen pesa > 1 MB o mide < 800 px.

import { useId, useRef, useState, type DragEvent } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { productKeys, useDeleteProductImage, useProductImages, useUpdateProductImage } from '@/hooks/useProducts';
import { productsAdminService } from '@/services/products-admin.service';
import type { ProductImage } from '@/types/product';
import { cn } from '@/lib/utils';
import { productAdminErrorCode, productAdminErrorMessage } from './lib/errors';
import { useReorderProductImages } from './useProductsAdmin';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 10;
const HEAVY_BYTES = 1024 * 1024;
const MIN_SIDE_PX = 800;

interface UploadItem {
  key: string;
  name: string;
  status: 'uploading' | 'done' | 'rejected';
  progress: number;
  reason?: string;
  warnings: string[];
}

interface ProductImagesManagerProps {
  productId: string;
  /** Sugerencia para el texto alternativo. */
  productName: string;
  readOnly?: boolean;
  /** Se llama tras cada escritura (para refrescar salud / tienda). */
  onWrite?: () => void;
}

function measureImage(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function ProductImagesManager({ productId, productName, readOnly = false, onWrite }: ProductImagesManagerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: images = [], isLoading, isError } = useProductImages(productId);
  const updateImage = useUpdateProductImage();
  const deleteImage = useDeleteProductImage();
  const reorder = useReorderProductImages(productId);

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOverZone, setIsDragOverZone] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProductImage | null>(null);
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  const [smallSides, setSmallSides] = useState<Record<string, number>>({});

  const patchUpload = (key: string, patch: Partial<UploadItem>) =>
    setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));

  const handleFiles = async (fileList: FileList | File[] | null) => {
    if (readOnly || !fileList) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const batch: UploadItem[] = files.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      status: 'uploading',
      progress: 0,
      warnings: [],
    }));
    setUploads(batch);
    setIsUploading(true);

    let ok = 0;
    let fail = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const key = batch[i].key;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        fail++;
        patchUpload(key, { status: 'rejected', reason: 'Formato no permitido (usa JPG, PNG o WEBP)' });
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        fail++;
        patchUpload(key, { status: 'rejected', reason: `Pesa ${formatMb(file.size)}; el máximo es ${MAX_MB} MB` });
        continue;
      }
      const warnings: string[] = [];
      if (file.size > HEAVY_BYTES) warnings.push(`Pesa ${formatMb(file.size)} (recomendado: menos de 1 MB)`);
      const size = await measureImage(file);
      if (size && Math.min(size.width, size.height) < MIN_SIDE_PX) {
        warnings.push(`Mide ${size.width}×${size.height} px (recomendado: al menos ${MIN_SIDE_PX} px por lado)`);
      }
      try {
        await productsAdminService.uploadImage(productId, file, (progress) => patchUpload(key, { progress }));
        ok++;
        patchUpload(key, { status: 'done', progress: 100, warnings });
      } catch (err) {
        fail++;
        patchUpload(key, { status: 'rejected', reason: productAdminErrorMessage(err, 'El servidor rechazó la imagen') });
      }
    }

    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    await queryClient.invalidateQueries({ queryKey: productKeys.images(productId) });
    queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    if (ok > 0) onWrite?.();

    const summary = `${ok} ${ok === 1 ? 'subida' : 'subidas'}, ${fail} ${fail === 1 ? 'rechazada' : 'rechazadas'}`;
    if (fail === 0) toast.success(summary);
    else if (ok === 0) toast.error(summary);
    else toast.warning(summary);
  };

  const applyOrder = async (next: ProductImage[]) => {
    try {
      await reorder.mutateAsync(next.map((img) => img.id));
      onWrite?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo guardar el orden de las imágenes'));
      if (productAdminErrorCode(err) === 'PRD_IMAGE_SET_MISMATCH') {
        queryClient.invalidateQueries({ queryKey: productKeys.images(productId) });
      }
    }
  };

  const move = (from: number, to: number) => {
    if (readOnly || reorder.isPending) return;
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void applyOrder(next);
  };

  const setPrimary = async (img: ProductImage) => {
    setBusyId(img.id);
    try {
      await updateImage.mutateAsync({ productId, imageId: img.id, dto: { isPrimary: true } });
      toast.success('Imagen principal actualizada');
      onWrite?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo marcar como principal'));
    } finally {
      setBusyId(null);
    }
  };

  const saveAlt = async (img: ProductImage) => {
    const draft = altDrafts[img.id];
    if (draft === undefined) return;
    const next = draft.trim();
    if (next === (img.altText ?? '')) {
      setAltDrafts((prev) => {
        const rest = { ...prev };
        delete rest[img.id];
        return rest;
      });
      return;
    }
    setBusyId(img.id);
    try {
      await updateImage.mutateAsync({ productId, imageId: img.id, dto: { altText: next } });
      setAltDrafts((prev) => {
        const rest = { ...prev };
        delete rest[img.id];
        return rest;
      });
      toast.success('Texto alternativo guardado');
      onWrite?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo guardar el texto alternativo'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteImage.mutateAsync({ productId, imageId: toDelete.id });
      toast.success('Imagen eliminada');
      setToDelete(null);
      onWrite?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo eliminar la imagen'));
    }
  };

  const onZoneDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOverZone(false);
    // Un arrastre de tarjeta (reordenar) no trae archivos.
    if (event.dataTransfer.files.length > 0) void handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-5">
      {!readOnly ? (
        <div>
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverZone(true);
            }}
            onDragLeave={() => setIsDragOverZone(false)}
            onDrop={onZoneDrop}
            className={cn(
              'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-[#3E667D]',
              isDragOverZone ? 'border-[#3E667D] bg-[#C8DDF2]/30' : 'border-gray-300 hover:border-[#3E667D] hover:bg-gray-50',
              isUploading && 'pointer-events-none opacity-60',
            )}
          >
            <ImagePlus className="h-8 w-8 text-gray-500" aria-hidden />
            <span className="text-sm font-medium text-gray-900">
              Arrastra aquí tus imágenes o haz clic para elegirlas
            </span>
            <span className="text-xs text-gray-600">
              JPG, PNG o WEBP · hasta {MAX_MB} MB cada una · recomendado: cuadradas, al menos {MIN_SIDE_PX} px y
              menos de 1 MB
            </span>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              multiple
              className="sr-only"
              disabled={isUploading}
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </label>

          {uploads.length > 0 ? (
            <ul className="mt-3 space-y-2" aria-live="polite">
              {uploads.map((u) => (
                <li key={u.key} className="rounded-lg border border-gray-200 p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium text-gray-900">{u.name}</span>
                    <span
                      className={cn(
                        'shrink-0 text-xs font-medium',
                        u.status === 'done' && 'text-emerald-700',
                        u.status === 'rejected' && 'text-red-700',
                        u.status === 'uploading' && 'text-gray-700',
                      )}
                    >
                      {u.status === 'done' ? 'Subida' : u.status === 'rejected' ? 'Rechazada' : `${u.progress}%`}
                    </span>
                  </div>
                  {u.status === 'uploading' ? (
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={u.progress}
                      aria-label={`Subiendo ${u.name}`}
                    >
                      <div className="h-full bg-[#3E667D] transition-[width]" style={{ width: `${u.progress}%` }} />
                    </div>
                  ) : null}
                  {u.reason ? <p className="mt-1 text-xs text-red-700">{u.reason}</p> : null}
                  {u.warnings.map((w) => (
                    <p key={w} className="mt-1 flex items-center gap-1 text-xs text-amber-800">
                      <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando imágenes…
        </p>
      ) : isError ? (
        <p className="text-sm text-red-700" role="alert">
          No se pudieron cargar las imágenes del producto.
        </p>
      ) : images.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">
          Este producto no tiene imágenes. En la tienda se muestra el monograma de la marca.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-600">
            La primera imagen es la principal (tarjetas, buscadores y redes).
            {!readOnly ? ' Reordena con los botones o arrastrando las tarjetas.' : ''}
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((img, index) => {
              const busy = busyId === img.id || reorder.isPending;
              const altValue = altDrafts[img.id] ?? img.altText ?? '';
              const altDirty = altDrafts[img.id] !== undefined && altDrafts[img.id].trim() !== (img.altText ?? '');
              const smallSide = smallSides[img.id];
              return (
                <li
                  key={img.id}
                  draggable={!readOnly && !busy}
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => {
                    if (dragIndex !== null) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    const from = dragIndex;
                    setDragIndex(null);
                    move(from, index);
                  }}
                  className={cn(
                    'overflow-hidden rounded-lg border bg-white',
                    dragIndex === index ? 'border-[#3E667D] opacity-60' : 'border-gray-200',
                  )}
                >
                  <div className="relative aspect-square w-full max-w-full bg-gray-50">
                    <Image
                      src={img.imageUrl}
                      alt={img.altText || productName || 'Imagen del producto'}
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="object-contain"
                      unoptimized
                      onLoad={(e) => {
                        const el = e.currentTarget;
                        const side = Math.min(el.naturalWidth, el.naturalHeight);
                        if (side > 0 && side < MIN_SIDE_PX) {
                          setSmallSides((prev) => (prev[img.id] === side ? prev : { ...prev, [img.id]: side }));
                        }
                      }}
                    />
                    {img.isPrimary ? (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#3E667D] px-2 py-0.5 text-xs font-medium text-white">
                        <Star className="h-3 w-3 fill-current" aria-hidden /> Principal
                      </span>
                    ) : null}
                    <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                      {index + 1} de {images.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 p-3">
                    {smallSide ? (
                      <p className="flex items-center gap-1 text-xs text-amber-800">
                        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Mide {smallSide} px en su lado menor; se verá borrosa al ampliar (mínimo {MIN_SIDE_PX} px).
                      </p>
                    ) : null}

                    <div className="space-y-1">
                      <Label htmlFor={`${inputId}-alt-${img.id}`} className="text-xs">
                        Texto alternativo
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`${inputId}-alt-${img.id}`}
                          value={altValue}
                          maxLength={200}
                          placeholder={productName}
                          disabled={readOnly || busyId === img.id}
                          onChange={(e) => setAltDrafts((prev) => ({ ...prev, [img.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void saveAlt(img);
                            }
                          }}
                          className="h-8 text-sm"
                        />
                        {!readOnly && altDirty ? (
                          <Button type="button" size="sm" className="h-8" onClick={() => void saveAlt(img)}>
                            Guardar
                          </Button>
                        ) : null}
                      </div>
                      {!readOnly && !altValue && productName ? (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => setAltDrafts((prev) => ({ ...prev, [img.id]: productName }))}
                        >
                          Usar el nombre del producto
                        </Button>
                      ) : null}
                    </div>

                    {!readOnly ? (
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            disabled={busy || index === 0}
                            onClick={() => move(index, index - 1)}
                            aria-label={`Mover antes la imagen ${index + 1}`}
                          >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            <span className="ml-1 hidden sm:inline">Antes</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            disabled={busy || index === images.length - 1}
                            onClick={() => move(index, index + 1)}
                            aria-label={`Mover después la imagen ${index + 1}`}
                          >
                            <span className="mr-1 hidden sm:inline">Después</span>
                            <ArrowRight className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                        <div className="flex gap-1.5">
                          {!img.isPrimary ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9"
                              disabled={busy}
                              onClick={() => void setPrimary(img)}
                            >
                              <Star className="mr-1 h-4 w-4" aria-hidden /> Principal
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 text-red-700 hover:text-red-800"
                            disabled={busy}
                            onClick={() => setToDelete(img)}
                            aria-label={`Eliminar la imagen ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Eliminar imagen"
        description={
          toDelete?.isPrimary
            ? 'Es la imagen principal: la siguiente de la galería ocupará su lugar en la tienda.'
            : 'La imagen dejará de mostrarse en la tienda y en el POS.'
        }
        confirmLabel="Eliminar imagen"
        destructive
        isPending={deleteImage.isPending}
        onConfirm={confirmDelete}
      >
        {toDelete ? (
          <div className="relative mx-auto aspect-square w-40 max-w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            <Image
              src={toDelete.imageUrl}
              alt={toDelete.altText || productName || 'Imagen del producto'}
              fill
              sizes="160px"
              className="object-contain"
              unoptimized
            />
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
