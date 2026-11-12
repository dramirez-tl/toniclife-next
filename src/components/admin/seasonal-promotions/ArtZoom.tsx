'use client';

// ArtZoom — Miniatura del arte de una temporada o de una promoción que, al pulsarla, se ve
// EN GRANDE (11-nov-2026). El arte de Marketing trae los productos participantes y la letra
// chica: en la miniatura de la lista no se alcanza a revisar. La miniatura es un botón (se
// puede abrir con el teclado) y el visor muestra la imagen completa, sin recortar, con un
// enlace para abrir el archivo original.
// La liga del arte es libre (cualquier host): por eso va con <img> y no con next/image.

import { useState } from 'react';
import { ArrowTopRightOnSquareIcon, MagnifyingGlassPlusIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ArtZoomProps {
  /** Lo que se pinta en la miniatura (la versión chica si existe). */
  thumbSrc: string;
  /** La imagen completa que se ve en grande. */
  fullSrc: string;
  /** Nombre de la temporada o promoción: título del visor. */
  title: string;
  /** Qué es: "Arte de la promoción" / "Arte de la temporada". */
  caption: string;
  /** Tamaño y forma de la miniatura (p. ej. `h-12 w-20 rounded-md`). */
  className?: string;
}

export function ArtZoom({ thumbSrc, fullSrc, title, caption, className }: ArtZoomProps) {
  // Si la versión chica no carga, la miniatura usa la imagen completa (una sola vez por imagen).
  const [thumbFailedFor, setThumbFailedFor] = useState<string | null>(null);
  const [fullFailedFor, setFullFailedFor] = useState<string | null>(null);
  const smallSrc = thumbFailedFor === thumbSrc ? fullSrc : thumbSrc;
  const fullFailed = fullFailedFor === fullSrc;
  const label = `Ver en grande: ${title}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            'group relative block flex-shrink-0 cursor-zoom-in overflow-hidden bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] focus-visible:ring-offset-2',
            className,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={smallSrc}
            alt=""
            className="h-full w-full object-cover"
            onError={() => {
              if (smallSrc !== fullSrc) setThumbFailedFor(thumbSrc);
            }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity duration-150 group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100"
          >
            <MagnifyingGlassPlusIcon className="h-5 w-5" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-base leading-snug text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-left text-xs text-gray-600">{caption}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
          {fullFailed ? (
            <div className="flex flex-col items-center gap-2 p-8 text-sm text-gray-600">
              <PhotoIcon aria-hidden="true" className="h-8 w-8 text-gray-400" />
              No se pudo cargar la imagen. Revisa la liga del arte.
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullSrc}
              alt={`${caption}: ${title}`}
              className="max-h-[72vh] w-auto max-w-full object-contain"
              onError={() => setFullFailedFor(fullSrc)}
            />
          )}
        </div>
        <a
          href={fullSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-[#3E667D] underline-offset-4 hover:text-[#2f5165] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
          Abrir la imagen original
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      </DialogContent>
    </Dialog>
  );
}
