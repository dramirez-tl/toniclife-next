'use client';

// Visor de la foto del colaborador que inició sesión (clic al avatar del
// bloque de cuenta). Solo ver: la foto se administra desde RRHH › Empleados.

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProfilePhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Foto original (alta resolución); si no viene se usa la miniatura. */
  photoUrl?: string | null;
  avatarUrl?: string | null;
  name: string;
  subtitle?: string;
}

export function ProfilePhotoDialog({
  open,
  onOpenChange,
  photoUrl,
  avatarUrl,
  name,
  subtitle,
}: ProfilePhotoDialogProps) {
  // Si la original falla (URL firmada vencida, archivo movido) se cae a la
  // miniatura; se recuerda la URL fallida para no insistir.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const candidates = [photoUrl, avatarUrl].filter((u): u is string => !!u);
  const src = candidates.find((u) => u !== failedUrl) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {subtitle ? `${subtitle} · ` : ''}Foto del expediente de RRHH (solo lectura).
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={`Foto de ${name}`}
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow"
              onError={() => setFailedUrl(src)}
            />
          ) : (
            <p className="py-10 text-sm text-gray-500">No hay foto en el expediente.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
