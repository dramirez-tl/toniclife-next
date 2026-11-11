'use client';

// Arte de una promoción de temporada en la tienda (p. ej. la publicación cuadrada del Buen Fin
// con sus productos participantes y su letra chica). Se pinta completo, sin recortar, y es un
// botón: al pulsarlo se ve en grande, porque la lista de productos y las condiciones no se leen
// en pequeño. Si el archivo no carga no se pinta nada (el texto de la promoción sigue ahí).

import { useState } from 'react';
import Image from 'next/image';
import { MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useImageAttempt } from '@/hooks/useImageAttempt';
import { imageAttempts } from '@/lib/inventory/product-thumb';
import { cn } from '@/lib/utils';

interface PromoArtProps {
  src: string;
  /** Nombre de la promoción: título de la vista en grande y texto alternativo. */
  name: string;
  /** Condiciones de la promoción (se repiten bajo el título de la vista en grande). */
  description?: string | null;
  /** Texto del botón para lectores de pantalla ("Ver … en grande"). */
  label: string;
  /** Ancho que ocupa en pantalla (atributo `sizes` de la imagen). */
  sizes: string;
  className?: string;
}

export function PromoArt({ src, name, description, label, sizes, className }: PromoArtProps) {
  const [open, setOpen] = useState(false);
  const small = useImageAttempt(imageAttempts(src));
  const large = useImageAttempt(imageAttempts(src));

  if (!small.current) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            'group relative block aspect-square shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-gray-200 bg-white outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#3E667D] focus-visible:ring-offset-2',
            className,
          )}
        >
          <Image
            key={`${small.current.optimized}:${small.current.src}`}
            src={small.current.src}
            alt={name}
            fill
            sizes={sizes}
            unoptimized={!small.current.optimized}
            className="object-contain"
            onError={small.fail}
          />
          <span
            aria-hidden="true"
            className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-[#2f5165] shadow-sm transition-transform motion-safe:group-hover:scale-110"
          >
            <MagnifyingGlassPlusIcon className="size-4" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-base leading-snug text-gray-900">{name}</DialogTitle>
          {description ? (
            <DialogDescription className="whitespace-pre-line text-left text-xs text-gray-600">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{name}</DialogDescription>
          )}
        </DialogHeader>
        {/* Cuadrada y nunca más alta que la ventana (pantallas bajas). */}
        <div className="relative mx-auto aspect-square w-full max-w-[72vh] overflow-hidden rounded-lg bg-gray-50">
          {large.current ? (
            <Image
              key={`${large.current.optimized}:${large.current.src}`}
              src={large.current.src}
              alt={name}
              fill
              sizes="(min-width: 640px) 720px, 100vw"
              unoptimized={!large.current.optimized}
              className="object-contain"
              onError={large.fail}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
