'use client';

// EventImageCard - Imagen / flyer del evento: vista previa, subir el archivo
// (POST /events/:id/image → S3; el API regresa la ficha con `imageUrl`
// pública, la que va en el correo y en el boleto público) y quitarla
// (PATCH imageUrl: null). Pegar una liga a mano sigue siendo posible desde
// el campo "URL de la imagen / flyer" del formulario (alternativa secundaria).

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ArrowUpTrayIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useUpdateEvent, useUploadEventImage } from '@/hooks/useEvents';
import { eventErrorMessage } from '@/lib/events/format';
import type { EventDto } from '@/types/events';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export function EventImageCard({ event }: { event: EventDto }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadEventImage();
  const updateMutation = useUpdateEvent();
  const [progress, setProgress] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Al reemplazar la imagen la URL pública es la misma (y el API la cachea
  // 1 h): la vista previa lleva un sufijo para que el navegador la vuelva a pedir.
  const [previewVersion, setPreviewVersion] = useState(0);

  const busy = uploadMutation.isPending || updateMutation.isPending;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error('La imagen debe ser JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 5 MB.`);
      return;
    }
    setProgress(0);
    try {
      await uploadMutation.mutateAsync({ id: event.id, file, onProgress: setProgress });
      setPreviewVersion(Date.now());
      toast.success('Imagen subida; ya se usa en el correo y en el boleto.');
    } catch (err) {
      toast.error(eventErrorMessage(err, 'No se pudo subir la imagen.'));
    }
  };

  const handleRemove = async () => {
    try {
      await updateMutation.mutateAsync({ id: event.id, input: { imageUrl: null } });
      toast.success('Imagen quitada');
      setConfirmRemove(false);
    } catch (err) {
      toast.error(eventErrorMessage(err, 'No se pudo quitar la imagen.'));
    }
  };

  const imageUrl = event.imageUrl;
  const previewSrc =
    imageUrl && previewVersion
      ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}v=${previewVersion}`
      : imageUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagen / flyer</CardTitle>
        <CardDescription>
          Se muestra en el correo de los boletos y en el boleto público. JPG, PNG o WebP, máximo 5 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 sm:w-72">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="Flyer del evento" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <PhotoIcon className="h-10 w-10" />
                <span className="text-xs">Sin imagen</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => void handleFile(e)}
                aria-label="Elegir imagen del evento"
              />
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
                {uploadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                )}
                {uploadMutation.isPending
                  ? `Subiendo… ${progress}%`
                  : imageUrl
                    ? 'Reemplazar imagen'
                    : 'Subir imagen'}
              </Button>
              {imageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setConfirmRemove(true)}
                  disabled={busy}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Quitar
                </Button>
              )}
            </div>

            {uploadMutation.isPending && (
              <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#3E667D] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {imageUrl ? (
              <p className="truncate text-xs text-gray-400" title={imageUrl}>
                Liga:{' '}
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#3E667D] hover:underline"
                >
                  {imageUrl}
                </a>
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                También puedes pegar una liga pública en “URL de la imagen / flyer”, más abajo.
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Quitar la imagen del evento"
        description="El correo y el boleto público dejarán de mostrarla. Puedes subir otra cuando quieras."
        confirmLabel="Quitar"
        destructive
        isPending={updateMutation.isPending}
        onConfirm={handleRemove}
      />
    </Card>
  );
}
